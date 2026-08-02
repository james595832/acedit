import type {Metadata} from 'next';
import {Public_Sans, Space_Grotesk} from 'next/font/google';
import {Providers} from '@/components/providers';
import {AppShellServer} from '@/components/AppShellServer';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
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
  title: 'ACED-IT — Interview practice built for designers',
  description:
    'Interview prep built exclusively for designers — practice out loud, whiteboard under pressure, and get clear feedback. Not another engineering platform.',
  icons: {
    icon: [
      // Self-adapting SVG first; explicit variants for browsers that honor media
      {url: '/img/favicon.svg', type: 'image/svg+xml'},
      {
        url: '/img/favicon-light.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/img/favicon-dark.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
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
