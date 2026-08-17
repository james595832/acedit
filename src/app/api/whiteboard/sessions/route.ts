import {NextResponse} from 'next/server';
import {featurePausedPayload, isFeatureEnabled} from '@/lib/feature-flags';
import {requireWhiteboardUser} from '@/lib/whiteboard/auth';
import {getWhiteboardChallenge} from '@/lib/whiteboard/challenges';
import {
  debriefWhiteboard,
  type WhiteboardBoard,
} from '@/lib/whiteboard/chat';
import {
  listWhiteboardSessions,
  saveWhiteboardSession,
} from '@/lib/whiteboard/sessions';

export const runtime = 'nodejs';

export async function GET() {
  if (!isFeatureEnabled('whiteboard')) {
    return NextResponse.json(featurePausedPayload('whiteboard'), {status: 503});
  }
  try {
    const auth = await requireWhiteboardUser();
    if (auth.response) return auth.response;

    const sessions = await listWhiteboardSessions(auth.userId);
    return NextResponse.json({sessions});
  } catch (error) {
    console.error('[whiteboard/sessions GET]', error);
    return NextResponse.json(
      {error: 'Could not load sessions', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}

export async function POST(request: Request) {
  if (!isFeatureEnabled('whiteboard')) {
    return NextResponse.json(featurePausedPayload('whiteboard'), {status: 503});
  }
  try {
    const auth = await requireWhiteboardUser();
    if (auth.response) return auth.response;

    const body = (await request.json()) as {
      challengeId?: string;
      board?: Partial<WhiteboardBoard>;
      clarifyingUsed?: number;
      sketchDataUrl?: string | null;
      hasSketch?: boolean;
      secondsRemaining?: number;
    };

    const challengeId = body.challengeId?.trim();
    if (!challengeId) {
      return NextResponse.json(
        {error: 'challengeId is required', code: 'VALIDATION_ERROR'},
        {status: 400},
      );
    }

    const challenge = getWhiteboardChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json(
        {error: 'Challenge not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    // Cap sketch payload size early (~6MB base64)
    if (
      typeof body.sketchDataUrl === 'string' &&
      body.sketchDataUrl.length > 8_000_000
    ) {
      return NextResponse.json(
        {error: 'Sketch is too large', code: 'PAYLOAD_TOO_LARGE'},
        {status: 413},
      );
    }

    const board: WhiteboardBoard = {
      framing: String(body.board?.framing ?? '').slice(0, 4000),
      users: String(body.board?.users ?? '').slice(0, 4000),
      flows: String(body.board?.flows ?? '').slice(0, 4000),
      solution: String(body.board?.solution ?? '').slice(0, 4000),
      tradeoffs: String(body.board?.tradeoffs ?? '').slice(0, 4000),
    };

    const clarifyingUsed = Math.max(
      0,
      Math.min(
        challenge.maxClarifyingQuestions,
        Number(body.clarifyingUsed) || 0,
      ),
    );

    const debrief = await debriefWhiteboard({
      challenge,
      board,
      clarifyingUsed,
      sketchDataUrl: body.sketchDataUrl ?? null,
      hasSketch: Boolean(body.hasSketch || body.sketchDataUrl),
    });

    const session = await saveWhiteboardSession({
      userId: auth.userId,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      board,
      clarifyingUsed,
      debrief,
      sketchDataUrl: body.sketchDataUrl ?? null,
      hasSketch: Boolean(body.hasSketch),
      secondsRemaining: Math.max(0, Number(body.secondsRemaining) || 0),
      durationMinutes: challenge.durationMinutes,
    });

    return NextResponse.json({debrief, session});
  } catch (error) {
    console.error('[whiteboard/sessions POST]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Could not save session',
        code: 'SERVER_ERROR',
      },
      {status: 500},
    );
  }
}
