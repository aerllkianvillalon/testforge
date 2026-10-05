import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/icon.svg"
      alt=""
      aria-hidden="true"
      className={cn('shrink-0', className)}
      style={{ colorScheme: 'inherit' }}
    />
  );
}

/**
 * Mark plus the wordmark. The name always stays visible — on narrow screens
 * it's the header's other controls (see SiteHeader) that collapse to icons
 * to make room, rather than the wordmark disappearing.
 */
export function Logo({ className, showMark = true }: { className?: string; showMark?: boolean }) {
  return (
    <span className={cn('flex items-center tracking-tight', showMark && 'gap-2', className)}>
      {showMark ? <LogoMark className="size-8" /> : null}
      <span className="font-bold">TestForge</span>
    </span>
  );
}