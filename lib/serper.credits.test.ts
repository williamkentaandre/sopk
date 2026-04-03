import { describe, expect, it } from 'vitest';
import { pickCreditsFromUnknown } from './serper';

describe('pickCreditsFromUnknown', () => {
  it('reads plain numbers', () => {
    expect(pickCreditsFromUnknown(42)).toBe(42);
    expect(pickCreditsFromUnknown(42.9)).toBe(42);
  });

  it('reads preferred keys', () => {
    expect(pickCreditsFromUnknown({ creditsRemaining: 100 })).toBe(100);
    expect(pickCreditsFromUnknown({ credits_remaining: 7 })).toBe(7);
  });

  it('returns null when nothing matches', () => {
    expect(pickCreditsFromUnknown({ foo: 'bar' })).toBeNull();
    expect(pickCreditsFromUnknown(null)).toBeNull();
  });
});
