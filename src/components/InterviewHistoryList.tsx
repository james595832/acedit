'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Text} from '@astryxdesign/core/Text';
import {FIGMA_COPY} from '@/lib/interview/figma-copy';

export type InterviewHistoryRow = {
  id: string;
  overall_score: number | null;
  created_at: string;
  role_title?: string | null;
  company_name?: string | null;
};

function formatDateTaken(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function scoreProgressVariant(
  score: number | null,
): 'success' | 'warning' | 'error' | 'neutral' {
  if (score === null) return 'neutral';
  if (score >= 75) return 'success';
  if (score >= 55) return 'warning';
  return 'error';
}

export function InterviewHistoryList({
  sessions,
}: {
  sessions: InterviewHistoryRow[];
  heading?: string;
  headingId?: string;
}) {
  const router = useRouter();
  const copy = FIGMA_COPY.interviews;
  const [rows, setRows] = useState(sessions);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(sessions);
  }, [sessions]);

  async function confirmDelete() {
    if (!pendingId) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/session/${pendingId}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => ({}))) as {error?: string};
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not delete interview');
      }
      setRows((current) => current.filter((row) => row.id !== pendingId));
      setPendingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete interview');
    } finally {
      setIsDeleting(false);
    }
  }

  if (rows.length === 0) return null;

  return (
    <VStack gap={3}>
      {error ? (
        <Banner
          status="error"
          title="Couldn’t delete interview"
          description={error}
        />
      ) : null}

      {rows.map((session) => {
        const score =
          session.overall_score === null ||
          session.overall_score === undefined
            ? null
            : Math.round(Number(session.overall_score));
        const role = session.role_title?.trim() || 'design role';
        const company = session.company_name?.trim();

        return (
          <Card key={session.id} padding={4}>
            <VStack gap={3}>
              <HStack gap={4} align="start" justify="between" wrap="wrap">
                <VStack gap={2}>
                  <Text as="p" type="large" weight="bold">
                    Interviewing for{' '}
                    <Text color="accent" weight="bold">
                      {role}
                    </Text>
                    {company ? (
                      <>
                        {' '}
                        at{' '}
                        <Text color="accent" weight="bold">
                          {company}
                        </Text>
                      </>
                    ) : null}
                  </Text>
                  <Text as="p" color="secondary">
                    {copy.dateTaken(formatDateTaken(session.created_at))}
                  </Text>
                  <HStack gap={2} wrap="wrap">
                    <Button
                      label={copy.readAnswers}
                      variant="secondary"
                      clickAction={() => {
                        router.push(
                          `/interview/results?session_id=${session.id}`,
                        );
                      }}
                    />
                    <Button
                      label={copy.retake}
                      variant="secondary"
                      clickAction={() => {
                        router.push('/interview');
                      }}
                    />
                    <Button
                      label="Delete"
                      variant="ghost"
                      size="sm"
                      clickAction={() => {
                        setError(null);
                        setPendingId(session.id);
                      }}
                    />
                  </HStack>
                </VStack>

                <VStack gap={2} align="center">
                  <Text as="p" type="display-3" weight="bold" hasTabularNumbers>
                    {score === null ? '—' : `${score}%`}
                  </Text>
                  <Text as="p" type="label" weight="bold">
                    {copy.assessmentScore}
                  </Text>
                  <ProgressBar
                    label={copy.assessmentScore}
                    isLabelHidden
                    value={score ?? 0}
                    max={100}
                    variant={scoreProgressVariant(score)}
                    isDisabled={score === null}
                  />
                </VStack>
              </HStack>
            </VStack>
          </Card>
        );
      })}

      <AlertDialog
        isOpen={Boolean(pendingId)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingId(null);
        }}
        title="Delete this interview?"
        description="Scores, answers, and transcripts for this run will be removed. Your CV stays."
        cancelLabel="Keep it"
        actionLabel="Delete interview"
        isActionLoading={isDeleting}
        onAction={() => {
          void confirmDelete();
        }}
      />
    </VStack>
  );
}
