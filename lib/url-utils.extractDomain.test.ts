import { describe, it, expect } from 'vitest';
import { extractDomain, urlsPathCompatibleForTracking } from './url-utils';

describe('extractDomain (multi-part TLD)', () => {
  it('does not collapse different .co.uk sites to co.uk', () => {
    expect(extractDomain('https://shop.foo.co.uk')).toBe('foo.co.uk');
    expect(extractDomain('https://bar.co.uk')).toBe('bar.co.uk');
    expect(extractDomain('https://shop.foo.co.uk')).not.toBe(extractDomain('https://bar.co.uk'));
  });

  it('still maps subdomains to same registrable .com', () => {
    expect(extractDomain('https://blog.example.com')).toBe('example.com');
  });
});

describe('urlsPathCompatibleForTracking', () => {
  it('treats home as prefix of deeper path', () => {
    expect(urlsPathCompatibleForTracking('https://x.com', 'https://x.com/a')).toBe(true);
    expect(urlsPathCompatibleForTracking('https://x.com/a', 'https://x.com')).toBe(true);
  });
});
