'use client';

import {useActionState, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Banner} from '@astryxdesign/core/Banner';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {signIn, type AuthActionState} from '@/lib/auth/actions';

const initialState: AuthActionState = {error: null};

type AuthFormProps = {
  configured: boolean;
};

export function SignInForm({configured}: AuthFormProps) {
  const params = useSearchParams();
  const next = params.get('next') ?? '/studio';
  const checkEmail = params.get('check_email') === '1';
  const callbackError = params.get('error') === 'auth_callback';
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <VStack gap={4}>
      {!configured ? (
        <Banner
          status="warning"
          title="Supabase not connected"
          description="Create a free Supabase project, then add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local. Steps are in the README under Supabase Auth."
        />
      ) : null}

      {checkEmail ? (
        <Banner
          status="success"
          title="Check your email"
          description="Confirm your address, then sign in. You’ll continue to checkout if you started a trial."
        />
      ) : null}

      {callbackError ? (
        <Banner
          status="error"
          title="Sign-in link failed"
          description="Try signing in again with email and password."
        />
      ) : null}

      {state.error ? (
        <Banner status="error" title="Could not sign in" description={state.error} />
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="next" value={next} />
        <VStack gap={4}>
          <FormLayout>
            <TextInput
              label="Email"
              type="email"
              htmlName="email"
              value={email}
              onChange={setEmail}
              isRequired
              isDisabled={!configured || isPending}
              placeholder="you@example.com"
              hasAutoFocus
            />
            <TextInput
              label="Password"
              type="password"
              htmlName="password"
              value={password}
              onChange={setPassword}
              isRequired
              isDisabled={!configured || isPending}
            />
          </FormLayout>

          <HStack gap={3} align="center" wrap="wrap">
            <Button
              label="Sign in"
              type="submit"
              variant="primary"
              isLoading={isPending}
              isDisabled={!configured}
            />
            <Text type="supporting" color="secondary">
              New here?{' '}
              <Link href="/signup" hasUnderline>
                Create an account
              </Link>
            </Text>
          </HStack>
        </VStack>
      </form>
    </VStack>
  );
}
