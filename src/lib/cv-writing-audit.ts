/**
 * Writing authenticity heuristics — NOT forensic AI detection.
 * Flags generic, template-like, or over-polished copy that often reads as AI-assisted.
 */

import {CHEAP_ANTHROPIC_MODEL, useStubs} from '@/lib/config';

export type WritingFlagSeverity = 'warning' | 'info' | 'pass';

export type WritingFlag = {
  id: string;
  severity: WritingFlagSeverity;
  title: string;
  detail: string;
  fix: string;
};

export type WritingAuditResult = {
  /** How human-specific the CV reads (higher = better). Not an AI detector. */
  authenticityScore: number;
  polishRisk: 'low' | 'medium' | 'high';
  summary: string;
  flags: WritingFlag[];
  stats: {
    buzzwordHits: number;
    aiPhraseHits: number;
    metricMentions: number;
    properNounHints: number;
  };
  /** Present only when Anthropic is configured — advisory LLM pass */
  llmNote: string | null;
};

const AI_TYPICAL_PHRASES = [
  'passionate about',
  'proven track record',
  'results-driven',
  'dynamic professional',
  'synerg',
  'leverage',
  'utilize',
  'delve',
  'fast-paced environment',
  'cutting-edge',
  'holistic approach',
  'spearhead',
  'orchestrat',
  'in today\'s',
  'robust solution',
  'seamless experience',
  'thought leader',
  'go-to person',
  'wear many hats',
  'detail-oriented professional',
  'team player with',
  'excited to bring',
  'unique blend of',
  'well-versed in',
  'committed to delivering',
];

const GENERIC_BUZZWORDS = [
  'innovative',
  'strategic',
  'collaborative',
  'impactful',
  'stakeholder',
  'cross-functional',
  'user-centric',
  'data-driven',
  'best-in-class',
  'world-class',
  'highly motivated',
  'excellent communication',
];

const METRIC_PATTERN =
  /\b\d+(?:\.\d+)?%|\b\d[\d,]*\+?\s*(?:users|customers|people|designers|teams|markets|countries|points|pp|bps)\b|\b(?:increased|reduced|improved|grew|cut|saved|raised)\s+(?:by\s+)?\d+/gi;

const PROPER_NOUN_HINT =
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g;

function wFlag(
  id: string,
  severity: WritingFlagSeverity,
  title: string,
  detail: string,
  fix: string,
): WritingFlag {
  return {id, severity, title, detail, fix};
}

function countMatches(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  return phrases.filter((p) => lower.includes(p)).length;
}

function bulletStarterDominance(text: string): string | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[-•*]/.test(l) || /^[A-Z]/.test(l));
  const starters = new Map<string, number>();
  for (const line of lines) {
    const cleaned = line.replace(/^[-•*]\s*/, '');
    const word = cleaned.split(/\s+/)[0]?.toLowerCase();
    if (!word || word.length < 3) continue;
    starters.set(word, (starters.get(word) ?? 0) + 1);
  }
  if (starters.size === 0) return null;
  const top = [...starters.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top[1] >= 4 && top[1] / lines.length > 0.35) {
    return top[0];
  }
  return null;
}

export function auditCvWritingHeuristic(text: string): WritingAuditResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  const aiPhraseHits = countMatches(trimmed, AI_TYPICAL_PHRASES);
  const buzzwordHits = countMatches(trimmed, GENERIC_BUZZWORDS);
  const metricMentions = (trimmed.match(METRIC_PATTERN) ?? []).length;
  const properNounHints = new Set(
    (trimmed.match(PROPER_NOUN_HINT) ?? [])
      .filter((w) => w.length > 2 && !/^(The|And|For|With|From|Your|Our)$/i.test(w))
      .map((w) => w.toLowerCase()),
  ).size;

  const flags: WritingFlag[] = [];

  if (wordCount < 80) {
    return {
      authenticityScore: 50,
      polishRisk: 'medium',
      summary:
        'Not enough text to assess writing style — fix ATS extraction first.',
      flags: [],
      stats: {buzzwordHits, aiPhraseHits, metricMentions, properNounHints},
      llmNote: null,
    };
  }

  if (aiPhraseHits >= 3) {
    flags.push(
      wFlag(
        'ai-phrases',
        'warning',
        'Reads like generic AI-polished copy',
        `Found ${aiPhraseHits} common AI/template phrases (e.g. “results-driven”, “leveraged”, “fast-paced”). Recruiters notice this pattern.`,
        'Rewrite in your voice: name the product, metric, and decision — drop filler adjectives.',
      ),
    );
  } else if (aiPhraseHits >= 1) {
    flags.push(
      wFlag(
        'ai-phrases-light',
        'info',
        'Some template-style phrasing',
        `${aiPhraseHits} phrase(s) match common AI/CV-template wording.`,
        'Swap vague lines for one concrete outcome from a real project.',
      ),
    );
  }

  if (buzzwordHits >= 5) {
    flags.push(
      wFlag(
        'buzzword-heavy',
        'warning',
        'Heavy buzzword density',
        `${buzzwordHits} generic buzzwords with little evidence — reads like padding.`,
        'Replace adjectives with outcomes: what shipped, for whom, and what changed.',
      ),
    );
  }

  if (metricMentions === 0 && wordCount > 120) {
    flags.push(
      wFlag(
        'no-metrics',
        'warning',
        'No quantified outcomes',
        'Long CV with no numbers, percentages, or scale — a hallmark of vague or AI-generated bullets.',
        'Add 2–3 real metrics (conversion, time saved, users researched, NPS, etc.).',
      ),
    );
  } else if (metricMentions >= 2) {
    flags.push(
      wFlag(
        'metrics-ok',
        'pass',
        'Quantified outcomes present',
        `${metricMentions} metric-style mentions help this read as lived experience.`,
        'Keep metrics tied to named projects where possible.',
      ),
    );
  }

  if (properNounHints < 4 && wordCount > 150) {
    flags.push(
      wFlag(
        'few-specifics',
        'info',
        'Few specific names or products',
        'Little mention of companies, products, or tools by name — copy may feel interchangeable.',
        'Name the app, client type, or platform you actually worked on.',
      ),
    );
  }

  const dominantStarter = bulletStarterDominance(trimmed);
  if (dominantStarter) {
    flags.push(
      wFlag(
        'repetitive-starters',
        'info',
        'Repetitive bullet pattern',
        `Many lines start with “${dominantStarter}…” — uniform structure can read auto-generated.`,
        'Vary how bullets open; lead with outcome, constraint, or user insight.',
      ),
    );
  }

  if (/\b(as an ai|language model|chatgpt|generated by)\b/i.test(lower)) {
    flags.push(
      wFlag(
        'ai-disclosure',
        'warning',
        'AI disclosure text detected',
        'The CV text mentions AI generation — remove before sending to employers.',
        'Edit out any meta AI wording; keep only your professional history.',
      ),
    );
  }

  if (
    aiPhraseHits === 0 &&
    buzzwordHits <= 2 &&
    metricMentions >= 1 &&
    flags.filter((f) => f.severity !== 'pass').length === 0
  ) {
    flags.push(
      wFlag(
        'human-voice',
        'pass',
        'Specific, evidence-led tone',
        'Bullets lean concrete rather than template-heavy.',
        'You’re in good shape — keep names, metrics, and tradeoffs visible.',
      ),
    );
  }

  let score = 100;
  score -= aiPhraseHits * 8;
  score -= Math.max(0, buzzwordHits - 2) * 5;
  if (metricMentions === 0 && wordCount > 120) score -= 18;
  if (properNounHints < 4 && wordCount > 150) score -= 8;
  if (dominantStarter) score -= 6;
  score = Math.max(0, Math.min(100, score));

  const polishRisk: WritingAuditResult['polishRisk'] =
    score >= 72 ? 'low' : score >= 48 ? 'medium' : 'high';

  const summary =
    polishRisk === 'low'
      ? 'Reads specific and human — low risk of sounding AI-templated.'
      : polishRisk === 'medium'
        ? 'Some generic phrasing — worth tightening before you apply widely.'
        : 'High template/AI-polish signals — recruiters may read this as copy-paste.';

  flags.sort((a, b) => {
    const order = {warning: 0, info: 1, pass: 2};
    return order[a.severity] - order[b.severity];
  });

  return {
    authenticityScore: score,
    polishRisk,
    summary,
    flags,
    stats: {buzzwordHits, aiPhraseHits, metricMentions, properNounHints},
    llmNote: null,
  };
}

export async function enrichWritingAuditWithLlm(
  text: string,
  base: WritingAuditResult,
): Promise<WritingAuditResult> {
  if (useStubs() || text.trim().length < 80) return base;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CHEAP_ANTHROPIC_MODEL,
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `You review design CV writing. This is NOT forensic AI detection — assess whether copy reads generic/template-like vs specific and evidenced.

CV excerpt:
${text.slice(0, 3500)}

Return ONLY JSON:
{"genericScore":0-100,"note":"one sentence for the candidate","phrasesToRewrite":["max 3 short examples"]}

genericScore: 100 = very generic/AI-template-like, 0 = highly specific human voice.`,
          },
        ],
      }),
    });

    if (!response.ok) return base;

    const data = (await response.json()) as {
      content: Array<{type: string; text?: string}>;
    };
    const raw = data.content.find((c) => c.type === 'text')?.text ?? '{}';
    const parsed = JSON.parse(raw) as {
      genericScore?: number;
      note?: string;
      phrasesToRewrite?: string[];
    };

    const genericScore = Math.max(
      0,
      Math.min(100, Number(parsed.genericScore) || 0),
    );
    let score = Math.round(base.authenticityScore * 0.65 + (100 - genericScore) * 0.35);
    score = Math.max(0, Math.min(100, score));

    const flags = [...base.flags];
    if (genericScore >= 65 && !flags.some((f) => f.id === 'llm-generic')) {
      flags.unshift(
        wFlag(
          'llm-generic',
          'warning',
          'Advisory: generic/template tone',
          parsed.note ??
            'Language model assessment: copy may read as templated rather than personal.',
          'Rewrite flagged lines with project names, constraints, and outcomes you can defend in interview.',
        ),
      );
    }
    if (parsed.phrasesToRewrite?.length) {
      for (const phrase of parsed.phrasesToRewrite.slice(0, 2)) {
        flags.push(
          wFlag(
            `rewrite-${phrase.slice(0, 12)}`,
            'info',
            'Consider rewriting',
            `“${phrase}”`,
            'Make this line interview-defensible with a real example.',
          ),
        );
      }
    }

    const polishRisk: WritingAuditResult['polishRisk'] =
      score >= 72 ? 'low' : score >= 48 ? 'medium' : 'high';

    return {
      ...base,
      authenticityScore: score,
      polishRisk,
      flags,
      llmNote: parsed.note ?? null,
    };
  } catch {
    return base;
  }
}

export async function auditCvWriting(text: string): Promise<WritingAuditResult> {
  const base = auditCvWritingHeuristic(text);
  return enrichWritingAuditWithLlm(text, base);
}
