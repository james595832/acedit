import type {
  GeneratedQuestion,
  InterviewPersona,
  InterviewQuestionKind,
  QuestionCategory,
} from '@/lib/types';
import {buildAnswerCriteria} from '@/lib/criteria';
import type {CvAnalysis} from '@/lib/cv-parse';
import type {JobDescriptionAnalysis} from '@/lib/criteria';
import {
  parseDesignProcessStance,
  parseOrgPace,
  type DesignProcessStance,
  type InterviewTrackFamily,
  type OrgPace,
  type TrackQuestionContext,
} from '@/lib/interview/tracks';
import {
  PERSONA_VOICES,
  parseInterviewPersona,
  parseInterviewRound,
  type ExecPersona,
  type InterviewRound,
} from '@/lib/interview/personas';

export {
  durationLabelForRound,
  INTERVIEW_PERSONAS,
  parseInterviewPersona,
  parseInterviewRound,
  PERSONA_VOICES,
  personaLine,
  roundTitle,
  voicesForRound,
} from '@/lib/interview/personas';
export type {
  ExecPersona,
  InterviewRound,
  PersonaVoice,
} from '@/lib/interview/personas';

export const SERIES_STAGE_COUNT = 3;
export const ROUND_PASS_SCORE = 60;
export const TEAM_QUESTION_COUNT = 6;
export const EXEC_QUESTION_COUNT = 5;

export function questionCountForRound(round: InterviewRound): number {
  if (round === 2) return TEAM_QUESTION_COUNT;
  if (round === 3) return EXEC_QUESTION_COUNT;
  return 10;
}

export function looksStartupJd(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return /\b(startup|seed[- ]stage|series [abc]|early[- ]stage|pre[- ]seed|scrappy|move fast|founder[- ]led)\b/i.test(
    text,
  );
}

export function looksEnterpriseJd(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return /\b(enterprise|fortune 500|regulated|compliance|governance|procurement|large organisation|large organization|global bank|incumbent)\b/i.test(
    text,
  );
}

export function pickExecPersona(input: {
  orgPace?: OrgPace | null;
  processStance?: DesignProcessStance | null;
  trackFamily?: InterviewTrackFamily | null;
  jdText?: string | null;
}): ExecPersona {
  const jd = input.jdText ?? '';
  if (looksEnterpriseJd(jd)) return 'cio';
  if (looksStartupJd(jd)) return 'ceo';

  const pace = parseOrgPace(input.orgPace);
  const process = parseDesignProcessStance(input.processStance);
  const family = input.trackFamily ?? null;

  if (family === 'intern_visual' && pace === 'established') return 'cio';
  if (family === 'intern_visual' && looksEnterpriseJd(jd)) return 'cio';
  if (pace === 'startup') return 'ceo';
  if (process === 'prototype_first') return 'ceo';
  if (family === 'product' || family === 'ai_product') return 'ceo';
  return 'cio';
}

export type RoundAttempt = {
  overall: number | null;
  gradedCount: number;
  questionCount: number;
};

export function mostAnswersGraded(attempt: RoundAttempt): boolean {
  if (attempt.questionCount <= 0) return false;
  return attempt.gradedCount * 2 > attempt.questionCount;
}

export function isRoundPassed(attempt: RoundAttempt): boolean {
  if (attempt.overall === null || Number.isNaN(attempt.overall)) return false;
  if (!mostAnswersGraded(attempt)) return false;
  return attempt.overall >= ROUND_PASS_SCORE;
}

export function canStartStage(input: {
  requestedStage: number;
  prior: RoundAttempt | null;
}): {ok: true} | {ok: false; status: 403; code: string; error: string} {
  const stage = parseInterviewRound(input.requestedStage);
  if (stage === 1) return {ok: true};
  if (!input.prior) {
    return {
      ok: false,
      status: 403,
      code: 'ROUND_LOCKED',
      error:
        'The previous round is still locked. Finish that interview and score 60 or more to continue.',
    };
  }
  if (!mostAnswersGraded(input.prior)) {
    return {
      ok: false,
      status: 403,
      code: 'ROUND_LOCKED',
      error:
        'The previous round needs most answers graded before the next round unlocks.',
    };
  }
  if (!isRoundPassed(input.prior)) {
    return {
      ok: false,
      status: 403,
      code: 'ROUND_LOCKED',
      error:
        'Score 60 or more on the last attempt of this round to unlock the next one. Retake this round.',
    };
  }
  return {ok: true};
}

export function nextUnlockedStage(input: {
  currentStage: InterviewRound;
  attempt: RoundAttempt;
}): InterviewRound | null {
  if (!isRoundPassed(input.attempt)) return null;
  if (input.currentStage === 1) return 2;
  if (input.currentStage === 2) return 3;
  return null;
}

export function nextRoundCta(next: InterviewRound | null): {
  label: string;
  hint: string;
} | null {
  if (next === 2) {
    return {
      label: 'Meet the team',
      hint: 'Engineering, product, and senior design — six sharper questions.',
    };
  }
  if (next === 3) {
    return {
      label: 'Meet the exec',
      hint: 'A shorter, pricklier conversation. One decision. One risk.',
    };
  }
  return null;
}

export type SeriesHistoryInput = {
  id: string;
  series_id: string | null;
  stage_number: number;
  overall_score: number | null;
  created_at: string;
  role_title?: string | null;
  company_name?: string | null;
};

export type SeriesHistoryTile = {
  id: string;
  series_id: string | null;
  stage_number: number;
  series_progress: string;
  next_stage: number | null;
  next_label: string;
  overall_score: number | null;
  created_at: string;
  role_title: string | null;
  company_name: string | null;
};

function latestBy<T>(rows: T[], stamp: (row: T) => string): T | null {
  if (!rows.length) return null;
  return rows.reduce((best, row) =>
    new Date(stamp(row)).getTime() > new Date(stamp(best)).getTime()
      ? row
      : best,
  );
}

function highestPassedStage(sessions: SeriesHistoryInput[]): number {
  let passed = 0;
  for (const stage of [1, 2, 3] as const) {
    const latest = latestBy(
      sessions.filter((row) => row.stage_number === stage),
      (row) => row.created_at,
    );
    if (!latest) break;
    if (
      latest.overall_score === null ||
      latest.overall_score < ROUND_PASS_SCORE
    ) {
      break;
    }
    passed = stage;
  }
  return passed;
}

export function buildSeriesHistoryTiles(
  sessions: SeriesHistoryInput[],
): SeriesHistoryTile[] {
  const groups = new Map<string, SeriesHistoryInput[]>();
  const leftovers: SeriesHistoryInput[] = [];

  for (const session of sessions) {
    if (session.series_id) {
      const list = groups.get(session.series_id) ?? [];
      list.push(session);
      groups.set(session.series_id, list);
    } else {
      leftovers.push(session);
    }
  }

  const tiles: SeriesHistoryTile[] = [];

  for (const [seriesId, rows] of groups) {
    const latest = latestBy(rows, (row) => row.created_at);
    if (!latest) continue;
    const passed = highestPassedStage(rows);
    const onStage = parseInterviewRound(
      passed < 3 ? Math.max(passed + 1, 1) : 3,
    );
    const latestOnStage = latestBy(
      rows.filter((row) => row.stage_number === onStage),
      (row) => row.created_at,
    );
    const latestPassed =
      latestOnStage?.overall_score !== null &&
      latestOnStage?.overall_score !== undefined &&
      latestOnStage.overall_score >= ROUND_PASS_SCORE;
    let next_stage: number | null = null;
    let next_label = 'Retake this round';
    if (passed >= 3) {
      next_stage = null;
      next_label = 'Read answers';
    } else if (latestOnStage && !latestPassed) {
      next_stage = onStage;
      next_label = 'Retake this round';
    } else if (passed >= 2) {
      next_stage = 3;
      next_label = 'Meet the exec';
    } else if (passed >= 1) {
      next_stage = 2;
      next_label = 'Meet the team';
    } else {
      next_stage = onStage;
      next_label = 'Retake this round';
    }

    tiles.push({
      id: latest.id,
      series_id: seriesId,
      stage_number: onStage,
      series_progress: `${Math.min(Math.max(passed, latest.stage_number), 3)} of ${SERIES_STAGE_COUNT}`,
      next_stage,
      next_label,
      overall_score: latest.overall_score,
      created_at: latest.created_at,
      role_title: latest.role_title ?? null,
      company_name: latest.company_name ?? null,
    });
  }

  for (const session of leftovers) {
    const stage = parseInterviewRound(session.stage_number);
    const passedAlone =
      session.overall_score !== null &&
      session.overall_score >= ROUND_PASS_SCORE;
    tiles.push({
      id: session.id,
      series_id: null,
      stage_number: stage,
      series_progress: `${stage} of ${SERIES_STAGE_COUNT}`,
      next_stage: passedAlone && stage < 3 ? stage + 1 : stage,
      next_label:
        passedAlone && stage === 1
          ? 'Meet the team'
          : passedAlone && stage === 2
            ? 'Meet the exec'
            : 'Retake this round',
      overall_score: session.overall_score,
      created_at: session.created_at,
      role_title: session.role_title ?? null,
      company_name: session.company_name ?? null,
    });
  }

  return tiles.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

type RoundDraft = {
  text: string;
  category: QuestionCategory;
  is_personal: boolean;
  kind: InterviewQuestionKind;
  persona: InterviewPersona;
};

function toGenerated(
  drafts: RoundDraft[],
  analysis: CvAnalysis,
  jd: JobDescriptionAnalysis | null,
): GeneratedQuestion[] {
  return drafts.map((draft) => {
    const criteria = buildAnswerCriteria({
      questionText: draft.text,
      category: draft.category,
      isPersonal: draft.is_personal,
      cv: analysis,
      jd,
      kind: draft.kind,
    });
    return {
      text: draft.text,
      category: draft.category,
      is_personal: draft.is_personal,
      persona: draft.persona,
      criteria: {...criteria, persona: draft.persona},
    };
  });
}

export function draftTeamRoundQuestions(
  ctx: TrackQuestionContext,
  analysis: CvAnalysis,
  jd: JobDescriptionAnalysis | null,
): GeneratedQuestion[] {
  const project = truncate(ctx.project, 42);
  const company = ctx.company;
  const role = ctx.role;
  const drafts: RoundDraft[] = [
    {
      persona: 'engineer',
      kind: 'team_ship',
      category: 'interaction',
      is_personal: true,
      text: `Priya, engineering: On “${project}”, what was actually hard to build — and what did you change once engineering said the last mile wouldn’t ship as designed?`,
    },
    {
      persona: 'pm',
      kind: 'team_scope',
      category: 'communication',
      is_personal: true,
      text: `Marcus, product: If we had to ship ${role} work for ${company} with half the time, what would you cut first, and what would you refuse to drop?`,
    },
    {
      persona: 'senior_designer',
      kind: 'team_taste',
      category: 'visual_design',
      is_personal: true,
      text: `Elena, senior design: Walk me through something you would reject from “${project}” or a peer — not a preference, a craft bar. What failed?`,
    },
    {
      persona: 'engineer',
      kind: 'team_ship',
      category: 'ux_process',
      is_personal: true,
      text: `Priya, engineering: How do you hand off so an engineer can finish without you sitting on the PR — states, empty/error, and what you left unspecified?`,
    },
    {
      persona: 'pm',
      kind: 'team_scope',
      category: 'design_thinking',
      is_personal: true,
      text: `Marcus, product: Tell me about a tradeoff you made on “${project}” where the user wanted one thing and the timeline wanted another. What shipped?`,
    },
    {
      persona: 'senior_designer',
      kind: 'team_taste',
      category: 'visual_design',
      is_personal: true,
      text: `Elena, senior design: Where is your taste stricter than the brief for ${role} at ${company}? Give one example you’d still fight for.`,
    },
  ];
  return toGenerated(drafts, analysis, jd);
}

export function draftExecRoundQuestions(
  persona: ExecPersona,
  ctx: TrackQuestionContext,
  analysis: CvAnalysis,
  jd: JobDescriptionAnalysis | null,
): GeneratedQuestion[] {
  const company = ctx.company;
  const role = ctx.role;
  const project = truncate(ctx.project, 42);
  const voice = PERSONA_VOICES[persona];

  const ceo: RoundDraft[] = [
    {
      persona,
      kind: 'exec_outcome',
      category: 'communication',
      is_personal: true,
      text: `${voice.name}, CEO: Why us, why now — not why design. What changes if you join ${company} this quarter?`,
    },
    {
      persona,
      kind: 'exec_outcome',
      category: 'design_thinking',
      is_personal: true,
      text: `${voice.name}, CEO: Name one outcome you would own in ${role} in the first 90 days. Not a process. A result.`,
    },
    {
      persona,
      kind: 'exec_outcome',
      category: 'communication',
      is_personal: true,
      text: `${voice.name}, CEO: I will interrupt waffle. On “${project}”, what did you decide, what did you drop, and what moved? Keep it short.`,
    },
    {
      persona,
      kind: 'exec_outcome',
      category: 'design_thinking',
      is_personal: true,
      text: `${voice.name}, CEO: What’s the biggest risk if we hire you — and how would I see it before it hits the product?`,
    },
    {
      persona,
      kind: 'exec_outcome',
      category: 'communication',
      is_personal: true,
      text: `${voice.name}, CEO: When would you tell me I’m wrong about a product call? Give a real example, not a speech.`,
    },
  ];

  const cio: RoundDraft[] = [
    {
      persona,
      kind: 'exec_outcome',
      category: 'communication',
      is_personal: true,
      text: `${voice.name}, CIO: How do you work with engineering at this scale — not a startup pairing, a real system. Who owns what?`,
    },
    {
      persona,
      kind: 'exec_outcome',
      category: 'ux_process',
      is_personal: true,
      text: `${voice.name}, CIO: Where does design create operational risk at ${company}, and how have you reduced it before?`,
    },
    {
      persona,
      kind: 'exec_outcome',
      category: 'design_thinking',
      is_personal: true,
      text: `${voice.name}, CIO: We have process for a reason. Tell me about a time you followed it — and a time you were right to bend it.`,
    },
    {
      persona,
      kind: 'exec_outcome',
      category: 'communication',
      is_personal: true,
      text: `${voice.name}, CIO: One decision you would make in ${role} in the first quarter. One risk you would flag. No TED talk.`,
    },
    {
      persona,
      kind: 'exec_outcome',
      category: 'communication',
      is_personal: true,
      text: `${voice.name}, CIO: A launch on “${project}” or similar missed. What did you change in the system afterwards — not the slide?`,
    },
  ];

  return toGenerated(persona === 'ceo' ? ceo : cio, analysis, jd);
}

export function llmRoundGuidance(
  round: InterviewRound,
  exec: ExecPersona,
): string {
  if (round === 2) {
    return `This is ROUND 2 — a team panel, not another hiring-manager screen.
Write exactly ${TEAM_QUESTION_COUNT} spoken questions. Do NOT ask “tell me about yourself”, why this company, strengths/weaknesses, conflict, or five-year plans.
Two questions from an engineer (feasibility, handoff, last-mile, can this ship).
Two from a PM (scope, what you would cut, tradeoffs, shipping).
Two from a senior designer (taste, craft bar, what you would reject).
Prefix each question with the speaker (“Priya, engineering: …”, “Marcus, product: …”, “Elena, senior design: …”).
Return persona as engineer | pm | senior_designer on every question. Pressure without insults.`;
  }
  if (round === 3 && exec === 'ceo') {
    return `This is ROUND 3 — a prickly CEO. Write exactly ${EXEC_QUESTION_COUNT} short questions.
Voice: skeptical founder. Interrupt waffle. Why us, why now, can they own an outcome, one decision, one risk.
Do not ask intro, Figma hygiene, or process theatre. Prefix with “Alex, CEO:”.
Return persona "ceo" on every question. Not insulting — just impatient.`;
  }
  if (round === 3) {
    return `This is ROUND 3 — a prickly CIO. Write exactly ${EXEC_QUESTION_COUNT} short questions.
Voice: systems, risk, engineering at scale, governance. One decision, one risk, no TED talk.
Do not ask intro or portfolio-file questions. Prefix with “Jordan, CIO:”.
Return persona "cio" on every question. Not insulting — just skeptical.`;
  }
  return '';
}

export function attachPersonas(
  questions: GeneratedQuestion[],
  round: InterviewRound,
  exec: ExecPersona,
): GeneratedQuestion[] {
  if (round === 1) {
    return questions.map((question) => ({
      ...question,
      persona: question.persona ?? 'hirer',
      criteria: question.criteria
        ? {...question.criteria, persona: question.persona ?? 'hirer'}
        : question.criteria,
    }));
  }

  const fallback =
    round === 2
      ? (['engineer', 'pm', 'senior_designer', 'engineer', 'pm', 'senior_designer'] as InterviewPersona[])
      : Array.from({length: EXEC_QUESTION_COUNT}, () => exec as InterviewPersona);

  return questions.map((question, index) => {
    const persona =
      parseInterviewPersona(question.persona) ??
      parseInterviewPersona(question.criteria?.persona) ??
      fallback[index] ??
      fallback[0];
    return {
      ...question,
      persona,
      criteria: question.criteria
        ? {...question.criteria, persona}
        : question.criteria,
    };
  });
}
