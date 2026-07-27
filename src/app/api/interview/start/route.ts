import {NextResponse} from 'next/server';
import {generateQuestions} from '@/lib/ai';
import {analyzeCvLocally} from '@/lib/cv-parse';
import {analyzeJobDescriptionText} from '@/lib/criteria';
import {createSession, getCv, getJobDescription} from '@/lib/store';
import type {InterviewType} from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      cv_id?: string;
      job_description_id?: string;
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

    const cv = await getCv(body.cv_id);
    if (!cv) {
      return NextResponse.json(
        {error: 'CV not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const jdRow = body.job_description_id
      ? await getJobDescription(body.job_description_id)
      : null;

    const jd = jdRow
      ? analyzeJobDescriptionText(jdRow.raw_text)
      : null;

    const questions = await generateQuestions({
      cvText: cv.parsed_text,
      analysis: analyzeCvLocally(cv.parsed_text ?? ''),
      company: body.company ?? jdRow?.company_name ?? undefined,
      role: body.role ?? jdRow?.role_title ?? undefined,
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

    const {session, questions: stored} = await createSession({
      cv_id: body.cv_id,
      job_description_id: body.job_description_id ?? null,
      interview_type: body.interview_type ?? 'practice',
      questions,
    });

    return NextResponse.json({
      session_id: session.id,
      first_question: stored[0]?.question_text ?? null,
      question_id: stored[0]?.id ?? null,
      question_count: stored.length,
      tailored_to_jd: Boolean(jdRow),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Failed to start interview', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
