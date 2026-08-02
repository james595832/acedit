import type {JobDescriptionAnalysis} from '@/lib/criteria';
import type {PortfolioConfidence, PortfolioJdFit} from '@/lib/portfolio/types';

const DOMAIN_SIGNALS: Array<{id: string; pattern: RegExp; label: string}> = [
  {id: 'b2b', pattern: /\b(b2b|saas|enterprise|dashboard|admin|workflow)\b/i, label: 'B2B / SaaS'},
  {id: 'b2c', pattern: /\b(b2c|consumer|mobile app|marketplace|social|e-?commerce)\b/i, label: 'B2C / consumer'},
  {id: 'fintech', pattern: /\b(fintech|bank|payment|wallet|trading|insurance)\b/i, label: 'Fintech'},
  {id: 'health', pattern: /\b(health|medical|clinical|patient|wellness)\b/i, label: 'Health'},
  {id: 'systems', pattern: /\b(design system|component library|tokens|scale)\b/i, label: 'Design systems'},
  {id: 'research', pattern: /\b(research|usability|discovery|interview|insight)\b/i, label: 'Research-led'},
];

function tokenHit(haystack: string, needle: string): boolean {
  const tokens = needle
    .toLowerCase()
    .split(/[^a-z0-9+/]+/)
    .filter((t) => t.length > 3)
    .slice(0, 5);
  if (tokens.length === 0) return false;
  const hits = tokens.filter((t) => haystack.includes(t)).length;
  return hits >= Math.min(2, tokens.length);
}

export function auditPortfolioJdFit(input: {
  portfolioText: string;
  jd: JobDescriptionAnalysis;
  portfolioConfidence: PortfolioConfidence;
}): PortfolioJdFit {
  if (
    input.portfolioConfidence === 'insufficient' ||
    input.portfolioConfidence === 'low'
  ) {
    return {
      canAssess: false,
      matchScore: null,
      aligned: [],
      gaps: [],
      summary:
        'Role fit needs a fuller portfolio read. Paste complete case study text or use a richer URL first.',
    };
  }

  const haystack = [
    input.portfolioText,
    input.jd.raw_text,
    input.jd.role_title ?? '',
    ...input.jd.requirements,
    ...input.jd.keywords,
  ]
    .join('\n')
    .toLowerCase();

  const portfolioLower = input.portfolioText.toLowerCase();

  const jdKeywords = [
    ...input.jd.keywords,
    ...input.jd.requirements.flatMap((r) =>
      r.split(/[^a-z0-9+/]+/i).filter((t) => t.length > 4),
    ),
  ]
    .map((k) => k.trim())
    .filter(Boolean);

  const uniqueKeywords = [...new Set(jdKeywords)].slice(0, 24);
  const aligned = uniqueKeywords.filter((k) =>
    tokenHit(portfolioLower, k),
  ).slice(0, 8);

  const gaps = uniqueKeywords
    .filter((k) => !tokenHit(portfolioLower, k))
    .slice(0, 6);

  const jdDomains = DOMAIN_SIGNALS.filter(({pattern}) => pattern.test(haystack));
  const portfolioDomains = DOMAIN_SIGNALS.filter(({pattern}) =>
    pattern.test(portfolioLower),
  );

  const domainOverlap = jdDomains.filter((jd) =>
    portfolioDomains.some((p) => p.id === jd.id),
  ).map((d) => d.label);

  let matchScore = 50;
  if (uniqueKeywords.length > 0) {
    matchScore = Math.round((aligned.length / Math.min(8, uniqueKeywords.length)) * 70);
  }
  matchScore += domainOverlap.length * 8;
  matchScore += Math.min(12, aligned.length * 2);
  matchScore = Math.max(15, Math.min(92, matchScore));

  const role = input.jd.role_title ?? 'this role';
  const canAssess = aligned.length > 0 || domainOverlap.length > 0;

  if (!canAssess) {
    return {
      canAssess: false,
      matchScore: null,
      aligned: [],
      gaps: gaps.slice(0, 4),
      summary: `Your portfolio copy does not yet show clear overlap with ${role}. Add a case study that mirrors the JD’s domain or methods before applying.`,
    };
  }

  const summaryParts = [
    domainOverlap.length
      ? `Domain overlap: ${domainOverlap.join(', ')}.`
      : null,
    aligned.length
      ? `Evidence for JD themes: ${aligned.slice(0, 4).join(', ')}.`
      : null,
    gaps.length
      ? `Still weak on: ${gaps.slice(0, 3).join(', ')} — address in a case study or cover letter.`
      : null,
  ].filter(Boolean);

  return {
    canAssess: true,
    matchScore,
    aligned: [...new Set([...domainOverlap, ...aligned])].slice(0, 10),
    gaps,
    summary: summaryParts.join(' ') ||
      `Moderate fit for ${role} — strengthen project evidence before applying.`,
  };
}
