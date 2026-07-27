import {NextResponse} from 'next/server';
import {gradeAnswer} from '@/lib/ai';
import type {AnswerCriteria} from '@/lib/criteria';
import {getAnswer, getQuestion, updateAnswerGrade} from '@/lib/store';

export async function POST(request: Request) {
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

    const answer = await getAnswer(body.answer_id);
    const question = await getQuestion(body.question_id);

    if (!answer || !question) {
      return NextResponse.json(
        {error: 'Answer or question not found', code: 'NOT_FOUND'},
        {status: 404},
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

    const grade = await gradeAnswer({
      questionText: question.question_text,
      transcription: answer.transcription ?? '',
      criteria,
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
