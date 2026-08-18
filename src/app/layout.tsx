import type {Metadata} from 'next';
import {Plus_Jakarta_Sans} from 'next/font/google';
import {Providers} from '@/components/providers';
import {AppShellServer} from '@/components/AppShellServer';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-aced-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jakartaHeading = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-aced-heading',
  display: 'swap',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ACED-IT | Ace your design interview',
  description:
    'Interview practice made just for designers. Answer real questions out loud, sketch on a timed whiteboard, and get clear feedback.',
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
      className={`${jakarta.variable} ${jakartaHeading.variable}`}
    >
      <body className={jakarta.className}>
        <Providers>
          <AppShellServer>{children}</AppShellServer>
        </Providers>
      </body>
    </html>
  );
}
