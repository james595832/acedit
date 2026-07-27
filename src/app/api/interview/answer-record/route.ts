import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {hasDeepgram} from '@/lib/config';
import {saveAnswer} from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
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

    if (audio.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        {error: 'Audio must be under 30MB', code: 'FILE_TOO_LARGE'},
        {status: 400},
      );
    }

    const bytes = Buffer.from(await audio.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), '.data', 'audio');
    await fs.mkdir(uploadsDir, {recursive: true});
    const fileName = `${sessionId}-${questionId}.webm`;
    await fs.writeFile(path.join(uploadsDir, fileName), bytes);
    const audioUrl = `/local-audio/${fileName}`;

    let transcription = browserTranscript;
    let source: 'browser' | 'deepgram' | 'empty' = browserTranscript
      ? 'browser'
      : 'empty';

    if (hasDeepgram()) {
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
      if (!response.ok) {
        return NextResponse.json(
          {error: 'Transcription failed', code: 'DEEPGRAM_ERROR'},
          {status: 500},
        );
      }
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
    }

    if (!transcription) {
      return NextResponse.json(
        {
          error:
            'No speech detected. Allow microphone access and speak clearly, or check browser speech recognition support (Chrome/Edge work best).',
          code: 'EMPTY_TRANSCRIPT',
        },
        {status: 422},
      );
    }

    const answer = await saveAnswer({
      question_id: questionId,
      audio_url: audioUrl,
      transcription,
      duration_seconds: null,
    });

    return NextResponse.json({
      transcription: answer.transcription,
      answer_id: answer.id,
      source,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Answer recording failed', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
