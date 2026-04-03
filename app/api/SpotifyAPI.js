import API_BASE_URL from "../config/api";
import { apiFetch } from "./apiClient";

const albumCache = new Map();
const artistCache = new Map();
const albumTracksCache = new Map();
const artistAlbumsCache = new Map();

const parseJsonSafely = async (response, label) => {
  const raw = await response.text();
  if (!raw || !raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON`);
  }
};

const createCacheKey = (path, query = {}) =>
  `${path}?${Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&")}`;

const getCachedRequest = (cache, key, loader) => {
  if (!cache.has(key)) {
    cache.set(
      key,
      Promise.resolve()
        .then(loader)
        .catch((error) => {
          cache.delete(key);
          throw error;
        })
    );
  }

  return cache.get(key);
};

const buildRequestUrl = (path, query = {}) => {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  );

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const spotifyRequest = async (path, query = {}, label = path) => {
  const response = await apiFetch(
    buildRequestUrl(path, query),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
    { authRequired: true }
  );

  const data = await parseJsonSafely(response, label);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `${label} failed with status ${response.status}`
    );
  }

  return data;
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

const isFullAlbumRelease = (album) =>
  typeof album?.album_type === "string"
    ? album.album_type.toLowerCase() === "album"
    : true;

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

export const getAlbum = async (albumID) => {
  if (!albumID) {
    return null;
  }

  const cacheKey = createCacheKey(`/spotify/albums/${albumID}`);
  return getCachedRequest(albumCache, cacheKey, () =>
    spotifyRequest(`/spotify/albums/${encodeURIComponent(albumID)}`)
  );
};

export const getAlbumName = async (albumID) => {
  const album = await getAlbum(albumID);
  return album?.name || null;
};

export const getAlbumCover = async (albumID) => {
  const album = await getAlbum(albumID);
  return album?.images?.[1]?.url || album?.images?.[0]?.url || null;
};

export const getAlbumsByName = async (albumName, page = 0, limit = 10) => {
  const offset = page * limit;
  const data = await spotifyRequest(
    "/spotify/albums/search",
    {
      q: albumName,
      limit,
      offset,
    },
    "Spotify album search"
  );

  return (data?.albums?.items || []).filter(isFullAlbumRelease);
};

export const getArtistById = async (artistID) => {
  if (!artistID) {
    return null;
  }

  const cacheKey = createCacheKey(`/spotify/artists/${artistID}`);
  return getCachedRequest(artistCache, cacheKey, () =>
    spotifyRequest(`/spotify/artists/${encodeURIComponent(artistID)}`)
  );
};

export const getArtistPhotoByAlbum = async (albumID) => {
  const album = await getAlbum(albumID);
  const primaryArtistId = album?.artists?.[0]?.id;

  if (!primaryArtistId) {
    return null;
  }

  const artist = await getArtistById(primaryArtistId);
  return artist?.images?.[0]?.url || null;
};

export const getArtistsByName = async (artistName, page = 0, limit = 10) => {
  const offset = page * limit;
  const data = await spotifyRequest(
    "/spotify/artists/search",
    {
      q: artistName,
      limit,
      offset,
    },
    "Spotify artist search"
  );

  return Array.isArray(data?.artists?.items) ? data.artists.items : [];
};

export const getArtistByName = async (artistName) => {
  return spotifyRequest(
    "/spotify/artists/by-name",
    { name: artistName },
    "Spotify artist lookup"
  );
};

export const getAlbumsByArtist = async (artistID) => {
  if (!artistID) {
    return [];
  }

  const cacheKey = createCacheKey(`/spotify/artists/${artistID}/albums`);
  return getCachedRequest(artistAlbumsCache, cacheKey, () =>
    spotifyRequest(`/spotify/artists/${encodeURIComponent(artistID)}/albums`)
  );
};

export const getTrackListFromSpotify = async (albumID) => {
  if (!albumID) {
    return [];
  }

  const cacheKey = createCacheKey(`/spotify/albums/${albumID}/tracks`);
  return getCachedRequest(albumTracksCache, cacheKey, () =>
    spotifyRequest(`/spotify/albums/${encodeURIComponent(albumID)}/tracks`)
  );
};

const searchAlbumCards = async ({
  query,
  limit = 20,
  offset = 0,
  market,
}) => {
  const resolvedMarket = resolveMarket(market);
  const data = await spotifyRequest(
    "/spotify/albums/search",
    {
      q: query,
      limit,
      offset,
      market: resolvedMarket,
    },
    "Spotify album card search"
  );

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

export const getAlbumList = getAlbumsByName;
