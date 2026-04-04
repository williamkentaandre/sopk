import { describe, it, expect } from 'vitest';
import { matchUrlInResults, type OrganicResult } from './serpapi';

describe('matchUrlInResults (domain root + path preference)', () => {
  it('for a full URL, picks a path-compatible row over an earlier same-domain row', () => {
    const target = 'https://www.example.com/pricing';
    const rows: OrganicResult[] = [
      { position: 1, link: 'https://competitor.com/' },
      { position: 2, link: 'https://blog.example.com/article' },
      { position: 3, link: 'https://example.com/pricing' },
    ];
    const m = matchUrlInResults(target, rows);
    expect(m.position).toBe(3);
    expect(m.matchedUrl).toContain('example.com');
    expect(m.matchType).toBe('domain');
  });

  it('returns none when no row shares root domain', () => {
    const m = matchUrlInResults('https://foo.com', [
      { position: 1, link: 'https://bar.com' },
    ]);
    expect(m.position).toBeNull();
    expect(m.matchType).toBe('none');
  });

  it('skips rows with empty resolved link', () => {
    const m = matchUrlInResults('https://a.com', [
      { position: 1, link: '' },
      { position: 2, link: 'https://sub.a.com/x' },
    ]);
    expect(m.position).toBe(2);
  });

  it('does not match different public suffixes (e.g. nike.com vs nike.fr)', () => {
    const m = matchUrlInResults('nike.com', [
      { position: 1, link: 'https://competitor.example/' },
      { position: 7, link: 'https://www.nike.fr/fr/' },
    ]);
    expect(m.position).toBeNull();
    expect(m.matchType).toBe('none');
  });

  it('matches when TLD matches (nike.fr target, nike.fr in SERP)', () => {
    const m = matchUrlInResults('nike.fr', [
      { position: 1, link: 'https://competitor.example/' },
      { position: 2, link: 'https://www.nike.fr/fr/' },
    ]);
    expect(m.position).toBe(2);
    expect(m.matchedUrl).toContain('nike.fr');
  });

  it('does not match amazon.fr target to amazon.com organic', () => {
    const m = matchUrlInResults('amazon.fr', [
      { position: 3, link: 'https://www.amazon.com/dp/test' },
    ]);
    expect(m.position).toBeNull();
  });

  it('resolves protocol-relative organic links when TLD matches', () => {
    const m = matchUrlInResults('nike.fr', [
      { position: 1, link: '//www.nike.fr/fr/' },
    ]);
    expect(m.position).toBe(1);
  });

  it('falls back to displayed_link when link is empty and TLD matches', () => {
    const m = matchUrlInResults('jules.fr', [
      {
        position: 1,
        link: '',
        displayed_link: 'https://www.jules.fr › Chaussures',
      } as OrganicResult,
    ]);
    expect(m.position).toBe(1);
  });

  it('uses list index for rank, not a misleading row.position from the API', () => {
    const rows: OrganicResult[] = [
      { position: 4, link: 'https://other.example/' },
      { position: 4, link: 'https://a.example/' },
      { position: 4, link: 'https://b.example/' },
      { position: 4, link: 'https://www.amazon.com/dp/x' },
      { position: 4, link: 'https://c.example/' },
      { position: 4, link: 'https://www.chaussea.com/y' },
    ];
    expect(matchUrlInResults('amazon.com', rows).position).toBe(4);
    expect(matchUrlInResults('chaussea.com', rows).position).toBe(6);
  });
});
