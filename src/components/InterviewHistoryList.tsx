'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Timestamp} from '@astryxdesign/core/Timestamp';
import {FIGMA_COPY} from '@/lib/interview/figma-copy';
import {inferTrackFromRole} from '@/lib/interview/tracks';
import {ContinueSeriesButton} from '@/components/ContinueSeriesButton';

export type InterviewHistoryRow = {
  id: string;
  overall_score: number | null;
  created_at: string;
  role_title?: string | null;
  company_name?: string | null;
  series_id?: string | null;
  stage_number?: number;
  series_progress?: string;
  next_stage?: number | null;
  next_label?: string;
};

type InterviewCardVariant =
  | 'muted'
  | 'blue'
  | 'cyan'
  | 'green'
  | 'orange'
  | 'purple'
  | 'teal';

function cardVariantForRole(role: string): InterviewCardVariant {
  switch (inferTrackFromRole(role)?.family) {
    case 'visual':
      return 'orange';
    case 'research':
      return 'teal';
    case 'ux':
      return 'blue';
    case 'product':
      return 'cyan';
    case 'ai_product':
      return 'purple';
    case 'direction':
      return 'purple';
    case 'intern_visual':
      return 'green';
    default:
      return 'muted';
  }
}

const RECENT_MS = 21 * 24 * 60 * 60 * 1000;

function isRecent(iso: string, now: number): boolean {
  const taken = new Date(iso).getTime();
  if (Number.isNaN(taken)) return false;
  return now - taken <= RECENT_MS;
}

function splitByRecency(rows: InterviewHistoryRow[]): {
  recent: InterviewHistoryRow[];
  older: InterviewHistoryRow[];
} {
  const now = Date.now();
  const recent: InterviewHistoryRow[] = [];
  const older: InterviewHistoryRow[] = [];
  for (const row of rows) {
    if (isRecent(row.created_at, now)) recent.push(row);
    else older.push(row);
  }
  return {recent, older};
}

function InterviewTile({
  session,
  copy,
  onDelete,
}: {
  session: InterviewHistoryRow;
  copy: (typeof FIGMA_COPY)['interviews'];
  onDelete: () => void;
}) {
  const role = session.role_title?.trim() || 'design role';
  const company = session.company_name?.trim();
  const continueStage =
    session.next_stage ?? session.stage_number ?? 1;
  const continueLabel = session.next_label ?? copy.retake;
  const showContinue =
    continueLabel !== 'Read answers' &&
    Boolean(session.next_stage || continueLabel === 'Retake this round');

  return (
    <Card padding={5} variant={cardVariantForRole(role)}>
      <VStack gap={5}>
        <HStack gap={4} align="start" justify="between">
          <VStack gap={2}>
            <Text as="p" type="supporting" color="secondary">
              {company ? company : 'Interview'}
            </Text>
            <Heading level={3}>{role}</Heading>
            <Text as="p" type="supporting">
              {session.series_progress ?? '1 of 3'}
            </Text>
            <HStack gap={1} align="center">
              <Icon icon="calendar" size="sm" color="secondary" />
              <Timestamp
                value={session.created_at}
                format="date"
                type="supporting"
                color="secondary"
              />
            </HStack>
          </VStack>
          <Avatar name={role} size="xl" alt="" />
        </HStack>

        <HStack gap={2} align="center" wrap="wrap">
          <Button
            label={copy.readAnswers}
            variant="ghost"
            href={`/interview/results?session_id=${session.id}`}
          />
          {showContinue ? (
            <ContinueSeriesButton
              seriesId={session.series_id}
              fromSessionId={session.id}
              stageNumber={continueStage}
              label={continueLabel}
              variant="ghost"
            />
          ) : (
            <Button label={copy.retake} variant="ghost" href="/interview" />
          )}
          <Button label="Delete" variant="ghost" clickAction={onDelete} />
        </HStack>
      </VStack>
    </Card>
  );
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

  const {recent, older} = splitByRecency(rows);
  const groups = [
    {title: copy.recent, sessions: recent},
    {title: copy.longerAgo, sessions: older},
  ].filter((group) => group.sessions.length > 0);

  return (
    <VStack gap={6}>
      {error ? (
        <Banner
          status="error"
          title="Couldn’t delete interview"
          description={error}
        />
      ) : null}

      {groups.map((group) => (
        <VStack key={group.title} gap={4}>
          <Heading level={2}>{group.title}</Heading>
          <Grid columns={{minWidth: 300, max: 3}} gap={4}>
            {group.sessions.map((session) => (
              <InterviewTile
                key={session.id}
                session={session}
                copy={copy}
                onDelete={() => {
                  setError(null);
                  setPendingId(session.id);
                }}
              />
            ))}
          </Grid>
        </VStack>
      ))}

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
