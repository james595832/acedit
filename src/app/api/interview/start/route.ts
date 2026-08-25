import {NextResponse} from 'next/server';
import {generateQuestions} from '@/lib/ai';
import {analyzeCvLocally} from '@/lib/cv-parse';
import {analyzeJobDescriptionText} from '@/lib/criteria';
import {requireInterviewUser} from '@/lib/interview/auth';
import {recommendWhiteboardFromJd} from '@/lib/interview/format';
import {
  getTrack,
  isInterviewTrackId,
  resolveInterviewTrack,
} from '@/lib/interview/tracks';
import {
  createSession,
  getCv,
  getJobDescription,
  saveJobDescription,
} from '@/lib/store';
import type {InterviewType} from '@/lib/types';

export async function POST(request: Request) {
  const auth = await requireInterviewUser();
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as {
      cv_id?: string;
      job_description_id?: string;
      target_track_id?: string;
      interview_type?: InterviewType;
      company?: string;
      role?: string;
    };

    if (!body.cv_id) {
      return NextResponse.json(
        {error: 'cv_id is required', code: 'VALIDATION_ERROR'},
        {status: 400},
      );
    }

    if (!body.job_description_id && !body.target_track_id) {
      return NextResponse.json(
        {
          error:
            'Pick the role you are going for, or add a job description.',
          code: 'VALIDATION_ERROR',
        },
        {status: 400},
      );
    }

    if (
      !body.job_description_id &&
      body.target_track_id &&
      !isInterviewTrackId(body.target_track_id)
    ) {
      return NextResponse.json(
        {error: 'Unknown target role', code: 'VALIDATION_ERROR'},
        {status: 400},
      );
    }

    const cv = await getCv(body.cv_id, auth.userId);
    if (!cv) {
      return NextResponse.json(
        {error: 'CV not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    let jdRow = body.job_description_id
      ? await getJobDescription(body.job_description_id, auth.userId)
      : null;

    if (body.job_description_id && !jdRow) {
      return NextResponse.json(
        {error: 'Job description not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const requestedTrack = body.job_description_id
      ? null
      : getTrack(body.target_track_id);

    if (!jdRow && requestedTrack) {
      const synthetic = analyzeJobDescriptionText(requestedTrack.syntheticJd);
      jdRow = await saveJobDescription(
        {
          source_type: 'text',
          file_name: `Target role: ${requestedTrack.label}`,
          file_url: null,
          raw_text: synthetic.raw_text,
          role_title: synthetic.role_title ?? requestedTrack.label,
          company_name: synthetic.company_name,
          requirements: synthetic.requirements,
          responsibilities: synthetic.responsibilities,
          keywords: synthetic.keywords,
        },
        auth.userId,
      );
    }

    const jd = jdRow ? analyzeJobDescriptionText(jdRow.raw_text) : null;
    const track = resolveInterviewTrack({
      trackId: requestedTrack?.id,
      roleTitle:
        body.role ?? jdRow?.role_title ?? jd?.role_title ?? null,
    });

    const whiteboard = recommendWhiteboardFromJd(jd);

    let questions = await generateQuestions({
      cvText: cv.parsed_text,
      analysis: analyzeCvLocally(cv.parsed_text ?? ''),
      company: body.company ?? jdRow?.company_name ?? undefined,
      role: body.role ?? track?.label ?? jdRow?.role_title ?? undefined,
      trackId: track?.id,
      jd: jd
        ? {
            ...jd,
            role_title: jdRow?.role_title ?? jd.role_title,
            company_name: jdRow?.company_name ?? jd.company_name,
            requirements: jdRow?.requirements?.length
              ? jdRow.requirements
              : jd.requirements,
            keywords: jdRow?.keywords?.length ? jdRow.keywords : jd.keywords,
          }
        : null,
    });

    if (whiteboard.recommended) {
      questions = questions.filter((q) => q.category !== 'whiteboard');
    }

    const {session, questions: stored} = await createSession(
      {
        cv_id: body.cv_id,
        job_description_id: jdRow?.id ?? null,
        interview_type: body.interview_type ?? 'practice',
        questions,
      },
      auth.userId,
    );

    return NextResponse.json({
      session_id: session.id,
      first_question: stored[0]?.question_text ?? null,
      question_id: stored[0]?.id ?? null,
      question_count: stored.length,
      tailored_to_jd: Boolean(body.job_description_id),
      target_track_id: track?.id ?? null,
      whiteboard_recommendation: whiteboard,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Failed to start interview', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
