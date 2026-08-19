import {NextResponse} from 'next/server';
import {requireInterviewUser} from '@/lib/interview/auth';
import {summarizeInterview} from '@/lib/interview/summary';
import {
  getSession,
  getSessionQuestions,
  listAnswersForQuestions,
} from '@/lib/store';
import type {GradeResult} from '@/lib/types';

type Params = {params: Promise<{sessionId: string}>};

export async function GET(_request: Request, {params}: Params) {
  const auth = await requireInterviewUser();
  if (auth.response) return auth.response;

  try {
    const {sessionId} = await params;
    const session = await getSession(sessionId, auth.userId);
    if (!session) {
      return NextResponse.json(
        {error: 'Session not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const questions = await getSessionQuestions(sessionId);
    const answers = await listAnswersForQuestions(
      questions.map((q) => q.id),
      auth.userId,
    );
    const answerByQuestion = new Map(
      answers.map((answer) => [answer.question_id, answer]),
    );

    const questionRows = questions.map((question) => {
      const answer = answerByQuestion.get(question.id);
      let feedback = answer?.feedback ?? null;
      let score = answer?.score ?? null;
      let strengths: string[] = [];
      let improvements: string[] = [];
      if (feedback) {
        try {
          const parsed = JSON.parse(feedback) as Partial<GradeResult>;
          feedback = parsed.feedback ?? feedback;
          score = parsed.score ?? score;
          strengths = parsed.strengths ?? [];
          improvements = parsed.improvements ?? [];
        } catch {
          // keep raw string
        }
      }

      return {
        question_text: question.question_text,
        category: question.question_category,
        score,
        feedback,
        transcription: answer?.transcription ?? null,
        strengths,
        improvements,
      };
    });

    const scored = questionRows.filter((q) => typeof q.score === 'number');
    const overall =
      scored.length > 0
        ? scored.reduce((sum, q) => sum + (q.score as number), 0) /
          scored.length
        : session.overall_score !== null &&
            session.overall_score !== undefined
          ? Number(session.overall_score)
          : null;

    return NextResponse.json({
      session_id: session.id,
      overall_score: overall,
      summary: summarizeInterview({
        overall,
        answers: questionRows.map((row) => ({
          question: row.question_text,
          score: row.score,
          feedback: row.feedback,
          strengths: row.strengths,
          improvements: row.improvements,
        })),
      }),
      questions: questionRows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Failed to load results', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
