'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import type {WhiteboardChallenge} from '@/lib/whiteboard/challenges';

type SessionLite = {
  id: string;
  challengeId: string;
  challengeTitle: string;
  score: number;
  hasSketch: boolean;
  sketchUrl: string | null;
  createdAt: string;
};

type WhiteboardHubProps = {
  challenges: WhiteboardChallenge[];
};

export function WhiteboardHub({challenges}: WhiteboardHubProps) {
  const [sessions, setSessions] = useState<SessionLite[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/whiteboard/sessions');
        if (!res.ok) return;
        const data = (await res.json()) as {sessions?: SessionLite[]};
        if (data.sessions) setSessions(data.sessions);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const cleared = new Set(sessions.map((s) => s.challengeId));

  return (
    <>
      <ul className="aced-wb-list" aria-label="Available challenges">
        {challenges.map((challenge) => {
          const done = cleared.has(challenge.id);
          return (
            <li key={challenge.id} className="aced-wb-list__item">
              <div className="aced-wb-list__copy">
                <p className="aced-wb-list__meta">
                  {challenge.durationMinutes} min · {challenge.difficulty} ·{' '}
                  {challenge.maxClarifyingQuestions} clarifying Qs
                  {done ? ' · practiced' : ''}
                </p>
                <h2>{challenge.title}</h2>
                <p>{challenge.summary}</p>
                <p className="aced-wb-list__focus">
                  Focus: {challenge.focus.join(' · ')}
                </p>
              </div>
              <Link
                className="aced-pill aced-pill--studio"
                href={`/whiteboard/${challenge.id}`}
              >
                {done ? 'Practice again' : 'Start challenge'}
              </Link>
            </li>
          );
        })}
      </ul>

      {sessions.length > 0 ? (
        <section className="aced-wb-history" aria-label="Past whiteboard runs">
          <h2>Past boards</h2>
          <ul className="aced-wb-history__list">
            {sessions.slice(0, 12).map((session) => (
              <li key={session.id} className="aced-wb-history__item">
                {session.sketchUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="aced-wb-history__thumb"
                    src={session.sketchUrl}
                    alt=""
                  />
                ) : (
                  <span className="aced-wb-history__thumb is-empty" aria-hidden>
                    No sketch
                  </span>
                )}
                <div className="aced-wb-history__copy">
                  <p className="aced-wb-list__meta">
                    {new Date(session.createdAt).toLocaleString()} · score{' '}
                    {session.score}
                  </p>
                  <h3>{session.challengeTitle}</h3>
                  <Link
                    className="aced-orient__cta"
                    href={`/whiteboard/review/${session.id}`}
                  >
                    Open review →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
