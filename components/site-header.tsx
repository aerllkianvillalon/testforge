import Link from 'next/link';
import { Logo } from '@/components/logo';
import { MobileNav } from '@/components/mobile-nav';
import { SiteNav } from '@/components/site-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';

/**
 * Below `sm`, the bar is just the logo and a single hamburger button — every
 * other control (nav links, saved sets, sign in/out, profile, theme) moves
 * into the MobileNav slide-over instead of being squeezed into the row.
 * Signed out, `sm` and up keep the inline layout. Signed in, the nav links stay
 * beside the logo on `sm` and up, and the menu (account actions, theme) is the
 * only control on the right at every width.
 */
export function SiteHeader({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="shrink-0 font-semibold">
            <Logo />
          </Link>
          <SiteNav signedIn={Boolean(email)} />
        </div>

        {email ? null : (
          <div className="hidden items-center gap-2 sm:flex">
            <ThemeToggle />
            <Link href="/login" className={buttonVariants('ghost', 'sm')}>
              Sign in
            </Link>
            <Link href="/register" className={buttonVariants('primary', 'sm')}>
              Create account
            </Link>
          </div>
        )}

        <MobileNav email={email} />
      </div>
    </header>
  );
}