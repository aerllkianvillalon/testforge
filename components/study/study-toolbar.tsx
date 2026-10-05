import { Button } from '@/components/ui/button';
import { MaximizeIcon, MinimizeIcon, ShuffleIcon, SwapIcon, VolumeIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * The secondary controls above a flashcard or quiz: shuffle, one study option,
 * read aloud and focus mode. Both study modes show the same four; only the
 * labels and what they act on differ, so the caller supplies those.
 */
export function StudyToolbar({
  shuffle,
  option,
  speech,
  focus,
}: {
  shuffle: { label: string; disabled: boolean; onClick: () => void };
  /** A toggle specific to the mode, e.g. "Answer first" or "Shuffle options". */
  option: { label: string; text: string; active: boolean; onClick: () => void };
  speech: { available: boolean; speaking: boolean; label: string; onClick: () => void };
  focus: { active: boolean; onClick: () => void };
}) {
  return (
    <div className="-mx-1 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={shuffle.onClick}
          disabled={shuffle.disabled}
          aria-label={shuffle.label}
        >
          <ShuffleIcon />
          <span className="hidden sm:inline">Shuffle</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={option.onClick}
          aria-pressed={option.active}
          aria-label={option.label}
          className={cn(option.active && 'bg-accent')}
        >
          <SwapIcon />
          <span className="hidden sm:inline">{option.text}</span>
        </Button>
      </div>
      <div className="flex items-center gap-1">
        {speech.available ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={speech.onClick}
            aria-pressed={speech.speaking}
            aria-label={speech.speaking ? 'Stop reading aloud' : speech.label}
            className={cn(speech.speaking && 'bg-accent')}
          >
            <VolumeIcon className={cn(speech.speaking && 'animate-pulse')} />
            <span className="hidden sm:inline">{speech.speaking ? 'Stop' : 'Read aloud'}</span>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={focus.onClick}
          aria-pressed={focus.active}
          aria-label={focus.active ? 'Exit focus mode' : 'Enter focus mode'}
        >
          {focus.active ? <MinimizeIcon /> : <MaximizeIcon />}
          <span className="hidden sm:inline">{focus.active ? 'Exit focus' : 'Focus'}</span>
        </Button>
      </div>
    </div>
  );
}
