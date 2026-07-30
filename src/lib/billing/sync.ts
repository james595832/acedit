import type Stripe from 'stripe';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/admin';
import {getStripe, isStripeConfigured, tierFromStatus} from '@/lib/stripe';

function unixToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function hasServiceKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_KEY);
}

function patchFromSubscription(
  subscription: Stripe.Subscription,
  customerIdFallback?: string,
) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer?.id ?? customerIdFallback);

  return {
    stripe_customer_id: customerId ?? null,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_tier: tierFromStatus(subscription.status),
    trial_ends_at: unixToIso(subscription.trial_end),
    current_period_end: unixToIso(
      subscription.items.data[0]?.current_period_end ??
        (subscription as {current_period_end?: number}).current_period_end,
    ),
    updated_at: new Date().toISOString(),
  };
}

function formatDbError(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}): string {
  return [error.message, error.code, error.details, error.hint]
    .filter(Boolean)
    .join(' · ');
}

function isMissingProfilesTable(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error &&
          'message' in error &&
          typeof (error as {message: unknown}).message === 'string'
        ? (error as {message: string}).message
        : '';
  const code =
    typeof error === 'object' &&
    error &&
    'code' in error &&
    typeof (error as {code: unknown}).code === 'string'
      ? (error as {code: string}).code
      : '';
  return (
    code === 'PGRST205' ||
    message.includes("Could not find the table 'public.profiles'") ||
    message.includes('PGRST205')
  );
}

const MISSING_PROFILES_HINT =
  "Supabase is missing public.profiles. In the Supabase SQL Editor, run the files in supabase/migrations/ in order (init → auth_profile_trigger → stripe_billing → marketing_consent → protect_billing_columns), then reload Settings.";

const BILLING_PROFILE_KEYS = new Set([
  'stripe_customer_id',
  'stripe_subscription_id',
  'subscription_status',
  'subscription_tier',
  'trial_ends_at',
  'current_period_end',
]);

function patchTouchesBilling(patch: Record<string, unknown>): boolean {
  return Object.keys(patch).some((key) => BILLING_PROFILE_KEYS.has(key));
}

/**
 * Update profile billing fields.
 * Billing columns are locked for authenticated users (RLS trigger) — always
 * use the service role for Stripe-driven writes.
 */
async function updateOwnProfile(
  userId: string,
  patch: Record<string, unknown>,
) {
  if (patchTouchesBilling(patch)) {
    if (!hasServiceKey()) {
      throw new Error(
        'SUPABASE_SERVICE_KEY is required to update billing fields',
      );
    }
    const admin = createServiceClient();
    const {error} = await admin.from('profiles').update(patch).eq('id', userId);
    if (error) {
      if (isMissingProfilesTable(error)) {
        throw new Error(MISSING_PROFILES_HINT);
      }
      throw new Error(formatDbError(error) || 'Admin profile update failed');
    }
    return;
  }

  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (user?.id !== userId) {
    throw new Error('Not authorized to update this profile');
  }

  const {error} = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) {
    if (isMissingProfilesTable(error)) {
      throw new Error(MISSING_PROFILES_HINT);
    }
    throw new Error(formatDbError(error) || 'Profile update failed');
  }
}

export async function upsertProfileFromSubscription(
  subscription: Stripe.Subscription,
  customerIdFallback?: string,
) {
  const patch = patchFromSubscription(subscription, customerIdFallback);
  const userId = subscription.metadata?.supabase_user_id;

  if (userId) {
    await updateOwnProfile(userId, patch);
    return;
  }

  if (!patch.stripe_customer_id || !hasServiceKey()) {
    throw new Error('Cannot sync subscription without customer or user id');
  }

  const supabase = createServiceClient();
  const {error} = await supabase
    .from('profiles')
    .update(patch)
    .eq('stripe_customer_id', patch.stripe_customer_id);
  if (error) throw error;
}

export async function markProfileCanceled(customerId: string) {
  if (!hasServiceKey()) {
    throw new Error('SUPABASE_SERVICE_KEY required to mark canceled from webhook');
  }
  const supabase = createServiceClient();
  const {error} = await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      subscription_tier: 'free',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
  if (error) throw error;
}

export async function attachStripeCustomer(
  userId: string,
  customerId: string,
) {
  await updateOwnProfile(userId, {
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  });
}

/** Sync plan after Checkout — no webhook / Stripe CLI needed. */
export async function syncBillingFromCheckoutSession(
  sessionId: string,
  userId: string,
) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  const sessionUser =
    session.metadata?.supabase_user_id ?? session.client_reference_id ?? null;

  // Fail closed: never apply billing from a session without ownership binding.
  if (!sessionUser) {
    throw new Error(
      'Checkout session is missing ownership metadata; refusing to sync',
    );
  }
  if (sessionUser !== userId) {
    throw new Error('Checkout session does not belong to this user');
  }

  if (!session.subscription) {
    return;
  }

  const subscription =
    typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;

  await updateOwnProfile(userId, patchFromSubscription(subscription, customerId));
}

/**
 * Pull latest Stripe subscription into the profile.
 * Finds the Stripe customer by stored id, or by email if missing.
 */
export async function syncBillingForUser(userId: string, email: string) {
  if (!isStripeConfigured()) return;

  const supabase = await createClient();
  const {data: profile} = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId && email) {
    const customers = await stripe.customers.list({email, limit: 5});
    customerId = customers.data[0]?.id ?? null;
  }

  if (!customerId) return;

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });

  const active =
    subs.data.find(s => s.status === 'trialing' || s.status === 'active') ??
    subs.data.find(s => s.status === 'past_due') ??
    subs.data[0];

  if (!active) {
    await updateOwnProfile(userId, {
      stripe_customer_id: customerId,
      subscription_status: 'canceled',
      subscription_tier: 'free',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  await updateOwnProfile(userId, patchFromSubscription(active, customerId));
}

export async function syncBillingFromCustomer(userId: string) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return;
  await syncBillingForUser(userId, user.email ?? '');
}
