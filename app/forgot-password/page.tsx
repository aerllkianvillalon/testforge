import Link from 'next/link';
import { CardPage } from '@/components/card-page';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <CardPage
      email={null}
      title="Reset your password"
      description="Enter the email on your account. This is the only time TestForge sends you an email."
      below={
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </CardPage>
  );
}
