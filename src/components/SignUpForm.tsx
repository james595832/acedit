'use client';

import {useActionState, useState} from 'react';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {Button} from '@astryxdesign/core/Button';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Banner} from '@astryxdesign/core/Banner';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {signUp, type AuthActionState} from '@/lib/auth/actions';

const initialState: AuthActionState = {error: null};

type AuthFormProps = {
  configured: boolean;
  trialDays?: number;
  plan?: string;
  /** Full-page trial signup: skip the info banner; quieter legal line */
  variant?: 'default' | 'start';
};

export function SignUpForm({
  configured,
  trialDays = 5,
  plan = 'pro',
  variant = 'default',
}: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const isStart = variant === 'start';

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

      {!isStart ? (
        <Banner
          status="info"
          title={`${trialDays}-day Pro trial`}
          description="After you create your account you’ll enter card details on Stripe. £0 today. Cancel any time in Settings."
        />
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="trial" value={String(trialDays)} />
        <input type="hidden" name="plan" value={plan} />
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
            <CheckboxInput
              label="Email me tips and product updates"
              description={
                isStart
                  ? 'Unsubscribe anytime.'
                  : 'You can unsubscribe anytime. We’ll still send essential account and billing emails.'
              }
              htmlName="marketing_consent"
              value={marketingConsent}
              onChange={setMarketingConsent}
              isDisabled={!configured || isPending}
              isOptional
            />
          </FormLayout>

          <VStack gap={3}>
            <Button
              label={isStart ? 'Start free trial' : 'Create account & continue'}
              type="submit"
              variant="primary"
              isLoading={isPending}
              isDisabled={!configured}
            />
            {!isStart ? (
              <Text type="supporting" color="secondary">
                Already have an account?{' '}
                <Link href="/login" hasUnderline>
                  Sign in
                </Link>
              </Text>
            ) : null}
            <Text type="supporting" color="secondary" as="p">
              {isStart
                ? 'You’ll add a card on the next step. £0 today. By continuing you agree to our '
                : 'By creating an account you agree to our '}
              <Link href="/terms" hasUnderline>
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" hasUnderline>
                Privacy Policy
              </Link>
              .
            </Text>
          </VStack>
        </VStack>
      </form>
    </VStack>
  );
}
