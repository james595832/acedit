import type {Metadata} from 'next';
import {Public_Sans, Space_Grotesk} from 'next/font/google';
import {Providers} from '@/components/providers';
import {AppShellServer} from '@/components/AppShellServer';
import './globals.css';

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-aced-body',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-aced-heading',
  weight: ['500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ACED-IT — Design interview prep',
  description:
    'Practice design interviews with CV-aware questions, voice answers, and actionable feedback.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${spaceGrotesk.variable}`}
    >
      <body className={publicSans.className}>
        <Providers>
          <AppShellServer>{children}</AppShellServer>
        </Providers>
      </body>
    </html>
  );
}
