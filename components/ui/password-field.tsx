'use client';

import { useState, type ReactNode } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon } from '@/components/ui/icons';
import { Input, Label } from '@/components/ui/field';

/** Labelled password input with a lock icon and a show/hide toggle. `children` render beneath it (hints, errors). */
export function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  onSubmit,
  children,
}: {
  id: string;
  label: string;
  autoComplete: 'new-password' | 'current-password';
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  children?: ReactNode;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="pl-9 pr-9"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onSubmit()}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {shown ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>
      {children}
    </div>
  );
}
