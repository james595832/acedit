'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {daysAgoLabel} from '@/lib/greeting';

export type InterviewHistoryRow = {
  id: string;
  overall_score: number | null;
  created_at: string;
};

function interviewLabel(score: number | null, index: number): string {
  if (score !== null) return `Score ${Math.round(score)} / 100`;
  return index === 0 ? 'Latest interview' : 'Interview';
}

export function InterviewHistoryList({
  sessions,
  heading,
  headingId,
}: {
  sessions: InterviewHistoryRow[];
  heading: string;
  headingId: string;
}) {
  const router = useRouter();
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
    <>
      {error ? (
        <Banner status="error" title="Couldn’t delete interview" description={error} />
      ) : null}
      <List
        density="balanced"
        hasDividers
        header={
          <Heading level={2} id={headingId}>
            {heading}
          </Heading>
        }
      >
        {rows.map((session, index) => {
          const score =
            session.overall_score === null || session.overall_score === undefined
              ? null
              : Math.round(Number(session.overall_score));
          return (
            <ListItem
              key={session.id}
              href={`/interview/results?session_id=${session.id}`}
              label={interviewLabel(score, index)}
              description={daysAgoLabel(session.created_at)}
              endContent={
                <HStack gap={2} align="center">
                  <Text type="supporting" color="secondary">
                    View
                  </Text>
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
              }
            />
          );
        })}
      </List>
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
    </>
  );
}
