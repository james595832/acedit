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

function looksLikePersonName(value: string): boolean {
  const cleaned = value.trim();
  if (cleaned.length < 2) return false;
  if (/aced[\s_-]*it|acedit/i.test(cleaned)) return false;
  if (/^(qa|test|demo|user|admin)([\s._-]|$)/i.test(cleaned)) return false;
  if (/^\d+$/.test(cleaned)) return false;
  return true;
}

function formatFirstName(raw: string): string {
  const first = raw.trim().split(/[\s._+-]+/)[0] ?? '';
  if (!first || !looksLikePersonName(first)) return '';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Prefer a real given name; never greet with the product brand. */
function resolveGreetingName(input: {
  profileName?: string | null;
  metaName?: string | null;
  givenName?: string | null;
  email?: string | null;
}): string {
  for (const candidate of [
    input.givenName,
    input.profileName,
    input.metaName,
  ]) {
    if (!candidate) continue;
    const formatted = formatFirstName(candidate);
    if (formatted) return formatted;
  }

  const local = input.email?.split('@')[0] ?? '';
  const fromEmail = formatFirstName(local);
  if (fromEmail) return fromEmail;

  return 'there';
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
            ? 'Ready for your next interview?'
            : 'Design interview prep'}
        </h1>
        <p className="aced-home__lead">
          {hasPractice
            ? 'Another run sharpens the weak spots. Same format as last time — speak your answers, get scored.'
            : 'You’ve signed up to rehearse design interviews out loud. About 15 minutes. CV in, five questions, clear feedback.'}
        </p>
        {billingBanner ? (
          <p className="aced-masthead__note" role="status">
            {billingBanner}
          </p>
        ) : null}

        <div className="aced-home__actions">
          <Link className="aced-home__primary" href="/interview">
            {hasPractice ? 'Start interview' : 'Get started'}
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

      {!hasPractice ? (
        <>
          <section className="aced-home__how" aria-labelledby="aced-home-how">
            <h2 id="aced-home-how">How it works</h2>
            <ol className="aced-home__steps">
              <li>
                <span className="aced-home__step-num">1</span>
                <span>
                  <strong>Upload your CV</strong>
                  <span>PDF only. Add a job description if you have one.</span>
                </span>
              </li>
              <li>
                <span className="aced-home__step-num">2</span>
                <span>
                  <strong>Answer five questions out loud</strong>
                  <span>Use your mic. We transcribe and score each answer.</span>
                </span>
              </li>
              <li>
                <span className="aced-home__step-num">3</span>
                <span>
                  <strong>Review your results</strong>
                  <span>See what worked, what to fix, then practise again.</span>
                </span>
              </li>
            </ol>
          </section>

          <section className="aced-home__need" aria-labelledby="aced-home-need">
            <h2 id="aced-home-need">What you need</h2>
            <ul className="aced-home__need-list">
              <li>A quiet spot and a working microphone</li>
              <li>About 15 minutes uninterrupted</li>
              <li>Your design CV as a PDF</li>
            </ul>
          </section>
        </>
      ) : (
        <section className="aced-home__how" aria-labelledby="aced-home-how">
          <h2 id="aced-home-how">Each interview</h2>
          <ol className="aced-home__steps">
            <li>
              <span className="aced-home__step-num">1</span>
              <span>
                <strong>Prepare</strong>
                <span>CV ready — optional JD to sharpen the questions.</span>
              </span>
            </li>
            <li>
              <span className="aced-home__step-num">2</span>
              <span>
                <strong>Room</strong>
                <span>Five spoken answers. Scored before you move on.</span>
              </span>
            </li>
            <li>
              <span className="aced-home__step-num">3</span>
              <span>
                <strong>Debrief</strong>
                <span>Overall score and notes on every answer.</span>
              </span>
            </li>
          </ol>
        </section>
      )}
    </div>
  );
}
