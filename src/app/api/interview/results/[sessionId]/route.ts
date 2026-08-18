import {NextResponse} from 'next/server';
import {requireInterviewUser} from '@/lib/interview/auth';
import {
  getSession,
  getSessionQuestions,
  listAnswersForQuestions,
} from '@/lib/store';

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
      if (feedback) {
        try {
          const parsed = JSON.parse(feedback) as {
            feedback?: string;
            score?: number;
          };
          feedback = parsed.feedback ?? feedback;
          score = parsed.score ?? score;
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
