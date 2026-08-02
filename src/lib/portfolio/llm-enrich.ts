import {CHEAP_ANTHROPIC_MODEL, useStubs} from '@/lib/config';
import type {PortfolioAuditResult} from '@/lib/portfolio/types';
import type {JobDescriptionAnalysis} from '@/lib/criteria';

export async function enrichPortfolioAuditWithLlm(input: {
  text: string;
  pageTitle: string | null;
  base: PortfolioAuditResult;
  jd?: JobDescriptionAnalysis | null;
}): Promise<PortfolioAuditResult> {
  if (useStubs() || !input.base.canScore || input.text.trim().length < 400) {
    return input.base;
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const jdContext = input.jd
      ? `Target role: ${input.jd.role_title ?? 'unknown'} at ${input.jd.company_name ?? 'unknown'}.
JD requirements: ${input.jd.requirements.slice(0, 6).join(' | ')}`
      : 'No target job description provided.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CHEAP_ANTHROPIC_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are a senior design hiring manager reviewing a candidate portfolio (text extract only — no images).

Be honest and specific. Do NOT flatter. If evidence is thin, say so.
This is advisory feedback for interview prep, not a hiring decision.

${jdContext}

Portfolio title: ${input.pageTitle ?? 'unknown'}
Portfolio text:
${input.text.slice(0, 6000)}

Return ONLY JSON:
{
  "hireReadyScore": 0-100,
  "note": "2 sentences max — what would you think in a 30-second recruiter scan?",
  "topFix": "single highest-impact improvement before applying",
  "roleFitNote": "one sentence on JD fit or null if no JD"
}

hireReadyScore: how ready this portfolio is to send TODAY (not potential).`,
          },
        ],
      }),
    });

    if (!response.ok) return input.base;

    const data = (await response.json()) as {
      content: Array<{type: string; text?: string}>;
    };
    const raw = data.content.find((c) => c.type === 'text')?.text ?? '{}';
    const parsed = JSON.parse(raw) as {
      hireReadyScore?: number;
      note?: string;
      topFix?: string;
      roleFitNote?: string;
    };

    const llmScore = Math.max(
      0,
      Math.min(100, Number(parsed.hireReadyScore) || 0),
    );
    const blendedScore = Math.round(
      (input.base.score ?? llmScore) * 0.55 + llmScore * 0.45,
    );

    const flags = [...input.base.flags];
    if (parsed.topFix && !flags.some((f) => f.id === 'llm-top-fix')) {
      flags.unshift({
        id: 'llm-top-fix',
        severity: 'info',
        title: 'Highest-impact fix',
        detail: parsed.topFix,
        fix: parsed.topFix,
      });
    }

    const noteParts = [parsed.note].filter(Boolean);
    if (parsed.roleFitNote) noteParts.push(parsed.roleFitNote);

    return {
      ...input.base,
      score: blendedScore,
      readiness:
        blendedScore >= 82
          ? 'strong'
          : blendedScore >= 68
            ? 'good'
            : blendedScore >= 48
              ? 'fair'
              : 'poor',
      flags,
      llmNote: noteParts.join(' ') || null,
    };
  } catch {
    return input.base;
  }
}

export async function auditPortfolioFull(input: {
  text: string;
  pageTitle: string | null;
  confidence: PortfolioAuditResult['confidence'];
  jd?: JobDescriptionAnalysis | null;
}): Promise<PortfolioAuditResult> {
  const {auditPortfolioHeuristic} = await import('@/lib/portfolio/audit');
  const base = auditPortfolioHeuristic({
    text: input.text,
    pageTitle: input.pageTitle,
    confidence: input.confidence,
  });
  return enrichPortfolioAuditWithLlm({
    text: input.text,
    pageTitle: input.pageTitle,
    base,
    jd: input.jd ?? null,
  });
}
