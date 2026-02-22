// src/vibeMath.js

export function calculateVibeMatch(myVibes, theirVibes) {
  if (!myVibes || !theirVibes || myVibes.length === 0 || theirVibes.length === 0) {
    return 0;
  }

  let score = 0;

  // 1. EXTRACT DATA SETS
  // We flatten the arrays to make comparison easier
  const myAlbums = myVibes.map(v => v.album_id).filter(Boolean);
  const theirAlbums = theirVibes.map(v => v.album_id).filter(Boolean);

  const myArtists = myVibes.map(v => v.album_artist).filter(Boolean);
  const theirArtists = theirVibes.map(v => v.album_artist).filter(Boolean);

  // For genres, we flatten the array of arrays into one big list of genres
  const myGenres = myVibes.flatMap(v => v.album_genres || []);
  const theirGenres = theirVibes.flatMap(v => v.album_genres || []);

  // 2. CALCULATE MATCHES

  // A. EXACT ALBUM MATCH (+20% each)
  // If you both have "Blonde", that's a huge deal.
  const sharedAlbums = myAlbums.filter(id => theirAlbums.includes(id));
  score += sharedAlbums.length * 20;

  // B. ARTIST MATCH (+10% each)
  // If you have "Blonde" and they have "Channel Orange", you still vibe.
  // We use Sets to avoid counting the same artist twice if they have multiple albums.
  const uniqueMyArtists = [...new Set(myArtists)];
  const uniqueTheirArtists = [...new Set(theirArtists)];
  const sharedArtists = uniqueMyArtists.filter(artist => uniqueTheirArtists.includes(artist));
  score += sharedArtists.length * 10;

  // C. GENRE SYNERGY (+2% each)
  // This is the "background radiation" of the match. 
  // If you both listen to a lot of "Indie Pop", this adds up quickly.
  const sharedGenres = myGenres.filter(g => theirGenres.includes(g));
  score += sharedGenres.length * 2;

  // 3. NORMALIZE (Cap at 100%)
  return Math.min(score, 100);
}