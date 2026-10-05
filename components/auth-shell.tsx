import type { ReactNode } from 'react';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthShell({
  icon: Icon,
  title,
  description,
  children,
  footer,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-12">
      <div className="bg-dots pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-md">
        <Card>
          <CardHeader className="items-center text-center">
            <span className="grid size-11 shrink-0 place-items-center text-foreground">
              <Icon className="size-5" />
            </span>
            <CardTitle className="mt-3 text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardBody className="pt-0">{children}</CardBody>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}