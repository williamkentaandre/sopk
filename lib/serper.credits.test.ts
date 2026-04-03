import { describe, expect, it } from 'vitest';
import {
  creditsBalanceFromSearchHeaders,
  pickCreditsFromSearchBodyTopLevel,
  pickCreditsFromUnknown,
} from './serper';

describe('creditsBalanceFromSearchHeaders', () => {
  it('ignores generic x-credits (often per-request, not balance)', () => {
    const h = new Headers();
    h.set('x-credits', '1');
    expect(creditsBalanceFromSearchHeaders(h)).toBeNull();
  });

  it('reads x-credits-remaining', () => {
    const h = new Headers();
    h.set('x-credits-remaining', '2500');
    expect(creditsBalanceFromSearchHeaders(h)).toBe(2500);
  });
});

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

  it('does not use ambiguous top-level credits key', () => {
    expect(pickCreditsFromSearchBodyTopLevel({ credits: 1 })).toBeNull();
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
