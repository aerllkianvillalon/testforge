import type { HTMLAttributes, ReactNode } from 'react';
import { AlertIcon, CheckCircleIcon, InfoIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'error' | 'success';

const tones: Record<Tone, string> = {
  info: 'bg-muted/50 text-foreground',
  error: 'border-destructive/40 bg-destructive/5 text-destructive',
  success: 'border-success/40 bg-success/5 text-success',
};

const icons: Record<Tone, typeof InfoIcon> = {
  info: InfoIcon,
  error: AlertIcon,
  success: CheckCircleIcon,
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
}

export function Alert({ tone = 'info', title, className, children, ...props }: AlertProps) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', tones[tone], className)}
      {...props}
    >
      <Icon className="mt-0.5" />
      <div className="min-w-0">
        {title ? <p className="font-medium leading-snug">{title}</p> : null}
        {children ? <div className={cn('leading-relaxed', title && 'mt-1')}>{children}</div> : null}
      </div>
    </div>
  );
}
