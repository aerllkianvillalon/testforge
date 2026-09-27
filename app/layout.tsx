import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const title = 'TestForge — forge your notes into practice tests';
const description =
  'Turn pasted notes or a PDF into flashcards or a multiple-choice quiz. No account required.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: '%s · TestForge' },
  description,
  openGraph: { title, description, siteName: 'TestForge', type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

/**
 * Runs before first paint so a dark-mode visitor never sees a white flash.
 * Follows the system setting until the person picks a theme, then remembers it.
 */
const themeScript = `(function(){try{
var root=document.documentElement;
var media=window.matchMedia('(prefers-color-scheme: dark)');
var stored=localStorage.getItem('theme');
root.classList.toggle('dark',stored?stored==='dark':media.matches);
media.addEventListener('change',function(e){
if(!localStorage.getItem('theme'))root.classList.toggle('dark',e.matches);
});
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}