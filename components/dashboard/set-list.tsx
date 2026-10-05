'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SetCard } from '@/components/dashboard/set-card';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { LayersIcon, SparklesIcon } from '@/components/ui/icons';
import { NETWORK_ERROR, readErrorMessage } from '@/lib/api-client';
import type { StudySetRow } from '@/lib/types';

export function SetList({ sets }: { sets: StudySetRow[] }) {
  const [rows, setRows] = useState(sets);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const response = await fetch(`/api/sets/${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        setError(await readErrorMessage(response, "We couldn't delete that set."));
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== id));
      if (openId === id) setOpenId(null);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPendingId(null);
      setConfirmingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <LayersIcon className="size-5" />
        </span>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Nothing saved yet. Generate a set from the home page and save it from there.
        </p>
        <Link href="/" className={buttonVariants('primary', 'md')}>
          <SparklesIcon />
          Generate a set
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {rows.map((row) => (
        <SetCard
          key={row.id}
          row={row}
          open={openId === row.id}
          confirmingDelete={confirmingId === row.id}
          deleting={pendingId === row.id}
          onToggleOpen={() => {
            setOpenId(openId === row.id ? null : row.id);
            setConfirmingId(null);
          }}
          onAskDelete={() => setConfirmingId(row.id)}
          onCancelDelete={() => setConfirmingId(null)}
          onConfirmDelete={() => remove(row.id)}
        />
      ))}
    </div>
  );
}
