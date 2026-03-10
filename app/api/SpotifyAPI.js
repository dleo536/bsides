import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import axios from "axios";

const CLIENT_ID = "35328aeb78ec43cbbb12afc948cdc687";
const SECRET = "e284561d79744d4db2086e526e9d15d0";
const redirectUrl = "eg:http://localhost:8080";

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = "user-read-private user-read-email";

let cachedToken = null;
let tokenExpiryTime = null;

const getAccessToken = async () => {
  const currentTime = Date.now();

  if (cachedToken && tokenExpiryTime && currentTime < tokenExpiryTime) {
    return cachedToken;
  }
  const clientId = "35328aeb78ec43cbbb12afc948cdc687";
  const clientSecret = "e284561d79744d4db2086e526e9d15d0";
  const tokenUrl = "https://accounts.spotify.com/api/token";
  const credentials = btoa(`${clientId}:${clientSecret}`); // Encode client_id:client_secret in Base64

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(data.access_token);
  cachedToken = data.access_token;
  // Set expiry time (current time + expires_in * 1000 milliseconds)
  tokenExpiryTime = currentTime + data.expires_in * 1000;

  return cachedToken; // Returns the access token
};

const fetchAlbum = async (albumID, accessToken) => {
  const url = `https://api.spotify.com/v1/albums/${albumID}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  return data; // Returns album name
};
const fetchAlbumsByName = async (
  searchValue,
  accessToken,
  limit = 10,
  offset = 0
) => {
  const url = `https://api.spotify.com/v1/search?q=${searchValue}&type=album&limit=${limit}&offset=${offset}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  return data; // Returns album name
};
const fetchAlbumCover = async (albumID, accessToken) => {
  const url = `https://api.spotify.com/v1/albums/${albumID}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  return data.images[1].url; // Returns album name
};
const fetchArtistPhotoByAlbum = async (albumID, accessToken) => {
  const url = `https://api.spotify.com/v1/albums/${albumID}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  const artistID = data.artists[0].id;
  try {
    const artistPhotoURL = await fetchArtistImage(artistID, accessToken);
    return artistPhotoURL;
  } catch (error) {
    console.error("Error fetching artist image:", error);
  }
};
const fetchArtistImage = async (artistID, accessToken) => {
  const url = `https://api.spotify.com/v1/artists/${artistID}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();

  return data.images[0].url; // Returns artist photo
};
const fetchArtistsByName = async (
  searchValue,
  accessToken,
  limit = 10,
  offset = 0
) => {
  const query = encodeURIComponent(searchValue);
  const url = `https://api.spotify.com/v1/search?q=${searchValue}&type=artist&limit=${limit}&offset=${offset}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();

  return data; // Returns artist photo
};
const fetchArtistAlbums = async (artistID, accessToken) => {
  const url = `https://api.spotify.com/v1/artists/${artistID}/albums?include_groups=album`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();

  return data.items; // Returns artist albums
};
const fetchTrackList = async (albumID, accessToken) => {
  const url = `https://api.spotify.com/v1/albums/${albumID}/tracks`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  //console.log("********data: ", JSON.stringify(data));

  return data.items; // Returns track list
};
const fetchArtistByName = async (artistName, accessToken) => {
  const url = `https://api.spotify.com/v1/search?q=${artistName}&type=artist`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  return data.artists.items[0];
};

export const getAlbumName = async (albumID) => {
  const token = await getAccessToken(); // Wait for access token
  const album = await fetchAlbum(albumID, token); // Wait for album data

  return album.name; // Return resolved album name
};
export const getAlbum = async (albumID) => {
  const alb = getAccessToken()
    .then((token) => fetchAlbum(albumID, token))
    .then((album) => {
      return album;
    });
  return alb;
};
export const getAlbumCover = async (albumID) => {
  const alb = getAccessToken()
    .then((token) => fetchAlbumCover(albumID, token))
    .then((album) => {
      return album;
    });
  return alb;
};
export const getAlbumsByName = async (albumName, page = 0, limit = 10) => {
  console.log(limit);

  const offset = page * limit;
  const alb = getAccessToken()
    .then((token) => fetchAlbumsByName(albumName, token, limit, offset))
    .then((albums) => {
      return (albums?.albums?.items || []).filter(isFullAlbumRelease);
    });
  return alb;
};
export const getArtistPhotoByAlbum = async (albumID) => {
  const token = await getAccessToken();
  const photoURL = await fetchArtistPhotoByAlbum(albumID, token);
  console.log("ummmmmmm", photoURL);
  return photoURL;
};
export const getArtistsByName = async (artistName, page = 0, limit = 10) => {
  const offset = page * limit;
  const artists = getAccessToken()
    .then((token) => fetchArtistsByName(artistName, token, limit, offset))
    .then((artists) => {
      return artists.artists.items;
    });
  return artists;
};
export const getArtistByName = async (artistName) => {
  const token = await getAccessToken();
  const artist = await fetchArtistByName(artistName, token);
  return artist;
};
export const getAlbumsByArtist = async (artistID) => {
  const token = await getAccessToken();
  const albums = await fetchArtistAlbums(artistID, token);
  return albums;
};
export const getTrackListFromSpotify = async (albumID) => {
  const token = await getAccessToken();
  const trackList = await fetchTrackList(albumID, token);
  return trackList;
};

const resolveMarket = (market) => {
  if (typeof market === "string" && market.trim().length === 2) {
    return market.trim().toUpperCase();
  }

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || "";
    const localeCountry = locale.split("-")[1];
    if (localeCountry && localeCountry.length === 2) {
      return localeCountry.toUpperCase();
    }
  } catch (error) {
    // Fall back to US if locale parsing is unavailable.
  }

  return "US";
};

export const toAlbumCardModel = (album) => ({
  id: album?.id ?? `${album?.name || "album"}-${album?.release_date || ""}`,
  title: album?.name || "Untitled Album",
  artistSubtitle:
    Array.isArray(album?.artists) && album.artists.length > 0
      ? album.artists.map((artist) => artist.name).join(", ")
      : "Unknown Artist",
  coverUrl: album?.images?.[0]?.url || null,
  releaseDate: album?.release_date || null,
  spotifyAlbum: album,
});

const isFullAlbumRelease = (album) =>
  typeof album?.album_type === "string"
    ? album.album_type.toLowerCase() === "album"
    : true;

const searchAlbumCards = async ({
  query,
  limit = 20,
  offset = 0,
  market,
}) => {
  const token = await getAccessToken();
  const resolvedMarket = resolveMarket(market);
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=album&limit=${limit}&offset=${offset}&market=${resolvedMarket}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Spotify search failed (${response.status}): ${errorBody?.slice?.(0, 180) || "unknown error"}`
    );
  }

  const data = await response.json();
  const rawAlbumItems = Array.isArray(data?.albums?.items) ? data.albums.items : [];
  const albumItems = rawAlbumItems.filter(isFullAlbumRelease);
  const total = data?.albums?.total || 0;
  const nextOffset = offset + rawAlbumItems.length;

  return {
    items: albumItems.map(toAlbumCardModel),
    total,
    hasMore: nextOffset < total,
    market: resolvedMarket,
    nextOffset,
  };
};

export const searchAlbumsByYear = async (
  year,
  { limit = 20, offset = 0, market } = {}
) => {
  return searchAlbumCards({
    query: `year:${year}`,
    limit,
    offset,
    market,
  });
};

export const searchNewAlbums = async ({
  limit = 20,
  offset = 0,
  market,
} = {}) => {
  return searchAlbumCards({
    query: "tag:new",
    limit,
    offset,
    market,
  });
};

export const searchNewAlbumsByMarket = async (
  countryCode,
  { limit = 20, offset = 0 } = {}
) => {
  return searchAlbumCards({
    query: "tag:new",
    limit,
    offset,
    market: countryCode,
  });
};
