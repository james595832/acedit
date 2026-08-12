'use client';

import Link from 'next/link';
import {Dialog} from '@astryxdesign/core/Dialog';

type PricingTrialDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const TIMELINE = [
  {
    day: 'Today',
    title: 'Start free',
    detail: 'Full access. Practice interviews with your CV. £0 today.',
  },
  {
    day: 'Day 4',
    title: 'Friendly reminder',
    detail: 'We’ll email you before billing starts so nothing is a surprise.',
  },
  {
    day: 'Day 5',
    title: 'Membership begins',
    detail: '£7.50 a month (or $9.99). Cancel any time before then.',
  },
] as const;

const FEATURES = [
  'Made for design interviews only, not coding',
  'Questions built from your CV',
  'Answer out loud and get clear feedback',
  'Design whiteboard challenges in one place',
  'Cancel any time, before or after the trial',
] as const;

export function PricingTrialDialog({
  isOpen,
  onOpenChange,
}: PricingTrialDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={720}
      maxHeight="90dvh"
      purpose="info"
      className="aced-trial-dialog"
    >
      <div className="aced-trial-dialog__shell">
        <button
          type="button"
          className="aced-trial-dialog__close"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="aced-trial-dialog__grid">
          <header className="aced-trial-dialog__intro">
            <p className="aced-trial-dialog__kicker">5-day free trial</p>
            <h2 className="aced-trial-dialog__title">
              Start practicing. Nothing charged today.
            </h2>
            <p className="aced-trial-dialog__lead">
              One plan. Clear timeline. Keep it only if it helps.
            </p>
          </header>

          <aside className="aced-trial-dialog__aside" aria-label="Plan summary">
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

          <div className="aced-trial-dialog__body">
            <ul className="aced-trial-dialog__features">
              {FEATURES.map(item => (
                <li key={item}>
                  <span className="aced-trial-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="aced-trial-dialog-cta">
              <Link
                href="/signup?trial=5&plan=pro"
                className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg aced-mkt__btn--block"
                onClick={() => onOpenChange(false)}
              >
                Continue to create account
              </Link>
              <p className="aced-trial-fineprint">
                Stripe Checkout collects your card after account setup. You
                won&apos;t be charged today, and you can cancel any time in
                Settings. By continuing you agree to our{' '}
                <Link href="/terms" onClick={() => onOpenChange(false)}>
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" onClick={() => onOpenChange(false)}>
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
