import { CardPage } from '@/components/card-page';
import { ConfirmResetForm } from '@/components/confirm-reset-form';

// Deliberately public (see middleware.ts) — the person doesn't have a
// session yet at this point. ConfirmResetForm creates one, client-side, only
// once they click through.
export default function ConfirmResetPage() {
  return (
    <CardPage
      email={null}
      title="Confirm password reset"
      description="One more click to make sure it's really you."
    >
      <ConfirmResetForm />
    </CardPage>
  );
}
