/**
 * Token persistence for IlluPia.
 * Tokens are stored in localStorage so users stay connected across page loads.
 * Each entry: { accessToken, refreshToken, user, exp }
 *   exp — Unix ms timestamp; we subtract 60 s as safety margin so we never
 *         use a token right as it expires.
 */

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
