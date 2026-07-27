import {Section} from '@astryxdesign/core/Section';
import {SignUpForm} from '@/components/SignUpForm';
import {isSupabaseConfigured} from '@/lib/supabase/config';

export default function SignUpPage() {
  const configured = isSupabaseConfigured();

  return (
    <>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Account</p>
          <h1>Create account</h1>
          <p className="aced-masthead__lead">
            Free to start. Confirm email if asked, then run personalised practice
            interviews.
          </p>
        </div>
      </header>
      <Section maxWidth={480} variant="transparent" padding={0}>
        <div className="aced-panel">
          <SignUpForm configured={configured} />
        </div>
      </Section>
    </>
  );
}
