import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({request});

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase env, leave the app open in local stub mode.
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({name, value}) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({request});
        cookiesToSet.forEach(({name, value, options}) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: {user},
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith('/interview') ||
    path.startsWith('/portfolio') ||
    path.startsWith('/studio') ||
    path.startsWith('/whiteboard') ||
    path.startsWith('/api/whiteboard') ||
    path.startsWith('/api/interview') ||
    path.startsWith('/api/portfolio') ||
    path.startsWith('/api/cv') ||
    path.startsWith('/api/jd') ||
    path.startsWith('/settings');
  const isAuthRoute = path === '/login' || path === '/signup';

  if (!user && isProtected) {
    // APIs get JSON 401; pages redirect to login.
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        {error: 'Sign in required', code: 'UNAUTHORIZED'},
        {status: 401},
      );
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/studio';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
