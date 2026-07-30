import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {
  DEFAULT_TRIAL_DAYS,
  getAppUrl,
  getProPriceId,
  getStripe,
  isStripeConfigured,
} from '@/lib/stripe';
import {attachStripeCustomer} from '@/lib/billing/sync';
import {isSupabaseConfigured} from '@/lib/supabase/config';

export const runtime = 'nodejs';

/**
 * Browser-friendly entry: creates a Checkout session and redirects.
 * Used after signup / login when ?trial=&plan= are present.
 */
export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const origin = getAppUrl(request);
  const trialParam = Number(searchParams.get('trial') ?? DEFAULT_TRIAL_DAYS);
  const trialDays =
    Number.isFinite(trialParam) && trialParam > 0
      ? Math.min(trialParam, 30)
      : DEFAULT_TRIAL_DAYS;
  const plan = searchParams.get('plan') ?? 'pro';

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user?.email) {
    const login = new URL('/login', origin);
    login.searchParams.set(
      'next',
      `/api/stripe/checkout/redirect?trial=${trialDays}&plan=${plan}`,
    );
    return NextResponse.redirect(login);
  }

  if (!isStripeConfigured()) {
    return NextResponse.redirect(
      new URL('/settings?billing=stripe_missing', origin),
    );
  }

  try {
    const {data: profile} = await supabase
      .from('profiles')
      .select(
        'stripe_customer_id, subscription_status, full_name',
      )
      .eq('id', user.id)
      .maybeSingle();

    if (
      profile?.subscription_status === 'trialing' ||
      profile?.subscription_status === 'active'
    ) {
      return NextResponse.redirect(
        new URL('/studio?billing=already_active', origin),
      );
    }

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? user.user_metadata?.full_name ?? undefined,
        metadata: {supabase_user_id: user.id},
      });
      customerId = customer.id;
      await attachStripeCustomer(user.id, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{price: getProPriceId(), quantity: 1}],
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {supabase_user_id: user.id, plan},
      },
      metadata: {supabase_user_id: user.id, plan},
      success_url: `${origin}/studio?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?billing=canceled`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.redirect(
        new URL('/settings?billing=checkout_error', origin),
      );
    }

    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error('[stripe/checkout/redirect]', error);
    return NextResponse.redirect(
      new URL('/settings?billing=checkout_error', origin),
    );
  }
}
