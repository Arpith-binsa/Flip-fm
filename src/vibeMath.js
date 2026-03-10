// src/vibeMath.js

export function calculateVibeMatch(myVibes, theirVibes) {
  if (!myVibes || !theirVibes || myVibes.length === 0 || theirVibes.length === 0) {
    return 0;
  }

  let score = 0;
  let maxPossibleScore = 0;

  // 1. EXTRACT DATA SETS
  const myAlbums = myVibes.map(v => v.album_id).filter(Boolean);
  const theirAlbums = theirVibes.map(v => v.album_id).filter(Boolean);

  const myArtists = myVibes.map(v => v.album_artist).filter(Boolean);
  const theirArtists = theirVibes.map(v => v.album_artist).filter(Boolean);

  const myGenres = myVibes.flatMap(v => v.album_genres || []);
  const theirGenres = theirVibes.flatMap(v => v.album_genres || []);

  const myAlbumTitles = myVibes.map(v => v.album_title?.toLowerCase()).filter(Boolean);
  const theirAlbumTitles = theirVibes.map(v => v.album_title?.toLowerCase()).filter(Boolean);

  // 2. CALCULATE MATCHES WITH WEIGHTED SCORING

  // A. EXACT ALBUM MATCH (Highest weight - 25 points each)
  // If you both have the exact same album, that's the strongest signal
  const sharedAlbums = myAlbums.filter(id => theirAlbums.includes(id));
  const albumMatchScore = sharedAlbums.length * 25;
  score += albumMatchScore;
  maxPossibleScore += 25 * 4; // Max 4 albums could match

  // B. SHARED ARTIST (Strong signal - 12 points each unique artist)
  // Using Sets to avoid counting same artist multiple times
  const uniqueMyArtists = [...new Set(myArtists)];
  const uniqueTheirArtists = [...new Set(theirArtists)];
  const sharedArtists = uniqueMyArtists.filter(artist => 
    uniqueTheirArtists.some(theirArtist => 
      theirArtist.toLowerCase() === artist.toLowerCase()
    )
  );
  const artistMatchScore = sharedArtists.length * 12;
  score += artistMatchScore;
  maxPossibleScore += 12 * 4; // Max 4 unique artists

  // C. MULTIPLE ALBUMS FROM SAME ARTIST (Bonus - 5 points)
  // If you both have multiple albums from the same artist, you're both fans
  const myArtistCounts = myArtists.reduce((acc, artist) => {
    acc[artist.toLowerCase()] = (acc[artist.toLowerCase()] || 0) + 1;
    return acc;
  }, {});
  
  const theirArtistCounts = theirArtists.reduce((acc, artist) => {
    acc[artist.toLowerCase()] = (acc[artist.toLowerCase()] || 0) + 1;
    return acc;
  }, {});

  let deepArtistFanBonus = 0;
  Object.keys(myArtistCounts).forEach(artist => {
    if (myArtistCounts[artist] > 1 && theirArtistCounts[artist] > 1) {
      deepArtistFanBonus += 5;
    }
  });
  score += deepArtistFanBonus;
  maxPossibleScore += 10; // Max bonus

  // D. GENRE OVERLAP (Medium signal)
  // Calculate both count and percentage overlap
  const uniqueMyGenres = [...new Set(myGenres.map(g => g.toLowerCase()))];
  const uniqueTheirGenres = [...new Set(theirGenres.map(g => g.toLowerCase()))];
  
  const sharedGenres = uniqueMyGenres.filter(g => uniqueTheirGenres.includes(g));
  const genreCountScore = sharedGenres.length * 3; // 3 points per shared genre
  
  // Genre overlap percentage (if you both have similar genre diversity)
  const totalUniqueGenres = new Set([...uniqueMyGenres, ...uniqueTheirGenres]).size;
  const genreOverlapPercent = totalUniqueGenres > 0 
    ? (sharedGenres.length / totalUniqueGenres) * 100 
    : 0;
  const genreOverlapScore = genreOverlapPercent * 0.2; // Up to 20 points for 100% overlap
  
  score += genreCountScore + genreOverlapScore;
  maxPossibleScore += 50; // Genre matching can add significant score

  // E. SIMILAR ALBUM TITLES (Weak signal - 3 points)
  // Different albums but similar naming patterns (live albums, greatest hits, etc.)
  const similarTitlePatterns = myAlbumTitles.filter(myTitle => 
    theirAlbumTitles.some(theirTitle => {
      // Check for similar patterns
      const patterns = ['live', 'greatest hits', 'best of', 'deluxe', 'remastered', 'acoustic'];
      return patterns.some(pattern => myTitle.includes(pattern) && theirTitle.includes(pattern));
    })
  );
  const titlePatternScore = Math.min(similarTitlePatterns.length * 3, 10);
  score += titlePatternScore;
  maxPossibleScore += 10;

  // F. ARTIST DIVERSITY SIMILARITY (Bonus for similar taste breadth)
  // If you both like 4 different artists vs both liking same artist 4 times
  const myArtistDiversity = uniqueMyArtists.length;
  const theirArtistDiversity = uniqueTheirArtists.length;
  const diversityDiff = Math.abs(myArtistDiversity - theirArtistDiversity);
  const diversityScore = diversityDiff === 0 ? 8 : Math.max(0, 8 - (diversityDiff * 2));
  score += diversityScore;
  maxPossibleScore += 8;

  // 3. NORMALIZE TO PERCENTAGE (0-100%)
  // Use a curve that makes mid-range matches more common
  const rawPercentage = maxPossibleScore > 0 
    ? (score / maxPossibleScore) * 100 
    : 0;

  // Apply sigmoid curve for better distribution
  // This prevents too many 0% or 100% matches
  const normalizedScore = Math.round(
    100 / (1 + Math.exp(-0.08 * (rawPercentage - 50)))
  );

  return Math.max(0, Math.min(100, normalizedScore));
}