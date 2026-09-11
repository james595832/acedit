import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {isStripeConfigured} from '@/lib/stripe';
import {syncBillingFromCheckoutSession} from '@/lib/billing/sync';
import {
  demoUserId,
  getJobDescription,
  listSessions,
} from '@/lib/store';
import {resolveGreetingName} from '@/lib/greeting';
import {StudioDashboard} from '@/components/StudioDashboard';

type StudioPageProps = {
  searchParams: Promise<{billing?: string; session_id?: string}>;
};

export default async function StudioPage({searchParams}: StudioPageProps) {
  let billingBanner: string | null = null;
  let userId: string | null = null;
  let firstName = 'there';

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;

      let profileName: string | null = null;
      if (user) {
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
  const historyRows = await Promise.all(
    sessions.map(async (session) => {
      let role_title: string | null = null;
      let company_name: string | null = null;
      if (session.job_description_id && ownerId) {
        try {
          const jd = await getJobDescription(
            session.job_description_id,
            ownerId,
          );
          role_title = jd?.role_title ?? null;
          company_name = jd?.company_name ?? null;
        } catch {
          // decorative metadata
        }
      }
      return {
        id: session.id,
        overall_score: session.overall_score,
        created_at: session.created_at,
        role_title,
        company_name,
      };
    }),
  );

  return (
    <StudioDashboard
      firstName={firstName}
      billingBanner={billingBanner}
      sessions={historyRows}
    />
  );
}
