import {NextResponse} from 'next/server';
import {generateQuestions} from '@/lib/ai';
import {requireInterviewUser} from '@/lib/interview/auth';
import {getCv} from '@/lib/store';

export async function POST(request: Request) {
  const auth = await requireInterviewUser();
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as {
      cv_id?: string;
      company?: string;
      role?: string;
    };

    if (!body.cv_id) {
      return NextResponse.json(
        {error: 'cv_id is required', code: 'VALIDATION_ERROR'},
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

    const questions = await generateQuestions({
      cvText: cv.parsed_text,
      company: body.company,
      role: body.role,
    });

    return NextResponse.json({questions});
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Question generation failed', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
