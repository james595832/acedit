import {NextResponse} from 'next/server';
import {generateQuestions} from '@/lib/ai';
import {analyzeCvLocally} from '@/lib/cv-parse';
import {analyzeJobDescriptionText} from '@/lib/criteria';
import {requireInterviewUser} from '@/lib/interview/auth';
import {recommendWhiteboardFromJd} from '@/lib/interview/format';
import {
  getTrack,
  isInterviewTrackId,
  parseDesignProcessStance,
  parseOrgPace,
  resolveInterviewTrack,
} from '@/lib/interview/tracks';
import {fetchCompanyBrief} from '@/lib/interview/company-brief';
import {companyNameFromUrl} from '@/lib/interview/company-from-url';
import {findCvJdGaps} from '@/lib/interview/cv-jd-gap';
import {loadPracticeMemory} from '@/lib/interview/practice-memory';
import {
  canStartStage,
  looksStartupJd,
  parseInterviewRound,
} from '@/lib/interview/rounds';
import {
  createSeries,
  createSession,
  getCv,
  getJobDescription,
  getLatestStageAttempt,
  getSeries,
  getSession,
  saveCv,
  saveJobDescription,
  scoreSessionAttempt,
  updateJobDescription,
  updateSeries,
  updateSessionFields,
} from '@/lib/store';
import type {InterviewSeries, InterviewType} from '@/lib/types';

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
      company_url?: string;
      role?: string;
      process_stance?: string;
      org_pace?: string;
      series_id?: string;
      from_session_id?: string;
      stage_number?: number;
    };

    const requestedStage = parseInterviewRound(body.stage_number);
    let series: InterviewSeries | null = body.series_id
      ? await getSeries(body.series_id, auth.userId)
      : null;

    if (body.series_id && !series) {
      return NextResponse.json(
        {error: 'Interview series not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    // Retake / next round: always resume CV + JD from the prior session.
    let priorSession = body.from_session_id
      ? await getSession(body.from_session_id, auth.userId)
      : null;
    if (body.from_session_id && !priorSession) {
      return NextResponse.json(
        {error: 'Session not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    if (priorSession && !series && priorSession.series_id) {
      series = await getSeries(priorSession.series_id, auth.userId);
    }

    if (priorSession && !series) {
      try {
        series = await createSeries(
          {
            cv_id: priorSession.cv_id,
            job_description_id: priorSession.job_description_id,
            current_stage: priorSession.stage_number,
          },
          auth.userId,
        );
        await updateSessionFields(priorSession.id, auth.userId, {
          series_id: series.id,
        });
      } catch (error) {
        // Migration may be missing — still retake from the prior session’s CV/JD.
        console.error('[interview/start] series from prior', error);
      }
    }

    if (requestedStage > 1) {
      let priorAttempt: {
        overall: number | null;
        gradedCount: number;
        questionCount: number;
      } | null = null;

      if (series) {
        const latest = await getLatestStageAttempt(
          series.id,
          requestedStage - 1,
          auth.userId,
        );
        priorAttempt = latest
          ? {
              overall: latest.overall,
              gradedCount: latest.gradedCount,
              questionCount: latest.questionCount,
            }
          : null;
      } else if (
        priorSession &&
        priorSession.stage_number === requestedStage - 1
      ) {
        priorAttempt = await scoreSessionAttempt(
          priorSession.id,
          auth.userId,
        );
      }

      if (!series && !priorAttempt) {
        return NextResponse.json(
          {
            error: 'Start from the hiring screen before later rounds.',
            code: 'VALIDATION_ERROR',
          },
          {status: 400},
        );
      }

      const gate = canStartStage({
        requestedStage,
        prior: priorAttempt,
      });
      if (!gate.ok) {
        return NextResponse.json(
          {error: gate.error, code: gate.code},
          {status: gate.status},
        );
      }
    }

    const resumeCvId =
      body.cv_id ?? series?.cv_id ?? priorSession?.cv_id ?? null;
    const resumeJdId =
      body.job_description_id ??
      series?.job_description_id ??
      priorSession?.job_description_id ??
      null;

    if (!series && !resumeJdId && !body.target_track_id && !priorSession) {
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
      !series &&
      !resumeJdId &&
      body.target_track_id &&
      !isInterviewTrackId(body.target_track_id)
    ) {
      return NextResponse.json(
        {error: 'Unknown target role', code: 'VALIDATION_ERROR'},
        {status: 400},
      );
    }

    if (
      !series &&
      !resumeCvId &&
      !body.target_track_id &&
      !priorSession
    ) {
      return NextResponse.json(
        {
          error: 'Upload a CV, or choose a role to simulate without one.',
          code: 'VALIDATION_ERROR',
        },
        {status: 400},
      );
    }

    let cv = resumeCvId
      ? await getCv(resumeCvId, auth.userId)
      : null;
    if (resumeCvId && !cv) {
      return NextResponse.json(
        {error: 'CV not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const resumeTrackId =
      body.target_track_id ?? series?.target_track_id ?? undefined;

    // Role-only path: synthesise a light CV so practice still runs.
    if (!cv && resumeTrackId) {
      const track = getTrack(resumeTrackId);
      if (!track) {
        return NextResponse.json(
          {error: 'Unknown target role', code: 'VALIDATION_ERROR'},
          {status: 400},
        );
      }
      cv = await saveCv(
        {
          file_name: `Role practice: ${track.label}`,
          file_url: 'role-practice://synthetic',
          parsed_text: `Candidate preparing for ${track.label} interviews.\n\nFocus areas from the target role:\n${track.syntheticJd}`,
          skills_extracted: [],
          experience_years: 0,
        },
        auth.userId,
      );
    }

    if (!cv) {
      return NextResponse.json(
        {error: 'CV is required', code: 'VALIDATION_ERROR'},
        {status: 400},
      );
    }

    let jdRow = resumeJdId
      ? await getJobDescription(resumeJdId, auth.userId)
      : null;

    if (resumeJdId && !jdRow) {
      return NextResponse.json(
        {error: 'Job description not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const requestedTrack = resumeJdId ? null : getTrack(resumeTrackId);

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

    const companyFromLink = companyNameFromUrl(
      body.company_url ?? series?.company_url,
    );
    if (
      jdRow &&
      !jdRow.company_name &&
      (body.company || companyFromLink)
    ) {
      const company_name = body.company ?? companyFromLink ?? null;
      const saved = await updateJobDescription(jdRow.id, auth.userId, {
        company_name,
      });
      jdRow = saved ?? {...jdRow, company_name};
    }

    const jd = jdRow ? analyzeJobDescriptionText(jdRow.raw_text) : null;
    const track = resolveInterviewTrack({
      trackId: requestedTrack?.id ?? series?.target_track_id,
      roleTitle:
        body.role ?? jdRow?.role_title ?? jd?.role_title ?? null,
    });

    if (jdRow && !jdRow.role_title && (jd?.role_title || track?.label)) {
      const role_title = jd?.role_title ?? track?.label ?? null;
      const saved = await updateJobDescription(jdRow.id, auth.userId, {
        role_title,
      });
      jdRow = saved ?? {...jdRow, role_title};
    }

    const processStance = parseDesignProcessStance(
      body.process_stance ?? series?.process_stance,
    );
    const orgPace = parseOrgPace(
      body.org_pace ??
        series?.org_pace ??
        (looksStartupJd(jdRow?.raw_text) ? 'startup' : undefined),
    );
    const companyUrl = body.company_url ?? series?.company_url ?? null;

    const whiteboard = recommendWhiteboardFromJd(jd);
    const practiceMemory = await loadPracticeMemory(auth.userId);
    const cvAnalysis = analyzeCvLocally(cv.parsed_text ?? '');
    const companyBrief = resumeJdId
      ? await fetchCompanyBrief(companyUrl)
      : null;
    const skillGaps = jd
      ? findCvJdGaps({
          cvText: cv.parsed_text,
          skills: cvAnalysis.skills_extracted,
          requirements: jdRow?.requirements?.length
            ? jdRow.requirements
            : jd.requirements,
          keywords: jdRow?.keywords?.length ? jdRow.keywords : jd.keywords,
        })
      : [];

    let questions = await generateQuestions({
      cvText: cv.parsed_text,
      analysis: cvAnalysis,
      company:
        body.company ??
        companyFromLink ??
        jdRow?.company_name ??
        undefined,
      role: body.role ?? track?.label ?? jdRow?.role_title ?? undefined,
      trackId: track?.id,
      processStance,
      orgPace,
      practiceMemory,
      round: requestedStage,
      jd: jd
        ? {
            ...jd,
            role_title: jdRow?.role_title ?? jd.role_title,
            company_name: jdRow?.company_name ?? jd.company_name,
            requirements: jdRow?.requirements?.length
              ? jdRow.requirements
              : jd.requirements,
            keywords: jdRow?.keywords?.length ? jdRow.keywords : jd.keywords,
            company_brief: companyBrief?.summary ?? null,
            skill_gaps: skillGaps,
          }
        : null,
    });

    if (whiteboard.recommended && requestedStage === 1) {
      questions = questions.filter((q) => q.category !== 'whiteboard');
    }

    if (!questions.length) {
      return NextResponse.json(
        {
          error:
            'Could not build interview questions. Go back and try again.',
          code: 'SERVER_ERROR',
        },
        {status: 500},
      );
    }

    if (!series) {
      try {
        series = await createSeries(
          {
            cv_id: cv.id,
            job_description_id: jdRow?.id ?? null,
            process_stance: processStance,
            org_pace: orgPace,
            company_url: companyUrl,
            target_track_id: track?.id ?? null,
            current_stage: 1,
          },
          auth.userId,
        );
      } catch (error) {
        console.error('[interview/start] series', error);
      }
    } else {
      await updateSeries(series.id, auth.userId, {
        current_stage: requestedStage,
        cv_id: cv.id,
        job_description_id: jdRow?.id ?? series.job_description_id,
        process_stance: processStance,
        org_pace: orgPace,
        company_url: companyUrl ?? series.company_url,
        target_track_id: track?.id ?? series.target_track_id,
      });
    }

    const {session, questions: stored} = await createSession(
      {
        cv_id: cv.id,
        job_description_id: jdRow?.id ?? null,
        series_id: series?.id ?? null,
        stage_number: requestedStage,
        interview_type: body.interview_type ?? 'practice',
        questions,
      },
      auth.userId,
    );

    return NextResponse.json({
      session_id: session.id,
      series_id: series?.id ?? null,
      stage_number: requestedStage,
      first_question: stored[0]?.question_text ?? null,
      question_id: stored[0]?.id ?? null,
      question_count: stored.length,
      tailored_to_jd: Boolean(resumeJdId),
      target_track_id: track?.id ?? null,
      whiteboard_recommendation: requestedStage === 1 ? whiteboard : null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Failed to start interview', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
