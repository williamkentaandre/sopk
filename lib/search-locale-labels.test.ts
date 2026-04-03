import { describe, expect, it } from 'vitest';
import { formatSearchLocaleLine } from './search-locale-labels';

const t = (key: string) =>
  ({
    'opt.french': 'French',
    'opt.france': 'France',
    'dashboard.status.searchLocaleNotSet': 'Not set',
  }[key] ?? key);

describe('formatSearchLocaleLine', () => {
  it('returns not set when hl or gl empty', () => {
    expect(formatSearchLocaleLine(t, '', 'fr')).toEqual({
      configured: false,
      label: 'Not set',
    });
  });

  it('returns translated pair when configured', () => {
    expect(formatSearchLocaleLine(t, 'fr', 'fr')).toEqual({
      configured: true,
      label: 'French · France',
    });
  });
});
