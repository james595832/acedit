'use client';

import {useState} from 'react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Button} from '@astryxdesign/core/Button';
import {Divider} from '@astryxdesign/core/Divider';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Link} from '@astryxdesign/core/Link';
import {Popover} from '@astryxdesign/core/Popover';
import {Text} from '@astryxdesign/core/Text';
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
  const [isOpen, setIsOpen] = useState(false);

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
        <Button label="Sign up" href="/start" variant="primary" size="sm" />
      </HStack>
    );
  }

  const name = displayNameFromEmail(email);

  return (
    <HStack gap={0} align="center" className="aced-nav-account">
      <Popover
        placement="below"
        alignment="end"
        width={272}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        hasCloseButton={false}
        label={`Account menu for ${email}`}
        className="aced-account-menu-popover"
        content={
          <VStack gap={0} className="aced-account-menu">
            <VStack gap={1} className="aced-account-menu__actions">
              <Button
                label="Home"
                variant="ghost"
                size="sm"
                className="aced-account-menu__item"
                onClick={() => {
                  setIsOpen(false);
                  window.location.assign('/studio');
                }}
              />
              <Button
                label="Settings"
                variant="ghost"
                size="sm"
                className="aced-account-menu__item"
                onClick={() => {
                  setIsOpen(false);
                  window.location.assign('/settings');
                }}
              />
              <Button
                label="Sign out"
                variant="ghost"
                size="sm"
                className="aced-account-menu__item"
                onClick={() => {
                  setIsOpen(false);
                  void signOut();
                }}
              />
            </VStack>

            <Divider variant="subtle" isFullBleed />

            <HStack
              gap={3}
              align="center"
              className="aced-account-menu__identity"
            >
              <Avatar name={name} size="md" />
              <VStack gap={0} className="aced-account-menu__meta">
                <Text type="label" as="p">
                  {name}
                </Text>
                <Text type="supporting" color="secondary" as="p">
                  {email}
                </Text>
              </VStack>
            </HStack>
          </VStack>
        }
      >
        <Button
          label={`Account menu for ${email}`}
          variant="ghost"
          size="sm"
          isIconOnly
          className="aced-nav-avatar-trigger"
          icon={<Avatar name={name} size="sm" />}
        />
      </Popover>
    </HStack>
  );
}
