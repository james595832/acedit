import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {saveFeedback} from '@/lib/feedback/store';
import {validateFeedbackInput} from '@/lib/feedback/validate';
import {demoUserId} from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as import('@/lib/feedback/validate').FeedbackInput;

    let userId: string | null = null;
    let sessionEmail: string | null = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const {
          data: {user},
        } = await supabase.auth.getUser();
        userId = user?.id ?? null;
        sessionEmail = user?.email ?? null;
      } catch {
        // fall through — guest feedback with email in body
      }
    } else if (process.env.NODE_ENV !== 'production') {
      userId = demoUserId();
      sessionEmail = sessionEmail ?? 'dev@acedit.local';
    }

    const validated = validateFeedbackInput(body, sessionEmail);
    if (!validated.ok) {
      return NextResponse.json(
        {error: validated.error, code: validated.code},
        {status: validated.code === 'SPAM' ? 400 : 400},
      );
    }

    const saved = await saveFeedback({
      user_id: userId,
      email: validated.data.email,
      category: validated.data.category,
      rating: validated.data.rating,
      message: validated.data.message,
      page_path: validated.data.page_path,
      user_agent: validated.data.user_agent,
    });

    return NextResponse.json({
      ok: true,
      id: saved.id,
      message: 'Thanks — we received your feedback.',
    });
  } catch (error) {
    console.error('[feedback]', error);
    return NextResponse.json(
      {error: 'Could not send feedback', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
