"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
  ChevronDownIcon,
  DownloadIcon,
  LayersIcon,
  ListChecksIcon,
  SparklesIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { FlashcardReview } from "@/components/flashcards/flashcard-review";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { downloadSet } from "@/lib/export";
import { cn } from "@/lib/utils";
import type { Flashcard, QuizItem } from "@/lib/ai/schemas";
import type { StudySetRow } from "@/lib/types";

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
      const response = await fetch(`/api/sets/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "We couldn't delete that set.");
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== id));
      if (openId === id) setOpenId(null);
    } catch {
      setError(
        "The request never reached us. Check your connection and try again.",
      );
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
          Nothing saved yet. Generate a set from the home page and save it from
          there.
        </p>
        <Link href="/" className={buttonVariants("primary", "md")}>
          <SparklesIcon />
          Generate a set
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {rows.map((row) => {
        const open = openId === row.id;
        const isCards = row.type === "flashcards";
        const Icon = isCards ? LayersIcon : ListChecksIcon;
        const panelId = `set-panel-${row.id}`;

        return (
          <Card
            key={row.id}
            className={cn(
              "overflow-hidden transition-shadow",
              open && "shadow-md",
            )}
          >
            <CardBody className="space-y-4 p-5">
              <div className="flex min-w-0 gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-medium leading-tight">
                    {row.title || untitled(row)}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge>{isCards ? "Flashcards" : "Quiz"}</Badge>
                    <Badge>{row.items.length} items</Badge>
                    <Badge>{formatDate(row.created_at)}</Badge>
                    <Badge>{row.model_version}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setOpenId(open ? null : row.id);
                    setConfirmingId(null);
                  }}
                  aria-expanded={open}
                  aria-controls={panelId}
                >
                  {open ? "Close" : "Open"}
                  <ChevronDownIcon
                    className={cn(
                      "size-3.5 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    downloadSet(
                      row.type === "flashcards"
                        ? {
                            type: "flashcards",
                            items: row.items as Flashcard[],
                          }
                        : { type: "quiz", items: row.items as QuizItem[] },
                      row.title,
                    )
                  }
                  title={
                    isCards ? "Download for Anki (.txt)" : "Download as CSV"
                  }
                >
                  <DownloadIcon className="size-3.5" />
                  Export
                </Button>
                {confirmingId === row.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => remove(row.id)}
                      disabled={pendingId === row.id}
                    >
                      {pendingId === row.id ? (
                        <SpinnerIcon className="size-3.5 animate-spin" />
                      ) : (
                        <TrashIcon className="size-3.5" />
                      )}
                      {pendingId === row.id ? "Deleting…" : "Confirm delete"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setConfirmingId(null)}
                      disabled={pendingId === row.id}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirmingId(row.id)}
                  >
                    <TrashIcon className="size-3.5" />
                    Delete
                  </Button>
                )}
              </div>

              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {row.source_excerpt}
              </p>

              {open ? (
                <div id={panelId} className="animate-reveal border-t pt-8">
                  {isCards ? (
                    <FlashcardReview items={row.items as Flashcard[]} />
                  ) : (
                    <QuizRunner items={row.items as QuizItem[]} />
                  )}
                </div>
              ) : null}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function untitled(row: StudySetRow): string {
  return `${row.type === "flashcards" ? "Flashcards" : "Quiz"} from ${formatDate(row.created_at)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}