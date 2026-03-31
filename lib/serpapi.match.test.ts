import { describe, it, expect } from 'vitest';
import { matchUrlInResults, type OrganicResult } from './serpapi';

describe('matchUrlInResults (domain root only)', () => {
  it('returns first result in order with same extractDomain as target URL path', () => {
    const target = 'https://www.example.com/pricing';
    const rows: OrganicResult[] = [
      { position: 1, link: 'https://competitor.com/' },
      { position: 2, link: 'https://blog.example.com/article' },
      { position: 3, link: 'https://example.com/' },
    ];
    const m = matchUrlInResults(target, rows);
    expect(m.position).toBe(2);
    expect(m.matchedUrl).toBe('https://blog.example.com/article');
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

  it('matches .com target to local ccTLD in SERP (e.g. nike.com vs nike.fr)', () => {
    const m = matchUrlInResults('nike.com', [
      { position: 1, link: 'https://competitor.example/' },
      { position: 7, link: 'https://www.nike.fr/fr/' },
    ]);
    expect(m.position).toBe(7);
    expect(m.matchedUrl).toContain('nike.fr');
  });

  it('matches amazon.fr target to amazon.com organic', () => {
    const m = matchUrlInResults('amazon.fr', [
      { position: 3, link: 'https://www.amazon.com/dp/test' },
    ]);
    expect(m.position).toBe(3);
  });
});
