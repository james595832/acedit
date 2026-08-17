import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {isStripeConfigured} from '@/lib/stripe';
import {syncBillingFromCheckoutSession} from '@/lib/billing/sync';
import {demoUserId, listSessions} from '@/lib/store';
import {listWhiteboardSessions} from '@/lib/whiteboard/sessions';

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
  let whiteboardRuns = 0;
  let whiteboardAvg: number | null = null;
  let lastActivity: string | null = null;
  try {
    const statsUserId =
      userId ?? (isSupabaseConfigured() ? null : demoUserId());
    const [interviewSessions, whiteboardSessions] = await Promise.all([
      statsUserId ? listSessions(statsUserId) : Promise.resolve([]),
      userId ? listWhiteboardSessions(userId) : Promise.resolve([]),
    ]);
    practiceRuns = interviewSessions.length;
    whiteboardRuns = whiteboardSessions.length;
    if (whiteboardSessions.length > 0) {
      whiteboardAvg = Math.round(
        whiteboardSessions.reduce((sum, s) => sum + s.score, 0) /
          whiteboardSessions.length,
      );
    }
    const dates = [
      ...interviewSessions.map((s) => s.created_at),
      ...whiteboardSessions.map((s) => s.createdAt),
    ].sort();
    lastActivity = dates.at(-1) ?? null;
  } catch {
    // stats are decorative — never block the page on them
  }

  const isFirstRun = practiceRuns === 0 && whiteboardRuns === 0;

  return (
    <div className="aced-studio">
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <h1>You’re signed in, {firstName}.</h1>
          <p className="aced-masthead__lead">
            Studio is your home base. Start a practice run when you’re ready.
            Prep, speak, then review your scores in Results.
          </p>
          {billingBanner ? (
            <p className="aced-masthead__note" role="status">
              {billingBanner}
            </p>
          ) : null}
        </div>
      </header>

      {isFirstRun ? (
        <section className="aced-studio-hello" aria-label="Getting started">
          <p className="aced-studio-hello__kicker">New here?</p>
          <p className="aced-studio-hello__copy">
            Start with a practice interview. Upload your CV, answer five
            questions out loud, and see your first scores in about 15 minutes.
          </p>
        </section>
      ) : (
        <section className="aced-studio-stats" aria-label="Your progress">
          <div className="aced-studio-stats__item">
            <span className="aced-studio-stats__value">{practiceRuns}</span>
            <span className="aced-studio-stats__label">
              Practice {practiceRuns === 1 ? 'run' : 'runs'}
            </span>
          </div>
          <div className="aced-studio-stats__item">
            <span className="aced-studio-stats__value">{whiteboardRuns}</span>
            <span className="aced-studio-stats__label">
              {whiteboardRuns === 1 ? 'Whiteboard' : 'Whiteboards'}
            </span>
          </div>
          {whiteboardAvg !== null ? (
            <div className="aced-studio-stats__item">
              <span className="aced-studio-stats__value">{whiteboardAvg}</span>
              <span className="aced-studio-stats__label">Avg board score</span>
            </div>
          ) : null}
          {lastActivity ? (
            <div className="aced-studio-stats__item">
              <span className="aced-studio-stats__value aced-studio-stats__value--sm">
                {daysAgoLabel(lastActivity)}
              </span>
              <span className="aced-studio-stats__label">Last practiced</span>
            </div>
          ) : null}
        </section>
      )}

      <section className="aced-orient" aria-label="Where to go next">
        <article className="aced-orient__hero-path">
          <div className="aced-orient__hero-copy">
            <p className="aced-orient__status">
              {practiceRuns > 0 ? 'Keep going' : 'Not started'}
            </p>
            <h2>Practice interview</h2>
            <p>
              Upload your CV and optional job description, get personalised
              questions, answer out loud, and see strong vs weak criteria.
            </p>
          </div>
          <div className="aced-orient__art" aria-hidden="true">
            <span className="aced-art-voice">
              <span className="aced-art-voice__mic" />
              <span className="aced-art-voice__bars">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="aced-art-voice__time">0:42</span>
            </span>
          </div>
          <Link className="aced-pill aced-pill--studio" href="/interview">
            {practiceRuns > 0 ? 'Practice again' : 'Start practice'}
          </Link>
        </article>

        <div className="aced-orient__rail">
          <p className="aced-orient__rail-label">Also available</p>
          <ol className="aced-orient__steps">
            <li className="aced-orient__step">
              <span className="aced-orient__num" aria-hidden="true">
                02
              </span>
              <div className="aced-orient__body">
                <h2>Portfolio review</h2>
                <p>
                  Check whether your case studies are hire-ready and match a
                  target job, before you apply.
                </p>
                <Link className="aced-orient__cta" href="/portfolio">
                  Review portfolio →
                </Link>
              </div>
            </li>

            <li className="aced-orient__step">
              <span className="aced-orient__num" aria-hidden="true">
                03
              </span>
              <div className="aced-orient__body">
                <h2>Whiteboard challenges</h2>
                <p>
                  Timed design prompts with a marker canvas and an AI
                  interviewer for clarifying questions. Practice under
                  pressure, then review your boards.
                </p>
                <Link className="aced-orient__cta" href="/whiteboard">
                  Open whiteboards →
                </Link>
              </div>
            </li>

            <li className="aced-orient__step">
              <span className="aced-orient__num" aria-hidden="true">
                04
              </span>
              <div className="aced-orient__body">
                <h2>Review results</h2>
                <p>
                  Revisit scores, transcripts, and must-cover feedback from
                  sessions you’ve already run.
                </p>
                <Link className="aced-orient__cta" href="/interview/results">
                  Open results →
                </Link>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
