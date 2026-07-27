import {ProgressBar} from '@astryxdesign/core/ProgressBar';

type SessionProgressProps = {
  label: string;
  current: number;
  total: number;
  /** Optional short status, e.g. "Recording" or "Ready" */
  status?: string;
};

/** HubSpot / Wellfound-style journey progress: where you are, how much is left. */
export function SessionProgress({
  label,
  current,
  total,
  status,
}: SessionProgressProps) {
  const safeTotal = Math.max(total, 1);
  const clamped = Math.min(Math.max(current, 0), safeTotal);

  return (
    <div className="aced-progress" role="group" aria-label={label}>
      <div className="aced-progress__meta">
        <p className="aced-progress__label">
          {label}
          <span className="aced-progress__count">
            {clamped} / {safeTotal}
          </span>
        </p>
        {status ? (
          <p className="aced-progress__status">{status}</p>
        ) : null}
      </div>
      <ProgressBar
        label={label}
        isLabelHidden
        value={clamped}
        max={safeTotal}
        variant="accent"
      />
      <ol className="aced-progress__dots" aria-hidden="true">
        {Array.from({length: safeTotal}).map((_, i) => {
          const n = i + 1;
          const state =
            n < clamped ? 'done' : n === clamped ? 'current' : 'todo';
          return (
            <li
              key={n}
              className={`aced-progress__dot aced-progress__dot--${state}`}
            />
          );
        })}
      </ol>
    </div>
  );
}
