'use client';

import type {ReactNode} from 'react';
import NextLink from 'next/link';
import {Theme} from '@astryxdesign/core/theme';
import {LinkProvider} from '@astryxdesign/core/Link';
import {acedItTheme} from '@/theme/aced-it/acedItTheme';

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({children}: ProvidersProps) {
  return (
    <Theme theme={acedItTheme} mode="light">
      <LinkProvider component={NextLink}>{children}</LinkProvider>
    </Theme>
  );
}
