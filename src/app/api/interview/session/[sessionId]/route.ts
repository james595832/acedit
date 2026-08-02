import {NextResponse} from 'next/server';
import {requireInterviewUser} from '@/lib/interview/auth';
import {getSession, getSessionQuestions} from '@/lib/store';

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
    return NextResponse.json({
      session,
      questions,
      first_question: questions[0] ?? null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Failed to load session', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
