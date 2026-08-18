import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {isStripeConfigured} from '@/lib/stripe';
import {syncBillingFromCheckoutSession} from '@/lib/billing/sync';
import {demoUserId, listSessions} from '@/lib/store';

type StudioPageProps = {
  searchParams: Promise<{billing?: string; session_id?: string}>;
};

function daysAgoLabel(iso: string): string {
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default async function StudioPage({searchParams}: StudioPageProps) {
  let firstName = 'there';
  let billingBanner: string | null = null;
  let userId: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
      const metaName = user?.user_metadata?.full_name as string | undefined;
      const emailName = user?.email?.split('@')[0];
      const raw = metaName?.trim() || emailName || 'there';
      firstName = raw.split(/\s+/)[0] ?? 'there';

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
      firstName = 'there';
    }
  }

  let practiceRuns = 0;
  let lastSessionId: string | null = null;
  let lastSessionScore: number | null = null;
  let lastActivity: string | null = null;

  try {
    const statsUserId =
      userId ?? (isSupabaseConfigured() ? null : demoUserId());
    const interviewSessions = statsUserId
      ? await listSessions(statsUserId)
      : [];
    practiceRuns = interviewSessions.length;
    const latest = interviewSessions[0] ?? null;
    if (latest) {
      lastSessionId = latest.id;
      lastSessionScore =
        latest.overall_score === null || latest.overall_score === undefined
          ? null
          : Math.round(Number(latest.overall_score));
      lastActivity = latest.created_at;
    }
  } catch {
    // stats are decorative — never block the page on them
  }

  const hasPractice = practiceRuns > 0;
  const resultsHref = lastSessionId
    ? `/interview/results?session_id=${lastSessionId}`
    : null;

  return (
    <div className="aced-home">
      <header className="aced-home__hero">
        <p className="aced-home__hello">Hi {firstName}</p>
        <h1>
          {hasPractice
            ? 'Ready for another practice?'
            : 'Ready for a 15-minute practice?'}
        </h1>
        <p className="aced-home__lead">
          {hasPractice
            ? 'Answer out loud. Get scored. Improve the weak spots.'
            : 'Upload your CV, answer five questions out loud, and get clear feedback.'}
        </p>
        {billingBanner ? (
          <p className="aced-masthead__note" role="status">
            {billingBanner}
          </p>
        ) : null}

        <div className="aced-home__actions">
          <Link className="aced-home__primary" href="/interview">
            Start interview
          </Link>
          {resultsHref ? (
            <Link className="aced-home__secondary" href={resultsHref}>
              {lastSessionScore !== null
                ? `Last score · ${lastSessionScore}`
                : 'Last session'}
              {lastActivity ? ` · ${daysAgoLabel(lastActivity)}` : ''}
            </Link>
          ) : null}
        </div>
      </header>

      <section className="aced-home__more" aria-label="Coming next">
        <p className="aced-home__more-label">Coming next</p>
        <ul className="aced-home__more-list">
          <li>
            <Link href="/roadmap#september-2026">
              <span className="aced-home__more-title">Whiteboard</span>
              <span className="aced-home__more-meta">On the roadmap</span>
            </Link>
          </li>
          <li>
            <Link href="/roadmap#september-2026">
              <span className="aced-home__more-title">Portfolio review</span>
              <span className="aced-home__more-meta">On the roadmap</span>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
