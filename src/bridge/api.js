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

// ── YouTube ───────────────────────────────────────────────────────────────────

// Fetch playlist snippet (title)
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
