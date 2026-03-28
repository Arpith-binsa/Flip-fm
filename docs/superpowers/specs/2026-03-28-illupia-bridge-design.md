# IlluPia — Playlist Bridge · Design Spec
**Date:** 2026-03-28
**Status:** Approved
**Route:** `/bridge`

---

## Overview

IlluPia is a standalone playlist converter that lives at `/bridge` inside the existing Flip-FM Vite app. It converts playlists between Spotify and YouTube Music in both directions. It is entirely independent of Flip-FM's auth, navigation, and state — accessible only by direct URL. The frontend name is **IlluPia**; all internal keys, env vars, and localStorage keys use generic names.

---

## 1. File Structure

```
src/
  pages/
    Bridge.jsx            ← entire component, self-contained
  assets/
    sami.jpg              ← Sámi language flag image (already added)
.env                      ← add VITE_SPOTIFY_CLIENT_ID, VITE_GOOGLE_CLIENT_ID
App.jsx                   ← add one unguarded route: /bridge
docs/superpowers/specs/
  2026-03-28-illupia-bridge-design.md  ← this file
```

**App.jsx change — one line only:**
```jsx
<Route path="/bridge" element={<Bridge />} />
```

No auth guard. No navigation links added anywhere in the existing app. No shared state with Flip-FM.

---

## 2. Sections

### Illu — YouTube Music → Spotify
- User pastes a YouTube Music playlist URL
- App fetches all tracks via YouTube Data API v3
- Each track title is searched on Spotify
- Matched tracks are added to a new private Spotify playlist
- Result: matched count, missed count, link to new Spotify playlist

### Pia — Spotify → YouTube Music
- User pastes a Spotify playlist URL
- App fetches all tracks via Spotify Web API
- Each track (`artist + title`) is searched on YouTube
- Matched videos are added to a new private YouTube playlist
- Result: matched count, missed count, link to new YouTube playlist

---

## 3. OAuth & Token Strategy

Both Spotify and YouTube use **PKCE (Authorization Code flow)**. Google's implicit flow is replaced with PKCE to unlock refresh tokens.

### Token Lifecycle
1. **First connect** → PKCE redirect → exchange code for `access_token` + `refresh_token` → store in localStorage
2. **Every page load** → restore from localStorage → if `exp` within 5 minutes, silently refresh in background
3. **User sees "connected" immediately** — never prompted again unless they disconnect or revoke app access

### localStorage Schema
```js
// Key: pb_sp (Spotify) | pb_gg (Google)
{
  accessToken: string,
  refreshToken: string,   // persists indefinitely
  user: string,           // display name / email
  exp: number             // Unix ms timestamp (access token expiry - 60s skew)
}
```

### Silent Refresh
- On load: if `Date.now() >= exp - 300_000` (within 5 min of expiry), call refresh endpoint
- Spotify: `POST https://accounts.spotify.com/api/token` with `grant_type=refresh_token`
- Google: `POST https://oauth2.googleapis.com/token` with `grant_type=refresh_token`
- Updates `accessToken` + `exp` in localStorage; `refreshToken` is kept unless a new one is issued

### Disconnect
- Explicit disconnect button visible inside each auth pill when connected
- One tap clears `pb_sp` or `pb_gg` from localStorage and resets in-memory state
- No redirect needed

---

## 4. UI Design

### Principles
- Dark monochrome (`#0d0d0d` background, `#f0f0f0` text, `#161616` surfaces)
- Platform identity communicated through **icons only** — no competing brand colors in the UI chrome
- Minimal text — icon-driven enough to use without reading English
- Font: Outfit (already used in the HTML)

### Language Popup
- Appears **once** on first visit (when `pb_lang` absent from localStorage)
- Full-screen overlay, two large tappable cards centered on screen:
  - 🇬🇧 (British flag emoji) — English
  - `<img src={samiFlag} />` — Sámi (`sami.jpg`)
- No text labels on the cards — flags only
- Selection written to `pb_lang` in localStorage; popup never shown again
- Small flag icon in top corner for switching language later

### Page Layout
```
┌──────────────────────────────┐
│  IlluPia          [flag btn] │  ← topbar
├──────────────────────────────┤
│  Illu                        │  ← section 1
│  [YT icon] → [Spotify icon]  │
│  [YT pill] [Spotify pill]    │  ← auth pills w/ disconnect
│  [URL input]       [Paste]   │
│  [Convert button]            │
│  [Progress bar + track list] │
│  [Result stats + open link]  │
├──────────────────────────────┤
│  Pia                         │  ← section 2
│  [Spotify icon] → [YT icon]  │
│  [Spotify pill] [YT pill]    │
│  [URL input]       [Paste]   │
│  [Convert button]            │
│  [Progress bar + track list] │
│  [Result stats + open link]  │
└──────────────────────────────┘
```

### Auth Pills
- Show platform icon + connected user name (or "—" when disconnected)
- Green status dot when connected, dim when not
- Small ✕ disconnect button appears inside pill when connected
- Tapping pill when disconnected → starts OAuth flow

---

## 5. Security

### API Key Handling
- `VITE_SPOTIFY_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` in `.env` (never hardcoded)
- Both are **client IDs only** — no secrets. Public by PKCE/OAuth design.
- App validates presence on load; shows a clear inline error if missing rather than silently failing
- `.env` is in `.gitignore`; a `.env.example` will document required keys

### Input Validation (schema-based)
| Input | Validation |
|---|---|
| Spotify URL | `/open\.spotify\.com\/playlist\/[A-Za-z0-9]{22}/i` or bare 22-char ID |
| YouTube URL | `/[?&]list=([A-Za-z0-9_-]{10,})/i` or bare playlist ID |
| All strings | Strip `<>"'\``, max 512 chars, trimmed |
| API responses | Only named properties destructured; no `eval`, no `innerHTML` with user data |

### Rate Limiting (client-side rolling window)
| Action | Limit | Window |
|---|---|---|
| Auth attempts | 5 | 60s |
| Conversions per section | 3 | 5 min |
| API 429 responses | exponential backoff, max 2 retries | per request |

True IP-based rate limiting is not possible client-side. If needed in future, a Supabase edge function or Vercel middleware can be added as a proxy layer.

### OWASP Compliance
- PKCE verifier + state param on both OAuth flows (CSRF protection)
- Token audience verification on Google tokens (`d.aud === clientId`)
- Redirect URI allowlist: `['open.spotify.com', 'www.youtube.com', 'music.youtube.com']`
- URL cleaned via `history.replaceState` after OAuth redirect (tokens removed from browser history)
- No `innerHTML` assignments with unsanitized data
- Comments throughout explaining each security decision

---

## 6. Environment Variables

Add to `.env`:
```
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Add to `.env.example` (committed to git):
```
VITE_SPOTIFY_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=
```

**Required redirect URI registrations:**
- Spotify Developer Console: add `http://localhost:5173/bridge` (dev) + production URL `/bridge`
- Google Cloud Console: add same URIs as Authorized redirect URIs under your OAuth 2.0 Web client

---

## 7. Translations

Two languages: English (`en`) and Sámi (`se`).
Keys: `connect`, `paste`, `convert`, `matched`, `missed`, `open`, `again`, `loading`, `searching`, `creating`, `done`, `ratelimit`, `autherror`, `urlerror`, `needboth`, `noenv`, `disconnect`.
Stored in a `TRANSLATIONS` constant inside `Bridge.jsx`.

---

## 8. Out of Scope (this iteration)

- No backend proxy / server-side rate limiting
- No playlist history / saved conversions
- No Flip-FM nav integration
- No real-time collaboration
- No support for other platforms (Apple Music, Tidal, etc.)
