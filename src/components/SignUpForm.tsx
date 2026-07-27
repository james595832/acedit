'use client';

import {useActionState, useState} from 'react';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Banner} from '@astryxdesign/core/Banner';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {signUp, type AuthActionState} from '@/lib/auth/actions';

const initialState: AuthActionState = {error: null};

type AuthFormProps = {
  configured: boolean;
};

export function SignUpForm({configured}: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <VStack gap={4}>
      {!configured ? (
        <Banner
          status="warning"
          title="Supabase not connected"
          description="Create a free Supabase project, then add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
        />
      ) : null}

      {state.error ? (
        <Banner
          status="error"
          title="Could not create account"
          description={state.error}
        />
      ) : null}

      <form action={formAction}>
        <VStack gap={4}>
          <FormLayout>
            <TextInput
              label="Full name"
              type="text"
              htmlName="full_name"
              value={fullName}
              onChange={setFullName}
              isOptional
              isDisabled={!configured || isPending}
              placeholder="Alex Designer"
              hasAutoFocus
            />
            <TextInput
              label="Email"
              type="email"
              htmlName="email"
              value={email}
              onChange={setEmail}
              isRequired
              isDisabled={!configured || isPending}
              placeholder="you@example.com"
            />
            <TextInput
              label="Password"
              type="password"
              htmlName="password"
              value={password}
              onChange={setPassword}
              isRequired
              isDisabled={!configured || isPending}
              description="At least 6 characters"
            />
          </FormLayout>

          <HStack gap={3} align="center" wrap="wrap">
            <Button
              label="Create account"
              type="submit"
              variant="primary"
              isLoading={isPending}
              isDisabled={!configured}
            />
            <Text type="supporting" color="secondary">
              Already have an account?{' '}
              <Link href="/login" hasUnderline>
                Sign in
              </Link>
            </Text>
          </HStack>
        </VStack>
      </form>
    </VStack>
  );
}
