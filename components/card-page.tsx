import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** A single centred card between the site header and footer: the shape of the password-reset pages. */
export function CardPage({
  email,
  title,
  description,
  children,
  below,
}: {
  email: string | null;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Rendered under the card, e.g. a "Back to sign in" link. */
  below?: ReactNode;
}) {
  return (
    <>
      <SiteHeader email={email} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardBody className="pt-0">{children}</CardBody>
        </Card>
        {below}
      </main>
      <SiteFooter />
    </>
  );
}
