import type {
  PortfolioAuditResult,
  PortfolioJdFit,
} from '@/lib/portfolio/types';

type PortfolioReportProps = {
  audit: PortfolioAuditResult;
  jdFit: PortfolioJdFit | null;
  extract: {
    wordCount: number;
    confidence: string;
    pageTitle: string | null;
    blockedReason: string | null;
  };
  stub?: boolean;
};

const TONE: Record<
  NonNullable<PortfolioAuditResult['readiness']>,
  {label: string; className: string}
> = {
  strong: {label: 'Interview-ready portfolio', className: 'aced-ats--strong'},
  good: {label: 'Good, minor gaps', className: 'aced-ats--good'},
  fair: {label: 'Fair, tighten before applying', className: 'aced-ats--fair'},
  poor: {label: 'Not ready to send', className: 'aced-ats--poor'},
};

function severityLabel(severity: string): string {
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Warning';
  if (severity === 'info') return 'Tip';
  return 'Pass';
}

export function PortfolioReport({
  audit,
  jdFit,
  extract,
  stub,
}: PortfolioReportProps) {
  const issues = audit.flags.filter((f) => f.severity !== 'pass');
  const passes = audit.flags.filter((f) => f.severity === 'pass');
  const tone =
    audit.readiness && audit.canScore ? TONE[audit.readiness] : null;

  return (
    <section className="aced-portfolio-report" aria-label="Portfolio review">
      {extract.confidence === 'low' ? (
        <p className="aced-ats__note" role="status">
          Partial read ({extract.wordCount.toLocaleString()} words), so the
          score is a rough guide. Paste full case study text for a review you
          can trust.
        </p>
      ) : null}

      <section
        className={`aced-ats ${tone?.className ?? 'aced-ats--fair'}`}
        aria-label="Portfolio quality"
      >
        <div className="aced-ats__head">
          <div>
            <p className="aced-ats__kicker">Portfolio review</p>
            <h3 className="aced-ats__title">
              {tone?.label ?? 'Review complete'}
            </h3>
            <p className="aced-ats__summary">{audit.summary}</p>
            {audit.llmNote ? (
              <p className="aced-ats__note">{audit.llmNote}</p>
            ) : null}
          </div>
          {audit.canScore && audit.score !== null ? (
            <p
              className="aced-ats__score"
              aria-label={`Portfolio readiness score ${audit.score} out of 100`}
            >
              {audit.score}
              <span>/100</span>
            </p>
          ) : (
            <p className="aced-ats__score aced-ats__score--muted">—</p>
          )}
        </div>

        <ul className="aced-ats__stats" aria-label="Portfolio stats">
          <li>{extract.wordCount.toLocaleString()} words analysed</li>
          {extract.pageTitle ? <li>Page: {extract.pageTitle}</li> : null}
          {audit.stats.caseStudyCount > 0 ? (
            <li>
              {audit.stats.caseStudyCount} case stud
              {audit.stats.caseStudyCount === 1 ? 'y' : 'ies'} detected
            </li>
          ) : null}
          <li>{audit.stats.processSignals} process signals</li>
          <li>{audit.stats.metricMentions} outcome metrics</li>
        </ul>

        {audit.caseStudies.length > 0 ? (
          <p className="aced-ats__note">
            Projects spotted: {audit.caseStudies.slice(0, 4).join(' · ')}
          </p>
        ) : null}

        {issues.length > 0 ? (
          <ul className="aced-ats__flags">
            {issues.map((item) => (
              <li
                key={item.id}
                className={`aced-ats__flag aced-ats__flag--${item.severity}`}
              >
                <p className="aced-ats__flag-head">
                  <span className="aced-ats__flag-sev">
                    {severityLabel(item.severity)}
                  </span>
                  <strong>{item.title}</strong>
                </p>
                <p className="aced-ats__flag-detail">{item.detail}</p>
                <p className="aced-ats__flag-fix">
                  <span>Fix</span> {item.fix}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {passes.length > 0 ? (
          <details className="aced-ats__passes">
            <summary>What is working ({passes.length})</summary>
            <ul>
              {passes.map((item) => (
                <li key={item.id}>{item.title}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {jdFit?.canAssess && jdFit.matchScore !== null ? (
        <section
          className="aced-ats aced-ats--good aced-portfolio-report__fit"
          aria-label="Role fit"
        >
          <div className="aced-ats__head">
            <div>
              <p className="aced-ats__kicker">Role fit</p>
              <h3 className="aced-ats__title">Portfolio vs job description</h3>
              <p className="aced-ats__summary">{jdFit.summary}</p>
            </div>
            <p
              className="aced-ats__score"
              aria-label={`Role fit score ${jdFit.matchScore} out of 100`}
            >
              {jdFit.matchScore}
              <span>/100</span>
            </p>
          </div>
          {jdFit.aligned.length > 0 ? (
            <p className="aced-ats__note">
              Aligned: {jdFit.aligned.join(', ')}
            </p>
          ) : null}
          {jdFit.gaps.length > 0 ? (
            <p className="aced-ats__note">
              Gaps to address: {jdFit.gaps.slice(0, 4).join(', ')}
            </p>
          ) : null}
        </section>
      ) : jdFit && !jdFit.canAssess ? (
        <p className="aced-ats__note">{jdFit.summary}</p>
      ) : null}

      {stub ? (
        <p className="aced-ats__note">
          Heuristic review only. Add an Anthropic API key for a hiring-manager
          advisory pass on top of these checks.
        </p>
      ) : null}
    </section>
  );
}
