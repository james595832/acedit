import type {AtsAuditResult, AtsFlag} from '@/lib/cv-ats';

type CVAtsReportProps = {
  audit: AtsAuditResult;
};

const TONE: Record<
  AtsAuditResult['readiness'],
  {label: string; className: string}
> = {
  strong: {label: 'Strong ATS readiness', className: 'aced-ats--strong'},
  good: {label: 'Good ATS readiness', className: 'aced-ats--good'},
  fair: {label: 'Fair — some ATS risk', className: 'aced-ats--fair'},
  poor: {label: 'Poor ATS readiness', className: 'aced-ats--poor'},
};

function severityLabel(flag: AtsFlag): string {
  if (flag.severity === 'critical') return 'Critical';
  if (flag.severity === 'warning') return 'Warning';
  if (flag.severity === 'info') return 'Tip';
  return 'Pass';
}

export function CVAtsReport({audit}: CVAtsReportProps) {
  const tone = TONE[audit.readiness];
  const issues = audit.flags.filter((f) => f.severity !== 'pass');
  const passes = audit.flags.filter((f) => f.severity === 'pass');

  return (
    <section
      className={`aced-ats ${tone.className}`}
      aria-label="ATS compatibility check"
    >
      <div className="aced-ats__head">
        <div>
          <p className="aced-ats__kicker">ATS compatibility check</p>
          <h3 className="aced-ats__title">{tone.label}</h3>
          <p className="aced-ats__summary">{audit.summary}</p>
        </div>
        <p
          className="aced-ats__score"
          aria-label={`ATS readiness score ${audit.score} out of 100`}
        >
          {audit.score}
          <span>/100</span>
        </p>
      </div>

      <ul className="aced-ats__stats" aria-label="Parse stats">
        <li>{audit.stats.wordCount.toLocaleString()} words extracted</li>
        {audit.stats.pageCount ? (
          <li>
            {audit.stats.pageCount} page{audit.stats.pageCount === 1 ? '' : 's'}
            {audit.stats.charsPerPage
              ? ` · ~${audit.stats.charsPerPage} chars/page`
              : ''}
          </li>
        ) : null}
        {audit.stats.sectionsFound.length > 0 ? (
          <li>Sections: {audit.stats.sectionsFound.join(', ')}</li>
        ) : null}
      </ul>

      {issues.length > 0 ? (
        <ul className="aced-ats__flags">
          {issues.map((item) => (
            <li
              key={item.id}
              className={`aced-ats__flag aced-ats__flag--${item.severity}`}
            >
              <p className="aced-ats__flag-head">
                <span className="aced-ats__flag-sev">
                  {severityLabel(item)}
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
          <summary>What parsed cleanly ({passes.length})</summary>
          <ul>
            {passes.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="aced-ats__note">
        This mimics common ATS text extraction — not a guarantee any specific
        employer system will score you the same way. Use a clean PDF for
        applications; keep a designed version for your portfolio.
      </p>
    </section>
  );
}
