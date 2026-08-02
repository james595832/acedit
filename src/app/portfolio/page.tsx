import Link from 'next/link';
import {Section} from '@astryxdesign/core/Section';
import {PortfolioReviewForm} from '@/components/PortfolioReviewForm';

export default function PortfolioPage() {
  return (
    <>
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Studio</Link>
      </nav>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Prep · Portfolio</p>
          <h1>Portfolio review</h1>
          <p className="aced-masthead__lead">
            We check whether your case studies tell a hiring-manager-ready story
            — process, role, outcomes — and optionally how that lines up with a
            job description. No grade unless we can read enough to stand behind
            it.
          </p>
        </div>
      </header>
      <Section variant="transparent" padding={0}>
        <div className="aced-panel">
          <PortfolioReviewForm />
        </div>
      </Section>
    </>
  );
}
