import {redirect} from 'next/navigation';

type SignUpPageProps = {
  searchParams: Promise<{trial?: string; plan?: string}>;
};

/** Canonical signup is the full-page trial flow at /start. */
export default async function SignUpPage({searchParams}: SignUpPageProps) {
  const params = await searchParams;
  const next = new URLSearchParams();
  if (params.trial) next.set('trial', params.trial);
  if (params.plan) next.set('plan', params.plan);
  const qs = next.toString();
  redirect(qs ? `/start?${qs}` : '/start');
}
