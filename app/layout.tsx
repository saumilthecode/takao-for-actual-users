/**
 * ============================================================
 * 📄 FILE: frontend/app/layout.tsx
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Root layout for the Next.js app.
 *    Wraps all pages with global styles and providers.
 * 
 * 🛠️ TECH USED:
 *    - Next.js 14 App Router
 *    - Tailwind CSS (global styles)
 *    - Inter font (Google Fonts)
 * 
 * ============================================================
 */

import type { Metadata } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['100', '200', '300', '400', '500', '600', '700']
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800']
});

export const metadata: Metadata = {
  title: 'Takoa - Find Your People',
  description: 'University friend-matching with 3D vector visualization',
  icons: {
    icon: '/stickman.png',
    shortcut: '/stickman.png',
    apple: '/stickman.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${ibmPlexSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <img
          src="/leaf.png"
          alt=""
          className="ambient-image"
          aria-hidden="true"
        />
        <div className="pointer-events-none fixed bottom-4 left-6 text-[11px] text-muted-foreground">
          Made by{' '}
          <a
            href="https://github.com/716r5"
            className="pointer-events-auto underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Ankita
          </a>{' '}
          and{' '}
          <a
            href="https://github.com/saumilthecode"
            className="pointer-events-auto underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Saumil
          </a>
        </div>
        {children}
      </body>
    </html>
  );
}
