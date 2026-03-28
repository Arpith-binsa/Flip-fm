/**
 * OAuth flows for IlluPia.
 *
 * Both Spotify and Google use PKCE (Proof Key for Code Exchange).
 * PKCE prevents auth-code interception without needing a client secret,
 * making it safe to use entirely in the browser (OWASP A07).
 *
 * Spotify: standard Web App PKCE — no client secret required.
 * Google:  Desktop App PKCE — no client secret required.
 *          If using Web App type, set VITE_GOOGLE_CLIENT_SECRET in .env.
 */

import { makePKCE, randomHex, sanitize } from './utils.js';

// Redirect URI must be registered in both Spotify and Google developer consoles
const REDIR = `${window.location.origin}/bridge`;
const TOKEN_TTL = 3600; // fallback if expires_in absent from response

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
