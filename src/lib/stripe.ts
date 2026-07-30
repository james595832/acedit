import Stripe from 'stripe';

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_PRO,
  );
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return new Stripe(key, {
    apiVersion: '2025-08-27.basil',
    typescript: true,
  });
}

function configuredOrigins(): string[] {
  const origins = new Set<string>();
  const primary = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '').trim();
  if (primary) origins.add(primary);

  for (const part of (process.env.ALLOWED_APP_ORIGINS ?? '').split(',')) {
    const origin = part.trim().replace(/\/$/, '');
    if (origin) origins.add(origin);
  }

  if (process.env.NODE_ENV !== 'production') {
    for (const port of [3000, 3001, 3002, 3003]) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }

  return [...origins];
}

function isLocalDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string): boolean {
  const allowed = configuredOrigins();
  if (allowed.includes(origin)) return true;
  return isLocalDevOrigin(origin);
}

/**
 * Public site origin for Stripe return URLs.
 * Only returns origins from an allowlist (NEXT_PUBLIC_APP_URL + ALLOWED_APP_ORIGINS).
 * Never trusts bare X-Forwarded-Host alone.
 */
export function getAppUrl(request?: Request): string {
  const allowed = configuredOrigins();
  const fallback = allowed[0] || 'http://localhost:3000';

  if (!request) return fallback;

  const candidates: string[] = [];

  try {
    candidates.push(new URL(request.url).origin);
  } catch {
    /* ignore */
  }

  const originHeader = request.headers.get('origin');
  if (originHeader) {
    try {
      candidates.push(new URL(originHeader).origin);
    } catch {
      /* ignore */
    }
  }

  // Only accept forwarded host when the constructed origin is allowlisted.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0]?.trim();
    const proto =
      forwardedProto?.split(',')[0]?.trim() ||
      (host?.includes('localhost') || host?.startsWith('127.0.0.1')
        ? 'http'
        : 'https');
    if (host) candidates.push(`${proto}://${host}`);
  }

  for (const candidate of candidates) {
    if (isAllowedOrigin(candidate)) return candidate;
  }

  return fallback;
}

export function getProPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID_PRO;
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID_PRO is not configured');
  }
  return priceId;
}

export const DEFAULT_TRIAL_DAYS = 5;

export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export function tierFromStatus(
  status: string | null | undefined,
): 'free' | 'pro' {
  if (status === 'trialing' || status === 'active' || status === 'past_due') {
    return 'pro';
  }
  return 'free';
}
