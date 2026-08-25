'use client';

import type {ReactNode} from 'react';
import NextLink from 'next/link';
import {Theme} from '@astryxdesign/core/theme';
import {LinkProvider} from '@astryxdesign/core/Link';
import {stoneTheme} from '@astryxdesign/theme-stone/built';

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({children}: ProvidersProps) {
  return (
    <Theme theme={stoneTheme} mode="light">
      <LinkProvider component={NextLink}>{children}</LinkProvider>
    </Theme>
  );
}
