import { describe, it, expect } from 'vitest';
import {
  extractDomain,
  retailLocaleKeyFromHlGl,
  urlsPathCompatibleForTracking,
} from './url-utils';

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

describe('retailLocaleKeyFromHlGl', () => {
  it('prefers gl over hl', () => {
    expect(retailLocaleKeyFromHlGl('de', 'fr')).toBe('de');
  });

  it('falls back to hl language subtag', () => {
    expect(retailLocaleKeyFromHlGl('', 'fr')).toBe('fr');
    expect(retailLocaleKeyFromHlGl('', 'fr-FR')).toBe('fr');
  });
});

describe('urlsPathCompatibleForTracking', () => {
  it('treats site root as prefix of deeper path when target is root', () => {
    expect(urlsPathCompatibleForTracking('https://x.com', 'https://x.com/a')).toBe(true);
  });

  it('does not treat homepage organic as matching a deep target URL', () => {
    expect(urlsPathCompatibleForTracking('https://x.com/a', 'https://x.com')).toBe(false);
    expect(
      urlsPathCompatibleForTracking(
        'https://www.spartoo.com/chaussures-femmes-orange.html',
        'https://www.spartoo.com/'
      )
    ).toBe(false);
  });

  it('still allows ancestor path prefix when both have paths', () => {
    expect(
      urlsPathCompatibleForTracking(
        'https://x.com/cat/shoes',
        'https://x.com/cat'
      )
    ).toBe(true);
  });

  it('matches desktop category URL to mobile-prefixed SERP path (same page)', () => {
    expect(
      urlsPathCompatibleForTracking(
        'https://www.spartoo.com/chaussures-femmes-orange.php',
        'https://www.spartoo.com/mobile/chaussures-femmes-orange.php'
      )
    ).toBe(true);
  });

  it('matches .php target to .html organic when basename is the same (retail CMS)', () => {
    expect(
      urlsPathCompatibleForTracking(
        'https://www.spartoo.com/chaussures-femmes-orange.php',
        'https://www.spartoo.com/chaussures-femmes-orange.html'
      )
    ).toBe(true);
  });

  it('does not change Nike-style localized paths (no false mobile strip)', () => {
    expect(
      urlsPathCompatibleForTracking(
        'https://www.nike.com/fr/w/vert-chaussures-bdkazy7ok',
        'https://www.nike.com/fr/w/vert-chaussures-bdkazy7ok'
      )
    ).toBe(true);
    expect(
      urlsPathCompatibleForTracking(
        'https://www.nike.com/fr/w/vert-chaussures-bdkazy7ok',
        'https://www.nike.com/fr/w/other-slug'
      )
    ).toBe(false);
  });
});
