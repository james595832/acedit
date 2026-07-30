import {NextResponse} from 'next/server';
import type Stripe from 'stripe';
import {getStripe, isStripeConfigured} from '@/lib/stripe';
import {
  markProfileCanceled,
  upsertProfileFromSubscription,
} from '@/lib/billing/sync';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {error: 'Stripe is not configured'},
      {status: 503},
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      {error: 'STRIPE_WEBHOOK_SECRET is not configured'},
      {status: 503},
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({error: 'Missing signature'}, {status: 400});
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe/webhook] signature', error);
    return NextResponse.json({error: 'Invalid signature'}, {status: 400});
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subId);
          const userId =
            session.metadata?.supabase_user_id ??
            session.client_reference_id ??
            undefined;
          if (userId && !subscription.metadata?.supabase_user_id) {
            await stripe.subscriptions.update(subId, {
              metadata: {
                ...subscription.metadata,
                supabase_user_id: userId,
              },
            });
          }
          await upsertProfileFromSubscription(
            {
              ...subscription,
              metadata: {
                ...subscription.metadata,
                supabase_user_id:
                  subscription.metadata?.supabase_user_id ?? userId ?? '',
              },
            },
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id,
          );
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertProfileFromSubscription(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;
        await markProfileCanceled(customerId);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('[stripe/webhook] handler', event.type, error);
    return NextResponse.json({error: 'Webhook handler failed'}, {status: 500});
  }

  return NextResponse.json({received: true});
}
