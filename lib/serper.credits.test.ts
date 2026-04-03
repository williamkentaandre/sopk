import { describe, expect, it } from 'vitest';
import { pickCreditsFromSearchBodyTopLevel, pickCreditsFromUnknown } from './serper';

describe('pickCreditsFromSearchBodyTopLevel', () => {
  it('does not treat nested usage/position as credits', () => {
    expect(
      pickCreditsFromSearchBodyTopLevel({
        usage: 1,
        organic: [{ position: 1 }],
        searchParameters: { page: 1, num: 10 },
      })
    ).toBeNull();
  });

  it('reads explicit top-level credit fields', () => {
    expect(pickCreditsFromSearchBodyTopLevel({ creditsRemaining: 500 })).toBe(500);
    expect(pickCreditsFromSearchBodyTopLevel({ credits_remaining: 42 })).toBe(42);
  });
});

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
