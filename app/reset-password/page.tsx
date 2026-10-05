import { SetPasswordRedirect } from '@/components/set-password-redirect';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSessionUser } from '@/lib/supabase/server';

// Middleware already requires a session to reach this path (the recovery
// link itself creates one); this page just renders the form.
export default async function ResetPasswordPage() {
  const user = await getSessionUser();

  return (
    <>
      <SiteHeader email={user?.email ?? null} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Choose a new password</CardTitle>
            <CardDescription>{user?.email ? `For ${user.email}.` : undefined}</CardDescription>
          </CardHeader>
          <CardBody className="pt-0">
            <SetPasswordRedirect submitLabel="Update password" redirectTo="/dashboard" />
          </CardBody>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
