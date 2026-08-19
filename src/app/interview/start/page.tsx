'use client';

import {useEffect, useMemo, useState, Suspense} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {VoiceRecorder} from '@/components/VoiceRecorder';
import {GradeFeedback} from '@/components/GradeFeedback';
import {SessionProgress} from '@/components/SessionProgress';
import {InterviewBrief} from '@/components/InterviewBrief';
import type {GradeResult} from '@/lib/types';
import type {AnswerCriteria} from '@/lib/criteria';

type QuestionRow = {
  id: string;
  question_text: string;
  question_category: string;
  is_personal: boolean;
  criteria_json: string | null;
  question_order: number;
};

type Briefing = {
  firstName: string;
  position: string;
};

function InterviewStartInner() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get('session_id') ?? '';
  const questionId = params.get('question_id') ?? '';

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [questionText, setQuestionText] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<AnswerCriteria | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcriptSource, setTranscriptSource] = useState<string | null>(null);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);

  const showBrief = Boolean(sessionId && !questionId);
  const ready = useMemo(
    () => Boolean(sessionId && questionId),
    [sessionId, questionId],
  );

  const questionIndex = useMemo(() => {
    const idx = questions.findIndex((q) => q.id === questionId);
    return idx >= 0 ? idx : 0;
  }, [questions, questionId]);

  const nextQuestion = useMemo(() => {
    if (!questions.length) return null;
    return questions[questionIndex + 1] ?? null;
  }, [questions, questionIndex]);

  useEffect(() => {
    if (!sessionId) return;
    void (async () => {
      const res = await fetch(`/api/interview/session/${sessionId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not load question');
        return;
      }
      const list = (data.questions ?? []) as QuestionRow[];
      setQuestions(list);
      if (data.briefing) {
        setBriefing({
          firstName: data.briefing.firstName ?? 'there',
          position: data.briefing.position ?? 'a product design role',
        });
      }
      if (!questionId) {
        setQuestionText(null);
        setCriteria(null);
        setTranscription(null);
        setTranscriptSource(null);
        setAnswerId(null);
        setGrade(null);
        setError(null);
        setIsGrading(false);
        return;
      }
      const match =
        list.find((q) => q.id === questionId) ?? data.first_question;
      setQuestionText(match?.question_text ?? null);
      if (match?.criteria_json) {
        try {
          setCriteria(JSON.parse(match.criteria_json) as AnswerCriteria);
        } catch {
          setCriteria(null);
        }
      } else {
        setCriteria(null);
      }
      setTranscription(null);
      setTranscriptSource(null);
      setAnswerId(null);
      setGrade(null);
      setError(null);
      setIsGrading(false);
    })();
  }, [sessionId, questionId]);

  async function gradeAnswer(id: string) {
    if (!id || !questionId) return;
    setError(null);
    setIsGrading(true);
    try {
      const res = await fetch('/api/interview/grade-answer', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({answer_id: id, question_id: questionId}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Grading failed');
      setGrade(data as GradeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed');
    } finally {
      setIsGrading(false);
    }
  }

  function goToQuestion(id: string) {
    router.push(`/interview/start?session_id=${sessionId}&question_id=${id}`);
  }

  const phaseStatus = grade
    ? 'Graded'
    : isGrading
      ? 'Scoring…'
      : transcription
        ? 'Answer saved'
        : 'Your turn';

  if (showBrief) {
    return (
      <section className="aced-room aced-room--brief">
        <nav className="aced-crumb" aria-label="Breadcrumb">
          <Link href="/studio">← Home</Link>
        </nav>
        {error ? (
          <Banner
            status="error"
            title="Couldn’t open the room"
            description={error}
          />
        ) : briefing ? (
          <InterviewBrief
            firstName={briefing.firstName}
            position={briefing.position}
            questionCount={questions.length}
            onReady={() => {
              const first = questions[0];
              if (first) goToQuestion(first.id);
            }}
          />
        ) : (
          <Text as="p" color="secondary" className="aced-loading">
            Taking a seat…
          </Text>
        )}
      </section>
    );
  }

  return (
    <div className="aced-room">
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Home</Link>
      </nav>

      <header className="aced-room__head">
        <Text type="label" color="secondary" as="p">
          Interview · Room · step 2 of 3
        </Text>
        {questions.length > 0 ? (
          <SessionProgress
            label="Questions"
            current={questionIndex + 1}
            total={questions.length}
            status={phaseStatus}
          />
        ) : null}
        <h1>{questionText ?? 'Loading question…'}</h1>
        <p className="aced-room__lead">
          Speak out loud, as you would in the room. Take a breath, then answer.
          {questions.length
            ? ` ${questions.length} questions — this is meant to feel like the real thing.`
            : ''}
        </p>
      </header>

      <Section variant="transparent" padding={0}>
        <VStack gap={5}>
          {criteria ? (
            <div className="aced-answer-tips">
              <Collapsible
                defaultIsOpen={false}
                trigger={
                  <Text type="label">
                    Before you answer · {criteria.mustCover.length} cues
                  </Text>
                }
              >
                <VStack gap={3} className="aced-answer-tips__body">
                  {criteria.summary ? (
                    <Text as="p" color="secondary">
                      {criteria.summary}
                    </Text>
                  ) : null}
                  <ol className="aced-answer-tips__list">
                    {criteria.mustCover.slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                  {criteria.strongSignals[0] ? (
                    <Text
                      as="p"
                      color="secondary"
                      className="aced-answer-tips__nudge"
                    >
                      Strong answers often include: {criteria.strongSignals[0]}
                    </Text>
                  ) : null}
                </VStack>
              </Collapsible>
            </div>
          ) : null}

          <section className="aced-room__stage" aria-label="Answer">
            {!ready ? (
              <Banner
                status="warning"
                title="Missing session"
                description="Start from Home so a session and question are created."
              />
            ) : (
              <VoiceRecorder
                key={questionId}
                sessionId={sessionId}
                questionId={questionId}
                onComplete={({answerId: id, transcription: text, source}) => {
                  setAnswerId(id);
                  setTranscription(text);
                  setTranscriptSource(source);
                  setGrade(null);
                  void gradeAnswer(id);
                }}
              />
            )}

            {isGrading ? (
              <Text type="label" color="secondary">
                Scoring your answer…
              </Text>
            ) : null}

            {transcription && !isGrading ? (
              <div className="aced-room__transcript">
                <Text type="label" color="secondary">
                  Transcript · {transcriptSource ?? 'browser'}
                </Text>
                <Text as="p">{transcription}</Text>
              </div>
            ) : null}

            {grade ? <GradeFeedback grade={grade} /> : null}

            {error ? (
              <Banner
                status="error"
                title="Interview error"
                description={error}
              />
            ) : null}

            {error && answerId && !grade && !isGrading ? (
              <Button
                label="Retry scoring"
                variant="secondary"
                onClick={() => void gradeAnswer(answerId)}
              />
            ) : null}

            {grade ? (
              <nav className="aced-room__next" aria-label="Continue">
                <HStack gap={2} wrap="wrap">
                  {nextQuestion ? (
                    <Button
                      label="Next question"
                      variant="primary"
                      onClick={() => goToQuestion(nextQuestion.id)}
                    />
                  ) : (
                    <Button
                      label="See session results"
                      variant="primary"
                      onClick={() =>
                        router.push(
                          `/interview/results?session_id=${sessionId}`,
                        )
                      }
                    />
                  )}
                  {nextQuestion && sessionId ? (
                    <Button
                      label="End session"
                      variant="secondary"
                      onClick={() =>
                        router.push(
                          `/interview/results?session_id=${sessionId}`,
                        )
                      }
                    />
                  ) : null}
                </HStack>
              </nav>
            ) : null}
          </section>
        </VStack>
      </Section>
    </div>
  );
}

export default function InterviewStartPage() {
  return (
    <Suspense
      fallback={<p className="aced-loading">Setting up your question…</p>}
    >
      <InterviewStartInner />
    </Suspense>
  );
}
