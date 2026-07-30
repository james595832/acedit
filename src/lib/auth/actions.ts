'use server';

import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/admin';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {getStripe, isStripeConfigured} from '@/lib/stripe';

export type AuthActionState = {
  error: string | null;
};

function checkoutPath(trial: string, plan: string): string {
  const params = new URLSearchParams();
  if (trial) params.set('trial', trial);
  if (plan) params.set('plan', plan);
  const qs = params.toString();
  return qs
    ? `/api/stripe/checkout/redirect?${qs}`
    : '/api/stripe/checkout/redirect?trial=5&plan=pro';
}

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        'Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.',
    };
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/studio');

  if (!email || !password) {
    return {error: 'Email and password are required.'};
  }

  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithPassword({email, password});

  if (error) {
    return {error: error.message};
  }

  redirect(next.startsWith('/') ? next : '/studio');
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        'Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.',
    };
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const trial = String(formData.get('trial') ?? '').trim();
  const plan = String(formData.get('plan') ?? '').trim();
  const marketingConsent = formData.get('marketing_consent') === 'on';
  const wantsCheckout = plan === 'pro' || trial.length > 0;

  if (!email || !password) {
    return {error: 'Email and password are required.'};
  }

  if (password.length < 6) {
    return {error: 'Password must be at least 6 characters.'};
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const afterConfirm = wantsCheckout
    ? checkoutPath(trial || '5', plan || 'pro')
    : '/studio';

  const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || undefined,
        marketing_consent: marketingConsent,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(afterConfirm)}`,
    },
  });

  if (error) {
    return {error: error.message};
  }

  if (data.user) {
    await supabase
      .from('profiles')
      .update({
        marketing_consent: marketingConsent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.user.id);
  }

  if (data.session) {
    if (wantsCheckout && isStripeConfigured()) {
      redirect(checkoutPath(trial || '5', plan || 'pro'));
    }
    if (wantsCheckout && !isStripeConfigured()) {
      redirect('/settings?billing=stripe_missing');
    }
    redirect('/studio');
  }

  const login = new URL('/login', origin);
  login.searchParams.set('check_email', '1');
  login.searchParams.set('next', afterConfirm);
  redirect(`${login.pathname}?${login.searchParams.toString()}`);
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect('/login');
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function deleteAccount(): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {error: 'Auth is not configured.'};
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    return {
      error:
        'Account deletion needs SUPABASE_SERVICE_KEY in .env.local (Supabase → Settings → API → service_role).',
    };
  }

  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return {error: 'You must be signed in to delete your account.'};
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .maybeSingle();

  if (isStripeConfigured() && profile?.stripe_customer_id) {
    try {
      const stripe = getStripe();
      if (profile.stripe_subscription_id) {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } else {
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'all',
          limit: 10,
        });
        for (const sub of subs.data) {
          if (sub.status === 'active' || sub.status === 'trialing') {
            await stripe.subscriptions.cancel(sub.id);
          }
        }
      }
    } catch (error) {
      console.error('[deleteAccount] stripe cancel', error);
    }
  }

  const admin = createServiceClient();
  const {error} = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return {error: error.message};
  }

  await supabase.auth.signOut();
  redirect('/?account=deleted');
}
