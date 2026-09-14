import {NextResponse} from 'next/server';
import {requireInterviewUser} from '@/lib/interview/auth';
import {resolveCandidateFirstName} from '@/lib/interview/candidate';
import {interviewPositionLine} from '@/lib/interview/host';
import {
  deleteSession,
  getJobDescription,
  getSeries,
  getSession,
  getSessionQuestions,
} from '@/lib/store';
import {loadPracticeMemory} from '@/lib/interview/practice-memory';
import {
  durationLabelForRound,
  parseInterviewRound,
  pickExecPersona,
  roundTitle,
  voicesForRound,
} from '@/lib/interview/rounds';
import {
  parseDesignProcessStance,
  parseOrgPace,
  resolveInterviewTrack,
} from '@/lib/interview/tracks';

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
    const memory = await loadPracticeMemory(auth.userId, {
      excludeSessionId: session.id,
    });
    const series = session.series_id
      ? await getSeries(session.series_id, auth.userId)
      : null;
    const round = parseInterviewRound(session.stage_number);
    const track = resolveInterviewTrack({
      trackId: series?.target_track_id,
      roleTitle: jd?.role_title,
    });
    const exec = pickExecPersona({
      orgPace: parseOrgPace(series?.org_pace),
      processStance: parseDesignProcessStance(series?.process_stance),
      trackFamily: track?.family,
      jdText: jd?.raw_text,
    });

    return NextResponse.json({
      session,
      questions,
      first_question: questions[0] ?? null,
      briefing: {
        firstName,
        position,
        role_title: jd?.role_title ?? null,
        company_name: jd?.company_name ?? null,
        tailored_to_jd: Boolean(jd?.raw_text?.trim() && !jd.file_name?.startsWith('Target role:')),
        practice_focus: memory?.focus ?? [],
        last_score: memory?.overall ?? null,
        stage_number: round,
        round_title: roundTitle(round),
        duration_label: durationLabelForRound(round),
        voices: voicesForRound(round, exec),
        exec_persona: exec,
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

export async function DELETE(_request: Request, {params}: Params) {
  const auth = await requireInterviewUser();
  if (auth.response) return auth.response;

  try {
    const {sessionId} = await params;
    if (!sessionId?.trim()) {
      return NextResponse.json(
        {error: 'Session not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const deleted = await deleteSession(sessionId, auth.userId);
    if (!deleted) {
      return NextResponse.json(
        {error: 'Session not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('[interview/session DELETE]', error);
    return NextResponse.json(
      {error: 'Could not delete interview', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
