import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ExternalLinkIcon } from '@/components/ui/icons';
import { CONTACT_URL, PRIVACY_UPDATED, SITE_NAME } from '@/lib/site';
import { getSessionUser } from '@/lib/supabase/server';

export const metadata = { title: `Privacy notice — ${SITE_NAME}` };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default async function PrivacyPage() {
  const user = await getSessionUser();

  return (
    <>
      <SiteHeader email={user?.email ?? null} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight">Privacy notice</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {PRIVACY_UPDATED}.</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          This is a plain-language description of what {SITE_NAME} stores and why, written to match what the code
          actually does rather than as a legal document. If you need something formal for compliance purposes, have
          it reviewed — this notice isn&apos;t legal advice.
        </p>

        <div className="mt-8 space-y-8">
          <Section title="Using it without an account">
            <p>
              Pasting notes or uploading a file to generate flashcards or a quiz never requires an account. Nothing
              from that session is stored on our server once you close the tab, unless you sign in and choose to save
              the set.
            </p>
          </Section>

          <Section title="What your notes are used for">
            <p>
              The text you submit is sent to Google&apos;s Gemini API to generate the flashcards or quiz questions.
              We don&apos;t store the full text on our server. If you save a set, only a short excerpt (up to 240
              characters) is kept alongside it, as a reminder of where it came from.
            </p>
          </Section>

          <Section title="If you create an account">
            <p>
              We store your email address and the sets you choose to save: their title, type, the generated
              flashcards or questions, the short source excerpt above, and when they were created. This is kept in
              our database and is only ever readable by your account, enforced by the database itself, not just by
              the app&apos;s code.
            </p>
            <p>
              Signing in also sets a session cookie so you stay logged in between visits. It identifies your session,
              not you personally beyond that.
            </p>
          </Section>

          <Section title="Study streaks and activity">
            <p>
              The streak and weekly-activity numbers shown in the app are stored only in your browser&apos;s local
              storage. They are never sent to our server, so they don&apos;t follow you to another device or browser,
              and deleting your account has no effect on them — clearing your browser&apos;s site data is what resets
              them.
            </p>
          </Section>

          <Section title="Abuse prevention">
            <p>
              Generating a set and creating an account are both rate-limited to keep the service usable and its
              costs sane. This works by briefly counting requests against your account or IP address; those counts
              expire on their own and are not kept as a history.
            </p>
          </Section>

          <Section title="Who else sees this data">
            <p>
              Supabase hosts our database and handles sign-in. Google&apos;s Gemini API processes the notes you
              submit, as described above. Upstash provides the short-lived counters used for rate limiting. Vercel
              hosts the app and provides anonymous page-view analytics (no cookies, no personal identifiers). We
              don&apos;t sell your data and we don&apos;t run ads.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Two cookies are used, both set by us directly: one keeps you signed in after you log in (deleted when
              you sign out or it expires), and one remembers whether you&apos;ve chosen light or dark mode. Neither
              is used for advertising or cross-site tracking. Page-view analytics (above) doesn&apos;t use cookies
              at all.
            </p>
          </Section>

          <Section title="Deleting your account">
            <p>
              Your{' '}
              <Link href="/profile" className="font-medium text-foreground underline underline-offset-4">
                profile page
              </Link>{' '}
              has a delete option that removes your account and every set you&apos;ve saved immediately. This can
              &apos;t be undone, and we can&apos;t recover it for you afterward.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this notice or your data can be sent through our{' '}
              <a
                href={CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
              >
                Facebook page
                <ExternalLinkIcon className="size-3" />
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}