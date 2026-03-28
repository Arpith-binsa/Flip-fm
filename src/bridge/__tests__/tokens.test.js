import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveToken, loadToken, clearToken, tokenNeedsRefresh } from '../tokens.js';

const KEY = 'test_token';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

const makeEntry = (overrides = {}) => ({
  accessToken: 'acc123',
  refreshToken: 'ref456',
  user: 'testuser',
  expiresIn: 3600,
  ...overrides,
});

describe('saveToken / loadToken round-trip', () => {
  it('stores and retrieves a valid token', () => {
    saveToken(KEY, makeEntry());
    const result = loadToken(KEY);
    expect(result.accessToken).toBe('acc123');
    expect(result.refreshToken).toBe('ref456');
    expect(result.user).toBe('testuser');
    expect(result.exp).toBeGreaterThan(Date.now());
  });

  it('returns null when key does not exist', () => {
    expect(loadToken('nonexistent')).toBeNull();
  });

  it('returns null and removes key when token is expired', () => {
    saveToken(KEY, makeEntry({ expiresIn: 0 }));
    // expiresIn 0 → exp = Date.now() - 60_000 (already expired due to 60s skew)
    expect(loadToken(KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('clearToken', () => {
  it('removes the entry from localStorage', () => {
    saveToken(KEY, makeEntry());
    clearToken(KEY);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('does not throw if key does not exist', () => {
    expect(() => clearToken('nonexistent')).not.toThrow();
  });
});

describe('tokenNeedsRefresh', () => {
  it('returns false for a fresh token', () => {
    saveToken(KEY, makeEntry({ expiresIn: 3600 }));
    expect(tokenNeedsRefresh(KEY)).toBe(false);
  });

  it('returns true when token expires within 5 minutes', () => {
    // Manually write a token that expires in 2 minutes
    const exp = Date.now() + 2 * 60 * 1000;
    localStorage.setItem(KEY, JSON.stringify({ accessToken: 'x', exp }));
    expect(tokenNeedsRefresh(KEY)).toBe(true);
  });

  it('returns false when key does not exist', () => {
    expect(tokenNeedsRefresh('nonexistent')).toBe(false);
  });
});
