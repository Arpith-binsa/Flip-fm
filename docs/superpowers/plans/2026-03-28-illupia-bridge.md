# IlluPia Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `/bridge` route that converts playlists between Spotify and YouTube Music, with PKCE OAuth for both platforms, persistent refresh-token-based sessions, a first-visit language popup (English/Sámi), and full OWASP-aligned input validation and rate limiting.

**Architecture:** Self-contained `src/bridge/` module folder (Bridge.jsx + pure helper modules) added to the existing Flip-FM Vite app. One unguarded route added to App.jsx. No Flip-FM auth or state shared. Pure utility and token modules are unit-tested with Vitest; OAuth and API calls are manually verified.

**Tech Stack:** React 19, Vite 7, React Router DOM 7, Spotify Web API, YouTube Data API v3, Vitest 3, localStorage for token persistence.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/bridge/utils.js` | sanitize, rate limiter, PKCE helpers, URL extractors, fetch wrapper |
| Create | `src/bridge/tokens.js` | localStorage token save/load/clear/needsRefresh |
| Create | `src/bridge/oauth.js` | Spotify + Google PKCE flows (initiate, exchange, refresh) |
| Create | `src/bridge/api.js` | Spotify + YouTube API functions |
| Create | `src/bridge/translations.js` | EN + Sámi translation strings |
| Create | `src/bridge/Bridge.jsx` | Main React component (language popup, auth pills, conversion UI) |
| Create | `src/bridge/__tests__/utils.test.js` | Unit tests for utils.js |
| Create | `src/bridge/__tests__/tokens.test.js` | Unit tests for tokens.js |
| Modify | `src/pages/App.jsx` | Add one unguarded `/bridge` route |
| Modify | `.env` | Add `VITE_SPOTIFY_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` |
| Create | `.env.example` | Document required env vars (committed to git) |
| Create | `vitest.config.js` | Vitest configuration |

---

## Important: Google OAuth Client Type

Google's token exchange endpoint requires a `client_secret` for **Web application** type OAuth clients. To avoid exposing a secret in the client bundle, create your Google OAuth credentials as type **"Desktop app"** (also called "Installed application") in Google Cloud Console. Desktop app clients support PKCE with no `client_secret`.

- **Development redirect URI:** `http://localhost:5173/bridge`
- **Production redirect URI:** your full production URL, e.g. `https://flip-fm.vercel.app/bridge`

Desktop app type accepts arbitrary HTTP(S) redirect URIs when you register them explicitly. Add both URIs in Google Cloud Console → APIs & Services → Credentials → your OAuth client.

If you already have a **Web application** type client and can't switch, add `VITE_GOOGLE_CLIENT_SECRET` to `.env`. The code in Task 7 handles both cases.

---

## Task 1: Env vars, file scaffold, and App.jsx route

**Files:**
- Modify: `.env`
- Create: `.env.example`
- Modify: `src/pages/App.jsx`
- Create (empty): `src/bridge/utils.js`, `src/bridge/tokens.js`, `src/bridge/oauth.js`, `src/bridge/api.js`, `src/bridge/translations.js`, `src/bridge/Bridge.jsx`

- [ ] **Step 1: Add env vars to `.env`**

Append these two lines to `.env` (keep existing vars intact):
```
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```
If you have a Web application type Google client, also add:
```
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

- [ ] **Step 2: Create `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_LASTFM_API_KEY=
VITE_SPOTIFY_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=
# Only needed if using a Google "Web application" type OAuth client:
# VITE_GOOGLE_CLIENT_SECRET=
```

- [ ] **Step 3: Create empty module files**

```bash
mkdir -p src/bridge/src/bridge/__tests__
touch src/bridge/utils.js src/bridge/tokens.js src/bridge/oauth.js src/bridge/api.js src/bridge/translations.js src/bridge/Bridge.jsx
touch src/bridge/__tests__/utils.test.js src/bridge/__tests__/tokens.test.js
```

- [ ] **Step 4: Add the route to `src/pages/App.jsx`**

Add the import at the top (after existing imports):
```jsx
import Bridge from '../bridge/Bridge';
```

Add the route inside `<Routes>`, before the closing `</Routes>` tag:
```jsx
{/* IlluPia — standalone playlist converter, no auth required */}
<Route path="/bridge" element={<Bridge />} />
```

- [ ] **Step 5: Commit**

```bash
git add .env.example src/bridge/ src/pages/App.jsx
git commit -m "feat(bridge): scaffold structure, env vars, and route"
```

---

## Task 2: Set up Vitest

**Files:**
- Create: `vitest.config.js`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest @vitest/ui jsdom
```

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.js'],
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

In the `"scripts"` block, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test in `src/bridge/__tests__/utils.test.js`**

```js
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest is working', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the smoke test and verify it passes**

```bash
npm test
```

Expected output:
```
✓ src/bridge/__tests__/utils.test.js (1)
  ✓ smoke > vitest is working

Test Files  1 passed (1)
Tests  1 passed (1)
```

- [ ] **Step 6: Commit**

```bash
git add vitest.config.js package.json src/bridge/__tests__/utils.test.js
git commit -m "chore: add Vitest for unit testing"
```

---

## Task 3: utils.js (TDD)

**Files:**
- Modify: `src/bridge/__tests__/utils.test.js`
- Modify: `src/bridge/utils.js`

- [ ] **Step 1: Write the failing tests in `src/bridge/__tests__/utils.test.js`**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test
```

Expected: all tests fail with import errors (utils.js is empty).

- [ ] **Step 3: Implement `src/bridge/utils.js`**

```js
/**
 * Pure utility functions for the IlluPia bridge.
 * No side effects, no React, no DOM — safe to unit-test in isolation.
 */

// ── Sanitization ─────────────────────────────────────────────────────────────
// Strip characters used in HTML injection (OWASP A03: Injection).
// Applied to all user-supplied strings before storage or display.
export const sanitize = (s, maxLen = 512) =>
  String(s).replace(/[<>"'`]/g, '').trim().slice(0, maxLen);

// ── Rate limiter ──────────────────────────────────────────────────────────────
// Rolling-window rate limiter. In-memory per session (not persisted to
// localStorage — clearing storage shouldn't reset rate limits).
// Usage: const rl = makeRateLimiter(); rl('key', maxCalls, windowMs)
export function makeRateLimiter() {
  const store = {};
  return function rl(key, max = 5, windowMs = 60_000) {
    const now = Date.now();
    store[key] = (store[key] ?? []).filter(ts => now - ts < windowMs);
    if (store[key].length >= max) return false;
    store[key].push(now);
    return true;
  };
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────
// PKCE (Proof Key for Code Exchange) prevents auth code interception attacks.
// Both Spotify and Google use S256 challenge method.

const toBase64Url = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const randomHex = (n = 64) => {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, n);
};

// Returns { verifier, challenge } — verifier is sent at exchange, challenge at initiation
export async function makePKCE() {
  const verifier = randomHex(64);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: toBase64Url(digest) };
}

// ── URL / ID extractors ───────────────────────────────────────────────────────
// Input validation: only accept well-formed Spotify/YouTube playlist identifiers.

export const extractSpotifyId = (s) => {
  const m = String(s).match(/open\.spotify\.com\/playlist\/([A-Za-z0-9]{22})/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9]{22}$/.test(String(s).trim())) return String(s).trim();
  return null;
};

export const extractYouTubeId = (s) => {
  const m = String(s).match(/[?&]list=([A-Za-z0-9_-]+)/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{10,}$/.test(String(s).trim())) return String(s).trim();
  return null;
};

// ── Fetch wrapper with 429 back-off ──────────────────────────────────────────
// Retries up to `retries` times on HTTP 429, honouring the Retry-After header.
// All Spotify and YouTube API calls go through this.
export async function apiFetch(url, options = {}, retries = 2) {
  const res = await fetch(url, options);
  if (res.status === 429 && retries > 0) {
    const wait = (parseInt(res.headers.get('Retry-After') ?? '2', 10)) * 1000;
    await new Promise(r => setTimeout(r, wait));
    return apiFetch(url, options, retries - 1);
  }
  return res;
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm test
```

Expected:
```
✓ src/bridge/__tests__/utils.test.js (12)
Test Files  1 passed (1)
Tests  12 passed (12)
```

- [ ] **Step 5: Commit**

```bash
git add src/bridge/utils.js src/bridge/__tests__/utils.test.js
git commit -m "feat(bridge): add utility functions with tests"
```

---

## Task 4: tokens.js (TDD)

**Files:**
- Modify: `src/bridge/__tests__/tokens.test.js`
- Modify: `src/bridge/tokens.js`

- [ ] **Step 1: Write the failing tests in `src/bridge/__tests__/tokens.test.js`**

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    // expiresIn 0 means exp = Date.now() - 60_000 (already expired due to 60s skew)
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test
```

Expected: failures on tokens.test.js (tokens.js is empty).

- [ ] **Step 3: Implement `src/bridge/tokens.js`**

```js
/**
 * Token persistence for IlluPia.
 * Tokens are stored in localStorage so users stay connected across page loads.
 * Each entry: { accessToken, refreshToken, user, exp }
 *   exp — Unix ms timestamp; we subtract 60 s as a safety margin so we never
 *         use a token right as it expires.
 */

const SKEW_MS = 60_000; // safety margin subtracted from expiry

export function saveToken(key, { accessToken, refreshToken, user, expiresIn }) {
  const exp = Date.now() + (expiresIn - 60) * 1000;
  try {
    localStorage.setItem(key, JSON.stringify({ accessToken, refreshToken, user, exp }));
  } catch {
    // localStorage may be blocked in private browsing — degrade silently
  }
}

export function loadToken(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj?.accessToken || !obj?.exp) return null;
    if (Date.now() >= obj.exp) {
      localStorage.removeItem(key);
      return null;
    }
    return obj; // { accessToken, refreshToken, user, exp }
  } catch {
    return null;
  }
}

export function clearToken(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// Returns true if the stored token expires within the next 5 minutes.
// Used to decide whether to trigger a silent background refresh.
export function tokenNeedsRefresh(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const { exp } = JSON.parse(raw);
    return !!exp && Date.now() >= exp - 300_000;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm test
```

Expected:
```
✓ src/bridge/__tests__/utils.test.js (12)
✓ src/bridge/__tests__/tokens.test.js (9)
Test Files  2 passed (2)
Tests  21 passed (21)
```

- [ ] **Step 5: Commit**

```bash
git add src/bridge/tokens.js src/bridge/__tests__/tokens.test.js
git commit -m "feat(bridge): add token persistence with tests"
```

---

## Task 5: translations.js

**Files:**
- Modify: `src/bridge/translations.js`

- [ ] **Step 1: Write `src/bridge/translations.js`**

```js
/**
 * UI translations for IlluPia.
 * Two languages: English (en) and Northern Sámi (se).
 * Add keys here; use t('key') in components.
 */
export const TRANSLATIONS = {
  en: {
    connect: 'Connect',
    paste: 'Paste',
    convert: 'Convert',
    matched: 'Matched',
    missed: 'Missed',
    open: 'Open playlist',
    again: 'Convert another',
    loading: 'Loading…',
    searching: 'Searching…',
    creating: 'Creating…',
    done: 'Done ✓',
    ratelimit: 'Slow down',
    autherror: 'Auth failed',
    urlerror: 'Invalid URL',
    needboth: 'Connect both accounts first',
    noenv: 'Missing client ID — check .env',
    disconnect: 'Disconnect',
    illuSub: 'YouTube → Spotify',
    piaSub: 'Spotify → YouTube',
  },
  se: {
    connect: 'Čatnat',
    paste: 'Liige',
    convert: 'Nuppástit',
    matched: 'Gávdnon',
    missed: 'Váilu',
    open: 'Rahpat listta',
    again: 'Nuppástit eará',
    loading: 'Loahpaha…',
    searching: 'Ohcan…',
    creating: 'Ráhkadan…',
    done: 'Gárvvis ✓',
    ratelimit: 'Vuordit veahá',
    autherror: 'Čatnamat ii leat',
    urlerror: 'URL ii leat buorre',
    needboth: 'Čatnat goappašat',
    noenv: 'Lasit Client ID',
    disconnect: 'Čuohcat',
    illuSub: 'YouTube → Spotify',
    piaSub: 'Spotify → YouTube',
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/translations.js
git commit -m "feat(bridge): add EN + Sámi translations"
```

---

## Task 6: oauth.js — Spotify PKCE

**Files:**
- Modify: `src/bridge/oauth.js`

- [ ] **Step 1: Write Spotify PKCE functions in `src/bridge/oauth.js`**

```js
/**
 * OAuth flows for IlluPia.
 *
 * Both Spotify and Google use PKCE (Proof Key for Code Exchange).
 * PKCE prevents auth-code interception without needing a client secret,
 * making it safe to use entirely in the browser (OWASP A07).
 *
 * Spotify: standard Web App PKCE — no client secret required.
 * Google:  Desktop App PKCE — no client secret required (see README note).
 *          If using Web App type, set VITE_GOOGLE_CLIENT_SECRET in .env.
 */

import { makePKCE, randomHex, sanitize } from './utils.js';
import { saveToken } from './tokens.js';

// Redirect URI must be registered in both Spotify and Google developer consoles
const REDIR = `${window.location.origin}/bridge`;
const TOKEN_TTL = 3600; // fallback if expires_in is absent from response

// ── Spotify ───────────────────────────────────────────────────────────────────

export async function initiateSpotifyAuth(clientId) {
  const { verifier, challenge } = await makePKCE();
  const state = randomHex(16); // CSRF token (OWASP A01)
  sessionStorage.setItem('pb_sp_v', verifier);
  sessionStorage.setItem('pb_sp_st', state);
  window.location.href =
    'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: REDIR,
      scope: [
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-modify-private',
      ].join(' '),
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
    });
}

export async function exchangeSpotifyCode(code, state, clientId) {
  // Verify CSRF state matches what we set before the redirect
  if (state !== sessionStorage.getItem('pb_sp_st')) throw new Error('state_mismatch');
  const verifier = sessionStorage.getItem('pb_sp_v');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIR,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error('spotify_exchange_failed');
  const data = await res.json();

  // Clean up PKCE session keys immediately after use
  sessionStorage.removeItem('pb_sp_v');
  sessionStorage.removeItem('pb_sp_st');

  // Fetch display name for the auth pill
  let user = 'Spotify';
  const me = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  if (me.ok) {
    const u = await me.json();
    user = sanitize(u.display_name || u.id);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user,
    expiresIn: data.expires_in ?? TOKEN_TTL,
  };
}

export async function refreshSpotifyToken(refreshToken, clientId) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  if (!res.ok) throw new Error('spotify_refresh_failed');
  const data = await res.json();
  return {
    accessToken: data.access_token,
    // Spotify may rotate the refresh token — use the new one if provided
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in ?? TOKEN_TTL,
  };
}
```

- [ ] **Step 2: Manually verify Spotify connect in dev**

```bash
npm run dev
```

Navigate to `http://localhost:5173/bridge`. Open browser console and run:
```js
import('/src/bridge/oauth.js').then(m => m.initiateSpotifyAuth(import.meta.env.VITE_SPOTIFY_CLIENT_ID))
```
Expected: redirected to Spotify login page, then back to `http://localhost:5173/bridge?code=...`.

- [ ] **Step 3: Commit**

```bash
git add src/bridge/oauth.js
git commit -m "feat(bridge): add Spotify PKCE OAuth flow"
```

---

## Task 7: oauth.js — Google PKCE

**Files:**
- Modify: `src/bridge/oauth.js`

- [ ] **Step 1: Append Google PKCE functions to `src/bridge/oauth.js`**

Add these exports after the Spotify section:

```js
// ── Google ────────────────────────────────────────────────────────────────────

export async function initiateGoogleAuth(clientId) {
  const { verifier, challenge } = await makePKCE();
  const state = randomHex(16);
  sessionStorage.setItem('pb_gg_v', verifier);
  sessionStorage.setItem('pb_gg_st', state);
  sessionStorage.setItem('pb_gg_id', clientId);
  window.location.href =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: REDIR,
      scope: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl',
      ].join(' '),
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
      access_type: 'offline',  // required to receive a refresh_token
      prompt: 'consent',        // required to always receive refresh_token on first grant
    });
}

export async function exchangeGoogleCode(code, state, clientId) {
  if (state !== sessionStorage.getItem('pb_gg_st')) throw new Error('state_mismatch');
  const verifier = sessionStorage.getItem('pb_gg_v');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIR,
    client_id: clientId,
    code_verifier: verifier,
  });
  // client_secret only needed for "Web application" type Google OAuth clients.
  // Desktop app / Installed app type does NOT need it (recommended setup).
  const secret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  if (secret) body.append('client_secret', secret);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('google_exchange_failed');
  const data = await res.json();

  sessionStorage.removeItem('pb_gg_v');
  sessionStorage.removeItem('pb_gg_st');
  sessionStorage.removeItem('pb_gg_id');

  // Verify token audience — prevents token substitution attacks (OWASP A07)
  const info = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(data.access_token)}`
  );
  if (!info.ok) throw new Error('google_token_invalid');
  const d = await info.json();
  if (d.aud !== clientId) throw new Error('google_token_audience_mismatch');

  const user = sanitize(d.email ?? 'Google');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user,
    expiresIn: parseInt(d.expires_in, 10) ?? TOKEN_TTL,
  };
}

export async function refreshGoogleToken(refreshToken, clientId) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const secret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  if (secret) body.append('client_secret', secret);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('google_refresh_failed');
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken, // Google does not rotate refresh tokens
    expiresIn: data.expires_in ?? TOKEN_TTL,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/oauth.js
git commit -m "feat(bridge): add Google PKCE OAuth flow with refresh token support"
```

---

## Task 8: api.js — Spotify

**Files:**
- Modify: `src/bridge/api.js`

- [ ] **Step 1: Write Spotify API functions in `src/bridge/api.js`**

```js
/**
 * API layer for IlluPia.
 * All requests go through apiFetch for automatic 429 backoff.
 * All string inputs are sanitized before use in requests.
 */

import { apiFetch, sanitize } from './utils.js';

const spH = (token) => ({ Authorization: `Bearer ${token}` });
const ggH = (token) => ({ Authorization: `Bearer ${token}` });

// ── Spotify ───────────────────────────────────────────────────────────────────

// Fetch playlist name only (minimal fields to reduce payload)
export async function spMeta(playlistId, token) {
  const res = await apiFetch(
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?fields=name`,
    { headers: spH(token) }
  );
  if (!res.ok) throw new Error(`spotify_meta_${res.status}`);
  return res.json();
}

// Fetch all tracks in a playlist, handling pagination
export async function spTracks(playlistId, token) {
  const tracks = [];
  let url =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks` +
    `?limit=100&fields=items(track(id,name,artists)),next`;
  while (url) {
    const res = await apiFetch(url, { headers: spH(token) });
    if (!res.ok) throw new Error(`spotify_tracks_${res.status}`);
    const data = await res.json();
    for (const item of (data.items ?? [])) {
      if (item?.track?.name) tracks.push(item.track);
    }
    url = data.next ?? null;
  }
  return tracks;
}

// Search Spotify for a single track, return first result or null
export async function spSearch(query, token) {
  const q = sanitize(query).slice(0, 200);
  const res = await apiFetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
    { headers: spH(token) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.tracks?.items?.[0] ?? null;
}

// Create a private Spotify playlist and batch-add URIs (max 100 per request)
export async function spCreate(name, desc, uris, token) {
  const meRes = await apiFetch('https://api.spotify.com/v1/me', { headers: spH(token) });
  if (!meRes.ok) throw new Error(`spotify_me_${meRes.status}`);
  const me = await meRes.json();

  const createRes = await apiFetch(
    `https://api.spotify.com/v1/users/${encodeURIComponent(me.id)}/playlists`,
    {
      method: 'POST',
      headers: { ...spH(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sanitize(name).slice(0, 100),
        description: sanitize(desc).slice(0, 300),
        public: false,
      }),
    }
  );
  if (!createRes.ok) throw new Error(`spotify_create_${createRes.status}`);
  const playlist = await createRes.json();

  for (let i = 0; i < uris.length; i += 100) {
    await apiFetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: 'POST',
        headers: { ...spH(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: uris.slice(i, i + 100) }),
      }
    );
  }
  return playlist;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/api.js
git commit -m "feat(bridge): add Spotify API functions"
```

---

## Task 9: api.js — YouTube

**Files:**
- Modify: `src/bridge/api.js`

- [ ] **Step 1: Append YouTube API functions to `src/bridge/api.js`**

Add after the Spotify section:

```js
// ── YouTube ───────────────────────────────────────────────────────────────────

// Fetch playlist snippet (title, description)
export async function ytMeta(playlistId, token) {
  const params = new URLSearchParams({ part: 'snippet', id: playlistId });
  const res = await apiFetch(
    `https://www.googleapis.com/youtube/v3/playlists?${params}`,
    { headers: ggH(token) }
  );
  if (!res.ok) throw new Error(`youtube_meta_${res.status}`);
  const data = await res.json();
  return data.items?.[0]?.snippet ?? null;
}

// Fetch all items in a playlist, filtering out deleted/private videos
export async function ytItems(playlistId, token) {
  const items = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await apiFetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params}`,
      { headers: ggH(token) }
    );
    if (!res.ok) throw new Error(`youtube_items_${res.status}`);
    const data = await res.json();
    for (const item of (data.items ?? [])) {
      const s = item.snippet;
      if (s?.title && s.title !== 'Private video' && s.title !== 'Deleted video') {
        items.push({ title: s.title, videoId: s.resourceId?.videoId });
      }
    }
    pageToken = data.nextPageToken ?? '';
  } while (pageToken);
  return items;
}

// Search YouTube for a single video, return videoId or null
export async function ytSearch(query, token) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: sanitize(query).slice(0, 200),
    maxResults: '1',
    type: 'video',
  });
  const res = await apiFetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
    { headers: ggH(token) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.id?.videoId ?? null;
}

// Create a private YouTube playlist
export async function ytCreate(name, desc, token) {
  const res = await apiFetch(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
    {
      method: 'POST',
      headers: { ...ggH(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          title: sanitize(name).slice(0, 150),
          description: sanitize(desc).slice(0, 5000),
        },
        status: { privacyStatus: 'private' },
      }),
    }
  );
  if (!res.ok) throw new Error(`youtube_create_${res.status}`);
  return res.json();
}

// Add a single video to a YouTube playlist; returns true on success
export async function ytAdd(playlistId, videoId, token) {
  const res = await apiFetch(
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
    {
      method: 'POST',
      headers: { ...ggH(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: { kind: 'youtube#video', videoId },
        },
      }),
    }
  );
  return res.ok;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bridge/api.js
git commit -m "feat(bridge): add YouTube API functions"
```

---

## Task 10: Bridge.jsx — language popup + page shell

**Files:**
- Modify: `src/bridge/Bridge.jsx`

- [ ] **Step 1: Write the language popup and page shell in `src/bridge/Bridge.jsx`**

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import samiFlag from '../assets/sami.jpg';
import { sanitize, makeRateLimiter, extractSpotifyId, extractYouTubeId } from './utils.js';
import { saveToken, loadToken, clearToken, tokenNeedsRefresh } from './tokens.js';
import {
  initiateSpotifyAuth, exchangeSpotifyCode, refreshSpotifyToken,
  initiateGoogleAuth, exchangeGoogleCode, refreshGoogleToken,
} from './oauth.js';
import { spMeta, spTracks, spSearch, spCreate, ytMeta, ytItems, ytSearch, ytCreate, ytAdd } from './api.js';
import { TRANSLATIONS } from './translations.js';

// localStorage keys — generic names (IlluPia branding is UI-only)
const CACHE_SP = 'pb_sp';
const CACHE_GG = 'pb_gg';
const LANG_KEY = 'pb_lang';
// Allowlist for result links — prevents open redirects (OWASP A01)
const SAFE_HOSTS = ['open.spotify.com', 'www.youtube.com', 'music.youtube.com'];

const rl = makeRateLimiter();

// ── Icons (inline SVG — no extra dependency) ──────────────────────────────────
const SpotifyIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <rect width="20" height="20" rx="5" fill="#1DB954" />
    <path d="M10 3C6.13 3 3 6.13 3 10s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm3.21 10.1a.43.43 0 0 1-.6.14c-1.64-1-3.7-1.22-6.13-.67a.43.43 0 1 1-.19-.84c2.66-.59 4.94-.34 6.78.77a.43.43 0 0 1 .14.6zm.86-1.92a.54.54 0 0 1-.74.18C11.48 10.2 8.72 9.87 6.4 10.56a.54.54 0 0 1-.3-1.03c2.6-.79 5.83-.41 8.04.95a.54.54 0 0 1 .18.74zm.07-2c-2.24-1.33-5.94-1.45-8.08-.76a.65.65 0 1 1-.37-1.24c2.52-.77 6.71-.62 9.36.87a.65.65 0 0 1-.91 1.13z" fill="white" />
  </svg>
);

const YouTubeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <rect width="20" height="20" rx="5" fill="#FF0000" />
    <path d="M16.72 6.76a1.98 1.98 0 0 0-1.4-1.4C14.06 5 10 5 10 5s-4.06 0-5.32.36a1.98 1.98 0 0 0-1.4 1.4C3 8.02 3 10 3 10s0 1.98.28 3.24a1.98 1.98 0 0 0 1.4 1.4C5.94 15 10 15 10 15s4.06 0 5.32-.36a1.98 1.98 0 0 0 1.4-1.4C17 11.98 17 10 17 10s0-1.98-.28-3.24z" fill="white" />
    <path d="M8.5 12.2V7.8L12.5 10l-4 2.2z" fill="#FF0000" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 7h12M8 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Language popup ────────────────────────────────────────────────────────────
function LangPopup({ onSelect }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ display: 'flex', gap: 16 }}>
        {/* English */}
        <button
          onClick={() => onSelect('en')}
          style={{
            background: '#161616', border: '1px solid #222', borderRadius: 16,
            padding: '32px 28px', cursor: 'pointer', fontSize: '3rem', lineHeight: 1,
            transition: 'border-color .15s', color: 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
          aria-label="English"
        >
          🇬🇧
        </button>
        {/* Sámi */}
        <button
          onClick={() => onSelect('se')}
          style={{
            background: '#161616', border: '1px solid #222', borderRadius: 16,
            padding: '32px 28px', cursor: 'pointer', lineHeight: 1,
            transition: 'border-color .15s', overflow: 'hidden',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
          aria-label="Sámegiel"
        >
          <img src={samiFlag} alt="Sámi flag" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Bridge() {
  const SP_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const GG_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Language — null means not chosen yet (shows popup)
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY));
  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;

  const selectLang = (l) => {
    localStorage.setItem(LANG_KEY, l);
    setLang(l);
  };

  // Auth state
  const [spToken, setSpToken] = useState(null);
  const [ggToken, setGgToken] = useState(null);
  const [spUser, setSpUser] = useState(null);
  const [ggUser, setGgUser] = useState(null);

  // Section state
  const [illuUrl, setIlluUrl] = useState('');
  const [piaUrl, setPiaUrl] = useState('');
  const [illuConv, setIlluConv] = useState(false);
  const [piaConv, setPiaConv] = useState(false);
  const [illuProg, setIlluProg] = useState({ pct: 0, lbl: '', tracks: [] });
  const [piaProg, setPiaProg] = useState({ pct: 0, lbl: '', tracks: [] });
  const [illuResult, setIlluResult] = useState(null);
  const [piaResult, setPiaResult] = useState(null);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMsg(sanitize(String(msg)));
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3200);
  }, []);

  // Validate env vars on mount
  useEffect(() => {
    if (!SP_ID || SP_ID === 'your_spotify_client_id_here') showToast(t('noenv') + ' (Spotify)');
    if (!GG_ID || GG_ID === 'your_google_client_id_here') showToast(t('noenv') + ' (Google)');
  }, []);

  // ── Render ──
  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent }
        body { background: #0d0d0d }
        .bridge-app { font-family: 'Outfit', sans-serif; background: #0d0d0d; color: #f0f0f0; min-height: 100dvh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased }
        .bridge-topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid #1a1a1a; position: sticky; top: 0; z-index: 100; background: #0d0d0d }
        .bridge-wordmark { font-size: .65rem; font-weight: 300; letter-spacing: .22em; text-transform: uppercase; color: #444 }
        .bridge-langbtn { background: none; border: 1px solid #1a1a1a; border-radius: 100px; padding: 6px 10px; cursor: pointer; font-size: 1rem; line-height: 1; transition: border-color .2s }
        .bridge-langbtn:hover { border-color: #444 }
        .bridge-sections { flex: 1; display: flex; flex-direction: column; gap: 1px; background: #1a1a1a }
        .bridge-section { background: #0d0d0d; padding: 28px 20px; display: flex; flex-direction: column; gap: 22px }
        .bridge-sechead { display: flex; align-items: center; justify-content: space-between }
        .bridge-secname { font-size: 1.5rem; font-weight: 200; letter-spacing: -.02em }
        .bridge-secsub { font-size: .65rem; font-weight: 300; letter-spacing: .05em; color: #444; margin-top: 3px }
        .bridge-flow { display: flex; align-items: center; gap: 6px; color: #333 }
        .bridge-auth-row { display: flex; gap: 8px }
        .bridge-pill { flex: 1; background: #111; border: 1px solid #1a1a1a; border-radius: 100px; padding: 10px 14px; display: flex; align-items: center; gap: 9px; cursor: pointer; font-family: 'Outfit', sans-serif; transition: border-color .2s }
        .bridge-pill:hover { border-color: #333 }
        .bridge-pill.on { border-color: #2a2a2a }
        .bridge-pill-info { flex: 1; min-width: 0 }
        .bridge-pill-lbl { font-size: .58rem; font-weight: 300; letter-spacing: .1em; text-transform: uppercase; color: #444 }
        .bridge-pill-usr { font-size: .73rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #f0f0f0 }
        .bridge-dot { width: 5px; height: 5px; border-radius: 50%; background: #2a2a2a; flex-shrink: 0; transition: background .3s }
        .bridge-pill.on .bridge-dot { background: #3d3d3d; box-shadow: 0 0 4px #3d3d3d }
        .bridge-disconn { background: none; border: none; color: #333; font-size: .7rem; cursor: pointer; padding: 0 2px; flex-shrink: 0; font-family: 'Outfit', sans-serif; transition: color .2s }
        .bridge-disconn:hover { color: #f44 }
        .bridge-inp-wrap { position: relative }
        .bridge-inp { width: 100%; background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 13px 52px 13px 15px; font-family: 'Outfit', sans-serif; font-size: .83rem; font-weight: 300; color: #f0f0f0; outline: none; transition: border-color .2s; -webkit-appearance: none }
        .bridge-inp::placeholder { color: #333 }
        .bridge-inp:focus { border-color: #2a2a2a }
        .bridge-inp.err { border-color: #f44 }
        .bridge-paste { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: .6rem; font-weight: 300; letter-spacing: .09em; text-transform: uppercase; color: #333; padding: 6px; transition: color .2s }
        .bridge-paste:hover { color: #f0f0f0 }
        .bridge-cvtbtn { width: 100%; border: none; border-radius: 12px; padding: 15px; font-family: 'Outfit', sans-serif; font-size: .75rem; font-weight: 400; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; background: #1a1a1a; color: #f0f0f0; border: 1px solid #222; transition: opacity .2s, border-color .2s }
        .bridge-cvtbtn:hover:not(:disabled) { border-color: #444 }
        .bridge-cvtbtn:disabled { opacity: .25; cursor: not-allowed }
        .bridge-prog { display: flex; flex-direction: column; gap: 10px }
        .bridge-prog-bg { background: #1a1a1a; border-radius: 100px; height: 2px; overflow: hidden }
        .bridge-prog-fill { height: 100%; border-radius: 100px; background: #444; transition: width .35s ease }
        .bridge-prog-lbl { font-size: .65rem; font-weight: 300; color: #444; letter-spacing: .04em }
        .bridge-tracks { display: flex; flex-direction: column; gap: 1px; max-height: 190px; overflow-y: auto; border-radius: 10px; border: 1px solid #1a1a1a }
        .bridge-trow { background: #111; padding: 8px 12px; display: flex; align-items: center; gap: 9px; font-size: .76rem }
        .bridge-trow-info { flex: 1; min-width: 0 }
        .bridge-trow-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
        .bridge-trow-artist { color: #444; font-size: .65rem; font-weight: 300 }
        .bridge-trow-st { font-size: .82rem; flex-shrink: 0 }
        .bridge-res { display: flex; flex-direction: column; gap: 12px }
        .bridge-stats { display: flex; gap: 7px }
        .bridge-stat { flex: 1; background: #111; border: 1px solid #1a1a1a; border-radius: 10px; padding: 13px; text-align: center }
        .bridge-stat-n { font-size: 1.35rem; font-weight: 200 }
        .bridge-stat-l { font-size: .58rem; font-weight: 300; letter-spacing: .1em; text-transform: uppercase; color: #444; margin-top: 2px }
        .bridge-open { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 14px; border-radius: 12px; border: 1px solid #1a1a1a; background: #111; color: #f0f0f0; font-family: 'Outfit', sans-serif; font-size: .7rem; font-weight: 300; letter-spacing: .1em; text-transform: uppercase; text-decoration: none; transition: border-color .2s }
        .bridge-open:hover { border-color: #444 }
        .bridge-again { background: none; border: none; color: #333; font-family: 'Outfit', sans-serif; font-size: .65rem; font-weight: 300; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; padding: 8px; text-align: center; transition: color .2s; width: 100% }
        .bridge-again:hover { color: #f0f0f0 }
        .bridge-toast { position: fixed; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); background: #161616; border: 1px solid #222; border-radius: 100px; padding: 10px 20px; font-size: .73rem; font-weight: 300; white-space: nowrap; z-index: 300; pointer-events: none; max-width: calc(100vw - 40px); overflow: hidden; text-overflow: ellipsis; font-family: 'Outfit', sans-serif; transition: opacity .25s, transform .25s }
      `}</style>

      {/* Language popup — shown on first visit only */}
      {!lang && <LangPopup onSelect={selectLang} />}

      {/* Toast */}
      <div className="bridge-toast" style={{ opacity: toastMsg ? 1 : 0, transform: `translateX(-50%) translateY(${toastMsg ? 0 : 60}px)` }}>
        {toastMsg}
      </div>

      <div className="bridge-app">
        <div className="bridge-topbar">
          <span className="bridge-wordmark">IlluPia</span>
          <button className="bridge-langbtn" onClick={() => setLang(null)} aria-label="Change language">
            {lang === 'se'
              ? <img src={samiFlag} alt="SE" style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
              : '🇬🇧'}
          </button>
        </div>

        <div className="bridge-sections">
          {/* Sections rendered in Tasks 11–13 */}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Start dev server and verify the language popup appears at `/bridge`**

```bash
npm run dev
```

Open `http://localhost:5173/bridge`. Expected: dark page with two flag cards centred on screen. Clicking a flag dismisses the popup and sets `pb_lang` in localStorage. Reload — popup should NOT reappear. Clicking the flag button in the topbar resets `lang` to null (shows popup again).

- [ ] **Step 3: Commit**

```bash
git add src/bridge/Bridge.jsx
git commit -m "feat(bridge): add language popup and page shell"
```

---

## Task 11: Bridge.jsx — OAuth wiring and auth pills

**Files:**
- Modify: `src/bridge/Bridge.jsx`

- [ ] **Step 1: Add token restore + OAuth callback useEffect inside the Bridge component**

Add this `useEffect` inside the `Bridge` function, after the `showToast` declaration:

```jsx
// Restore cached tokens on mount, then handle OAuth callback, then silent-refresh
useEffect(() => {
  // 1. Restore persisted sessions
  const sp = loadToken(CACHE_SP);
  if (sp) { setSpToken(sp.accessToken); setSpUser(sp.user); }
  const gg = loadToken(CACHE_GG);
  if (gg) { setGgToken(gg.accessToken); setGgUser(gg.user); }

  // 2. Handle OAuth redirect (code in query string)
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');

  // Clean URL immediately — remove tokens from browser history (OWASP A07)
  if (code || error) history.replaceState({}, '', '/bridge');

  if (error) { showToast('Auth cancelled'); return; }

  if (code && sessionStorage.getItem('pb_sp_v')) {
    exchangeSpotifyCode(code, state, SP_ID)
      .then((result) => {
        saveToken(CACHE_SP, result);
        setSpToken(result.accessToken);
        setSpUser(result.user);
      })
      .catch(() => showToast(t('autherror')));
    return;
  }

  if (code && sessionStorage.getItem('pb_gg_v')) {
    exchangeGoogleCode(code, state, GG_ID)
      .then((result) => {
        saveToken(CACHE_GG, result);
        setGgToken(result.accessToken);
        setGgUser(result.user);
      })
      .catch(() => showToast(t('autherror')));
    return;
  }

  // 3. Silent background refresh if token is near expiry
  const spCached = loadToken(CACHE_SP);
  if (spCached?.refreshToken && tokenNeedsRefresh(CACHE_SP)) {
    refreshSpotifyToken(spCached.refreshToken, SP_ID)
      .then((updated) => {
        const merged = { ...spCached, ...updated };
        saveToken(CACHE_SP, merged);
        setSpToken(merged.accessToken);
      })
      .catch(() => {}); // Silent fail — existing token still valid until actual expiry
  }

  const ggCached = loadToken(CACHE_GG);
  if (ggCached?.refreshToken && tokenNeedsRefresh(CACHE_GG)) {
    refreshGoogleToken(ggCached.refreshToken, GG_ID)
      .then((updated) => {
        const merged = { ...ggCached, ...updated };
        saveToken(CACHE_GG, merged);
        setGgToken(merged.accessToken);
      })
      .catch(() => {});
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Add connect/disconnect handlers inside Bridge**

```jsx
const connectSpotify = () => {
  // Rate limit auth attempts — max 5 per 60 s (OWASP A04)
  if (!rl('spa', 5, 60_000)) { showToast(t('ratelimit')); return; }
  if (!SP_ID) { showToast(t('noenv')); return; }
  initiateSpotifyAuth(SP_ID);
};

const disconnectSpotify = () => {
  clearToken(CACHE_SP);
  setSpToken(null);
  setSpUser(null);
};

const connectGoogle = () => {
  if (!rl('gga', 5, 60_000)) { showToast(t('ratelimit')); return; }
  if (!GG_ID) { showToast(t('noenv')); return; }
  initiateGoogleAuth(GG_ID);
};

const disconnectGoogle = () => {
  clearToken(CACHE_GG);
  setGgToken(null);
  setGgUser(null);
};
```

- [ ] **Step 3: Add the AuthPill component (outside Bridge, above it in the file)**

```jsx
function AuthPill({ icon, label, user, connected, onConnect, onDisconnect, t }) {
  return (
    <button
      className={`bridge-pill${connected ? ' on' : ''}`}
      onClick={connected ? undefined : onConnect}
      style={{ cursor: connected ? 'default' : 'pointer' }}
    >
      {icon}
      <div className="bridge-pill-info">
        <div className="bridge-pill-lbl">{label}</div>
        <div className="bridge-pill-usr">{connected ? user : t('connect')}</div>
      </div>
      {connected
        ? <button className="bridge-disconn" onClick={e => { e.stopPropagation(); onDisconnect(); }} title={t('disconnect')}>✕</button>
        : <div className="bridge-dot" />}
    </button>
  );
}
```

- [ ] **Step 4: Verify auth pills render by adding them temporarily to the section div**

Inside the `bridge-sections` div in Bridge's render, replace the comment with:

```jsx
<div className="bridge-section">
  <div className="bridge-auth-row">
    <AuthPill icon={<YouTubeIcon />} label="YouTube" user={ggUser} connected={!!ggToken} onConnect={connectGoogle} onDisconnect={disconnectGoogle} t={t} />
    <AuthPill icon={<SpotifyIcon />} label="Spotify" user={spUser} connected={!!spToken} onConnect={connectSpotify} onDisconnect={disconnectSpotify} t={t} />
  </div>
</div>
```

```bash
npm run dev
```

Open `http://localhost:5173/bridge`. Expected: two auth pills showing "Connect". Clicking Spotify pill → Spotify auth page. After auth, pill shows username with ✕ button. Reload → still connected (token restored from localStorage). Click ✕ → disconnected.

- [ ] **Step 5: Commit (with the temporary section — will be replaced in Task 12)**

```bash
git add src/bridge/Bridge.jsx
git commit -m "feat(bridge): add OAuth wiring, silent refresh, and auth pills"
```

---

## Task 12: Bridge.jsx — Illu section (YouTube → Spotify)

**Files:**
- Modify: `src/bridge/Bridge.jsx`

- [ ] **Step 1: Add URL validation helpers inside Bridge**

```jsx
const illuValid = (() => {
  const v = illuUrl.trim();
  return /youtube\.com\/(playlist\?list=|watch\?.*list=)[A-Za-z0-9_-]+/i.test(v)
    || /^[A-Za-z0-9_-]{10,}$/.test(v);
})();

const piaValid = (() => {
  const v = piaUrl.trim();
  return /open\.spotify\.com\/playlist\/[A-Za-z0-9]{22}/i.test(v)
    || /^[A-Za-z0-9]{22}$/.test(v);
})();
```

- [ ] **Step 2: Add paste helper**

```jsx
const pasteUrl = async (setter) => {
  try {
    const text = await navigator.clipboard.readText();
    setter(sanitize(text));
  } catch {
    showToast('Paste manually');
  }
};
```

- [ ] **Step 3: Add doIllu conversion function inside Bridge**

```jsx
const doIllu = async () => {
  // Rate limit conversions — max 3 per 5 minutes
  if (!rl('cv_illu', 3, 300_000)) { showToast(t('ratelimit')); return; }
  if (!spToken || !ggToken) { showToast(t('needboth')); return; }

  const plId = extractYouTubeId(illuUrl.trim());
  if (!plId) { showToast(t('urlerror')); return; }

  setIlluConv(true);
  setIlluResult(null);
  setIlluProg({ pct: 0, lbl: t('loading'), tracks: [] });

  try {
    const meta = await ytMeta(plId, ggToken);
    const name = sanitize(meta?.title ?? 'Converted');
    setIlluProg(p => ({ ...p, pct: 5 }));

    const items = await ytItems(plId, ggToken);
    setIlluProg(p => ({ ...p, pct: 10, lbl: `${items.length}` }));

    let matched = 0, missed = 0;
    const uris = [];
    const trackRows = [];

    for (let i = 0; i < items.length; i++) {
      // Strip common YouTube title noise before searching Spotify
      const clean = sanitize(items[i].title)
        .replace(/\(Official.*?\)/gi, '')
        .replace(/\[.*?]/g, '')
        .replace(/\|\s*.+$/, '')
        .trim();

      trackRows.push({ name: items[i].title, artist: '', status: '⏳' });
      setIlluProg(p => ({
        ...p,
        pct: 10 + (i / items.length) * 78,
        lbl: t('searching'),
        tracks: [...trackRows],
      }));

      const tr = await spSearch(clean, spToken);
      if (tr) {
        uris.push(tr.uri);
        trackRows[i] = { ...trackRows[i], status: '✅' };
        matched++;
      } else {
        trackRows[i] = { ...trackRows[i], status: '❌' };
        missed++;
      }
      setIlluProg(p => ({ ...p, tracks: [...trackRows] }));
      await new Promise(r => setTimeout(r, 250)); // avoid burst rate limiting
    }

    setIlluProg(p => ({ ...p, pct: 90, lbl: t('creating') }));
    const pl = await spCreate(name, `From YouTube: ${name}`, uris, spToken);
    setIlluProg(p => ({ ...p, pct: 100, lbl: t('done') }));
    setIlluResult({ matched, missed, url: `https://open.spotify.com/playlist/${pl.id}` });
  } catch (e) {
    showToast(sanitize(e.message));
  } finally {
    setIlluConv(false);
  }
};
```

- [ ] **Step 4: Replace the bridge-sections content with the full Illu section**

Replace the temporary section div from Task 11 with:

```jsx
<div className="bridge-sections">
  {/* ── Illu: YouTube → Spotify ── */}
  <div className="bridge-section">
    <div className="bridge-sechead">
      <div>
        <div className="bridge-secname">Illu</div>
        <div className="bridge-secsub">{t('illuSub')}</div>
      </div>
      <div className="bridge-flow">
        <YouTubeIcon size={28} />
        <ArrowIcon />
        <SpotifyIcon size={28} />
      </div>
    </div>

    <div className="bridge-auth-row">
      <AuthPill icon={<YouTubeIcon />} label="YouTube" user={ggUser} connected={!!ggToken} onConnect={connectGoogle} onDisconnect={disconnectGoogle} t={t} />
      <AuthPill icon={<SpotifyIcon />} label="Spotify" user={spUser} connected={!!spToken} onConnect={connectSpotify} onDisconnect={disconnectSpotify} t={t} />
    </div>

    <div className="bridge-inp-wrap">
      <input
        className={`bridge-inp${illuUrl.length > 4 && !illuValid ? ' err' : ''}`}
        type="url"
        placeholder="youtube.com/playlist?list=…"
        maxLength={512}
        value={illuUrl}
        onChange={e => setIlluUrl(e.target.value)}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
      />
      <button className="bridge-paste" onClick={() => pasteUrl(setIlluUrl)}>{t('paste')}</button>
    </div>

    <button
      className="bridge-cvtbtn"
      onClick={doIllu}
      disabled={!illuValid || !spToken || !ggToken || illuConv}
    >
      {illuConv ? t('loading') : t('convert')}
    </button>

    {(illuConv || illuProg.tracks.length > 0) && (
      <div className="bridge-prog">
        <div className="bridge-prog-bg">
          <div className="bridge-prog-fill" style={{ width: `${illuProg.pct}%` }} />
        </div>
        <div className="bridge-prog-lbl">{illuProg.lbl}</div>
        {illuProg.tracks.length > 0 && (
          <div className="bridge-tracks">
            {illuProg.tracks.map((tr, i) => (
              <div key={i} className="bridge-trow">
                <div className="bridge-trow-info">
                  <div className="bridge-trow-name">{tr.name}</div>
                  {tr.artist && <div className="bridge-trow-artist">{tr.artist}</div>}
                </div>
                <div className="bridge-trow-st">{tr.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Pia section placeholder — added in Task 13 */}
  </div>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/bridge/Bridge.jsx
git commit -m "feat(bridge): add Illu conversion section (YouTube → Spotify)"
```

---

## Task 13: Bridge.jsx — Pia section (Spotify → YouTube)

**Files:**
- Modify: `src/bridge/Bridge.jsx`

- [ ] **Step 1: Add doPia conversion function inside Bridge (after doIllu)**

```jsx
const doPia = async () => {
  if (!rl('cv_pia', 3, 300_000)) { showToast(t('ratelimit')); return; }
  if (!spToken || !ggToken) { showToast(t('needboth')); return; }

  const plId = extractSpotifyId(piaUrl.trim());
  if (!plId) { showToast(t('urlerror')); return; }

  setPiaConv(true);
  setPiaResult(null);
  setPiaProg({ pct: 0, lbl: t('loading'), tracks: [] });

  try {
    const meta = await spMeta(plId, spToken);
    const name = sanitize(meta?.name ?? 'Converted');
    setPiaProg(p => ({ ...p, pct: 5 }));

    const tracks = await spTracks(plId, spToken);
    setPiaProg(p => ({ ...p, pct: 10, lbl: `${tracks.length}` }));

    setPiaProg(p => ({ ...p, pct: 12, lbl: t('creating') }));
    const ytPl = await ytCreate(name, `From Spotify: ${name}`, ggToken);

    let matched = 0, missed = 0;
    const trackRows = [];

    for (let i = 0; i < tracks.length; i++) {
      const tr = tracks[i];
      const artist = sanitize(tr.artists?.[0]?.name ?? '');
      const title = sanitize(tr.name ?? '');

      trackRows.push({ name: title, artist, status: '⏳' });
      setPiaProg(p => ({
        ...p,
        pct: 12 + (i / tracks.length) * 76,
        lbl: t('searching'),
        tracks: [...trackRows],
      }));

      const vid = await ytSearch(`${artist} ${title}`, ggToken);
      if (vid) {
        const ok = await ytAdd(ytPl.id, vid, ggToken);
        trackRows[i] = { ...trackRows[i], status: ok ? '✅' : '⚠️' };
        if (ok) matched++; else missed++;
      } else {
        trackRows[i] = { ...trackRows[i], status: '❌' };
        missed++;
      }
      setPiaProg(p => ({ ...p, tracks: [...trackRows] }));
      await new Promise(r => setTimeout(r, 300));
    }

    setPiaProg(p => ({ ...p, pct: 100, lbl: t('done') }));
    setPiaResult({ matched, missed, url: `https://www.youtube.com/playlist?list=${ytPl.id}` });
  } catch (e) {
    showToast(sanitize(e.message));
  } finally {
    setPiaConv(false);
  }
};
```

- [ ] **Step 2: Add the Pia section inside bridge-sections, after the Illu section**

```jsx
{/* ── Pia: Spotify → YouTube ── */}
<div className="bridge-section">
  <div className="bridge-sechead">
    <div>
      <div className="bridge-secname">Pia</div>
      <div className="bridge-secsub">{t('piaSub')}</div>
    </div>
    <div className="bridge-flow">
      <SpotifyIcon size={28} />
      <ArrowIcon />
      <YouTubeIcon size={28} />
    </div>
  </div>

  <div className="bridge-auth-row">
    <AuthPill icon={<SpotifyIcon />} label="Spotify" user={spUser} connected={!!spToken} onConnect={connectSpotify} onDisconnect={disconnectSpotify} t={t} />
    <AuthPill icon={<YouTubeIcon />} label="YouTube" user={ggUser} connected={!!ggToken} onConnect={connectGoogle} onDisconnect={disconnectGoogle} t={t} />
  </div>

  <div className="bridge-inp-wrap">
    <input
      className={`bridge-inp${piaUrl.length > 4 && !piaValid ? ' err' : ''}`}
      type="url"
      placeholder="open.spotify.com/playlist/…"
      maxLength={512}
      value={piaUrl}
      onChange={e => setPiaUrl(e.target.value)}
      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
    />
    <button className="bridge-paste" onClick={() => pasteUrl(setPiaUrl)}>{t('paste')}</button>
  </div>

  <button
    className="bridge-cvtbtn"
    onClick={doPia}
    disabled={!piaValid || !spToken || !ggToken || piaConv}
  >
    {piaConv ? t('loading') : t('convert')}
  </button>

  {(piaConv || piaProg.tracks.length > 0) && (
    <div className="bridge-prog">
      <div className="bridge-prog-bg">
        <div className="bridge-prog-fill" style={{ width: `${piaProg.pct}%` }} />
      </div>
      <div className="bridge-prog-lbl">{piaProg.lbl}</div>
      {piaProg.tracks.length > 0 && (
        <div className="bridge-tracks">
          {piaProg.tracks.map((tr, i) => (
            <div key={i} className="bridge-trow">
              <div className="bridge-trow-info">
                <div className="bridge-trow-name">{tr.name}</div>
                {tr.artist && <div className="bridge-trow-artist">{tr.artist}</div>}
              </div>
              <div className="bridge-trow-st">{tr.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/bridge/Bridge.jsx
git commit -m "feat(bridge): add Pia conversion section (Spotify → YouTube)"
```

---

## Task 14: Bridge.jsx — results panel + reset

**Files:**
- Modify: `src/bridge/Bridge.jsx`

- [ ] **Step 1: Add a safe URL helper inside Bridge**

```jsx
const safeUrl = (url) => {
  try {
    const u = new URL(url);
    return SAFE_HOSTS.includes(u.hostname) ? url : '#';
  } catch { return '#'; }
};
```

- [ ] **Step 2: Add reset handlers inside Bridge**

```jsx
const resetIllu = () => {
  setIlluUrl('');
  setIlluResult(null);
  setIlluProg({ pct: 0, lbl: '', tracks: [] });
};

const resetPia = () => {
  setPiaUrl('');
  setPiaResult(null);
  setPiaProg({ pct: 0, lbl: '', tracks: [] });
};
```

- [ ] **Step 3: Add result panel JSX after the Illu progress block (inside the Illu section div)**

Add this immediately after the Illu `bridge-prog` block:

```jsx
{illuResult && (
  <div className="bridge-res">
    <div className="bridge-stats">
      <div className="bridge-stat">
        <div className="bridge-stat-n">{illuResult.matched}</div>
        <div className="bridge-stat-l">{t('matched')}</div>
      </div>
      <div className="bridge-stat">
        <div className="bridge-stat-n">{illuResult.missed}</div>
        <div className="bridge-stat-l">{t('missed')}</div>
      </div>
    </div>
    <a className="bridge-open" href={safeUrl(illuResult.url)} target="_blank" rel="noopener noreferrer">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1h3V0H0v11h11V8h-1v2H1V1zm6-1v1h2.29L4.65 4.64l.7.71L10 1.71V4h1V0H7z" fill="currentColor"/></svg>
      {t('open')}
    </a>
    <button className="bridge-again" onClick={resetIllu}>{t('again')}</button>
  </div>
)}
```

Add the same block after the Pia progress, using `piaResult` and `resetPia`:

```jsx
{piaResult && (
  <div className="bridge-res">
    <div className="bridge-stats">
      <div className="bridge-stat">
        <div className="bridge-stat-n">{piaResult.matched}</div>
        <div className="bridge-stat-l">{t('matched')}</div>
      </div>
      <div className="bridge-stat">
        <div className="bridge-stat-n">{piaResult.missed}</div>
        <div className="bridge-stat-l">{t('missed')}</div>
      </div>
    </div>
    <a className="bridge-open" href={safeUrl(piaResult.url)} target="_blank" rel="noopener noreferrer">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1h3V0H0v11h11V8h-1v2H1V1zm6-1v1h2.29L4.65 4.64l.7.71L10 1.71V4h1V0H7z" fill="currentColor"/></svg>
      {t('open')}
    </a>
    <button className="bridge-again" onClick={resetPia}>{t('again')}</button>
  </div>
)}
```

- [ ] **Step 4: Run all unit tests to confirm nothing regressed**

```bash
npm test
```

Expected: all 21 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/bridge/Bridge.jsx
git commit -m "feat(bridge): add results panel and reset flow"
```

---

## Task 15: Final wiring, manual smoke test, and production notes

**Files:**
- Verify: `src/pages/App.jsx` (route added in Task 1)
- Verify: `.env` (env vars added in Task 1)

- [ ] **Step 1: Confirm App.jsx has the route**

Open `src/pages/App.jsx`. Verify these two lines are present (added in Task 1):
```jsx
import Bridge from '../bridge/Bridge';
// ...inside <Routes>:
<Route path="/bridge" element={<Bridge />} />
```

If missing, add them now.

- [ ] **Step 2: Full manual smoke test**

```bash
npm run dev
```

Checklist:
- [ ] `http://localhost:5173/bridge` loads without errors
- [ ] Language popup appears on first visit; disappears after selection; does not reappear on reload
- [ ] Clicking topbar flag re-shows the popup
- [ ] Connecting Spotify: click pill → Spotify auth → redirect back → pill shows username + ✕
- [ ] Connecting YouTube: click pill → Google auth → redirect back → pill shows email + ✕
- [ ] Reload page → both accounts still connected (localStorage restore)
- [ ] Click ✕ on either pill → disconnects and clears localStorage
- [ ] Paste a YouTube playlist URL in Illu → convert button becomes active → conversion runs → results show with "Open playlist" link
- [ ] Paste a Spotify playlist URL in Pia → same flow for YT creation
- [ ] "Convert another" resets the section
- [ ] Switching to Sámi: all labels update correctly
- [ ] `http://localhost:5173/` and other Flip-FM routes unaffected

- [ ] **Step 3: Register production redirect URIs**

Before deploying:

**Spotify Developer Console** (`developer.spotify.com/dashboard` → your app → Edit Settings → Redirect URIs):
- Add: `https://your-production-domain.com/bridge`

**Google Cloud Console** (`console.cloud.google.com` → APIs & Services → Credentials → your OAuth client → Authorized redirect URIs):
- Add: `https://your-production-domain.com/bridge`

- [ ] **Step 4: Run final test suite**

```bash
npm test
```

Expected:
```
✓ src/bridge/__tests__/utils.test.js (12)
✓ src/bridge/__tests__/tokens.test.js (9)
Test Files  2 passed (2)
Tests  21 passed (21)
```

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(bridge): IlluPia playlist converter complete"
```

---

## Spec Coverage Check

| Spec requirement | Covered by task |
|---|---|
| `/bridge` route, unguarded | Task 1 |
| `VITE_SPOTIFY_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` in env | Task 1 |
| `.env.example` | Task 1 |
| Vitest setup | Task 2 |
| sanitize, rate limiter, PKCE, URL extractors, apiFetch | Task 3 |
| Token save/load/clear/needsRefresh with tests | Task 4 |
| EN + Sámi translations | Task 5 |
| Spotify PKCE initiate + exchange + refresh | Task 6 |
| Google PKCE initiate + exchange + refresh | Task 7 |
| Spotify API functions | Task 8 |
| YouTube API functions | Task 9 |
| Language popup (first visit, sami.jpg, localStorage pb_lang) | Task 10 |
| Token restore on mount + OAuth callback + silent refresh | Task 11 |
| Disconnect buttons in auth pills | Task 11 |
| Illu conversion (YT→SP) with progress + track rows | Task 12 |
| Pia conversion (SP→YT) with progress + track rows | Task 13 |
| Results panel, SAFE_HOSTS check, reset | Task 14 |
| Dark monochrome UI, icon-driven, Outfit font | Tasks 10–14 |
| OWASP: state CSRF, audience check, history cleanup, no innerHTML | Tasks 6–7, 11 |
| Rate limiting (auth 5/60s, conversion 3/5min) | Tasks 3, 11–13 |
| 429 backoff | Task 3 |
| IlluPia name in UI only | Tasks 10, 15 |
