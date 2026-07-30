import {Section} from '@astryxdesign/core/Section';
import {SignUpForm} from '@/components/SignUpForm';
import {isSupabaseConfigured} from '@/lib/supabase/config';

type SignUpPageProps = {
  searchParams: Promise<{trial?: string; plan?: string}>;
};

export default async function SignUpPage({searchParams}: SignUpPageProps) {
  const configured = isSupabaseConfigured();
  const params = await searchParams;
  const trialDays = Math.min(
    Math.max(Number(params.trial ?? 5) || 5, 1),
    30,
  );
  const plan = params.plan === 'pro' ? 'pro' : 'pro';

  return (
    <>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Account</p>
          <h1>Create account</h1>
          <p className="aced-masthead__lead">
            {trialDays}-day free trial of Pro — £0 today, then £7.50 / mo
            ($9.99). You’ll add a card on the next step, then start practice.
          </p>
        </div>
      </header>
      <Section maxWidth={480} variant="transparent" padding={0}>
        <div className="aced-panel">
          <SignUpForm
            configured={configured}
            trialDays={trialDays}
            plan={plan}
          />
        </div>
      </Section>
    </>
  );
}
