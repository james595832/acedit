import type {ReactNode} from 'react';
import Link from 'next/link';

type LegalPageProps = {
  title: string;
  kicker: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPage({
  title,
  kicker,
  lastUpdated,
  children,
}: LegalPageProps) {
  return (
    <article className="aced-legal">
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="aced-masthead__lead">
            Last updated {lastUpdated}. Questions?{' '}
            <a href="mailto:support@acedit.app">support@acedit.app</a>
          </p>
        </div>
      </header>
      <div className="aced-legal__body">{children}</div>
      <nav className="aced-legal__nav" aria-label="Legal">
        <Link href="/roadmap">Roadmap</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms &amp; Conditions</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </article>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="aced-legal__section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
