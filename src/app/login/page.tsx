import {Suspense} from 'react';
import {Section} from '@astryxdesign/core/Section';
import {SignInForm} from '@/components/SignInForm';
import {isSupabaseConfigured} from '@/lib/supabase/config';

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="aced-auth">
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Account</p>
          <h1>Sign in</h1>
          <p className="aced-masthead__lead">
            Pick up your CVs, sessions, and feedback where you left off.
          </p>
        </div>
      </header>
      <Section variant="transparent" padding={0}>
        <div className="aced-panel">
          <Suspense fallback={<p className="aced-loading">One moment…</p>}>
            <SignInForm configured={configured} />
          </Suspense>
        </div>
      </Section>
    </div>
  );
}
