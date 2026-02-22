// src/services/musicService.js

const API_KEY = "49dd31fca41bd2d158b7d48673e6aea5"; //
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

export const musicService = {
  // 1. Search for albums
  searchAlbums: async (term) => {
    const url = `${BASE_URL}?method=album.search&album=${term}&api_key=${API_KEY}&format=json&limit=10`;
    const resp = await fetch(url);
    const data = await resp.json();
    
    // We "Normalize" the data here so the rest of the app 
    // doesn't have to care that it came from Last.fm
    const albums = data.results.albummatches.album.map(a => ({
      album_id: a.mbid || a.url, // Use MBID or URL as a unique ID
      album_title: a.name,
      album_artist: a.artist,
      album_cover: a.image[3]['#text'] || a.image[2]['#text'], // Grab the "large" or "extralarge" image
    }));

    return albums;
  },

  // 2. Get Genres (Last.fm calls these "tags")
  // Note: Last.fm requires a separate call to get the genres for a specific album
  getAlbumDetails: async (artist, albumName) => {
    const url = `${BASE_URL}?method=album.getInfo&api_key=${API_KEY}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(albumName)}&format=json`;
    const resp = await fetch(url);
    const data = await resp.json();

    // Extract tags and filter out generic ones like your brother suggested
    const tags = data.album?.tags?.tag || [];
    const genres = tags
      .map(t => t.name)
      .filter(g => !["albums I own", "favorite albums", "Music"].includes(g));

    return genres;
  }
};