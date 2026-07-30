import {promises as fs} from 'fs';
import {NextResponse} from 'next/server';
import {requireWhiteboardUser} from '@/lib/whiteboard/auth';
import {
  getSketchPath,
  getWhiteboardSession,
} from '@/lib/whiteboard/sessions';

export const runtime = 'nodejs';

type RouteProps = {
  params: Promise<{fileName: string}>;
};

export async function GET(_request: Request, {params}: RouteProps) {
  try {
    const auth = await requireWhiteboardUser();
    if (auth.response) return auth.response;

    const {fileName} = await params;
    if (!/^[a-zA-Z0-9._-]+\.png$/.test(fileName)) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    const sessionId = fileName.replace(/\.png$/i, '');
    const session = await getWhiteboardSession(sessionId, auth.userId);
    if (!session?.hasSketch || !session.sketchUrl) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    const full = await getSketchPath(fileName);
    if (!full) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    const bytes = await fs.readFile(full);
    return new NextResponse(bytes, {
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
