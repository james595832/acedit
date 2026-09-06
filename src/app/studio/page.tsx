import Link from 'next/link';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/Layout';
import {Section} from '@astryxdesign/core/Section';
import {Banner} from '@astryxdesign/core/Banner';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {isStripeConfigured} from '@/lib/stripe';
import {syncBillingFromCheckoutSession} from '@/lib/billing/sync';
import {
  demoUserId,
  getJobDescription,
  listSessions,
} from '@/lib/store';
import {InterviewHistoryList} from '@/components/InterviewHistoryList';

type StudioPageProps = {
  searchParams: Promise<{billing?: string; session_id?: string}>;
};

export default async function StudioPage({searchParams}: StudioPageProps) {
  let billingBanner: string | null = null;
  let userId: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;

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
    <Section variant="transparent" padding={0}>
      <VStack gap={5} className="aced-interviews">
        <header className="aced-interviews__head">
          <div className="aced-interviews__title">
            <Heading level={1}>Interviews</Heading>
            <Text as="p" type="large">
              We will keep a list of your interviews here for you to review or
              retake
            </Text>
          </div>
          <Link className="aced-flow__btn" href="/interview">
            Create an interview
          </Link>
        </header>

        {billingBanner ? (
          <Banner status="success" title={billingBanner} />
        ) : null}

        {historyRows.length === 0 ? (
          <EmptyState
            headingLevel={2}
            title="No interviews yet"
            description="Create your first interview — pick a role or upload a CV, then add a job description if you have one."
            actions={
              <Link className="aced-flow__btn" href="/interview">
                Create an interview
              </Link>
            }
          />
        ) : (
          <InterviewHistoryList sessions={historyRows} />
        )}
      </VStack>
    </Section>
  );
}
