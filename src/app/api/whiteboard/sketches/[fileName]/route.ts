import {NextResponse} from 'next/server';
import {featurePausedPayload, isFeatureEnabled} from '@/lib/feature-flags';
import {requireWhiteboardUser} from '@/lib/whiteboard/auth';
import {getSketchBytes} from '@/lib/whiteboard/sessions';

export const runtime = 'nodejs';

type RouteProps = {
  params: Promise<{fileName: string}>;
};

export async function GET(_request: Request, {params}: RouteProps) {
  if (!isFeatureEnabled('whiteboard')) {
    return NextResponse.json(featurePausedPayload('whiteboard'), {status: 503});
  }
  try {
    const auth = await requireWhiteboardUser();
    if (auth.response) return auth.response;

    const {fileName} = await params;
    if (!/^[a-zA-Z0-9._-]+\.png$/.test(fileName)) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    const bytes = await getSketchBytes(fileName, auth.userId);
    if (!bytes) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[whiteboard/sketches]', error);
    return NextResponse.json(
      {error: 'Could not load sketch', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
