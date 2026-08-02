'use client';

import {Suspense, useEffect, useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {Banner} from '@astryxdesign/core/Banner';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Button} from '@astryxdesign/core/Button';
import {StatusDot} from '@astryxdesign/core/StatusDot';

type ResultRow = {
  question_text: string;
  category: string;
  score: number | null;
  feedback: string | null;
  transcription: string | null;
};

function ResultsInner() {
  const params = useSearchParams();
  const sessionId = params.get('session_id') ?? '';
  const [overall, setOverall] = useState<number | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    void (async () => {
      const res = await fetch(`/api/interview/results/${sessionId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not load results');
        return;
      }
      setOverall(data.overall_score);
      setRows(data.questions ?? []);
    })();
  }, [sessionId]);

  const graded = rows.filter((r) => r.score !== null).length;
  const tone =
    overall === null
      ? 'okay'
      : overall >= 70
        ? 'strong'
        : overall >= 50
          ? 'okay'
          : 'weak';

  return (
    <>
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Studio</Link>
      </nav>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">Session review</p>
          <h1>Results</h1>
          <p className="aced-masthead__lead">
            Score first, then drill into each answer. Use next steps to keep
            practising the gaps.
          </p>
        </div>
      </header>

      <Section variant="transparent" padding={0}>
        <VStack gap={5}>
          {error ? (
            <Banner status="error" title="Results error" description={error} />
          ) : null}

          {!sessionId ? (
            <Banner
              status="warning"
              title="No session selected"
              description="Results show scores from a finished practice run. Start practice from Studio, or open Results from a completed session."
            />
          ) : null}

          <section className={`aced-score-hero aced-score-hero--${tone}`}>
            <p className="aced-score-hero__kicker">Overall</p>
            {overall !== null ? (
              <>
                {tone === 'strong' ? (
                  <p className="aced-score-hero__celebrate" role="status">
                    <span
                      className="aced-score-hero__celebrate-check"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    Strong session — keep this pace.
                  </p>
                ) : null}
                <div
                  className="aced-score-hero__ring"
                  style={{'--score-pct': overall} as React.CSSProperties}
                >
                  <p
                    className="aced-score-hero__value"
                    aria-label={`${overall.toFixed(0)} out of 100`}
                  >
                    {overall.toFixed(0)}
                    <span className="aced-score-hero__denom">/100</span>
                  </p>
                </div>
                <ProgressBar
                  label="Overall session score"
                  isLabelHidden
                  value={overall}
                  max={100}
                  variant={
                    overall >= 70
                      ? 'success'
                      : overall >= 50
                        ? 'warning'
                        : 'error'
                  }
                />
              </>
            ) : (
              <Text as="p" color="secondary">
                Complete at least one graded answer to see an overall score.
              </Text>
            )}
            {rows.length > 0 ? (
              <Text type="supporting" color="secondary" as="p">
                {graded} of {rows.length} questions graded
              </Text>
            ) : null}
          </section>

          <nav className="aced-next-steps" aria-label="Next steps">
            <p className="aced-next-steps__label">Next steps</p>
            <HStack gap={2} wrap="wrap">
              <Link className="aced-orient__cta" href="/interview">
                Practice again →
              </Link>
              <Link className="aced-orient__cta" href="/studio">
                Back to studio →
              </Link>
            </HStack>
          </nav>

          <VStack gap={3}>
            <Heading level={2}>Your answers</Heading>
            {rows.length === 0 && sessionId ? (
              <Text as="p" color="secondary">
                No answers in this session yet.
              </Text>
            ) : null}
            <ul className="aced-result-list">
              {rows.map((row, index) => {
                const scored = row.score !== null;
                return (
                  <li
                    key={`${row.question_text}-${index}`}
                    className="aced-result-list__item"
                  >
                    <div className="aced-result-list__head">
                      <StatusDot
                        variant={
                          !scored
                            ? 'neutral'
                            : (row.score as number) >= 70
                              ? 'success'
                              : (row.score as number) >= 50
                                ? 'warning'
                                : 'error'
                        }
                        label={
                          scored
                            ? `Score ${row.score} of 100`
                            : 'Not graded yet'
                        }
                      />
                      <Heading level={3}>
                        Q{index + 1}. {row.question_text}
                      </Heading>
                    </div>
                    <Text type="label" color="secondary">
                      {row.category.replaceAll('_', ' ')}
                      {scored ? ` · ${row.score}/100` : ' · Not graded'}
                    </Text>
                    {row.transcription ? (
                      <p className="aced-result-list__transcript">
                        {row.transcription}
                      </p>
                    ) : null}
                    {row.feedback ? (
                      <Text as="p">{row.feedback}</Text>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </VStack>

          {!sessionId ? (
            <Button
              label="Start practice"
              variant="primary"
              href="/interview"
            />
          ) : null}
        </VStack>
      </Section>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<p className="aced-loading">Pulling your scores…</p>}>
      <ResultsInner />
    </Suspense>
  );
}
