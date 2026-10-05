import { describe, expect, it } from 'vitest';
import { describePasswordError } from '@/lib/password-errors';

describe('describePasswordError', () => {
  it('recognises the common provider failures by code or message', () => {
    expect(describePasswordError({ code: 'same_password' })).toContain('same as your current');
    expect(describePasswordError({ message: 'New password should be different from the old password.' })).toContain('same as your current');
    expect(describePasswordError({ code: 'weak_password' })).toContain('too easy');
    expect(describePasswordError({ code: 'reauthentication_needed' })).toContain('sign back in');
    expect(describePasswordError({ code: 'over_request_rate_limit' })).toContain('Too many');
  });

  it('never echoes an unknown provider message back to the user', () => {
    const text = describePasswordError({ message: 'pq: connection refused at 10.0.0.4:5432' });
    expect(text).toBe("We couldn't update your password. Try again in a moment.");
  });
});
