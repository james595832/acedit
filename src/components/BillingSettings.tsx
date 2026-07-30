'use client';

import {useState, useTransition} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Divider} from '@astryxdesign/core/Divider';
import {deleteAccount} from '@/lib/auth/actions';
import type {BillingInvoice} from '@/lib/billing/invoices';

export type BillingProfile = {
  email: string;
  subscription_tier: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

type BillingSettingsProps = {
  profile: BillingProfile;
  invoices: BillingInvoice[];
  stripeConfigured: boolean;
  notice: string | null;
  syncError: string | null;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function statusLabel(status: string | null, tier: string): string {
  if (status === 'trialing') return 'Pro trial';
  if (status === 'active') return 'Pro active';
  if (status === 'past_due') return 'Payment past due';
  if (status === 'canceled') return 'Canceled';
  if (tier === 'pro') return 'Pro';
  return 'Free';
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function invoiceStatusLabel(status: string | null): string {
  if (status === 'paid') return 'Paid';
  if (status === 'open') return 'Due';
  if (status === 'draft') return 'Draft';
  if (status === 'void') return 'Void';
  if (status === 'uncollectible') return 'Failed';
  return status ?? '—';
}

export function BillingSettings({
  profile,
  invoices,
  stripeConfigured,
  notice,
  syncError,
}: BillingSettingsProps) {
  const [error, setError] = useState<string | null>(syncError);
  const [pending, setPending] = useState<'checkout' | 'portal' | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const isSubscribed =
    profile.subscription_status === 'trialing' ||
    profile.subscription_status === 'active' ||
    profile.subscription_status === 'past_due';

  const hasStripeCustomer = Boolean(profile.stripe_customer_id);
  const trialEnd = formatDate(profile.trial_ends_at);
  const periodEnd = formatDate(profile.current_period_end);

  async function startCheckout() {
    setError(null);
    setPending('checkout');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({trialDays: 5, plan: 'pro'}),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? data.detail ?? 'Could not start checkout');
      }
      window.location.assign(data.url);
    } catch (err) {
      setPending(null);
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  async function openPortal() {
    setError(null);
    setPending('portal');
    try {
      const res = await fetch('/api/stripe/portal', {method: 'POST'});
      const data = (await res.json()) as {url?: string; error?: string};
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not open billing portal');
      }
      window.location.assign(data.url);
    } catch (err) {
      setPending(null);
      setError(err instanceof Error ? err.message : 'Portal failed');
    }
  }

  function confirmDelete() {
    const ok = window.confirm(
      'Delete your ACED-IT account permanently? This cancels any Stripe subscription and cannot be undone.',
    );
    if (!ok) return;

    startDelete(async () => {
      setError(null);
      const result = await deleteAccount();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <VStack gap={5} className="aced-settings-billing">
      {notice ? (
        <Banner status="info" title="Billing" description={notice} />
      ) : null}
      {error ? (
        <Banner status="error" title="Something went wrong" description={error} />
      ) : null}
      {!stripeConfigured ? (
        <Banner
          status="warning"
          title="Stripe not connected"
          description="Add STRIPE_SECRET_KEY (sk_test_…) and STRIPE_PRICE_ID_PRO to .env.local."
        />
      ) : null}

      <section className="aced-panel aced-settings-card">
        <div className="aced-settings-card__inner">
          <HStack gap={3} align="start" justify="between" wrap="wrap">
            <VStack gap={1}>
              <Text size="xsm" color="secondary" className="aced-settings-kicker">
                Membership
              </Text>
              <Heading level={3}>
                {statusLabel(profile.subscription_status, profile.subscription_tier)}
              </Heading>
              <Text size="sm" color="secondary">
                {profile.email}
              </Text>
            </VStack>
            <Text size="sm" weight="semibold" className="aced-settings-price">
              £7.50 / mo
            </Text>
          </HStack>

          <Divider />

          <VStack gap={2} className="aced-settings-meta">
            {profile.subscription_status === 'trialing' && trialEnd ? (
              <Text size="sm">
                Trial ends {trialEnd}. Cancel before then to avoid being charged.
              </Text>
            ) : null}
            {profile.subscription_status === 'active' && periodEnd ? (
              <Text size="sm">Current period renews {periodEnd}.</Text>
            ) : null}
            {profile.subscription_status === 'canceled' && periodEnd ? (
              <Text size="sm">Access continues until {periodEnd}.</Text>
            ) : null}
            {!isSubscribed ? (
              <Text size="sm" color="secondary">
                Start a 5-day Pro trial — card required, £0 today.
              </Text>
            ) : null}
          </VStack>

          <div className="aced-settings-actions">
            {isSubscribed || hasStripeCustomer ? (
              <button
                type="button"
                className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg aced-mkt__btn--block"
                disabled={!stripeConfigured || pending !== null || isDeleting}
                onClick={() => {
                  void openPortal();
                }}
              >
                {pending === 'portal'
                  ? 'Opening…'
                  : 'Manage billing & cancel'}
              </button>
            ) : (
              <button
                type="button"
                className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg aced-mkt__btn--block"
                disabled={!stripeConfigured || pending !== null || isDeleting}
                onClick={() => {
                  void startCheckout();
                }}
              >
                {pending === 'checkout' ? 'Starting…' : 'Start 5-day free trial'}
              </button>
            )}
            {(isSubscribed || hasStripeCustomer) && (
              <p className="aced-settings-hint">
                Opens Stripe’s secure portal to update your card or cancel.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="aced-panel aced-settings-card">
        <div className="aced-settings-card__inner">
          <VStack gap={1}>
            <Text size="xsm" color="secondary" className="aced-settings-kicker">
              Billing history
            </Text>
            <Heading level={3}>Monthly payments</Heading>
            <Text size="sm" color="secondary">
              Invoices from Stripe for your ACED-IT membership.
            </Text>
          </VStack>

          {invoices.length === 0 ? (
            <Text size="sm" color="secondary">
              No invoices yet. After your first paid month (or a £0 trial
              invoice), they’ll show up here.
            </Text>
          ) : (
            <ul className="aced-invoice-list" aria-label="Billing history">
              {invoices.map(invoice => {
                const amount =
                  invoice.status === 'paid'
                    ? invoice.amountPaid
                    : invoice.amountDue;
                const link = invoice.hostedInvoiceUrl ?? invoice.invoicePdf;
                const period =
                  invoice.periodStart && invoice.periodEnd
                    ? `${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`
                    : formatDate(invoice.createdAt);

                return (
                  <li key={invoice.id} className="aced-invoice-row">
                    <div className="aced-invoice-row__main">
                      <p className="aced-invoice-row__title">
                        {invoice.description}
                        {invoice.number ? (
                          <span className="aced-invoice-row__num">
                            {' '}
                            · {invoice.number}
                          </span>
                        ) : null}
                      </p>
                      <p className="aced-invoice-row__meta">{period}</p>
                    </div>
                    <div className="aced-invoice-row__end">
                      <span
                        className={`aced-invoice-status aced-invoice-status--${invoice.status ?? 'unknown'}`}
                      >
                        {invoiceStatusLabel(invoice.status)}
                      </span>
                      <span className="aced-invoice-row__amount">
                        {formatMoney(amount, invoice.currency)}
                      </span>
                      {link ? (
                        <a
                          className="aced-invoice-row__link"
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="aced-panel aced-settings-card aced-settings-card--danger">
        <div className="aced-settings-card__inner">
          <VStack gap={2}>
            <Text size="xsm" color="secondary" className="aced-settings-kicker">
              Account
            </Text>
            <Heading level={3}>Delete account</Heading>
            <Text size="sm" color="secondary">
              Permanently remove your account, practice data, and cancel any
              active subscription.
            </Text>
          </VStack>
          <div className="aced-settings-actions">
            <button
              type="button"
              className="aced-mkt__btn aced-mkt__btn--danger aced-mkt__btn--lg aced-mkt__btn--block"
              disabled={pending !== null || isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </div>
      </section>
    </VStack>
  );
}
