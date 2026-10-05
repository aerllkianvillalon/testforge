import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalidates the token with Supabase. getSession() only decodes
  // the cookie, so it can't be trusted for an access decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // /reset-password needs the short-lived session a recovery link creates,
  // so it is gated the same way as the account pages, not treated as a public
  // auth page like /login and /register. /reset-password/confirm is the
  // exception: it's the step that *creates* that session (by verifying the
  // token from the email link), so it has to be reachable without one.
  const isResetConfirm = path === '/reset-password/confirm';
  const requiresSession =
    path.startsWith('/dashboard') || path.startsWith('/profile') || (path.startsWith('/reset-password') && !isResetConfirm);

  if (!user && requiresSession) {
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith('/reset-password') ? '/forgot-password' : '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && (path === '/login' || path === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
