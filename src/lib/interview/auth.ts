import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {demoUserId} from '@/lib/store';

type AuthOk = {userId: string; response?: never};
type AuthFail = {userId?: never; response: NextResponse};

/** Require signed-in user for interview / CV / JD APIs. */
export async function requireInterviewUser(): Promise<AuthOk | AuthFail> {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      return {
        response: NextResponse.json(
          {error: 'Sign in required', code: 'UNAUTHORIZED'},
          {status: 401},
        ),
      };
    }
    return {userId: demoUserId()};
  }

  try {
    const supabase = await createClient();
    const {
      data: {user},
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return {
        response: NextResponse.json(
          {error: 'Sign in required', code: 'UNAUTHORIZED'},
          {status: 401},
        ),
      };
    }

    return {userId: user.id};
  } catch {
    return {
      response: NextResponse.json(
        {error: 'Sign in required', code: 'UNAUTHORIZED'},
        {status: 401},
      ),
    };
  }
}
