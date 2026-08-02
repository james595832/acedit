'use client';

import type {ReactNode} from 'react';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {AppShell} from '@astryxdesign/core/AppShell';
import {HStack} from '@astryxdesign/core/Layout';
import {MobileNav, MobileNavToggle} from '@astryxdesign/core/MobileNav';
import {SideNavItem} from '@astryxdesign/core/SideNav';
import {TopNav, TopNavHeading, TopNavItem} from '@astryxdesign/core/TopNav';
import {AuthNav} from '@/components/AuthNav';
import {SiteFooter} from '@/components/SiteFooter';
import {FeedbackWidget} from '@/components/FeedbackWidget';

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
    // Marketing landing owns its own chrome.
    return children;
  }

  const isInterview =
    pathname.startsWith('/interview') &&
    !pathname.startsWith('/interview/results');

  const isPortfolio = pathname.startsWith('/portfolio');
  const isStudio = pathname === '/studio';
  const isResults = pathname.startsWith('/interview/results');
  const isWhiteboard = pathname.startsWith('/whiteboard');

  // Responsive contract:
  //   > 1024px  logo left · Studio · Practice · Whiteboard · Results + account right
  //   <= 1024px links hide; burger opens MobileNav drawer

  const navItems = (
    <>
      <TopNavItem label="Studio" href="/studio" isSelected={isStudio} />
      <TopNavItem label="Practice" href="/interview" isSelected={isInterview} />
      <TopNavItem
        label="Portfolio"
        href="/portfolio"
        isSelected={isPortfolio}
      />
      <TopNavItem
        label="Whiteboard"
        href="/whiteboard"
        isSelected={isWhiteboard}
      />
      <TopNavItem
        label="Results"
        href="/interview/results"
        isSelected={isResults}
      />
    </>
  );

  return (
    <AppShell
      height="auto"
      variant="wash"
      contentPadding={0}
      mobileNav={{
        breakpoint: 'lg',
        hasToggle: false,
        content: (
          <MobileNav header="ACED-IT" side="end">
            <SideNavItem label="Studio" href="/studio" isSelected={isStudio} />
            <SideNavItem
              label="Practice"
              href="/interview"
              isSelected={isInterview}
            />
            <SideNavItem
              label="Portfolio"
              href="/portfolio"
              isSelected={isPortfolio}
            />
            <SideNavItem
              label="Whiteboard"
              href="/whiteboard"
              isSelected={isWhiteboard}
            />
            <SideNavItem
              label="Results"
              href="/interview/results"
              isSelected={isResults}
            />
            <SideNavItem
              label="Settings"
              href="/settings"
              isSelected={pathname.startsWith('/settings')}
            />
          </MobileNav>
        ),
      }}
      topNav={
        <TopNav
          label="ACED-IT primary navigation"
          className="aced-top-nav"
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
          endContent={
            <HStack gap={4} align="center" className="aced-nav-end">
              <HStack gap={4} align="center" className="aced-nav-links">
                {navItems}
              </HStack>
              <AuthNav email={userEmail} configured={supabaseConfigured} />
              <MobileNavToggle label="Open navigation" />
            </HStack>
          }
        />
      }
    >
      <div className="aced-app-page">{children}</div>
      <FeedbackWidget userEmail={userEmail} />
      <SiteFooter variant="app" />
    </AppShell>
  );
}
