import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { UserIcon } from '@/components/ui/icons';

export default function RegisterPage() {
  return (
    <>
      <SiteHeader email={null} />
      <main className="flex flex-1">
        <AuthShell
          icon={UserIcon}
          title="Create an account"
          description="Only needed if you want to save sets."
          footer={
            <>
              Already have one?{' '}
              <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
                Sign in
              </Link>
              .
            </>
          }
        >
          <Suspense fallback={null}>
            <AuthForm mode="register" />
          </Suspense>
        </AuthShell>
      </main>
      <SiteFooter />
    </>
  );
}