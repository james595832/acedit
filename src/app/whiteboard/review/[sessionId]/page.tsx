'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {Banner} from '@astryxdesign/core/Banner';
import {Section} from '@astryxdesign/core/Section';
import {FeaturePaused} from '@/components/FeaturePaused';
import {WhiteboardDebriefView} from '@/components/WhiteboardDebrief';
import {isFeatureEnabled} from '@/lib/feature-flags';
import type {WhiteboardBoard, WhiteboardDebrief} from '@/lib/whiteboard/chat';

type ReviewSession = {
  id: string;
  challengeId: string;
  challengeTitle: string;
  board: WhiteboardBoard;
  score: number;
  debrief: WhiteboardDebrief;
  sketchUrl: string | null;
  clarifyingUsed: number;
  createdAt: string;
};

export default function WhiteboardReviewPage() {
  const params = useParams<{sessionId: string}>();
  const sessionId = params.sessionId;
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFeatureEnabled('whiteboard') || !sessionId) return;
    void (async () => {
      try {
        const res = await fetch(`/api/whiteboard/sessions/${sessionId}`);
        const data = (await res.json()) as {
          session?: ReviewSession;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? 'Not found');
        if (!data.session) {
          setSession(null);
          return;
        }
        const d = data.session.debrief;
        setSession({
          ...data.session,
          debrief: {
            ...d,
            againstAsk: d.againstAsk ?? d.summary,
            deliverables: d.deliverables ?? [],
            sketchAssessment:
              d.sketchAssessment ??
              (data.session.sketchUrl
                ? 'Sketch was saved for this run.'
                : 'No sketch saved for this run.'),
            criteriaHit: d.criteriaHit ?? [],
            criteriaMissed: d.criteriaMissed ?? [],
            strengths: d.strengths ?? [],
            improvements: d.improvements ?? [],
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load review');
      }
    })();
  }, [sessionId]);

  if (!isFeatureEnabled('whiteboard')) {
    return (
      <>
        <nav className="aced-crumb" aria-label="Breadcrumb">
          <Link href="/studio">← Home</Link>
        </nav>
        <FeaturePaused
          title="Whiteboard challenges"
          lead="Timed design prompts and clarifying questions will return after we lock interview practice."
          roadmapHash="#september-2026"
        />
      </>
    );
  }

  return (
    <>
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <h1>{session?.challengeTitle ?? 'Loading board…'}</h1>
          <p className="aced-masthead__lead">
            Revisit your sketch, talk track, and debrief from this run.
          </p>
        </div>
      </header>

      <Section variant="transparent" padding={0}>
        <p className="aced-wb__back">
          <Link href="/whiteboard">← All challenges</Link>
        </p>

        {error ? (
          <Banner status="error" title="Review error" description={error} />
        ) : null}

        {session ? (
          <div className="aced-wb-review">
            <div className="aced-wb-review__meta">
              <p>
                Score {session.score}/100 · {session.clarifyingUsed} clarifying
                Qs · {new Date(session.createdAt).toLocaleString()}
              </p>
            </div>

            <section className="aced-panel">
              <h2>Talk track</h2>
              {(
                [
                  ['Framing', session.board.framing],
                  ['Users', session.board.users],
                  ['Flows', session.board.flows],
                  ['Solution', session.board.solution],
                  ['Tradeoffs', session.board.tradeoffs],
                ] as const
              ).map(([label, text]) => (
                <div key={label} className="aced-wb-review__block">
                  <h3>{label}</h3>
                  <p>{text.trim() || '—'}</p>
                </div>
              ))}
            </section>

            <section className="aced-panel aced-wb__debrief">
              <WhiteboardDebriefView
                debrief={session.debrief}
                sketchUrl={session.sketchUrl}
                sketchAlt={`Sketch for ${session.challengeTitle}`}
              />
            </section>

            <div className="aced-wb__footer-actions">
              <Link
                className="aced-pill aced-pill--studio"
                href={`/whiteboard/${session.challengeId}`}
              >
                Practice again
              </Link>
              <Link className="aced-orient__cta" href="/whiteboard">
                Back to challenges →
              </Link>
            </div>
          </div>
        ) : !error ? (
          <p>Loading…</p>
        ) : null}
      </Section>
    </>
  );
}
