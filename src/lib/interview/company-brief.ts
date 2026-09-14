import {
  htmlToReadableText,
  normalizePortfolioUrl,
} from '@/lib/portfolio/fetch';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 1_200_000;
const USER_AGENT =
  'ACED-IT-InterviewBot/1.0 (+https://acedit.app; user-requested company brief)';

export type CompanyBrief = {
  url: string;
  summary: string;
  fetched: boolean;
};

export function summariseCompanyHtml(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/\s+/g, ' ')
    .trim();
  const description =
    html.match(
      /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i,
    )?.[1];
  const body = htmlToReadableText(html).slice(0, 1200);
  return [title, description, body].filter(Boolean).join('\n\n').slice(0, 1600);
}

/** Public homepage / careers page only. Fail closed — never block starting. */
export async function fetchCompanyBrief(
  rawUrl: string | null | undefined,
): Promise<CompanyBrief | null> {
  if (!rawUrl?.trim()) return null;
  const url = normalizePortfolioUrl(rawUrl);
  if (!url) return null;

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
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain')
    ) {
      return null;
    }
    const buffer = await response.arrayBuffer();
    const bytes = buffer.byteLength > MAX_HTML_BYTES
      ? buffer.slice(0, MAX_HTML_BYTES)
      : buffer;
    const html = new TextDecoder('utf-8', {fatal: false}).decode(bytes);
    const summary = summariseCompanyHtml(html);
    if (summary.split(/\s+/).length < 12) return null;
    return {url: url.toString(), summary, fetched: true};
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
