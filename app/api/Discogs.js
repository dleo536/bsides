export const getMusicianMixedCredits = async (musicianName) => {
  let json;
  const searchEncoded = encodeURIComponent(musicianName);
  let myDiscogsToken = "";

  try {
    const response = await fetch(
      `https://api.discogs.com/database/search?q=${searchEncoded}&credit=Mixed+By&type=release&token=MPpvJuuMxUababWaCPJYpzjUMlMHpFhnWdEewrln`
    );
    const data = await response.json();
    //console.log(data);

    return data.results;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
export const getMusicians = async (searchValue) => {
  let json;
  const searchEncoded = encodeURIComponent(searchValue);
  let myDiscogsToken = "";

  try {
    const response = await fetch(
      `https://api.discogs.com/database/search?q=${searchEncoded}&type=artist&token=MPpvJuuMxUababWaCPJYpzjUMlMHpFhnWdEewrln`
    );
    const data = await response.json();
    console.log(data.results);
    console.log(" this is a break");

    return data.results;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
export const getLabels = async (searchValue) => {
  let json;
  const searchEncoded = encodeURIComponent(searchValue);
  let myDiscogsToken = "";

  try {
    const response = await fetch(
      `https://api.discogs.com/database/search?q=${searchEncoded}&type=label&token=MPpvJuuMxUababWaCPJYpzjUMlMHpFhnWdEewrln`
    );
    const data = await response.json();
    console.log(data.results);
    console.log(" this is a break");

    return data.results;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
export async function getDiscogsArtistBio(artistName) {
  const searchRes = await fetch(
    `https://api.discogs.com/database/search?q=${encodeURIComponent(
      artistName
    )}&type=artist&token=MPpvJuuMxUababWaCPJYpzjUMlMHpFhnWdEewrln`
  );
  const artistId = (await searchRes.json()).results[0]?.id;

  if (!artistId) return "Artist not found";

  const artistRes = await fetch(`https://api.discogs.com/artists/${artistId}`);
  const artist = await artistRes.json();

  return artist.profile || "No bio available.";
}
export async function getDiscogsArtistImage(artistName) {
  // Helper: Get JSON
  const fetchJson = async (url) => {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  };

  try {
    // STEP 1: Search Discogs for artist ID
    const searchUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(
      artistName
    )}&type=artist&token=MPpvJuuMxUababWaCPJYpzjUMlMHpFhnWdEewrln`;
    const searchRes = await fetchJson(searchUrl);
    const artistId = searchRes?.results?.[0]?.id;
    if (!artistId) return null;

    // STEP 2: Try Discogs artist image
    const artistData = await fetchJson(
      `https://api.discogs.com/artists/${artistId}`
    );
    const discogsImage = artistData?.images?.[0]?.uri;
    if (discogsImage) return discogsImage;

    // STEP 3: Try release image from first release
    const releases = await fetchJson(
      `https://api.discogs.com/artists/${artistId}/releases`
    );
    const releaseThumb = releases?.releases?.[0]?.thumb;
    if (releaseThumb) return releaseThumb;

    // STEP 4: Try MusicBrainz → Wikidata → Wikipedia
    const mbSearch = await fetchJson(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(
        artistName
      )}&fmt=json`
    );
    const mbid = mbSearch?.artists?.[0]?.id;
    if (!mbid) return null;

    const mbDetail = await fetchJson(
      `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`
    );
    const wikidataUrl = mbDetail?.relations?.find((r) => r.type === "wikidata")
      ?.url?.resource;
    if (!wikidataUrl) return null;

    const wikidataId = wikidataUrl.split("/").pop();
    const wikidata = await fetchJson(
      `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`
    );
    const entity = wikidata?.entities?.[wikidataId];
    const imageFile = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!imageFile) return null;

    // Format Wikipedia Commons image URL
    const formatted = imageFile.replace(/ /g, "_");
    const md5 = await md5Hash(formatted);
    const commonsUrl = `https://upload.wikimedia.org/wikipedia/commons/${md5.slice(
      0,
      1
    )}/${md5.slice(0, 2)}/${formatted}`;

    return commonsUrl;
  } catch (err) {
    console.error("Image fetch failed:", err);
    return null;
  }
}

// Helper: get MD5 hash for Wikipedia Commons URLs
async function md5Hash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
