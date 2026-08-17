'use client';

import {Suspense, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {Banner} from '@astryxdesign/core/Banner';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {StatusDot} from '@astryxdesign/core/StatusDot';

type ResultRow = {
  question_text: string;
  category: string;
  score: number | null;
  feedback: string | null;
  transcription: string | null;
};

type OutcomeTone = 'strong' | 'okay' | 'weak' | 'empty';

function outcomeTone(overall: number | null): OutcomeTone {
  if (overall === null) return 'empty';
  if (overall >= 70) return 'strong';
  if (overall >= 50) return 'okay';
  return 'weak';
}

function outcomeCopy(tone: OutcomeTone, overall: number | null) {
  if (tone === 'strong') {
    return {
      title: 'You aced this run',
      lead: 'That was a strong practice. Take the win — then one more round to lock it in.',
      badge: 'Strong session',
      cta: 'Practice again',
      ctaHint: 'Keep the momentum while it’s fresh',
    };
  }
  if (tone === 'okay') {
    return {
      title: 'Solid session — keep going',
      lead: 'You’re building the muscle. Another round will sharpen the weak spots.',
      badge: overall !== null ? `${Math.round(overall)} / 100` : 'In progress',
      cta: 'Try another round',
      ctaHint: 'Focus on the lower-scoring answers below',
    };
  }
  if (tone === 'weak') {
    return {
      title: 'Good that you showed up',
      lead: 'First runs are messy. That’s the point of practice. Try again and watch the score move.',
      badge: 'Keep practising',
      cta: 'Practice again',
      ctaHint: 'You’ve done the hard part — starting',
    };
  }
  return {
    title: 'Session saved',
    lead: 'Finish and grade at least one answer to see your overall score.',
    badge: 'No score yet',
    cta: 'Start interview',
    ctaHint: 'Head back in when you’re ready',
  };
}

function ResultsInner() {
  const params = useSearchParams();
  const sessionId = params.get('session_id') ?? '';
  const [overall, setOverall] = useState<number | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId));

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/interview/results/${sessionId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not load results');
        setLoading(false);
        return;
      }
      setOverall(data.overall_score);
      setRows(data.questions ?? []);
      setLoading(false);
    })();
  }, [sessionId]);

  const tone = outcomeTone(overall);
  const copy = outcomeCopy(tone, overall);
  const scoredRows = useMemo(() => {
    return rows
      .map((row, index) => ({row, index}))
      .filter((x) => x.row.score !== null);
  }, [rows]);

  const weakest = useMemo(() => {
    if (!scoredRows.length) return null;
    return scoredRows.reduce((min, cur) =>
      (cur.row.score as number) < (min.row.score as number) ? cur : min,
    );
  }, [scoredRows]);

  const strongest = useMemo(() => {
    if (!scoredRows.length) return null;
    return scoredRows.reduce((max, cur) =>
      (cur.row.score as number) > (max.row.score as number) ? cur : max,
    );
  }, [scoredRows]);

  const graded = scoredRows;

  return (
    <div className={`aced-debrief aced-debrief--${tone}`}>
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Home</Link>
      </nav>

      {!sessionId ? (
        <Section variant="transparent" padding={0}>
          <VStack gap={4}>
            <header className="aced-debrief__head">
              <h1>No session selected</h1>
              <p className="aced-debrief__lead">
                Open a finished run from Home, or start a new interview.
              </p>
            </header>
            <div className="aced-debrief__cta">
              <Link className="aced-home__primary" href="/interview">
                Start interview
              </Link>
              <Link className="aced-orient__cta" href="/studio">
                Back to Home →
              </Link>
            </div>
          </VStack>
        </Section>
      ) : null}

      {sessionId ? (
        <Section variant="transparent" padding={0}>
          <VStack gap={5}>
            {error ? (
              <Banner
                status="error"
                title="Results error"
                description={error}
              />
            ) : null}

            {loading ? (
              <p className="aced-loading">Pulling your scores…</p>
            ) : (
              <>
                <header className="aced-debrief__head">
                  <p className={`aced-debrief__badge aced-debrief__badge--${tone}`}>
                    {copy.badge}
                  </p>
                  <h1>{copy.title}</h1>
                  <p className="aced-debrief__lead">{copy.lead}</p>
                </header>

                <section
                  className={`aced-score-hero aced-score-hero--${tone === 'empty' ? 'okay' : tone}`}
                  aria-label="Overall session score"
                >
                  {overall !== null ? (
                    <>
                      <div
                        className="aced-score-hero__ring"
                        style={
                          {'--score-pct': overall} as React.CSSProperties
                        }
                      >
                        <p
                          className="aced-score-hero__value"
                          aria-label={`${overall.toFixed(0)} out of 100`}
                        >
                          {overall.toFixed(0)}
                          <span className="aced-score-hero__denom">/100</span>
                        </p>
                      </div>
                      <div className="aced-score-hero__meta">
                        <p className="aced-score-hero__label">Overall score</p>
                        <p className="aced-score-hero__count">
                          {graded.length} of {rows.length} answers graded
                        </p>
                        {strongest && weakest && strongest !== weakest ? (
                          <p className="aced-score-hero__range">
                            Best Q{strongest.index + 1} ·{' '}
                            {strongest.row.score}/100 · Needs work Q
                            {weakest.index + 1} · {weakest.row.score}/100
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <Text as="p" color="secondary">
                      Complete at least one graded answer to see an overall
                      score.
                    </Text>
                  )}
                </section>

                <div className="aced-debrief__cta">
                  <Link className="aced-home__primary" href="/interview">
                    {copy.cta}
                  </Link>
                  <p className="aced-debrief__cta-hint">{copy.ctaHint}</p>
                  {tone === 'strong' ? (
                    <Link className="aced-orient__cta" href="/studio">
                      Back to Home →
                    </Link>
                  ) : null}
                </div>

                {weakest && tone !== 'strong' ? (
                  <aside
                    className="aced-debrief__focus"
                    aria-label="Focus next"
                  >
                    <p className="aced-debrief__focus-label">Focus next</p>
                    <p className="aced-debrief__focus-q">
                      Q{weakest.index + 1} scored {weakest.row.score}/100
                    </p>
                    <p className="aced-debrief__focus-text">
                      {weakest.row.feedback
                        ? weakest.row.feedback
                        : weakest.row.question_text}
                    </p>
                  </aside>
                ) : null}

                {tone === 'strong' && strongest ? (
                  <aside
                    className="aced-debrief__focus aced-debrief__focus--win"
                    aria-label="What worked"
                  >
                    <p className="aced-debrief__focus-label">What worked</p>
                    <p className="aced-debrief__focus-q">
                      Q{strongest.index + 1} · {strongest.row.score}/100
                    </p>
                    <p className="aced-debrief__focus-text">
                      {strongest.row.feedback
                        ? strongest.row.feedback
                        : 'Carry this structure into your next answers.'}
                    </p>
                  </aside>
                ) : null}

                <section
                  className="aced-debrief__answers"
                  aria-labelledby="aced-debrief-answers"
                >
                  <Heading level={2} id="aced-debrief-answers">
                    Answer by answer
                  </Heading>
                  <Text as="p" color="secondary">
                    Skim scores first. Open a transcript only if you want the
                    detail.
                  </Text>

                  {rows.length === 0 ? (
                    <Text as="p" color="secondary">
                      No answers in this session yet.
                    </Text>
                  ) : null}

                  <ul className="aced-result-list">
                    {rows.map((row, index) => {
                      const scored = row.score !== null;
                      const rowTone = !scored
                        ? 'neutral'
                        : (row.score as number) >= 70
                          ? 'strong'
                          : (row.score as number) >= 50
                            ? 'okay'
                            : 'weak';
                      return (
                        <li
                          key={`${row.question_text}-${index}`}
                          className={`aced-result-list__item aced-result-list__item--${rowTone}`}
                        >
                          <div className="aced-result-list__top">
                            <span
                              className={`aced-result-list__score aced-result-list__score--${rowTone}`}
                            >
                              {scored ? `${row.score}` : '—'}
                            </span>
                            <div className="aced-result-list__copy">
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
                                {scored
                                  ? ` · ${row.score}/100`
                                  : ' · Not graded'}
                              </Text>
                            </div>
                          </div>

                          {row.feedback ? (
                            <p className="aced-result-list__feedback">
                              {row.feedback}
                            </p>
                          ) : null}

                          {row.transcription ? (
                            <Collapsible
                              defaultIsOpen={false}
                              trigger={
                                <Text type="label">Show transcript</Text>
                              }
                            >
                              <p className="aced-result-list__transcript">
                                {row.transcription}
                              </p>
                            </Collapsible>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <nav className="aced-debrief__foot" aria-label="Next steps">
                  <HStack gap={2} wrap="wrap">
                    <Link className="aced-home__primary" href="/interview">
                      {copy.cta}
                    </Link>
                    <Link className="aced-orient__cta" href="/studio">
                      Back to Home →
                    </Link>
                  </HStack>
                </nav>
              </>
            )}
          </VStack>
        </Section>
      ) : null}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<p className="aced-loading">Pulling your scores…</p>}>
      <ResultsInner />
    </Suspense>
  );
}
