import {inferQuestionKind} from '@/lib/criteria';
import {
  getSessionQuestions,
  listAnswersForQuestions,
  listSessions,
} from '@/lib/store';
import type {
  GeneratedQuestion,
  GradeResult,
  InterviewQuestionKind,
  QuestionCategory,
} from '@/lib/types';

const WEAK_SCORE = 65;
const MAX_FOCUS = 4;
const MAX_PRIOR_SESSIONS = 3;

export type PracticeMemory = {
  fromSessionId: string;
  overall: number;
  sessionCount: number;
  focus: string[];
  weakCategories: QuestionCategory[];
  weakKinds: InterviewQuestionKind[];
};

export type PracticeMemoryInputAnswer = {
  score: number | null;
  feedback: string | null;
  questionText: string;
  category: QuestionCategory;
};

function uniqueKeep(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

export function parseStoredGrade(
  feedback: string | null,
): Partial<GradeResult> | null {
  if (!feedback?.trim()) return null;
  try {
    return JSON.parse(feedback) as Partial<GradeResult>;
  } catch {
    return null;
  }
}

export function buildPracticeMemory(
  sessions: Array<{
    sessionId: string;
    answers: PracticeMemoryInputAnswer[];
  }>,
): PracticeMemory | null {
  const usable = sessions
    .map((session) => {
      const scored = session.answers.filter(
        (answer) => typeof answer.score === 'number',
      );
      if (!scored.length) return null;
      const overall =
        scored.reduce((sum, answer) => sum + (answer.score as number), 0) /
        scored.length;
      return {...session, scored, overall};
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (!usable.length) return null;

  const latest = usable[0];
  const weak = usable.flatMap((session) =>
    session.scored.filter((answer) => (answer.score as number) < WEAK_SCORE),
  );

  const focus = uniqueKeep(
    weak.flatMap((answer) => {
      const grade = parseStoredGrade(answer.feedback);
      if (grade?.improvements?.length) return grade.improvements.map(String);
      if (grade?.feedback) return [grade.feedback];
      if (answer.feedback && !answer.feedback.startsWith('{')) {
        return [answer.feedback];
      }
      return [];
    }),
  ).slice(0, MAX_FOCUS);

  const weakCategories = uniqueKeep(
    weak.map((answer) => answer.category),
  ) as QuestionCategory[];

  const weakKinds = uniqueKeep(
    weak.map((answer) => inferQuestionKind(answer.questionText)),
  ) as InterviewQuestionKind[];

  if (!focus.length && latest.overall >= WEAK_SCORE) return null;

  return {
    fromSessionId: latest.sessionId,
    overall: Math.round(latest.overall),
    sessionCount: usable.length,
    focus,
    weakCategories,
    weakKinds,
  };
}

/** Nudge the first matching weak question so stub interviews still reuse coaching. */
export function applyPracticeMemoryToQuestions(
  questions: GeneratedQuestion[],
  memory: PracticeMemory | null,
): GeneratedQuestion[] {
  if (!memory?.focus[0] || !memory.weakKinds[0]) return questions;
  const kind = memory.weakKinds[0];
  const focus = memory.focus[0].replace(/\.$/, '');
  let used = false;
  return questions.map((question) => {
    if (used) return question;
    if (inferQuestionKind(question.text) !== kind) return question;
    used = true;
    return {
      ...question,
      text: `${question.text} Last time this kind of answer needed work — ${focus}. Go deeper than last time.`,
    };
  });
}

export function llmPracticeMemoryGuidance(
  memory: PracticeMemory | null,
): string {
  if (!memory) return '';
  const gaps = memory.focus.length
    ? memory.focus.map((item) => `- ${item}`).join('\n')
    : '- Answers were thin: fewer slogans, one real story, a decision, an outcome.';
  return `
Previous practice for this person (latest interview ${memory.overall}/100 across ${memory.sessionCount} scored session${memory.sessionCount === 1 ? '' : 's'}).
Probe these gaps again with NEW questions. Do not copy the old wording.
${gaps}
Lean craft questions toward: ${memory.weakCategories.join(', ') || 'the weaker answers'}.`;
}

export function practiceMemoryBannerText(memory: PracticeMemory): {
  title: string;
  description: string;
} {
  const gaps = memory.focus.slice(0, 2).join(' ');
  return {
    title: 'Carrying last interview forward',
    description: gaps
      ? `Last interview scored ${memory.overall}/100. Practise: ${gaps}`
      : `Last interview scored ${memory.overall}/100. This round will press the weaker answers.`,
  };
}

/** Load coaching from the last scored interviews for this user. */
export async function loadPracticeMemory(
  userId: string,
  options?: {excludeSessionId?: string},
): Promise<PracticeMemory | null> {
  const sessions = (await listSessions(userId))
    .filter((session) => session.id !== options?.excludeSessionId)
    .slice(0, 8);

  const packed = (
    await Promise.all(
      sessions.slice(0, MAX_PRIOR_SESSIONS).map(async (session) => {
        const questions = await getSessionQuestions(session.id);
        if (!questions.length) return null;
        const answers = await listAnswersForQuestions(
          questions.map((question) => question.id),
          userId,
        );
        const byQuestion = new Map(
          answers.map((answer) => [answer.question_id, answer]),
        );
        const rows: PracticeMemoryInputAnswer[] = questions.map((question) => {
          const answer = byQuestion.get(question.id);
          const grade = parseStoredGrade(answer?.feedback ?? null);
          return {
            score: grade?.score ?? answer?.score ?? null,
            feedback: answer?.feedback ?? null,
            questionText: question.question_text,
            category: question.question_category,
          };
        });
        if (!rows.some((row) => typeof row.score === 'number')) return null;
        return {sessionId: session.id, answers: rows};
      }),
    )
  ).filter((row): row is NonNullable<typeof row> => Boolean(row));

  return buildPracticeMemory(packed);
}
