import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChangePasswordForm } from '@/components/profile/change-password-form';
import { DeleteAccountSection } from '@/components/profile/delete-account-section';
import { SignOutButton } from '@/components/sign-out-button';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects unauthenticated visitors away from /profile;
  // this is the second check, kept in step with the dashboard page's own.
  if (!user) redirect('/login?next=/profile');

  return (
    <>
      <SiteHeader email={user.email ?? null} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:py-14">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to dashboard
          </Link>
          <SignOutButton />
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>

        <div className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email</CardTitle>
            </CardHeader>
            <CardBody className="pt-0 text-sm">{user.email}</CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change password</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <ChangePasswordForm />
            </CardBody>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Delete account</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <DeleteAccountSection itemNoun="flashcard and quiz set" />
            </CardBody>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              See what we store and why
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
