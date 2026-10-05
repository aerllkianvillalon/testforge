import { CardPage } from '@/components/card-page';
import { SetPasswordRedirect } from '@/components/set-password-redirect';
import { getSessionUser } from '@/lib/supabase/server';

// Middleware already requires a session to reach this path (the recovery
// link itself creates one); this page just renders the form.
export default async function ResetPasswordPage() {
  const user = await getSessionUser();

  return (
    <CardPage
      email={user?.email ?? null}
      title="Choose a new password"
      description={user?.email ? `For ${user.email}.` : undefined}
    >
      <SetPasswordRedirect submitLabel="Update password" redirectTo="/dashboard" />
    </CardPage>
  );
}
