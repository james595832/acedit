'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {TextArea} from '@astryxdesign/core/TextArea';
import {ChatComposer} from '@astryxdesign/core/Chat';
import {
  WhiteboardCanvas,
  type WhiteboardCanvasHandle,
} from '@/components/WhiteboardCanvas';
import {WhiteboardDebriefView} from '@/components/WhiteboardDebrief';
import type {WhiteboardChallenge} from '@/lib/whiteboard/challenges';
import type {
  ClarifyingMessage,
  WhiteboardBoard,
  WhiteboardDebrief,
} from '@/lib/whiteboard/chat';

type WhiteboardSessionProps = {
  challenge: WhiteboardChallenge;
};

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const EMPTY_BOARD: WhiteboardBoard = {
  framing: '',
  users: '',
  flows: '',
  solution: '',
  tradeoffs: '',
};

type SavePayload = {
  debrief: WhiteboardDebrief;
  session: {id: string; sketchUrl: string | null};
};

export function WhiteboardSession({challenge}: WhiteboardSessionProps) {
  const totalSeconds = challenge.durationMinutes * 60;
  const sketchRef = useRef<WhiteboardCanvasHandle | null>(null);
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [timedOut, setTimedOut] = useState(false);
  const [board, setBoard] = useState<WhiteboardBoard>(EMPTY_BOARD);
  const [hasSketchInk, setHasSketchInk] = useState(false);
  const [messages, setMessages] = useState<ClarifyingMessage[]>([
    {
      role: 'assistant',
      content: `I’m your interviewer for “${challenge.title}”. You have ${challenge.maxClarifyingQuestions} clarifying questions. Ask about users, constraints, data, or success — I won’t solve the board for you.`,
    },
  ]);
  const [draft, setDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [result, setResult] = useState<SavePayload | null>(null);
  const [debriefBusy, setDebriefBusy] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);

  const questionsUsed = useMemo(
    () => messages.filter((m) => m.role === 'user').length,
    [messages],
  );
  const questionsRemaining = Math.max(
    0,
    challenge.maxClarifyingQuestions - questionsUsed,
  );

  useEffect(() => {
    if (!started || timedOut || result) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, timedOut, result]);

  function updateBoard(key: keyof WhiteboardBoard, value: string) {
    setBoard((prev) => ({...prev, [key]: value}));
  }

  async function sendClarifying(value: string) {
    const content = value.trim();
    if (!content || chatBusy) return;
    if (questionsRemaining <= 0) {
      setChatError('You’ve used all clarifying questions for this challenge.');
      return;
    }

    setChatError(null);
    setChatBusy(true);
    const nextMessages: ClarifyingMessage[] = [
      ...messages,
      {role: 'user', content},
    ];
    setMessages(nextMessages);
    setDraft('');

    try {
      const res = await fetch('/api/whiteboard/chat', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          challengeId: challenge.id,
          messages: nextMessages,
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? 'Chat failed');
      }
      setMessages((prev) => [
        ...prev,
        {role: 'assistant', content: data.reply ?? '…'},
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Chat failed');
    } finally {
      setChatBusy(false);
    }
  }

  async function runDebrief() {
    setDebriefError(null);
    setDebriefBusy(true);
    try {
      const sketchDataUrl = sketchRef.current?.exportPng() ?? null;
      const res = await fetch('/api/whiteboard/sessions', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          challengeId: challenge.id,
          board,
          clarifyingUsed: questionsUsed,
          sketchDataUrl,
          hasSketch: Boolean(sketchDataUrl || hasSketchInk),
          secondsRemaining: remaining,
        }),
      });
      const data = (await res.json()) as SavePayload & {error?: string};
      if (!res.ok) {
        throw new Error(data.error ?? 'Debrief failed');
      }
      setResult(data);
    } catch (error) {
      setDebriefError(
        error instanceof Error ? error.message : 'Debrief failed',
      );
    } finally {
      setDebriefBusy(false);
    }
  }

  const timerTone = !started
    ? 'idle'
    : remaining <= 60
      ? 'critical'
      : remaining <= 300
        ? 'warn'
        : 'ok';

  const debrief = result?.debrief ?? null;

  const talkSections = [
    {key: 'framing' as const, filled: board.framing.trim().length > 20},
    {key: 'users' as const, filled: board.users.trim().length > 20},
    {key: 'flows' as const, filled: board.flows.trim().length > 20},
    {key: 'solution' as const, filled: board.solution.trim().length > 20},
    {key: 'tradeoffs' as const, filled: board.tradeoffs.trim().length > 20},
  ];
  const talkFilled = talkSections.filter((s) => s.filled).length;

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  return (
    <div className="aced-wb">
      <header className="aced-wb__top">
        <div className="aced-wb__top-copy">
          <p className="aced-masthead__kicker">
            Whiteboard · {challenge.difficulty} · {challenge.focus.join(' · ')}
          </p>
          <h1>{challenge.title}</h1>
          <p className="aced-masthead__lead">{challenge.summary}</p>
        </div>
        <div
          className={`aced-wb__timer aced-wb__timer--${timerTone}`}
          role="timer"
          aria-live="polite"
          aria-label="Time remaining"
        >
          <span className="aced-wb__timer-label">
            {timedOut ? 'Time’s up' : started ? 'Remaining' : 'Duration'}
          </span>
          <span className="aced-wb__timer-value">
            {started ? formatClock(remaining) : formatClock(totalSeconds)}
          </span>
        </div>
      </header>

      {!started ? (
        <section className="aced-panel aced-wb__brief">
          <h2>Challenge brief</h2>
          <p className="aced-wb__goal">
            <span>The ask</span>
            {challenge.goal}
          </p>
          <p className="aced-wb__brief-text">{challenge.brief}</p>
          <h3 className="aced-wb__deliverable-heading">You’ll be assessed on</h3>
          <ol className="aced-wb__meta aced-wb__meta--numbered">
            {challenge.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <ul className="aced-wb__meta">
            <li>{challenge.durationMinutes} minutes on the clock</li>
            <li>
              {challenge.maxClarifyingQuestions} clarifying questions with the
              AI interviewer
            </li>
            <li>
              Marker + post-its on the canvas, plus talk track — judged against
              the ask
            </li>
          </ul>
          <Button
            label="Start timed challenge"
            variant="primary"
            size="lg"
            onClick={() => setStarted(true)}
          />
        </section>
      ) : (
        <>
          {timedOut ? (
            <Banner
              status="warning"
              title="Timer finished"
              description="You can still tidy notes and run a debrief — treat this like wrapping up in the room."
            />
          ) : null}

          <div className="aced-wb__rail" aria-label="Session guide">
            <div className="aced-wb__rail-ask">
              <p className="aced-wb__rail-kicker">The ask</p>
              <p className="aced-wb__rail-goal">{challenge.goal}</p>
            </div>
            <nav className="aced-wb__rail-nav" aria-label="Jump to section">
              <button
                type="button"
                className="aced-wb__rail-link"
                onClick={() => jumpTo('wb-canvas')}
              >
                Canvas
              </button>
              <button
                type="button"
                className="aced-wb__rail-link"
                onClick={() => jumpTo('wb-chat')}
              >
                Ask interviewer
              </button>
              <button
                type="button"
                className="aced-wb__rail-link"
                onClick={() => jumpTo('wb-talk')}
              >
                Talk track
              </button>
              <button
                type="button"
                className="aced-wb__rail-link"
                onClick={() => jumpTo('wb-finish')}
              >
                Finish
              </button>
            </nav>
            <ul className="aced-wb__rail-status" aria-label="Progress">
              <li>
                Talk track · {talkFilled}/5
              </li>
              <li>
                Clarifying Qs left · {questionsRemaining}
              </li>
              <li>
                Board · {hasSketchInk ? 'sketched' : 'empty'}
              </li>
            </ul>
            <details className="aced-wb__rail-details">
              <summary>Assessed on</summary>
              <ol>
                {challenge.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </details>
          </div>

          <div className="aced-wb__workspace">
            <section
              id="wb-canvas"
              className="aced-wb__sketch-panel"
              aria-label="Marker canvas"
            >
              <div className="aced-wb__board-head">
                <h2>1 · Sketch canvas</h2>
                <p>
                  Focal board — marker for flows, post-its for labels. Keep the
                  ask in mind while you draw.
                </p>
              </div>
              <WhiteboardCanvas
                canvasRef={sketchRef}
                disabled={Boolean(result)}
                onInkChange={setHasSketchInk}
              />
            </section>

            <aside
              id="wb-chat"
              className="aced-wb__chat"
              aria-label="Clarifying questions"
            >
              <div className="aced-wb__chat-head">
                <h2>2 · Ask the interviewer</h2>
                <p>
                  Clarifying questions only — this challenge. Left:{' '}
                  <strong>{questionsRemaining}</strong>
                </p>
              </div>

              <div className="aced-wb__messages" role="log" aria-live="polite">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`aced-wb__bubble aced-wb__bubble--${message.role}`}
                  >
                    <span className="aced-wb__bubble-role">
                      {message.role === 'user' ? 'You' : 'Interviewer'}
                    </span>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>

              {chatError ? (
                <Banner
                  status="error"
                  title="Chat error"
                  description={chatError}
                />
              ) : null}

              <ChatComposer
                value={draft}
                onChange={setDraft}
                onSubmit={sendClarifying}
                placeholder={
                  questionsRemaining > 0
                    ? 'Ask a clarifying question…'
                    : 'No clarifying questions left'
                }
                isDisabled={
                  chatBusy || questionsRemaining <= 0 || Boolean(result)
                }
                density="compact"
              />
            </aside>

            <section
              id="wb-talk"
              className="aced-wb__board"
              aria-label="Talk track"
            >
              <div className="aced-wb__board-head">
                <h2>3 · Talk track</h2>
                <p>
                  What you’d say out loud while pointing at the board. Assessed
                  with your sketch — {talkFilled} of 5 sections started.
                </p>
              </div>

              <div className="aced-wb__talk-progress" aria-hidden="true">
                {talkSections.map((section, index) => (
                  <span
                    key={section.key}
                    className={`aced-wb__talk-dot${section.filled ? ' is-filled' : ''}`}
                  >
                    {index + 1}
                  </span>
                ))}
              </div>

              <TextArea
                label="1 · Problem framing"
                description="What’s broken, for whom, and why it matters now?"
                value={board.framing}
                onChange={(v) => updateBoard('framing', v)}
                rows={3}
              />
              <TextArea
                label="2 · Users & context"
                description="Primary user, jobs-to-be-done, constraints you learned."
                value={board.users}
                onChange={(v) => updateBoard('users', v)}
                rows={3}
              />
              <TextArea
                label="3 · Flows / IA"
                description="Current → proposed steps. Call out key states."
                value={board.flows}
                onChange={(v) => updateBoard('flows', v)}
                rows={4}
              />
              <TextArea
                label="4 · Solution notes"
                description="What the sketch is arguing — key screens and decisions."
                value={board.solution}
                onChange={(v) => updateBoard('solution', v)}
                rows={4}
              />
              <TextArea
                label="5 · Tradeoffs & validation"
                description="Risks, metrics, what you’d test next."
                value={board.tradeoffs}
                onChange={(v) => updateBoard('tradeoffs', v)}
                rows={3}
              />
            </section>
          </div>

          <section id="wb-finish" className="aced-wb__footer">
            {debriefError ? (
              <Banner
                status="error"
                title="Debrief error"
                description={debriefError}
              />
            ) : null}

            {!result || !debrief ? (
              <div className="aced-wb__footer-actions">
                <Button
                  label="End, save sketch & debrief"
                  variant="primary"
                  size="lg"
                  isLoading={debriefBusy}
                  clickAction={runDebrief}
                />
                <Link className="aced-orient__cta" href="/whiteboard">
                  Back to challenges →
                </Link>
              </div>
            ) : (
              <div className="aced-panel aced-wb__debrief">
                <WhiteboardDebriefView
                  debrief={debrief}
                  sketchUrl={result.session.sketchUrl}
                  sketchAlt={`Whiteboard sketch for ${challenge.title}`}
                />
                <div className="aced-wb__footer-actions">
                  <Link
                    className="aced-pill aced-pill--studio"
                    href={`/whiteboard/review/${result.session.id}`}
                  >
                    Review this run
                  </Link>
                  <Link className="aced-pill aced-pill--studio" href="/whiteboard">
                    Try another challenge
                  </Link>
                  <Link className="aced-orient__cta" href="/studio">
                    Back to Studio →
                  </Link>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
