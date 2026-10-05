import { FlipIcon } from '@/components/ui/icons';

export function FlashcardFace({
  side,
  label,
  text,
  count,
  hint,
  hidden,
}: {
  side: 'front' | 'back';
  label: string;
  text: string;
  count: string;
  hint: string;
  hidden: boolean;
}) {
  return (
    <div className={`fc-face ${side === 'front' ? 'fc-front' : 'fc-back'}`} aria-hidden={hidden}>
      <div className="fc-head">
        <span>{label}</span>
        <span className="fc-head-count">{count}</span>
      </div>
      <div className="fc-body">
        <p className={`fc-text ${textSize(text)}`}>{text}</p>
      </div>
      <div className="fc-hint">
        <FlipIcon className="size-3" />
        {hint}
      </div>
    </div>
  );
}

/** Long answers shrink rather than overflow the card. */
function textSize(text: string): string {
  if (text.length <= 60) return 'text-2xl sm:text-3xl';
  if (text.length <= 140) return 'text-xl sm:text-2xl';
  if (text.length <= 260) return 'text-base sm:text-lg';
  return 'text-sm sm:text-base';
}
