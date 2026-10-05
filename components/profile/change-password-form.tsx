'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { SetPasswordForm } from '@/components/set-password-form';

export function ChangePasswordForm() {
  const [justUpdated, setJustUpdated] = useState(false);

  return (
    <div className="space-y-4">
      {justUpdated ? <Alert tone="success">Password updated.</Alert> : null}
      {/* Remounting after success clears the fields for the next change. */}
      <SetPasswordForm key={justUpdated ? 'done' : 'form'} submitLabel="Update password" onSuccess={() => setJustUpdated(true)} />
    </div>
  );
}
