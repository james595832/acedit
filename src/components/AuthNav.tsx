'use client';

import {Avatar} from '@astryxdesign/core/Avatar';
import {Button} from '@astryxdesign/core/Button';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {HStack} from '@astryxdesign/core/Layout';
import {Link} from '@astryxdesign/core/Link';
import {signOut} from '@/lib/auth/actions';

type AuthNavProps = {
  email: string | null;
  configured: boolean;
};

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  const token = local.split(/[._-]/)[0] ?? local;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

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
      <HStack gap={2} align="center" className="aced-nav-account">
        <Button label="Sign in" href="/login" variant="ghost" size="sm" />
        <Button label="Sign up" href="/signup" variant="primary" size="sm" />
      </HStack>
    );
  }

  const name = displayNameFromEmail(email);

  return (
    <div className="aced-nav-account">
      <DropdownMenu
        hasChevron={false}
        menuWidth={260}
        button={{
          label: `Account menu for ${email}`,
          variant: 'ghost',
          size: 'sm',
          isIconOnly: true,
          className: 'aced-nav-avatar-trigger',
          icon: <Avatar name={name} size="sm" />,
        }}
        items={[
          {
            type: 'section',
            title: email,
            items: [
              {
                label: 'Settings',
                onClick: () => {
                  window.location.assign('/settings');
                },
              },
              {
                label: 'Sign out',
                onClick: () => {
                  void signOut();
                },
              },
            ],
          },
        ]}
      />
    </div>
  );
}
