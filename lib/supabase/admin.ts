import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client. This bypasses RLS entirely, so it is used for exactly
 * two things: creating a pre-confirmed user at sign-up (so no confirmation
 * email is sent) and deleting a user's auth record on account deletion.
 *
 * Never import this into a Client Component — `server-only` turns that into a
 * build error rather than a leaked key. Every other query in this app goes
 * through lib/supabase/server.ts (anon key, RLS enforced).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
