import {NextResponse} from 'next/server';
import {getSession, getSessionQuestions} from '@/lib/store';
import {promises as fs} from 'fs';
import path from 'path';
import type {UserAnswer} from '@/lib/types';

type Params = {params: Promise<{sessionId: string}>};

export async function GET(_request: Request, {params}: Params) {
  try {
    const {sessionId} = await params;
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        {error: 'Session not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const questions = await getSessionQuestions(sessionId);
    const answers = await readAnswers();

    const questionRows = questions.map((question) => {
      const answer = answers.find((a) => a.question_id === question.id);
      let feedback = answer?.feedback ?? null;
      let score = answer?.score ?? null;
      if (feedback) {
        try {
          const parsed = JSON.parse(feedback) as {feedback?: string; score?: number};
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
        ? scored.reduce((sum, q) => sum + (q.score as number), 0) / scored.length
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

async function readAnswers(): Promise<UserAnswer[]> {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), '.data', 'answers.json'),
      'utf8',
    );
    return JSON.parse(raw) as UserAnswer[];
  } catch {
    return [];
  }
}
