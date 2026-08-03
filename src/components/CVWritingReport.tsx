import type {WritingAuditResult, WritingFlag} from '@/lib/cv-writing-audit';

type CVWritingReportProps = {
  audit: WritingAuditResult;
};

const TONE: Record<
  WritingAuditResult['polishRisk'],
  {label: string; className: string}
> = {
  low: {label: 'Reads human & specific', className: 'aced-writing--low'},
  medium: {label: 'Some generic phrasing', className: 'aced-writing--medium'},
  high: {label: 'High template / AI-polish risk', className: 'aced-writing--high'},
};

function severityLabel(flag: WritingFlag): string {
  if (flag.severity === 'warning') return 'Flag';
  if (flag.severity === 'info') return 'Tip';
  return 'Pass';
}

export function CVWritingReport({audit}: CVWritingReportProps) {
  const tone = TONE[audit.polishRisk];
  const issues = audit.flags.filter((f) => f.severity !== 'pass');
  const passes = audit.flags.filter((f) => f.severity === 'pass');

  return (
    <section
      className={`aced-ats aced-writing ${tone.className}`}
      aria-label="Writing authenticity check"
    >
      <div className="aced-ats__head">
        <div>
          <p className="aced-ats__kicker">Writing check</p>
          <h3 className="aced-ats__title">{tone.label}</h3>
          <p className="aced-ats__summary">{audit.summary}</p>
        </div>
        <p
          className="aced-ats__score"
          aria-label={`Authenticity score ${audit.authenticityScore} out of 100`}
        >
          {audit.authenticityScore}
          <span>/100</span>
        </p>
      </div>

      <ul className="aced-ats__stats" aria-label="Writing stats">
        <li>{audit.stats.metricMentions} quantified mentions</li>
        <li>{audit.stats.aiPhraseHits} template-style phrases</li>
        <li>{audit.stats.buzzwordHits} generic buzzwords</li>
      </ul>

      {issues.length > 0 ? (
        <ul className="aced-ats__flags">
          {issues.map((item) => (
            <li
              key={item.id}
              className={`aced-ats__flag aced-ats__flag--${item.severity === 'warning' ? 'critical' : 'warning'}`}
            >
              <p className="aced-ats__flag-head">
                <span className="aced-ats__flag-sev">{severityLabel(item)}</span>
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
          <summary>What reads well ({passes.length})</summary>
          <ul>
            {passes.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="aced-ats__note">
        This is <strong>not</strong> forensic AI detection. No tool can prove
        who wrote a CV. We flag generic, template-like language recruiters
        often associate with AI polish. Use your judgment.
      </p>
    </section>
  );
}
