'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {VStack} from '@astryxdesign/core/Layout';

export function DeleteInterviewButton({
  sessionId,
  afterHref = '/interview/results',
}: {
  sessionId: string;
  afterHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/session/${sessionId}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => ({}))) as {error?: string};
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not delete interview');
      }
      setOpen(false);
      router.push(afterHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete interview');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <VStack gap={2}>
      {error ? (
        <Banner status="error" title="Couldn’t delete interview" description={error} />
      ) : null}
      <Button
        label="Delete this interview"
        variant="ghost"
        size="sm"
        clickAction={() => {
          setError(null);
          setOpen(true);
        }}
      />
      <AlertDialog
        isOpen={open}
        onOpenChange={(next) => {
          if (!isDeleting) setOpen(next);
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
