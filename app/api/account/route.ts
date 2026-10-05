import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Deletes the signed-in person's own account — never anyone else's, since the
 * id being deleted always comes from the caller's own session, not from the
 * request body.
 *
 * `study_sets.user_id` references `auth.users on delete cascade` (see
 * supabase/schema.sql), so removing the auth user removes every saved set
 * with it. Nothing here has to touch that table directly.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('Admin client unavailable for account deletion:', err);
    return NextResponse.json({ error: "We couldn't delete your account right now. Try again shortly." }, { status: 503 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Account deletion failed:', error);
    return NextResponse.json({ error: "We couldn't delete your account. Try again." }, { status: 500 });
  }

  // The access token can otherwise outlive the user it names until it expires.
  // Clearing it here on the same response removes the cookies immediately.
  await supabase.auth.signOut();

  return new NextResponse(null, { status: 204 });
}
