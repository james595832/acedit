import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/supabase/config';

export default async function StudioPage() {
  let firstName = 'there';

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
    } catch {
      firstName = 'there';
    }
  }

  return (
    <>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Studio · Ready</p>
          <h1>You’re signed in, {firstName}.</h1>
          <p className="aced-masthead__lead">
            One clear next action: start a practice interview. Upload your CV when
            you begin — not before you know the path.
          </p>
        </div>
      </header>

      <section className="aced-orient" aria-label="Where to go next">
        <article className="aced-orient__hero-path">
          <p className="aced-orient__status">Not started</p>
          <h2>Practice interview</h2>
          <p>
            Upload your CV and optional job description, get personalised
            questions, answer out loud, and see strong vs weak criteria.
          </p>
          <Link className="aced-pill aced-pill--studio" href="/interview">
            Start practice
          </Link>
        </article>

        <ol className="aced-orient__steps">
          <li className="aced-orient__step">
            <span className="aced-orient__num" aria-hidden="true">
              02
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

          <li className="aced-orient__step">
            <span className="aced-orient__num" aria-hidden="true">
              03
            </span>
            <div className="aced-orient__body">
              <h2>How a session works</h2>
              <p>
                Analyse CV → optionally add a JD screenshot → record answers →
                get graded against your personal rubric for that role.
              </p>
              <p className="aced-orient__note">
                Tip: use Chrome or Edge so live listening can transcribe while
                you speak.
              </p>
            </div>
          </li>
        </ol>
      </section>
    </>
  );
}
