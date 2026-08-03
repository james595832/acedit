'use client';

import {useEffect, useMemo, useState, Suspense} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {VoiceRecorder} from '@/components/VoiceRecorder';
import {GradeFeedback} from '@/components/GradeFeedback';
import {SessionProgress} from '@/components/SessionProgress';
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

function InterviewStartInner() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get('session_id') ?? '';
  const questionId = params.get('question_id') ?? '';

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [questionText, setQuestionText] = useState<string | null>(null);
  const [questionCategory, setQuestionCategory] = useState<string | null>(null);
  const [isPersonal, setIsPersonal] = useState(false);
  const [criteria, setCriteria] = useState<AnswerCriteria | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcriptSource, setTranscriptSource] = useState<string | null>(null);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);

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
      const match =
        list.find((q) => q.id === questionId) ?? data.first_question;
      setQuestionText(match?.question_text ?? null);
      setQuestionCategory(match?.question_category ?? null);
      setIsPersonal(Boolean(match?.is_personal));
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
    })();
  }, [sessionId, questionId]);

  async function gradeCurrentAnswer() {
    if (!answerId || !questionId) return;
    setError(null);
    setIsGrading(true);
    try {
      const res = await fetch('/api/interview/grade-answer', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({answer_id: answerId, question_id: questionId}),
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
    : transcription
      ? 'Ready to grade'
      : 'Practice & get feedback';

  return (
    <>
      <nav className="aced-crumb" aria-label="Breadcrumb">
        <Link href="/studio">← Studio</Link>
        <span aria-hidden="true">/</span>
        <Link href="/interview">Practice interview</Link>
      </nav>
      <header className="aced-masthead aced-masthead--question">
        {questions.length > 0 ? (
          <SessionProgress
            label="Session questions"
            current={questionIndex + 1}
            total={questions.length}
            status={phaseStatus}
          />
        ) : null}
        <div className="aced-masthead__copy">
          <p className="aced-masthead__kicker">
            {isPersonal ? 'Personal · From your CV / JD' : 'Fundamentals'}
            {questionCategory
              ? ` · ${questionCategory.replaceAll('_', ' ')}`
              : ''}
          </p>
          <h1>{questionText ?? 'Loading question…'}</h1>
          <p className="aced-masthead__lead">
            Answer out loud. We’ll capture a transcript and score it against the
            rubric for this role.
          </p>
        </div>
      </header>

      <Section variant="transparent" padding={0}>
        <VStack gap={5}>
          {criteria ? (
            <div className="aced-panel aced-panel--soft">
              <Collapsible
                defaultIsOpen
                trigger={
                  <Text type="label">
                    What a strong answer includes. Read before you speak
                  </Text>
                }
              >
                <VStack gap={2}>
                  <Text as="p" color="secondary">
                    {criteria.summary}
                  </Text>
                  <Text type="label">Must cover</Text>
                  {criteria.mustCover.map((item) => (
                    <Text key={item} as="p" color="secondary">
                      • {item}
                    </Text>
                  ))}
                  <Text type="label">Strong signals</Text>
                  {criteria.strongSignals.map((item) => (
                    <Text key={item} as="p" color="secondary">
                      • {item}
                    </Text>
                  ))}
                  <Text type="label">Weak answers usually sound like</Text>
                  {criteria.weakSignals.map((item) => (
                    <Text key={item} as="p" color="secondary">
                      • {item}
                    </Text>
                  ))}
                </VStack>
              </Collapsible>
            </div>
          ) : null}

          <div className="aced-panel">
            <VStack gap={4}>
              <Heading level={3}>Practice and get feedback</Heading>
              {!ready ? (
                <Banner
                  status="warning"
                  title="Missing session"
                  description="Start from the interview page so a session and question are created."
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
                  }}
                />
              )}

              {transcription ? (
                <VStack gap={2}>
                  <Heading level={3}>Captured transcript</Heading>
                  <Text type="supporting" color="secondary" as="p">
                    Source: {transcriptSource ?? 'browser'}. Graded against the
                    criteria above.
                  </Text>
                  <div className="aced-record__transcript">
                    <Text as="p">{transcription}</Text>
                  </div>
                  <Button
                    label="Grade this answer"
                    variant="primary"
                    clickAction={gradeCurrentAnswer}
                    isDisabled={!answerId}
                    isLoading={isGrading}
                  />
                </VStack>
              ) : null}

              {grade ? <GradeFeedback grade={grade} /> : null}

              {error ? (
                <Banner
                  status="error"
                  title="Interview error"
                  description={error}
                />
              ) : null}

              <nav className="aced-next-steps" aria-label="Next steps">
                <p className="aced-next-steps__label">Next steps</p>
                <HStack gap={2} wrap="wrap">
                  {nextQuestion ? (
                    <Button
                      label="Next question"
                      variant="primary"
                      onClick={() => goToQuestion(nextQuestion.id)}
                    />
                  ) : null}
                  {sessionId ? (
                    <Button
                      label="View session results"
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
            </VStack>
          </div>
        </VStack>
      </Section>
    </>
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
