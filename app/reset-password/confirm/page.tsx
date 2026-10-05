import { ConfirmResetForm } from '@/components/confirm-reset-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Deliberately public (see middleware.ts) — the person doesn't have a
// session yet at this point. ConfirmResetForm creates one, client-side, only
// once they click through.
export default function ConfirmResetPage() {
  return (
    <>
      <SiteHeader email={null} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Confirm password reset</CardTitle>
            <CardDescription>One more click to make sure it's really you.</CardDescription>
          </CardHeader>
          <CardBody className="pt-0">
            <ConfirmResetForm />
          </CardBody>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
