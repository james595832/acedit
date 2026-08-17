'use client';

import {type ReactNode, useLayoutEffect, useRef, useState} from 'react';
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

type NavIndicator = {
  x: number;
  width: number;
  ready: boolean;
};

export function AppFrame({
  children,
  userEmail,
  supabaseConfigured,
}: AppFrameProps) {
  const pathname = usePathname();
  const linksRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<NavIndicator>({
    x: 0,
    width: 0,
    ready: false,
  });

  const isHome = pathname === '/';
  const isStart = pathname === '/start';
  const isSignedIn = Boolean(userEmail);
  const showAppChrome = !isHome && !isStart && isSignedIn;

  const isInterview =
    pathname.startsWith('/interview') &&
    !pathname.startsWith('/interview/results');
  const isPortfolio = pathname.startsWith('/portfolio');
  const isStudio = pathname === '/studio';
  const isResults = pathname.startsWith('/interview/results');
  const isWhiteboard = pathname.startsWith('/whiteboard');

  useLayoutEffect(() => {
    if (!showAppChrome) return;

    function measure() {
      const root = linksRef.current;
      if (!root) return;
      const selected = root.querySelector(
        '.astryx-top-nav-item[data-selected="true"], .astryx-top-nav-item[aria-current="page"]',
      ) as HTMLElement | null;
      if (!selected) {
        setIndicator((prev) => ({...prev, ready: false}));
        return;
      }
      setIndicator({
        x: selected.getBoundingClientRect().left - root.getBoundingClientRect().left,
        width: selected.offsetWidth,
        ready: true,
      });
    }

    measure();
    // Remeasure after layout settles (fonts / Astryx sizing).
    const raf = window.requestAnimationFrame(measure);
    const root = linksRef.current;
    const ro =
      typeof ResizeObserver !== 'undefined' && root
        ? new ResizeObserver(measure)
        : null;
    if (root) ro?.observe(root);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [pathname, showAppChrome]);

  if (isHome || isStart) {
    // Marketing / trial start pages own their own chrome.
    return children;
  }

  const navItems = isSignedIn ? (
    <>
      <TopNavItem label="Home" href="/studio" isSelected={isStudio} />
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
  ) : null;

  return (
    <AppShell
      height="auto"
      variant="wash"
      contentPadding={0}
      mobileNav={
        isSignedIn
          ? {
              breakpoint: 'lg',
              hasToggle: false,
              content: (
                <MobileNav header="ACED-IT" side="end">
                  <SideNavItem
                    label="Home"
                    href="/studio"
                    isSelected={isStudio}
                  />
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
            }
          : undefined
      }
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
              {navItems ? (
                <div className="aced-nav-links" ref={linksRef}>
                  <span
                    className={`aced-nav-links__pill${indicator.ready ? ' is-ready' : ''}`}
                    style={{
                      transform: `translate3d(${indicator.x}px, -50%, 0)`,
                      width: indicator.width,
                    }}
                    aria-hidden
                  />
                  <HStack gap={1} align="center" className="aced-nav-links__row">
                    {navItems}
                  </HStack>
                </div>
              ) : null}
              <AuthNav email={userEmail} configured={supabaseConfigured} />
              {isSignedIn ? (
                <MobileNavToggle label="Open navigation" />
              ) : null}
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
