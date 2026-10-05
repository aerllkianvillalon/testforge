/** Turns an auth provider error into something a person can act on. */
export function describePasswordError(error: { message?: string; code?: string }): string {
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();

  if (code === 'same_password' || message.includes('different from the old')) {
    return "That's the same as your current password. Choose a new one.";
  }
  if (code === 'weak_password' || message.includes('weak') || message.includes('easy to guess')) {
    return 'That password is too easy to guess. Try a longer or less common one.';
  }
  if (code === 'reauthentication_needed' || message.includes('reauthenticat')) {
    return 'For security, sign out and sign back in, then try again.';
  }
  if (code.includes('rate_limit') || message.includes('rate limit')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  return "We couldn't update your password. Try again in a moment.";
}
