'use client';

import {BackLink} from '@/components/BackLink';
import {useHomeHref} from '@/components/AuthSession';

/** Single way back — studio when signed in, marketing home when not. */
export function LegalBackLink() {
  const homeHref = useHomeHref();
  const label = homeHref === '/studio' ? 'Back to Home' : 'Back to ACED-IT';

  return (
    <nav className="aced-legal__nav" aria-label="Back">
      <BackLink href={homeHref}>{label}</BackLink>
    </nav>
  );
}
