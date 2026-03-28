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

// Returns { verifier, challenge } — verifier sent at exchange, challenge at initiation
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
  // YouTube playlist IDs use alphanumeric + underscore only (no hyphens)
  if (/^[A-Za-z0-9_]{10,}$/.test(String(s).trim())) return String(s).trim();
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
