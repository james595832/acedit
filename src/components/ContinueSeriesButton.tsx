'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';

export function ContinueSeriesButton({
  seriesId,
  fromSessionId,
  stageNumber,
  label,
  variant = 'primary',
}: {
  seriesId?: string | null;
  fromSessionId?: string | null;
  stageNumber: number;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startRound() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          series_id: seriesId ?? undefined,
          from_session_id: fromSessionId ?? undefined,
          stage_number: stageNumber,
        }),
      });
      const data = (await res.json()) as {
        session_id?: string;
        error?: string;
      };
      if (!res.ok || !data.session_id) {
        throw new Error(data.error ?? 'Could not start this round');
      }
      router.push(`/interview/start?session_id=${data.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start this round');
      setBusy(false);
    }
  }

  return (
    <>
      {error ? (
        <Banner status="error" title="Couldn’t start the next round" description={error} />
      ) : null}
      <Button
        label={busy ? 'Setting up…' : label}
        variant={variant}
        clickAction={() => {
          void startRound();
        }}
        isDisabled={busy}
      />
    </>
  );
}
