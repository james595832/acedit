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

function stripeMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as {message: unknown}).message);
  }
  if (error instanceof Error) return error.message;
  return 'Checkout failed';
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {error: 'Auth is not configured', code: 'AUTH_NOT_CONFIGURED'},
        {status: 503},
      );
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            'Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO.',
          code: 'STRIPE_NOT_CONFIGURED',
        },
        {status: 503},
      );
    }

    const supabase = await createClient();
    const {
      data: {user},
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        {error: 'Sign in required', code: 'UNAUTHORIZED'},
        {status: 401},
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      trialDays?: number;
      plan?: string;
    };

    const trialDays =
      typeof body.trialDays === 'number' && body.trialDays > 0
        ? Math.min(body.trialDays, 30)
        : DEFAULT_TRIAL_DAYS;

    const {data: profile} = await supabase
      .from('profiles')
      .select(
        'stripe_customer_id, subscription_status, subscription_tier, email, full_name',
      )
      .eq('id', user.id)
      .maybeSingle();

    const status = profile?.subscription_status;
    if (status === 'trialing' || status === 'active') {
      return NextResponse.json({
        url: `${getAppUrl(request)}/studio?billing=already_active`,
      });
    }

    const stripe = getStripe();
    const priceId = getProPriceId();

    // Fail fast with a clear message if the price isn't in this Stripe mode
    try {
      await stripe.prices.retrieve(priceId);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            'Stripe price not found in Test mode. Open https://dashboard.stripe.com/test/products, create/copy the Pro price, and put the new price_… id in STRIPE_PRICE_ID_PRO.',
          code: 'PRICE_NOT_FOUND',
          detail: stripeMessage(error),
        },
        {status: 400},
      );
    }

    let customerId = profile?.stripe_customer_id ?? null;

    // Drop stale customer ids from Live mode when using Test keys
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ('deleted' in existing && existing.deleted) {
          customerId = null;
        }
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      // Prefer an existing Test-mode customer with this email
      const listed = await stripe.customers.list({email: user.email, limit: 1});
      if (listed.data[0]?.id) {
        customerId = listed.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: profile?.full_name ?? user.user_metadata?.full_name ?? undefined,
          metadata: {supabase_user_id: user.id},
        });
        customerId = customer.id;
      }
      await attachStripeCustomer(user.id, customerId);
    }

    const origin = getAppUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{price: priceId, quantity: 1}],
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          supabase_user_id: user.id,
          plan: body.plan ?? 'pro',
        },
      },
      metadata: {
        supabase_user_id: user.id,
        plan: body.plan ?? 'pro',
      },
      success_url: `${origin}/studio?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?billing=canceled`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        {error: 'Checkout session missing URL', code: 'CHECKOUT_ERROR'},
        {status: 500},
      );
    }

    return NextResponse.json({url: session.url});
  } catch (error) {
    console.error('[stripe/checkout]', error);
    return NextResponse.json(
      {
        error: stripeMessage(error),
        code: 'CHECKOUT_ERROR',
      },
      {status: 500},
    );
  }
}
