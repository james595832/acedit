import {NextResponse} from 'next/server';
import {requireInterviewUser} from '@/lib/interview/auth';
import {resolveCandidateFirstName} from '@/lib/interview/candidate';
import {interviewPositionLine} from '@/lib/interview/host';
import {getJobDescription, getSession, getSessionQuestions} from '@/lib/store';

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
    const jd = session.job_description_id
      ? await getJobDescription(session.job_description_id, auth.userId)
      : null;
    const firstName = await resolveCandidateFirstName();
    const position = interviewPositionLine({
      roleTitle: jd?.role_title,
      companyName: jd?.company_name,
    });

    return NextResponse.json({
      session,
      questions,
      first_question: questions[0] ?? null,
      briefing: {
        firstName,
        position,
        tailored_to_jd: Boolean(jd),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Failed to load session', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
