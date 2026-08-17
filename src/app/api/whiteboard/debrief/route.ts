import {NextResponse} from 'next/server';
import {featurePausedPayload, isFeatureEnabled} from '@/lib/feature-flags';
import {requireWhiteboardUser} from '@/lib/whiteboard/auth';
import {getWhiteboardChallenge} from '@/lib/whiteboard/challenges';
import {
  debriefWhiteboard,
  type WhiteboardBoard,
} from '@/lib/whiteboard/chat';

export const runtime = 'nodejs';

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

    return NextResponse.json(debrief);
  } catch (error) {
    console.error('[whiteboard/debrief]', error);
    return NextResponse.json(
      {error: 'Debrief failed', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
