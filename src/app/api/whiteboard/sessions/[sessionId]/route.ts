import {NextResponse} from 'next/server';
import {featurePausedPayload, isFeatureEnabled} from '@/lib/feature-flags';
import {requireWhiteboardUser} from '@/lib/whiteboard/auth';
import {getWhiteboardSession} from '@/lib/whiteboard/sessions';

export const runtime = 'nodejs';

type RouteProps = {
  params: Promise<{sessionId: string}>;
};

export async function GET(_request: Request, {params}: RouteProps) {
  if (!isFeatureEnabled('whiteboard')) {
    return NextResponse.json(featurePausedPayload('whiteboard'), {status: 503});
  }
  try {
    const auth = await requireWhiteboardUser();
    if (auth.response) return auth.response;

    const {sessionId} = await params;
    if (!sessionId || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      return NextResponse.json(
        {error: 'Session not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }

    const session = await getWhiteboardSession(sessionId, auth.userId);
    if (!session) {
      return NextResponse.json(
        {error: 'Session not found', code: 'NOT_FOUND'},
        {status: 404},
      );
    }
    return NextResponse.json({session});
  } catch (error) {
    console.error('[whiteboard/session GET]', error);
    return NextResponse.json(
      {error: 'Could not load session', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
