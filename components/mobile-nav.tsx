'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Logo } from '@/components/logo';
import { navLinks } from '@/components/site-nav';
import { ThemeSwitch } from '@/components/theme-switch';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  BookmarkIcon,
  ExternalLinkIcon,
  FileTextIcon,
  LogOutIcon,
  MenuIcon,
  SparklesIcon,
  SunMoonIcon,
  UserIcon,
  XIcon,
} from '@/components/ui/icons';
import { createClient } from '@/lib/supabase/client';
import { CONTACT_URL } from '@/lib/site';

/** Icon per nav link, keyed by href — kept local to the mobile menu since the
 *  desktop SiteNav is deliberately plain text links, no icons. */
const navIcons: Record<string, typeof SparklesIcon> = {
  '/#generate': SparklesIcon,
  '/dashboard': BookmarkIcon,
};

const generalLinks = [{ href: '/privacy', label: 'Privacy' }] as const;

/**
 * Everything the header needs on a phone, moved off the top bar and into a
 * single slide-over panel — grouped into labeled sections (MENU, then
 * account actions, then GENERAL) with an icon per row, mirroring the
 * reference pattern rather than a flat list of plain links.
 * Only rendered below `sm`; the desktop header keeps its own inline layout.
 */
export function MobileNav({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  // Portals touch `document`, so render nothing extra until after mount —
  // matches the guard flashcard-review.tsx uses for the same reason.
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // Close on route change, lock body scroll while open, close on Escape.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    setOpen(false);
    router.push('/');
    router.refresh();
  }

  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </p>
    );
  }

  return (
    <div className="sm:hidden">
      <Button variant="ghost" size="icon" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <MenuIcon />
      </Button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <button
                aria-label="Close menu"
                className="absolute inset-0 bg-background/70 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Site menu"
                tabIndex={-1}
                className="mobile-nav-panel absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col overflow-y-auto border-l bg-background p-5 shadow-2xl outline-none"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <Logo />
                  <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                    <XIcon />
                  </Button>
                </div>

                <div className="mt-5">
                  <SectionLabel>Menu</SectionLabel>
                  <nav aria-label="Main" className="flex flex-col gap-0.5">
                    {navLinks
                      .filter((link) => !link.requiresAuth || email)
                      .map((link) => {
                        const Icon = navIcons[link.href];
                        const active = pathname === link.match;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            aria-current={active ? 'page' : undefined}
                            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium transition-colors ${
                              active ? 'bg-secondary text-foreground' : 'text-foreground hover:bg-secondary'
                            }`}
                          >
                            {Icon ? (
                              <Icon className={`size-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                            ) : null}
                            {link.label}
                          </Link>
                        );
                      })}
                  </nav>
                </div>

                <div className="my-5 h-px bg-border" />

                <div>
                  <SectionLabel>Account</SectionLabel>
                  {email ? (
                    <div className="flex flex-col gap-0.5">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <UserIcon className="size-5 text-muted-foreground" />
                        Profile
                      </Link>
                      <button
                        onClick={signOut}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-base font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <LogOutIcon className="size-5 text-muted-foreground" />
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 px-1">
                      <Link href="/login" className={buttonVariants('secondary', 'md', 'w-full')}>
                        Sign in
                      </Link>
                      <Link href="/register" className={buttonVariants('primary', 'md', 'w-full')}>
                        Create account
                      </Link>
                    </div>
                  )}
                </div>

                <div className="my-5 h-px bg-border" />

                <div>
                  <SectionLabel>General</SectionLabel>
                  <div className="flex flex-col gap-0.5">
                    {generalLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <FileTextIcon className="size-5 text-muted-foreground" />
                        {link.label}
                      </Link>
                    ))}
                    <a
                      href={CONTACT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <ExternalLinkIcon className="size-5 text-muted-foreground" />
                      Contact
                    </a>
                    <div className="flex items-center justify-between rounded-md px-3 py-2.5">
                      <span className="flex items-center gap-3 text-base font-medium text-foreground">
                        <SunMoonIcon className="size-5 text-muted-foreground" />
                        Theme
                      </span>
                      <ThemeSwitch />
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}