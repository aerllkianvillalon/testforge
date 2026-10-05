import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MIN_PASSWORD_LENGTH } from '@/lib/site';
import { checkSignupRateLimit, rateLimitIdentifier } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

/**
 * Creates the account and signs the person in immediately, with no
 * confirmation email — that's the point of this route over calling
 * `supabase.auth.signUp()` straight from the browser, which would leave the
 * account unusable until an email is clicked.
 *
 * `admin.createUser({ email_confirm: true })` marks the address confirmed at
 * creation, so Supabase never queues that email. It's a real capability
 * trade-off: this app takes on the job of that confirmation step (verifying
 * the address is real, throttling account creation) instead of outsourcing it
 * to "click the link we mailed you". The rate limit below is the throttle;
 * there is deliberately no email-ownership check beyond it.
 *
 * Only the forgot-password flow (it calls Supabase's own
 * `resetPasswordForEmail`) sends mail after this.
 */
export async function POST(request: Request) {
  // No session exists yet, so signups are throttled by IP alone.
  const identifier = rateLimitIdentifier(request, null);
  const ip = identifier.startsWith('ip:') ? identifier.slice(3) : identifier;
  const verdict = await checkSignupRateLimit(ip);
  if (!verdict.allowed) {
    const message =
      verdict.scope === 'daily'
        ? 'Too many accounts created from this connection today. Try again tomorrow.'
        : verdict.scope === 'unconfigured'
          ? 'Account creation is temporarily unavailable.'
          : `Too many attempts. Try again in ${verdict.retryAfterSeconds} seconds.`;
    return NextResponse.json(
      { error: message },
      { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Enter a valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('Admin client unavailable for signup:', err);
    return NextResponse.json({ error: 'Account creation is temporarily unavailable.' }, { status: 503 });
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    // Supabase reports a duplicate address in plain text; surfacing it is a
    // deliberate, small trade-off (an enumeration signal) for a clearer signup
    // flow, no different from most sites' "this email is already registered".
    const duplicate =
      createError.code === 'email_exists' ||
      createError.status === 422 ||
      /already.*regist|already.*exist/i.test(createError.message);
    return NextResponse.json(
      {
        error: duplicate
          ? 'An account with that email already exists. Try signing in instead.'
          : "We couldn't create that account. Try again.",
      },
      { status: duplicate ? 409 : 500 },
    );
  }

  // Establish the session on the cookie-bound client so the response carries
  // the same auth cookies a normal signInWithPassword would.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('Post-signup sign-in failed:', signInError);
    return NextResponse.json(
      { error: 'Your account was created. Sign in to continue.', accountCreated: true },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
