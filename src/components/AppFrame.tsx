'use client';

import type {ReactNode} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {AppShell} from '@astryxdesign/core/AppShell';
import {TopNav, TopNavHeading, TopNavItem} from '@astryxdesign/core/TopNav';
import {AuthNav} from '@/components/AuthNav';

type AppFrameProps = {
  children: ReactNode;
  userEmail: string | null;
  supabaseConfigured: boolean;
};

export function AppFrame({
  children,
  userEmail,
  supabaseConfigured,
}: AppFrameProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  if (isHome) {
    return (
      <div className="aced-landing" data-theme="dark">
        <header className="aced-landing__nav">
          <Link href="/" className="aced-landing__logo" aria-label="ACED-IT home">
            <Image
              src="/ACED-IT.svg"
              alt="ACED-IT"
              width={120}
              height={22}
              className="aced-landing__logo-img"
              priority
            />
          </Link>
          <nav className="aced-landing__nav-end" aria-label="Landing actions">
            <Link className="aced-pill aced-pill--solid" href="/studio">
              Start practice
            </Link>
            <Link
              className="aced-pill aced-pill--ghost"
              href={userEmail ? '/studio' : '/login'}
            >
              {userEmail ? 'Studio' : 'Sign in'}
            </Link>
          </nav>
        </header>
        {children}
      </div>
    );
  }

  return (
    <AppShell
      height="auto"
      variant="wash"
      contentPadding={4}
      topNav={
        <TopNav
          label="ACED-IT primary navigation"
          heading={
            <TopNavHeading
              headingHref="/"
              logo={
                <Image
                  src="/ACED-IT.svg"
                  alt="ACED-IT"
                  width={118}
                  height={21}
                  priority
                />
              }
            />
          }
          startContent={
            <>
              <TopNavItem
                label="Studio"
                href="/studio"
                isSelected={pathname === '/studio'}
              />
              <TopNavItem
                label="Interview"
                href="/interview"
                isSelected={
                  pathname.startsWith('/interview') &&
                  !pathname.startsWith('/interview/results')
                }
              />
              <TopNavItem
                label="Results"
                href="/interview/results"
                isSelected={pathname.startsWith('/interview/results')}
              />
            </>
          }
          endContent={
            <AuthNav email={userEmail} configured={supabaseConfigured} />
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
