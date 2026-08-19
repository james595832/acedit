export type InterviewDebriefSummary = {
  headline: string;
  body: string;
  wins: string[];
  next: string[];
};

export type SummaryAnswer = {
  question: string;
  score: number | null;
  feedback: string | null;
  strengths?: string[];
  improvements?: string[];
};

function uniqueKeep(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!item.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function summarizeInterview(input: {
  overall: number | null;
  answers: SummaryAnswer[];
}): InterviewDebriefSummary | null {
  const scored = input.answers
    .map((answer, index) => ({answer, index}))
    .filter((row) => typeof row.answer.score === 'number');
  if (!scored.length || input.overall === null) return null;

  const overall = Math.round(input.overall);
  const best = scored.reduce((max, cur) =>
    (cur.answer.score as number) > (max.answer.score as number) ? cur : max,
  );
  const worst = scored.reduce((min, cur) =>
    (cur.answer.score as number) < (min.answer.score as number) ? cur : min,
  );

  const wins = uniqueKeep(
    scored.flatMap((row) => row.answer.strengths ?? []),
  ).slice(0, 3);
  const next = uniqueKeep(
    scored.flatMap((row) => row.answer.improvements ?? []),
  ).slice(0, 3);

  const bestLabel = `Q${best.index + 1}`;
  const worstLabel = `Q${worst.index + 1}`;

  if (overall >= 75) {
    return {
      headline: 'You handled this like a real interview',
      body: `Strong across the set (${overall}/100). ${bestLabel} was the one a hiring manager would replay. Keep that shape — specifics, a decision, an outcome.`,
      wins: wins.length ? wins : ['You stayed specific instead of hiding in slogans.'],
      next:
        best !== worst && (worst.answer.score as number) < 70
          ? next.length
            ? next
            : [`Replay ${worstLabel}. That’s the one that would wobble live.`]
          : next.slice(0, 1),
    };
  }

  if (overall >= 55) {
    return {
      headline: 'Solid interview — a few answers would wobble in the room',
      body: `${overall}/100. ${bestLabel} landed. ${worstLabel} is the one to practise out loud until it has a beginning, a decision, and an ending.`,
      wins: wins.length ? wins : [`${bestLabel} showed you can be specific when you settle.`],
      next: next.length
        ? next
        : [`Rebuild ${worstLabel} with one CV example and a clear outcome.`],
    };
  }

  return {
    headline: 'Honest first pass — the room is survivable if you practise',
    body: `${overall}/100. Showing up for ten spoken questions is the hard part. The gap is almost always the same: fewer slogans, one real story, a decision, an outcome.`,
    wins: wins.length ? wins : ['You finished the interview. Most people stall.'],
    next: next.length
      ? next
      : [
          'For each weak answer, name the project, the conflict, and what changed.',
        ],
  };
}
