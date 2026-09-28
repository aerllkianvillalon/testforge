import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
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
 * The choice is read from localStorage first, then from the `theme` cookie, so
 * it still survives when storage is blocked (private tabs, in-app browsers).
 * Storage access is wrapped separately so a blocked localStorage can no longer
 * abort the whole script and leave the page stuck in light mode.
 */
const themeScript = `(function(){
var root=document.documentElement;
var stored=null;
try{stored=localStorage.getItem('theme');}catch(e){}
if(!stored){var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);if(m)stored=m[1];}
var media=window.matchMedia('(prefers-color-scheme: dark)');
root.classList.toggle('dark',stored?stored==='dark':media.matches);
media.addEventListener('change',function(e){
if(!stored)root.classList.toggle('dark',e.matches);
});
})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The cookie lets the server render the right class on first byte, so a
  // refresh never starts in light mode even if client storage is unavailable.
  const theme = (await cookies()).get('theme')?.value;
  return (
    <html lang="en" className={`${inter.variable}${theme === 'dark' ? ' dark' : ''}`} suppressHydrationWarning>
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