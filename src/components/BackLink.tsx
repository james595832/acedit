'use client';

import type {ReactNode} from 'react';
import {Link} from '@astryxdesign/core/Link';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack} from '@astryxdesign/core/Layout';

/** App back control — chevron + label in accessible accent blue. */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={['aced-back-link', className].filter(Boolean).join(' ')}
    >
      <HStack gap={1} align="center">
        <Icon icon="chevronLeft" size="sm" color="inherit" />
        {children}
      </HStack>
    </Link>
  );
}
