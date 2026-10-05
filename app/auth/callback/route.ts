import { NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/safe-redirect';
import { createClient } from '@/lib/supabase/server';

/**
 * Compatibility path only. Password reset emails no longer point here — the
 * Recovery template in the Supabase dashboard now links straight to
 * /reset-password/confirm#token_hash=...&type=recovery, which keeps the
 * token out of any URL a server (or an email scanner) ever sees and only
 * spends it on an explicit button click. See components/confirm-reset-form.tsx.
 *
 * This route still handles any reset email sent before that change, whose
 * link points here with a PKCE `code`. `?error=link_invalid` below is read
 * by the login page (see components/auth-form.tsx) so a failure here isn't
 * silent.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalid`);
}
