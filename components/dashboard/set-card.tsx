import { FlashcardReview } from '@/components/flashcards/flashcard-review';
import { QuizRunner } from '@/components/quiz/quiz-runner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import {
  ChevronDownIcon,
  DownloadIcon,
  LayersIcon,
  ListChecksIcon,
  SpinnerIcon,
  TrashIcon,
} from '@/components/ui/icons';
import { downloadSet } from '@/lib/export';
import { cn } from '@/lib/utils';
import type { StudySetRow } from '@/lib/types';

/**
 * One saved set. Purely presentational: which card is open, which is being
 * confirmed for deletion, and the delete request itself all live in SetList,
 * so that only one of each can be active at a time.
 */
export function SetCard({
  row,
  open,
  confirmingDelete,
  deleting,
  onToggleOpen,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  row: StudySetRow;
  open: boolean;
  confirmingDelete: boolean;
  deleting: boolean;
  onToggleOpen: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const isCards = row.type === 'flashcards';
  const Icon = isCards ? LayersIcon : ListChecksIcon;
  const panelId = `set-panel-${row.id}`;

  return (
    <Card className={cn('overflow-hidden transition-shadow', open && 'shadow-md')}>
      <CardBody className="space-y-4 p-5">
        <div className="flex min-w-0 gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-medium leading-tight">{row.title || untitled(row)}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge>{isCards ? 'Flashcards' : 'Quiz'}</Badge>
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
            onClick={onToggleOpen}
            aria-expanded={open}
            aria-controls={panelId}
          >
            {open ? 'Close' : 'Open'}
            <ChevronDownIcon className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadSet(row, row.title)}
            title={isCards ? 'Download for Anki (.txt)' : 'Download as CSV'}
          >
            <DownloadIcon className="size-3.5" />
            Export
          </Button>
          {confirmingDelete ? (
            <>
              <Button size="sm" variant="danger" onClick={onConfirmDelete} disabled={deleting}>
                {deleting ? <SpinnerIcon className="size-3.5 animate-spin" /> : <TrashIcon className="size-3.5" />}
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </Button>
              <Button size="sm" variant="secondary" onClick={onCancelDelete} disabled={deleting}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="danger" onClick={onAskDelete}>
              <TrashIcon className="size-3.5" />
              Delete
            </Button>
          )}
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{row.source_excerpt}</p>

        {open ? (
          <div id={panelId} className="animate-reveal border-t pt-8">
            {row.type === 'flashcards' ? <FlashcardReview items={row.items} /> : <QuizRunner items={row.items} />}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function untitled(row: StudySetRow): string {
  return `${row.type === 'flashcards' ? 'Flashcards' : 'Quiz'} from ${formatDate(row.created_at)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
