import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {getAuthUser} from '@/lib/supabase/user';
import {isStripeConfigured} from '@/lib/stripe';
import {syncBillingFromCheckoutSession} from '@/lib/billing/sync';
import {demoUserId, listSessions} from '@/lib/store';
import {resolveGreetingName} from '@/lib/greeting';
import {StudioDashboard} from '@/components/StudioDashboard';
import {historyTilesForSessions} from '@/lib/interview/history-tiles';

type StudioPageProps = {
  searchParams: Promise<{billing?: string; session_id?: string}>;
};

export default async function StudioPage({searchParams}: StudioPageProps) {
  let billingBanner: string | null = null;
  let userId: string | null = null;
  let firstName = 'there';

  if (isSupabaseConfigured()) {
    try {
      const user = await getAuthUser();
      userId = user?.id ?? null;

      let profileName: string | null = null;
      if (user) {
        const supabase = await createClient();
        const {data: profile} = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        profileName = (profile?.full_name as string | null) ?? null;
      }

      firstName = resolveGreetingName({
        profileName,
        metaName: (user?.user_metadata?.full_name as string | undefined) ?? null,
        givenName: (user?.user_metadata?.given_name as string | undefined) ?? null,
        email: user?.email ?? null,
      });

      const params = await searchParams;
      if (
        user &&
        params.billing === 'success' &&
        params.session_id &&
        isStripeConfigured()
      ) {
        try {
          await syncBillingFromCheckoutSession(params.session_id, user.id);
          billingBanner = 'Trial started. You’re on Pro. Welcome in!';
        } catch (error) {
          console.error('[studio] billing sync', error);
          billingBanner =
            'Payment received, but membership didn’t sync yet. Open Settings to refresh.';
        }
      } else if (params.billing === 'already_active') {
        billingBanner = 'You’re already on Pro.';
      }
    } catch {
      // keep page usable
    }
  }

  let sessions: Awaited<ReturnType<typeof listSessions>> = [];
  try {
    const statsUserId =
      userId ?? (isSupabaseConfigured() ? null : demoUserId());
    sessions = statsUserId ? await listSessions(statsUserId) : [];
  } catch {
    sessions = [];
  }

  const ownerId = userId ?? (isSupabaseConfigured() ? null : demoUserId());
  const historyRows = await historyTilesForSessions(sessions, ownerId);

  return (
    <StudioDashboard
      firstName={firstName}
      billingBanner={billingBanner}
      sessions={historyRows}
    />
  );
}
