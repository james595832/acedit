import type {Metadata} from 'next';
import Link from 'next/link';
import {SUPPORT_EMAIL} from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Contact | ACED-IT',
  description: 'Contact ACED-IT support at support@acedit.app.',
};

export default function ContactPage() {
  return (
    <article className="aced-legal">
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Help · Contact</p>
          <h1>Contact us</h1>
          <p className="aced-masthead__lead">
            Account, billing, privacy, or product questions. We read every
            message.
          </p>
        </div>
      </header>

      <div className="aced-legal__body">
        <section className="aced-legal__section">
          <h2>Email</h2>
          <p>
            <a className="aced-contact__email" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>
            We aim to reply within two business days (UK time). Billing and account
            security issues are prioritised.
          </p>
        </section>

        <section className="aced-legal__section">
          <h2>In-app feedback</h2>
          <p>
            Signed in? Use the <strong>Feedback</strong> button at the bottom
            right of the app. Feature ideas, bugs, and performance notes go
            straight to the team.
          </p>
        </section>

        <section className="aced-legal__section">
          <h2>What to include</h2>
          <ul>
            <li>The email address on your ACED-IT account</li>
            <li>A short description of the issue</li>
            <li>Screenshots or session IDs if relevant</li>
            <li>For billing: date of charge and last four digits of card (never full card numbers)</li>
          </ul>
        </section>

        <section className="aced-legal__section">
          <h2>Other enquiries</h2>
          <ul>
            <li>
              <strong>Privacy &amp; data rights:</strong> see our{' '}
              <Link href="/privacy">Privacy Policy</Link> or email us with
              “Privacy request” in the subject line.
            </li>
            <li>
              <strong>Terms of use:</strong>{' '}
              <Link href="/terms">Terms &amp; Conditions</Link>
            </li>
            <li>
              <strong>Cancel or manage subscription:</strong> Settings in the
              app, or email us if you cannot access your account.
            </li>
          </ul>
        </section>
      </div>

      <nav className="aced-legal__nav" aria-label="Legal">
        <Link href="/roadmap">Roadmap</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms &amp; Conditions</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </article>
  );
}
