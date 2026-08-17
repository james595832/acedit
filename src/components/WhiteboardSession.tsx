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

type Panel = 'none' | 'chat' | 'talk';

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

const TALK_FIELDS: Array<{
  key: keyof WhiteboardBoard;
  label: string;
  description: string;
  rows: number;
}> = [
  {
    key: 'framing',
    label: 'Problem framing',
    description: 'What’s broken, for whom, and why it matters now?',
    rows: 3,
  },
  {
    key: 'users',
    label: 'Users & context',
    description: 'Primary user, jobs-to-be-done, constraints you learned.',
    rows: 3,
  },
  {
    key: 'flows',
    label: 'Flows',
    description: 'Current → proposed steps. Call out key states.',
    rows: 4,
  },
  {
    key: 'solution',
    label: 'Solution notes',
    description: 'What the sketch is arguing: key screens and decisions.',
    rows: 4,
  },
  {
    key: 'tradeoffs',
    label: 'Tradeoffs & validation',
    description: 'Risks, metrics, what you’d test next.',
    rows: 3,
  },
];

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
  const [panel, setPanel] = useState<Panel>('none');
  const [talkStep, setTalkStep] = useState(0);
  const [messages, setMessages] = useState<ClarifyingMessage[]>([
    {
      role: 'assistant',
      content: `I’m your interviewer for “${challenge.title}”. You have ${challenge.maxClarifyingQuestions} clarifying questions. Ask about users, constraints, data, or success — I’ll share facts from this brief. I won’t solve the board for you.`,
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

  const talkFilled = TALK_FIELDS.filter(
    (field) => board[field.key].trim().length > 20,
  ).length;

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

  useEffect(() => {
    if (panel === 'none') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanel('none');
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  function updateBoard(key: keyof WhiteboardBoard, value: string) {
    setBoard((prev) => ({...prev, [key]: value}));
  }

  function togglePanel(next: Panel) {
    setPanel((prev) => (prev === next ? 'none' : next));
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
    setPanel('none');
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
  const activeTalk = TALK_FIELDS[talkStep] ?? TALK_FIELDS[0];

  return (
    <div className={`aced-wb${started ? ' aced-wb--live' : ''}`}>
      <header className="aced-wb__top">
        <div className="aced-wb__top-copy">
          <h1>{challenge.title}</h1>
          {!started ? (
            <p className="aced-masthead__lead">{challenge.summary}</p>
          ) : (
            <p className="aced-wb__live-ask">{challenge.goal}</p>
          )}
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
          <p className="aced-wb__goal">{challenge.goal}</p>
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
            <li>Sketch on the canvas, then add a short talk track before you finish</li>
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
              description="You can still tidy notes and run a debrief. Treat this like wrapping up in the room."
            />
          ) : null}

          <div className="aced-wb__toolbar" aria-label="Session tools">
            <p className="aced-wb__toolbar-meta">
              Board {hasSketchInk ? 'started' : 'empty'} · Talk {talkFilled}/5 ·
              Qs left {questionsRemaining}
            </p>
            <div className="aced-wb__toolbar-actions">
              <button
                type="button"
                className={`aced-wb__tool-btn${panel === 'chat' ? ' is-active' : ''}`}
                aria-pressed={panel === 'chat'}
                onClick={() => togglePanel('chat')}
              >
                Ask interviewer
                <span className="aced-wb__tool-count">{questionsRemaining}</span>
              </button>
              <button
                type="button"
                className={`aced-wb__tool-btn${panel === 'talk' ? ' is-active' : ''}`}
                aria-pressed={panel === 'talk'}
                onClick={() => togglePanel('talk')}
              >
                Talk track
                <span className="aced-wb__tool-count">{talkFilled}/5</span>
              </button>
              <details className="aced-wb__brief-pop">
                <summary>Brief</summary>
                <div className="aced-wb__brief-pop-body">
                  <p>{challenge.goal}</p>
                  <ol>
                    {challenge.deliverables.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
              </details>
            </div>
          </div>

          <div className="aced-wb__stage">
            <section
              id="wb-canvas"
              className="aced-wb__sketch-panel"
              aria-label="Marker canvas"
            >
              <div className="aced-wb__board-head">
                <h2>Sketch</h2>
                <p>Marker for flows, post-its for labels. Open Ask or Talk when you need them.</p>
              </div>
              <WhiteboardCanvas
                canvasRef={sketchRef}
                disabled={Boolean(result)}
                onInkChange={setHasSketchInk}
              />
            </section>

            {panel !== 'none' ? (
              <div
                className="aced-wb__panel-scrim"
                aria-hidden="true"
                onClick={() => setPanel('none')}
              />
            ) : null}

            <aside
              id="wb-chat"
              className={`aced-wb__side-panel${panel === 'chat' ? ' is-open' : ''}`}
              aria-label="Clarifying questions"
              aria-hidden={panel !== 'chat'}
            >
              <div className="aced-wb__side-panel-head">
                <div>
                  <h2>Ask the interviewer</h2>
                  <p>
                    Clarifying questions only. Left:{' '}
                    <strong>{questionsRemaining}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="aced-wb__side-close"
                  aria-label="Close interviewer panel"
                  onClick={() => setPanel('none')}
                >
                  Close
                </button>
              </div>

              <div className="aced-wb__messages" role="log" aria-live="polite">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`aced-wb__bubble aced-wb__bubble--${message.role}`}
                  >
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
                density="balanced"
              />
            </aside>

            <aside
              id="wb-talk"
              className={`aced-wb__side-panel${panel === 'talk' ? ' is-open' : ''}`}
              aria-label="Talk track"
              aria-hidden={panel !== 'talk'}
            >
              <div className="aced-wb__side-panel-head">
                <div>
                  <h2>Talk track</h2>
                  <p>
                    What you’d say out loud. {talkFilled} of 5 sections started.
                  </p>
                </div>
                <button
                  type="button"
                  className="aced-wb__side-close"
                  aria-label="Close talk track panel"
                  onClick={() => setPanel('none')}
                >
                  Close
                </button>
              </div>

              <div className="aced-wb__talk-steps" role="tablist" aria-label="Talk sections">
                {TALK_FIELDS.map((field, index) => {
                  const filled = board[field.key].trim().length > 20;
                  return (
                    <button
                      key={field.key}
                      type="button"
                      role="tab"
                      aria-selected={talkStep === index}
                      className={`aced-wb__talk-step${talkStep === index ? ' is-active' : ''}${filled ? ' is-filled' : ''}`}
                      onClick={() => setTalkStep(index)}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <TextArea
                label={`${talkStep + 1} · ${activeTalk.label}`}
                description={activeTalk.description}
                value={board[activeTalk.key]}
                onChange={(v) => updateBoard(activeTalk.key, v)}
                rows={activeTalk.rows}
              />

              <div className="aced-wb__talk-nav">
                <Button
                  label="Previous"
                  variant="secondary"
                  size="sm"
                  isDisabled={talkStep === 0}
                  onClick={() => setTalkStep((s) => Math.max(0, s - 1))}
                />
                <Button
                  label={talkStep >= TALK_FIELDS.length - 1 ? 'Done' : 'Next'}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (talkStep >= TALK_FIELDS.length - 1) {
                      setPanel('none');
                      return;
                    }
                    setTalkStep((s) => Math.min(TALK_FIELDS.length - 1, s + 1));
                  }}
                />
              </div>
            </aside>
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
                    Back to Home →
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
