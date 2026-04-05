import { describe, it, expect } from 'vitest';
import {
  resolveSerpResultDestination,
  urlsPathCompatibleForTracking,
} from './url-utils';

describe('resolveSerpResultDestination (Google /url unwrapping)', () => {
  it('unwraps google.fr /url?url=… to the Nike destination', () => {
    const wrapped =
      'https://www.google.fr/url?sa=t&url=https%3A%2F%2Fwww.nike.com%2Ffr%2Fw%2Fvert-chaussures-bdkazy7ok&ved=abc';
    expect(resolveSerpResultDestination(wrapped)).toBe(
      'https://www.nike.com/fr/w/vert-chaussures-bdkazy7ok'
    );
  });

  it('unwraps google.com /url?q=https://…', () => {
    const wrapped =
      'https://www.google.com/url?q=https%3A%2F%2Fwww.example.com%2Fpath&usg=1';
    expect(resolveSerpResultDestination(wrapped)).toBe('https://www.example.com/path');
  });
});

describe('urlsPathCompatibleForTracking (host+path without query)', () => {
  it('matches same path when only query strings differ', () => {
    const target =
      'https://www.nike.com/fr/w/vert-chaussures-bdkazy7ok?foo=1&bar=2';
    const result = 'https://www.nike.com/fr/w/vert-chaussures-bdkazy7ok';
    expect(urlsPathCompatibleForTracking(target, result)).toBe(true);
  });
});
