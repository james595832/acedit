import {NextResponse} from 'next/server';
import {requireWhiteboardUser} from '@/lib/whiteboard/auth';
import {getWhiteboardChallenge} from '@/lib/whiteboard/challenges';
import {
  answerClarifyingQuestion,
  type ClarifyingMessage,
} from '@/lib/whiteboard/chat';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const auth = await requireWhiteboardUser();
    if (auth.response) return auth.response;

    const body = (await request.json()) as {
      challengeId?: string;
      messages?: ClarifyingMessage[];
    };

    const challengeId = body.challengeId?.trim();
    const messages = Array.isArray(body.messages) ? body.messages : [];

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

    const cleaned = messages
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
      )
      .map((m) => ({
        role: m.role,
        content: m.content.trim().slice(0, 1200),
      }))
      .slice(-12);

    const userCount = cleaned.filter((m) => m.role === 'user').length;
    if (userCount === 0) {
      return NextResponse.json(
        {error: 'Send a clarifying question first', code: 'VALIDATION_ERROR'},
        {status: 400},
      );
    }

    if (userCount > challenge.maxClarifyingQuestions) {
      return NextResponse.json(
        {
          error: `Clarifying question limit reached (${challenge.maxClarifyingQuestions}).`,
          code: 'LIMIT_REACHED',
          questionsRemaining: 0,
        },
        {status: 400},
      );
    }

    const reply = await answerClarifyingQuestion({
      challenge,
      messages: cleaned,
    });

    return NextResponse.json({
      reply,
      questionsUsed: userCount,
      questionsRemaining: Math.max(
        0,
        challenge.maxClarifyingQuestions - userCount,
      ),
    });
  } catch (error) {
    console.error('[whiteboard/chat]', error);
    return NextResponse.json(
      {error: 'Clarifying chat failed', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
