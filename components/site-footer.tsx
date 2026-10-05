import Link from 'next/link';
import { Logo } from '@/components/logo';
import { CONTACT_URL, SITE_TAGLINE } from '@/lib/site';

type FooterLink = { href: string; label: string; external?: boolean };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { href: '/', label: 'Generate' },
      { href: '/dashboard', label: 'Saved sets' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/register', label: 'Create account' },
    ],
  },
  {
    title: 'More',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: CONTACT_URL, label: 'Contact', external: true },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo showMark={false} />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{SITE_TAGLINE}</p>
          </div>

          <div className="flex flex-wrap gap-x-12 gap-y-8">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title} className="min-w-28">
                <h3 className="text-sm font-medium">{column.title}</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                  {column.links.map((link) =>
                    link.external ? (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      </li>
                    ) : (
                      <li key={link.href}>
                        <Link href={link.href} className="transition-colors hover:text-foreground">
                          {link.label}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} TestForge. All rights reserved.</p>
          <p>Notes stay yours. AI-generated content should be double-checked before you rely on it.</p>
        </div>
      </div>
    </footer>
  );
}