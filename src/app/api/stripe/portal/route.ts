import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {getAppUrl, getStripe, isStripeConfigured} from '@/lib/stripe';
import {isSupabaseConfigured} from '@/lib/supabase/config';

export const runtime = 'nodejs';

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
          error: 'Stripe is not configured',
          code: 'STRIPE_NOT_CONFIGURED',
        },
        {status: 503},
      );
    }

    const supabase = await createClient();
    const {
      data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {error: 'Sign in required', code: 'UNAUTHORIZED'},
        {status: 401},
      );
    }

    const {data: profile} = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        {
          error: 'No billing account yet. Start a trial first.',
          code: 'NO_CUSTOMER',
        },
        {status: 400},
      );
    }

    const stripe = getStripe();
    const origin = getAppUrl(request);
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings?billing=portal_return`,
    });

    return NextResponse.json({url: portal.url});
  } catch (error) {
    console.error('[stripe/portal]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Portal failed',
        code: 'PORTAL_ERROR',
      },
      {status: 500},
    );
  }
}
