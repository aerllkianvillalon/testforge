import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { LockIcon } from '@/components/ui/icons';

export default function LoginPage() {
  return (
    <>
      <SiteHeader email={null} />
      <main className="flex flex-1">
        <AuthShell
          icon={LockIcon}
          title="Sign in"
          description="To save sets and come back to them."
          footer={
            <>
              No account?{' '}
              <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
                Create one
              </Link>
              .
            </>
          }
        >
          <Suspense fallback={null}>
            <AuthForm mode="login" />
          </Suspense>
        </AuthShell>
      </main>
      <SiteFooter />
    </>
  );
}