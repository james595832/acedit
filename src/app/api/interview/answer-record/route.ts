import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {hasDeepgram} from '@/lib/config';
import {requireInterviewUser} from '@/lib/interview/auth';
import {getSession, getQuestion, saveAnswer} from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireInterviewUser();
  if (auth.response) return auth.response;

  try {
    const form = await request.formData();
    const audio = form.get('audio');
    const questionId = String(form.get('question_id') ?? '');
    const sessionId = String(form.get('session_id') ?? '');
    const browserTranscript = String(form.get('transcription') ?? '').trim();

    if (!(audio instanceof File) || !questionId || !sessionId) {
      return NextResponse.json(
        {
          error: 'audio, question_id, and session_id are required',
          code: 'VALIDATION_ERROR',
        },
        {status: 400},
      );
    }

    const session = await getSession(sessionId, auth.userId);
    if (!session) {
      return NextResponse.json(
        {error: 'Session not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const question = await getQuestion(questionId);
    if (!question || question.session_id !== sessionId) {
      return NextResponse.json(
        {error: 'Question not found in session', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    if (audio.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        {error: 'Audio must be under 30MB', code: 'FILE_TOO_LARGE'},
        {status: 400},
      );
    }

    const bytes = Buffer.from(await audio.arrayBuffer());
    // Hosted deploys cannot write .data/; grading uses the transcript, not the file.
    let audioUrl = `audio://${auth.userId}/${sessionId}/${questionId}`;
    if (!process.env.VERCEL) {
      try {
        const uploadsDir = path.join(process.cwd(), '.data', 'audio');
        await fs.mkdir(uploadsDir, {recursive: true});
        const fileName = `${sessionId}-${questionId}.webm`;
        await fs.writeFile(path.join(uploadsDir, fileName), bytes);
        audioUrl = `/local-audio/${fileName}`;
      } catch (err) {
        console.error('[answer-record] local audio write skipped', err);
      }
    }

    let transcription = browserTranscript;
    let source: 'browser' | 'deepgram' | 'empty' = browserTranscript
      ? 'browser'
      : 'empty';

    if (hasDeepgram() && bytes.length > 0) {
      const response = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
            'Content-Type': audio.type || 'audio/webm',
          },
          body: bytes,
        },
      );
      if (response.ok) {
        const data = (await response.json()) as {
          results?: {
            channels?: Array<{alternatives?: Array<{transcript?: string}>}>;
          };
        };
        const deepgramText =
          data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ??
          '';
        if (deepgramText) {
          transcription = deepgramText;
          source = 'deepgram';
        }
      } else {
        console.error('[answer-record] Deepgram failed', response.status);
      }
    }

    if (!transcription) {
      return NextResponse.json(
        {
          error:
            'No speech detected. Allow microphone access and speak clearly, or use Chrome/Edge for live transcription.',
          code: 'EMPTY_TRANSCRIPT',
        },
        {status: 422},
      );
    }

    const answer = await saveAnswer(
      {
        question_id: questionId,
        audio_url: audioUrl,
        transcription,
        duration_seconds: null,
      },
      auth.userId,
    );

    return NextResponse.json({
      transcription: answer.transcription,
      answer_id: answer.id,
      source,
    });
  } catch (error) {
    console.error('[answer-record]', error);
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : 'Answer recording failed';
    return NextResponse.json(
      {error: detail, code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
