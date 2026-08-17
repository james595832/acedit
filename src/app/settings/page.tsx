import {Section} from '@astryxdesign/core/Section';
import {BillingSettings} from '@/components/BillingSettings';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {isStripeConfigured} from '@/lib/stripe';
import {syncBillingForUser} from '@/lib/billing/sync';
import {listBillingInvoices} from '@/lib/billing/invoices';
import {redirect} from 'next/navigation';

type SettingsPageProps = {
  searchParams: Promise<{billing?: string}>;
};

function billingNotice(code: string | undefined): string | null {
  switch (code) {
    case 'canceled':
      return 'Checkout was canceled. You can start the trial anytime from here.';
    case 'checkout_error':
      return 'Checkout could not start. Check Stripe keys and try again.';
    case 'stripe_missing':
      return 'Stripe keys are missing in this environment.';
    case 'portal_return':
      return 'Billing updated from Stripe.';
    default:
      return null;
  }
}

export default async function SettingsPage({searchParams}: SettingsPageProps) {
  if (!isSupabaseConfigured()) {
    redirect('/login');
  }

  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/settings');
  }

  const params = await searchParams;
  let syncError: string | null = null;

  if (isStripeConfigured()) {
    try {
      await syncBillingForUser(user.id, user.email ?? '');
    } catch (error) {
      console.error('[settings] billing sync', error);
      syncError =
        error instanceof Error
          ? error.message
          : 'Could not refresh membership from Stripe.';
    }
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select(
      'email, subscription_tier, subscription_status, trial_ends_at, current_period_end, stripe_customer_id',
    )
    .eq('id', user.id)
    .maybeSingle();

  let invoices: Awaited<ReturnType<typeof listBillingInvoices>> = [];
  if (isStripeConfigured() && profile?.stripe_customer_id) {
    try {
      invoices = await listBillingInvoices(profile.stripe_customer_id);
    } catch (error) {
      console.error('[settings] invoice list', error);
    }
  }

  return (
    <>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <h1>Settings</h1>
          <p className="aced-masthead__lead">
            Manage your membership, view payment history, or delete your
            account.
          </p>
        </div>
      </header>
      <Section maxWidth={560} variant="transparent" padding={0}>
        <BillingSettings
          stripeConfigured={isStripeConfigured()}
          notice={billingNotice(params.billing)}
          syncError={syncError}
          invoices={invoices}
          profile={{
            email: profile?.email ?? user.email ?? '',
            subscription_tier: profile?.subscription_tier ?? 'free',
            subscription_status: profile?.subscription_status ?? 'none',
            trial_ends_at: profile?.trial_ends_at ?? null,
            current_period_end: profile?.current_period_end ?? null,
            stripe_customer_id: profile?.stripe_customer_id ?? null,
          }}
        />
      </Section>
    </>
  );
}
