import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {SignUpForm} from '@/components/SignUpForm';
import {isSupabaseConfigured} from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Start free trial | ACED-IT',
  description:
    'Create your ACED-IT account and start a 5-day Pro trial. £0 today.',
};

const BENEFITS = [
  'Questions built from your CV',
  'Practice answers out loud with clear scores',
  'Cancel any time before Day 5',
] as const;

const TIMELINE = [
  {
    day: 'Today',
    title: 'Start free',
    detail: 'Full Pro access. £0 today.',
  },
  {
    day: 'Day 4',
    title: 'Friendly reminder',
    detail: 'We’ll email you before billing starts.',
  },
  {
    day: 'Day 5',
    title: 'Membership begins',
    detail: '£7.50 a month (or $9.99). Cancel any time.',
  },
] as const;

export default function StartPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="aced-start">
      <header className="aced-start__nav">
        <Link href="/" className="aced-start__logo" aria-label="ACED-IT home">
          <Image
            src="/ACED-IT.svg"
            alt="ACED-IT"
            width={118}
            height={21}
            priority
          />
        </Link>
        <p className="aced-start__nav-end">
          Already have an account?{' '}
          <Link href="/login">Sign in</Link>
        </p>
      </header>

      <main className="aced-start__main">
        <header className="aced-start__intro" aria-labelledby="aced-start-title">
          <p className="aced-start__kicker">5-day free trial</p>
          <h1 id="aced-start-title">Create your account</h1>
          <p className="aced-start__lead">
            Start practicing today. Nothing charged until the trial ends.
          </p>

          <ul className="aced-start__benefits">
            {BENEFITS.map(item => (
              <li key={item}>
                <span className="aced-trial-check" aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </header>

        <aside className="aced-start__aside" aria-label="Plan summary">
          <div className="aced-price-panel">
            <div className="aced-price-panel__top">
              <p className="aced-price-panel__name">ACED-IT Pro</p>
              <p className="aced-price-panel__price">
                <span>£7.50</span>
                <small>/ mo</small>
              </p>
            </div>
            <p className="aced-price-panel__alt">
              Or $9.99 a month · Billed after the trial
            </p>
            <p className="aced-price-panel__due">
              <strong>Due today</strong>
              <span>£0.00</span>
            </p>
          </div>

          <ol className="aced-trial-timeline">
            {TIMELINE.map((step, index) => (
              <li key={step.day}>
                <span className="aced-trial-day">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="aced-trial-timeline__title">
                    {step.day}: {step.title}
                  </p>
                  <p className="aced-trial-timeline__detail">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        <section className="aced-start__form" aria-label="Create account">
          <SignUpForm
            configured={configured}
            trialDays={5}
            plan="pro"
            variant="start"
          />
        </section>
      </main>
    </div>
  );
}
