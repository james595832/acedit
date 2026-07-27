'use client';

import {Button} from '@astryxdesign/core/Button';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {HStack} from '@astryxdesign/core/Layout';
import {signOut} from '@/lib/auth/actions';

type AuthNavProps = {
  email: string | null;
  configured: boolean;
};

export function AuthNav({email, configured}: AuthNavProps) {
  if (!configured) {
    return (
      <Link href="/login" isStandalone>
        Sign in
      </Link>
    );
  }

  if (!email) {
    return (
      <HStack gap={3} align="center">
        <Link href="/signup" isStandalone>
          Sign up
        </Link>
        <Link href="/login" isStandalone>
          Sign in
        </Link>
      </HStack>
    );
  }

  return (
    <HStack gap={3} align="center">
      <Text type="supporting" color="secondary" maxLines={1}>
        {email}
      </Text>
      <form action={signOut}>
        <Button label="Sign out" type="submit" variant="ghost" size="sm" />
      </form>
    </HStack>
  );
}
