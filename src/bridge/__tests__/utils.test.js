import { describe, it, expect } from 'vitest';
import { sanitize, makeRateLimiter, extractSpotifyId, extractYouTubeId } from '../utils.js';

describe('sanitize', () => {
  it('strips HTML-injection characters', () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
  });
  it('trims whitespace', () => {
    expect(sanitize('  hello  ')).toBe('hello');
  });
  it('enforces max length', () => {
    expect(sanitize('a'.repeat(600))).toHaveLength(512);
  });
  it('accepts a custom max length', () => {
    expect(sanitize('hello world', 5)).toBe('hello');
  });
  it('coerces non-string input to string', () => {
    expect(sanitize(42)).toBe('42');
  });
});

describe('makeRateLimiter', () => {
  it('allows calls within the limit', () => {
    const rl = makeRateLimiter();
    expect(rl('key', 3, 60_000)).toBe(true);
    expect(rl('key', 3, 60_000)).toBe(true);
    expect(rl('key', 3, 60_000)).toBe(true);
  });
  it('blocks the call that exceeds the limit', () => {
    const rl = makeRateLimiter();
    rl('k2', 2, 60_000);
    rl('k2', 2, 60_000);
    expect(rl('k2', 2, 60_000)).toBe(false);
  });
  it('uses independent buckets per key', () => {
    const rl = makeRateLimiter();
    rl('a', 1, 60_000);
    expect(rl('a', 1, 60_000)).toBe(false);
    expect(rl('b', 1, 60_000)).toBe(true);
  });
});

describe('extractSpotifyId', () => {
  it('extracts from full URL', () => {
    expect(extractSpotifyId('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'))
      .toBe('37i9dQZF1DXcBWIGoYBM5M');
  });
  it('returns bare 22-char ID unchanged', () => {
    expect(extractSpotifyId('37i9dQZF1DXcBWIGoYBM5M')).toBe('37i9dQZF1DXcBWIGoYBM5M');
  });
  it('returns null for invalid input', () => {
    expect(extractSpotifyId('not-a-playlist')).toBeNull();
  });
});

describe('extractYouTubeId', () => {
  it('extracts list param from full URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknc9TTnkwVquh'))
      .toBe('PLrAXtmErZgOeiKm4sgNOknc9TTnkwVquh');
  });
  it('extracts list from watch URL with list param', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=abc&list=PLrAXtmErZgOeiKm4sgNO'))
      .toBe('PLrAXtmErZgOeiKm4sgNO');
  });
  it('returns bare playlist ID unchanged', () => {
    expect(extractYouTubeId('PLrAXtmErZgOeiKm4sgNOknc9TTnkwVquh')).toBe('PLrAXtmErZgOeiKm4sgNOknc9TTnkwVquh');
  });
  it('returns null for invalid input', () => {
    expect(extractYouTubeId('not-a-playlist')).toBeNull();
  });
});
