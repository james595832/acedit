import {NextResponse} from 'next/server';
import {gradeAnswer} from '@/lib/ai';
import {analyzeCvLocally} from '@/lib/cv-parse';
import type {AnswerCriteria} from '@/lib/criteria';
import {requireInterviewUser} from '@/lib/interview/auth';
import {
  getAnswerForUser,
  getCv,
  getQuestionForUserSession,
  updateAnswerGrade,
} from '@/lib/store';

export async function POST(request: Request) {
  const auth = await requireInterviewUser();
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as {
      answer_id?: string;
      question_id?: string;
    };

    if (!body.answer_id || !body.question_id) {
      return NextResponse.json(
        {
          error: 'answer_id and question_id are required',
          code: 'VALIDATION_ERROR',
        },
        {status: 400},
      );
    }

    const answer = await getAnswerForUser(body.answer_id, auth.userId);
    const owned = await getQuestionForUserSession(
      body.question_id,
      auth.userId,
    );

    if (!answer || !owned) {
      return NextResponse.json(
        {error: 'Answer or question not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const {question, session} = owned;
    if (answer.question_id !== question.id) {
      return NextResponse.json(
        {error: 'Answer does not match question', code: 'VALIDATION_ERROR'},
        {status: 400},
      );
    }

    let criteria: AnswerCriteria | null = null;
    if (question.criteria_json) {
      try {
        criteria = JSON.parse(question.criteria_json) as AnswerCriteria;
      } catch {
        criteria = null;
      }
    }

    const cv = session.cv_id ? await getCv(session.cv_id, auth.userId) : null;
    const cvAnalysis = cv
      ? analyzeCvLocally(cv.parsed_text ?? '')
      : null;

    const grade = await gradeAnswer({
      questionText: question.question_text,
      transcription: answer.transcription ?? '',
      criteria,
      cv: cvAnalysis,
      isPersonal: question.is_personal,
    });

    await updateAnswerGrade(answer.id, grade);

    return NextResponse.json(grade);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Grading failed', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
