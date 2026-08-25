import type {Metadata} from 'next';
import {Figtree, JetBrains_Mono, Montserrat} from 'next/font/google';
import {Providers} from '@/components/providers';
import {AppShellServer} from '@/components/AppShellServer';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './globals.css';

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ACED-IT | Ace your design interview',
  description:
    'Interview practice made just for designers. Answer real questions out loud, sketch on a timed whiteboard, and get clear feedback.',
  icons: {
    icon: [
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
      data-theme="light"
      data-astryx-theme="stone"
      className={`${figtree.variable} ${montserrat.variable} ${jetbrains.variable}`}
    >
      <body className={figtree.className}>
        <Providers>
          <AppShellServer>{children}</AppShellServer>
        </Providers>
      </body>
    </html>
  );
}
