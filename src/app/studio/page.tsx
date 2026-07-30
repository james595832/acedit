import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import {isStripeConfigured} from '@/lib/stripe';
import {syncBillingFromCheckoutSession} from '@/lib/billing/sync';

type StudioPageProps = {
  searchParams: Promise<{billing?: string; session_id?: string}>;
};

export default async function StudioPage({searchParams}: StudioPageProps) {
  let firstName = 'there';
  let billingBanner: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();
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
          billingBanner = 'Trial started — you’re on Pro. Welcome in.';
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

  return (
    <div className="aced-studio">
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Studio · Home</p>
          <h1>You’re signed in, {firstName}.</h1>
          <p className="aced-masthead__lead">
            Studio is your home base. Start a practice run when you’re ready —
            prep, speak, then review scores in Results.
          </p>
          {billingBanner ? (
            <p className="aced-masthead__note" role="status">
              {billingBanner}
            </p>
          ) : null}
        </div>
      </header>

      <section className="aced-orient" aria-label="Where to go next">
        <article className="aced-orient__hero-path">
          <div className="aced-orient__hero-copy">
            <p className="aced-orient__status">Not started</p>
            <h2>Practice interview</h2>
            <p>
              Upload your CV and optional job description, get personalised
              questions, answer out loud, and see strong vs weak criteria.
            </p>
          </div>
          <Link className="aced-pill aced-pill--studio" href="/interview">
            Start practice
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
                <h2>Whiteboard challenges</h2>
                <p>
                  Timed design prompts with a marker canvas and a limited AI
                  interviewer for clarifying questions — practice under
                  pressure, then review your boards.
                </p>
                <Link className="aced-orient__cta" href="/whiteboard">
                  Open whiteboards →
                </Link>
              </div>
            </li>

            <li className="aced-orient__step">
              <span className="aced-orient__num" aria-hidden="true">
                03
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
