import type {PortfolioConfidence, PortfolioExtractResult} from '@/lib/portfolio/types';

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 2_500_000;
const USER_AGENT =
  'ACED-IT-PortfolioBot/1.0 (+https://acedit.app; user-requested portfolio review)';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
]);

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)));
}

export function htmlToReadableText(html: string): string {
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  cleaned = cleaned.replace(
    /<(br|hr|p|div|section|article|header|footer|li|h[1-6]|tr)[^>]*>/gi,
    '\n',
  );
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return cleaned.replace(/[ \t]{2,}/g, ' ').trim();
}

function extractMetaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const match = html.match(re);
  return match?.[1]?.trim() ?? null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith('.local')) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

export function normalizePortfolioUrl(raw: string): URL | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (isPrivateHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function assessConfidence(text: string): {
  confidence: PortfolioConfidence;
  blockedReason: string | null;
} {
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;

  const loginWall =
    words < 220 &&
    /\b(sign in|log in|password|members only|access denied|403 forbidden)\b/i.test(
      lower,
    );
  const jsWall =
    words < 180 &&
    /\b(enable javascript|please turn on javascript|javascript is required)\b/i.test(
      lower,
    );
  const captcha =
    words < 200 &&
    /\b(captcha|verify you are human|cloudflare|attention required)\b/i.test(
      lower,
    );

  if (loginWall) {
    return {
      confidence: 'insufficient',
      blockedReason:
        'This page looks password-protected or behind a login wall. We only analyse public portfolio pages.',
    };
  }
  if (jsWall || captcha) {
    return {
      confidence: 'insufficient',
      blockedReason:
        'This site needs a full browser to render. Paste your case study text below instead and you’ll get the same review.',
    };
  }
  if (words < 120) {
    return {
      confidence: 'insufficient',
      blockedReason:
        'Too little readable text on this page. Try your main portfolio URL, a case study page, or paste the copy directly.',
    };
  }
  if (words < 350) {
    return {
      confidence: 'low',
      blockedReason:
        'Only a partial read, so scores are a rough guide. Paste full case study text for a stronger review.',
    };
  }
  if (words < 750) {
    return {confidence: 'medium', blockedReason: null};
  }
  return {confidence: 'high', blockedReason: null};
}

export async function fetchPortfolioPage(
  rawUrl: string,
): Promise<PortfolioExtractResult> {
  const url = normalizePortfolioUrl(rawUrl);
  if (!url) {
    return {
      ok: false,
      url: rawUrl,
      pageTitle: null,
      text: '',
      wordCount: 0,
      confidence: 'insufficient',
      blockedReason: 'Enter a valid public http(s) portfolio URL.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': USER_AGENT,
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return {
        ok: false,
        url: url.toString(),
        pageTitle: null,
        text: '',
        wordCount: 0,
        confidence: 'insufficient',
        blockedReason:
          'This URL did not return a readable web page. Link to an HTML portfolio or paste case study text.',
      };
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) {
      return {
        ok: false,
        url: url.toString(),
        pageTitle: null,
        text: '',
        wordCount: 0,
        confidence: 'insufficient',
        blockedReason: 'Page is too large to analyse reliably. Paste case study text instead.',
      };
    }

    const html = new TextDecoder('utf-8', {fatal: false}).decode(buffer);
    const pageTitle =
      extractTitle(html) ??
      extractMetaContent(html, 'og:title') ??
      extractMetaContent(html, 'twitter:title');
    const metaDesc =
      extractMetaContent(html, 'description') ??
      extractMetaContent(html, 'og:description') ??
      '';

    let text = htmlToReadableText(html);
    if (metaDesc && !text.includes(metaDesc.slice(0, 40))) {
      text = `${metaDesc}\n\n${text}`;
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const {confidence, blockedReason} = assessConfidence(text);

    if (!response.ok && wordCount < 120) {
      return {
        ok: false,
        url: url.toString(),
        pageTitle,
        text,
        wordCount,
        confidence: 'insufficient',
        blockedReason: `Server returned ${response.status}. Check the URL is public, or paste your case study text.`,
      };
    }

    return {
      ok: confidence !== 'insufficient',
      url: url.toString(),
      pageTitle,
      text,
      wordCount,
      confidence,
      blockedReason,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'The site took too long to respond. Try again or paste case study text.'
        : 'Could not reach this URL. Check it is public and try again, or paste case study text.';
    return {
      ok: false,
      url: url.toString(),
      pageTitle: null,
      text: '',
      wordCount: 0,
      confidence: 'insufficient',
      blockedReason: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function assessPastedPortfolioText(text: string): PortfolioExtractResult {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const {confidence, blockedReason} = assessConfidence(trimmed);

  return {
    ok: confidence !== 'insufficient',
    url: 'pasted-text',
    pageTitle: null,
    text: trimmed,
    wordCount,
    confidence,
    blockedReason,
  };
}
