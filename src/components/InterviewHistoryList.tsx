'use client';

import {useEffect, useState, type CSSProperties} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';

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

function scoreTone(score: number | null): 'strong' | 'okay' | 'weak' | 'empty' {
  if (score === null) return 'empty';
  if (score >= 75) return 'strong';
  if (score >= 55) return 'okay';
  return 'weak';
}

export function InterviewHistoryList({
  sessions,
}: {
  sessions: InterviewHistoryRow[];
  /** @deprecated kept for call-site compatibility */
  heading?: string;
  headingId?: string;
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
        <Banner
          status="error"
          title="Couldn’t delete interview"
          description={error}
        />
      ) : null}

      <ul className="aced-history">
        {rows.map((session) => {
          const score =
            session.overall_score === null ||
            session.overall_score === undefined
              ? null
              : Math.round(Number(session.overall_score));
          const tone = scoreTone(score);
          const role = session.role_title?.trim() || 'design role';
          const company = session.company_name?.trim();
          const resultsHref = `/interview/results?session_id=${session.id}`;
          const retakeHref = '/interview';

          return (
            <li key={session.id} className="aced-history__card">
              <div className="aced-history__main">
                <Text as="p" className="aced-history__title">
                  Interviewing for{' '}
                  <span className="aced-history__accent">{role}</span>
                  {company ? (
                    <>
                      {' '}
                      at <span className="aced-history__accent">{company}</span>
                    </>
                  ) : null}
                </Text>
                <Text as="p" color="secondary">
                  Date taken: {formatDateTaken(session.created_at)}
                </Text>
                <div className="aced-history__actions">
                  <Link className="aced-history__ghost" href={resultsHref}>
                    Read answers
                  </Link>
                  <Link className="aced-history__ghost" href={retakeHref}>
                    Retake interview
                  </Link>
                  <Button
                    label="Delete"
                    variant="ghost"
                    size="sm"
                    clickAction={() => {
                      setError(null);
                      setPendingId(session.id);
                    }}
                  />
                </div>
              </div>

              <div
                className={`aced-history__score aced-history__score--${tone}`}
                aria-label={
                  score === null
                    ? 'Assessment score pending'
                    : `Assessment score ${score} percent`
                }
              >
                <div
                  className="aced-history__ring"
                  style={
                    score === null
                      ? undefined
                      : ({['--score-pct']: score} as CSSProperties)
                  }
                >
                  <span className="aced-history__pct">
                    {score === null ? '—' : `${score}%`}
                  </span>
                </div>
                <Text as="p" type="label" className="aced-history__score-label">
                  Assessment score
                </Text>
              </div>
            </li>
          );
        })}
      </ul>

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
