import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { buttonVariants } from '@/components/ui/button';
import { ArrowRightIcon, FileTextIcon } from '@/components/ui/icons';
import { getSessionUser } from '@/lib/supabase/server';

export default async function NotFound() {
  const user = await getSessionUser();

  return (
    <>
      <SiteHeader email={user?.email ?? null} />
      <main className="flex flex-1 items-center justify-center px-5 py-20">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="grid size-14 place-items-center rounded-full bg-secondary">
            <FileTextIcon className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-6 text-sm font-medium text-muted-foreground">404</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page doesn't exist</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The link may be broken, or the page may have moved. Head back and generate a set from your notes.
          </p>
          <Link href="/" className={buttonVariants('primary', 'md', 'mt-8')}>
            Back to TestForge
            <ArrowRightIcon />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
