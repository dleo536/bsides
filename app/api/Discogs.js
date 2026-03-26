import API_BASE_URL from "../config/api";

const fetchJson = async (path, searchParams = {}) => {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      url.searchParams.set(key, value.trim());
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Discogs request failed with status ${response.status}`);
  }

  return response.json();
};

export const getMusicianMixedCredits = async (musicianName) => {
  if (!musicianName?.trim()) {
    return [];
  }

  try {
    const data = await fetchJson("/discogs/mixing-credits", {
      name: musicianName,
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to load Discogs mixing credits:", error);
    return [];
  }
};

export const getMusicians = async (searchValue) => {
  if (!searchValue?.trim()) {
    return [];
  }

  try {
    const data = await fetchJson("/discogs/artists/search", { q: searchValue });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to search Discogs artists:", error);
    return [];
  }
};

export const getLabels = async (searchValue) => {
  if (!searchValue?.trim()) {
    return [];
  }

  try {
    const data = await fetchJson("/discogs/labels/search", { q: searchValue });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to search Discogs labels:", error);
    return [];
  }
};

export async function getDiscogsArtistBio(artistName) {
  if (!artistName?.trim()) {
    return "Artist not found";
  }

  try {
    const data = await fetchJson("/discogs/artists/bio", { name: artistName });
    return typeof data === "string" ? data : "No bio available.";
  } catch (error) {
    console.error("Failed to load Discogs artist bio:", error);
    return "No bio available.";
  }
}

export async function getDiscogsArtistImage(artistName) {
  if (!artistName?.trim()) {
    return null;
  }

  try {
    const data = await fetchJson("/discogs/artists/image", { name: artistName });
    return typeof data === "string" && data.trim() ? data : null;
  } catch (error) {
    console.error("Failed to load Discogs artist image:", error);
    return null;
  }
}
