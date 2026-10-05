import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Confetti } from '@/components/ui/confetti';
import { CheckIcon } from '@/components/ui/icons';
import type { Flashcard } from '@/lib/ai/schemas';

const PREVIEW = 5; // how many "still to review" cards the summary lists

export function RoundSummary({
  round,
  total,
  remaining,
  onNextRound,
  onRestart,
  focus,
  onExitFocus,
}: {
  round: number;
  total: number;
  /** The cards marked "review again", which become the next round. */
  remaining: Flashcard[];
  onNextRound: () => void;
  onRestart: () => void;
  focus: boolean;
  onExitFocus: () => void;
}) {
  const left = remaining.length;

  return (
    <>
      {left === 0 ? <Confetti /> : null}
      <Card className="mx-auto w-full max-w-xl animate-reveal">
        <CardBody className="space-y-6 py-10 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
            <CheckIcon className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Round {round} finished</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {left === 0
                ? `You got through all ${total} ${total === 1 ? 'card' : 'cards'} without marking any for review.`
                : `${total - left} of ${total} marked as known. ${left} left to review.`}
            </p>
          </div>

          {left > 0 ? (
            <div className="mx-auto max-w-md text-left">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Still to review</p>
              <ul className="divide-y rounded-lg border text-sm">
                {remaining.slice(0, PREVIEW).map((card, i) => (
                  <li key={i} className="truncate px-3 py-2">
                    {card.front}
                  </li>
                ))}
              </ul>
              {left > PREVIEW ? (
                <p className="mt-2 text-xs text-muted-foreground">and {left - PREVIEW} more</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-center gap-2">
            {left > 0 ? <Button onClick={onNextRound}>Review the {left} remaining</Button> : null}
            <Button variant="secondary" onClick={onRestart}>
              Start over
            </Button>
            {focus ? (
              <Button variant="ghost" onClick={onExitFocus}>
                Exit focus
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
