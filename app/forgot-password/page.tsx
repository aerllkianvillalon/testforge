import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/forgot-password-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader email={null} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              Enter the email on your account. This is the only time TestForge sends you an email.
            </CardDescription>
          </CardHeader>
          <CardBody className="pt-0">
            <ForgotPasswordForm />
          </CardBody>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
