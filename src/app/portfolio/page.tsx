import Link from 'next/link';
import {FeaturePaused} from '@/components/FeaturePaused';
import {isFeatureEnabled} from '@/lib/feature-flags';
import {Section} from '@astryxdesign/core/Section';
import {PortfolioReviewForm} from '@/components/PortfolioReviewForm';

export default function PortfolioPage() {
  if (!isFeatureEnabled('portfolio')) {
    return (
      <>
        <nav className="aced-crumb" aria-label="Breadcrumb">
          <Link href="/studio">← Home</Link>
        </nav>
        <FeaturePaused
          title="Portfolio review"
          lead="Case study checks and JD fit will come back once the interview loop is rock solid."
          roadmapHash="#next"
        />
      </>
    );
  }

  return (
    <>
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Home</Link>
      </nav>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <h1>Portfolio review</h1>
          <p className="aced-masthead__lead">
            We check whether your case studies tell a story a hiring manager
            can follow: process, role, and outcomes. Add a job description and
            we check the match too. No grade unless we can read enough to stand
            behind it.
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
