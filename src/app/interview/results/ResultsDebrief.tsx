'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {Banner} from '@astryxdesign/core/Banner';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {SessionProgress} from '@/components/SessionProgress';

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

function outcomeCopy(
  tone: OutcomeTone,
  overall: number | null,
  gradedCount: number,
  questionCount: number,
) {
  if (tone === 'strong') {
    return {
      title: 'You aced this interview',
      lead: 'Strong answers. Take the win — then one more round to lock it in.',
      badge: 'Strong interview',
      cta: 'Interview again',
      ctaHint: 'Keep the momentum while it’s fresh',
    };
  }
  if (tone === 'okay') {
    return {
      title: 'Solid interview — keep going',
      lead: 'You’re building the muscle. Another round will sharpen the weak spots.',
      badge: overall !== null ? `${Math.round(overall)} / 100` : 'In progress',
      cta: 'Start another interview',
      ctaHint: 'Focus on the lower-scoring answers below',
    };
  }
  if (tone === 'weak') {
    return {
      title: 'Good that you showed up',
      lead: 'First interviews are messy. That’s the point. Try again and watch the score move.',
      badge: 'Keep going',
      cta: 'Interview again',
      ctaHint: 'You’ve done the hard part — starting',
    };
  }
  if (questionCount > 0 && gradedCount === 0) {
    return {
      title: 'Interview started — not graded yet',
      lead: 'These questions are waiting for spoken answers. Jump back in to record and get scored.',
      badge: 'In progress',
      cta: 'Continue interview',
      ctaHint: 'Mic on. Answer out loud.',
    };
  }
  return {
    title: 'No interview to review yet',
    lead: 'Start an interview, answer out loud, then come back here for your debrief.',
    badge: 'No score yet',
    cta: 'Start interview',
    ctaHint: 'About 15 minutes',
  };
}

export function ResultsDebrief({sessionId}: {sessionId: string}) {
  const [overall, setOverall] = useState<number | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/interview/results/${sessionId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not load results');
        setLoading(false);
        return;
      }
      setOverall(
        data.overall_score === null || data.overall_score === undefined
          ? null
          : Number(data.overall_score),
      );
      setRows(data.questions ?? []);
      setLoading(false);
    })();
  }, [sessionId]);

  const tone = outcomeTone(overall);
  const scoredRows = useMemo(() => {
    return rows
      .map((row, index) => ({row, index}))
      .filter((x) => x.row.score !== null);
  }, [rows]);
  const copy = outcomeCopy(tone, overall, scoredRows.length, rows.length);

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
  const showScore = overall !== null;

  return (
    <div className={`aced-debrief aced-debrief--${tone}`}>
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Home</Link>
      </nav>

      <Section variant="transparent" padding={0}>
        <VStack gap={6}>
          <SessionProgress
            label="Interview"
            current={3}
            total={3}
            status="Debrief"
          />

          {error ? (
            <Banner
              status="error"
              title="Couldn’t load results"
              description={error}
            />
          ) : null}

          {loading ? (
            <Text as="p" color="secondary" className="aced-loading">
              Pulling your scores…
            </Text>
          ) : (
            <>
              <header className="aced-debrief__head">
                <p className={`aced-debrief__badge aced-debrief__badge--${tone}`}>
                  {copy.badge}
                </p>
                <Heading level={1}>{copy.title}</Heading>
                <Text as="p" color="secondary" type="large">
                  {copy.lead}
                </Text>
              </header>

              {showScore ? (
                <section
                  className={`aced-score-hero aced-score-hero--${tone}`}
                  aria-label="Overall interview score"
                >
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
                  <div className="aced-score-hero__meta">
                    <p className="aced-score-hero__label">Overall score</p>
                    <p className="aced-score-hero__count">
                      {graded.length} of {rows.length} answers graded
                    </p>
                    {strongest && weakest && strongest !== weakest ? (
                      <p className="aced-score-hero__range">
                        Best Q{strongest.index + 1} · {strongest.row.score}
                        /100 · Needs work Q{weakest.index + 1} ·{' '}
                        {weakest.row.score}/100
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <div className="aced-debrief__cta">
                <HStack gap={3} align="center" wrap="wrap">
                  <Link className="aced-home__primary" href="/interview">
                    {copy.cta}
                  </Link>
                  <Link className="aced-home__secondary" href="/studio">
                    Back to Home
                  </Link>
                </HStack>
                <p className="aced-debrief__cta-hint">{copy.ctaHint}</p>
              </div>

              {weakest && tone !== 'strong' ? (
                <aside className="aced-debrief__focus" aria-label="Focus next">
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

              {rows.length > 0 ? (
                <section
                  className="aced-debrief__answers"
                  aria-labelledby="aced-debrief-answers"
                >
                  <div className="aced-debrief__answers-head">
                    <Heading level={2} id="aced-debrief-answers">
                      Answer by answer
                    </Heading>
                    <Text as="p" color="secondary">
                      {graded.length > 0
                        ? 'Skim scores first. Open a transcript only if you want the detail.'
                        : 'Record answers in the room to unlock scores and coaching notes.'}
                    </Text>
                  </div>

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
                      const statusLabel = scored
                        ? `Score ${row.score} of 100`
                        : 'Not graded yet';
                      return (
                        <li
                          key={`${row.question_text}-${index}`}
                          className={`aced-result-list__item aced-result-list__item--${rowTone}`}
                        >
                          <div className="aced-result-list__top">
                            <div className="aced-result-list__copy">
                              <Heading level={3}>
                                Q{index + 1}. {row.question_text}
                              </Heading>
                              <div className="aced-result-list__meta">
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
                                  label={statusLabel}
                                />
                                <Text type="supporting" color="secondary">
                                  {row.category.replaceAll('_', ' ')}
                                  {' · '}
                                  {statusLabel}
                                </Text>
                              </div>
                            </div>
                            <span
                              className={`aced-result-list__score aced-result-list__score--${rowTone}`}
                              aria-hidden={!scored}
                            >
                              {scored ? `${row.score}` : '—'}
                            </span>
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
              ) : null}
            </>
          )}
        </VStack>
      </Section>
    </div>
  );
}
