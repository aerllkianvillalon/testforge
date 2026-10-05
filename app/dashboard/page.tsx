import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SetList } from '@/components/dashboard/set-list';
import { StudyActivity } from '@/components/dashboard/study-activity';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { buttonVariants } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { SparklesIcon } from '@/components/ui/icons';
import { createClient } from '@/lib/supabase/server';
import type { StudySetRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects unauthenticated users; this is the second
  // check, so a middleware matcher change can't quietly expose the page.
  if (!user) redirect('/login?next=/dashboard');

  // No .eq('user_id', ...) needed — RLS scopes this select to the caller.
  // The filter is omitted deliberately so the policy is what's being exercised.
  const { data, error } = await supabase
    .from('study_sets')
    .select('id, user_id, title, type, source_excerpt, items, model_version, created_at')
    .order('created_at', { ascending: false });

  return (
    <>
      <SiteHeader email={user.email ?? null} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved sets</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Open a set to keep studying where you left off.</p>
          </div>
          <Link href="/" className={buttonVariants('primary', 'md')}>
            <SparklesIcon />
            Generate a new set
          </Link>
        </div>

        <StudyActivity />

        {error ? (
          <Alert tone="error">We couldn&apos;t load your sets just now. Refresh to try again.</Alert>
        ) : (
          <SetList sets={(data ?? []) as StudySetRow[]} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
