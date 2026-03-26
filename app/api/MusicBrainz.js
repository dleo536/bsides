//import fetch from "node-fetch";

const HEADERS = {
  "User-Agent": "b.sides/1.0 (support@bsides.invalid)",
};

const BASE_URL = "https://musicbrainz.org/ws/2";
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Search release group by album and artist
export async function searchReleaseGroup(album, artist) {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // simulate sleep
  const query = encodeURIComponent(`release:${album} AND artist:${artist}`);
  const url = `https://musicbrainz.org/ws/2/release-group/?query=${query}&fmt=json`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "b.sides/1.0 (support@bsides.invalid)",
    },
  });

  const data = await res.json();
  return data["release-groups"]?.[0];
}

// Get all releases from the release group
async function getReleasesFromGroup(groupId) {
  await sleep(1000);
  const url = `${BASE_URL}/release-group/${groupId}?inc=releases&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  return data.releases || [];
}

async function getReleaseGroupMetadata(groupId) {
  await sleep(1000);
  const url = `${BASE_URL}/release-group/${groupId}?inc=url-rels&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  return data;
}

// Get full release data including track listing
async function getFullReleaseData(releaseId) {
  await sleep(1000);
  const url = `${BASE_URL}/release/${releaseId}?inc=artist-rels+media+recordings&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  //console.log(data);
  return data;
}

// Fetch a recording's individual artist relationships (for credits)
async function getRecordingCredits(recordingId) {
  await sleep(1000);
  const url = `${BASE_URL}/recording/${recordingId}?inc=artist-rels&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  return data.relations || [];
}

// Filter for mixing/engineering credits
function findMixingCredits(relations = []) {
  return relations.filter(
    (r) =>
      r.type?.toLowerCase().includes("mix") ||
      r.type?.toLowerCase().includes("engineer")
  );
}

// Main function
export async function findMixingCreditsFromMusicBrainz(album, artist) {
  try {
    const releaseGroup = await searchReleaseGroup(album, artist);
    if (!releaseGroup) {
      return [];
    }

    const releases = await getReleasesFromGroup(releaseGroup.id);

    for (const release of releases) {
      const releaseData = await getFullReleaseData(release.id);

      // 1. Check release-level credits
      const releaseCredits = findMixingCredits(releaseData.relations || []);

      if (releaseCredits.length > 0) {
        return releaseCredits;
      }

      // 2. Now check *recording-level* credits for each track in this release
      const allMedia = releaseData.media || [];

      for (const medium of allMedia) {
        const tracks = medium.tracks || [];
        for (const track of tracks) {
          const recordingId = track.recording?.id;
          if (!recordingId) continue;

          const recCredits = await getRecordingCredits(recordingId);
          const mixers = findMixingCredits(recCredits);

          if (mixers.length > 0) {
            return mixers;
          }
        }
      }
    }

    return [];
  } catch (err) {
    console.error("Failed to load MusicBrainz mixing credits");
    return [];
  }
}

// Example usage

async function getArtistId(name) {
  await sleep(1000);
  const query = encodeURIComponent(name);
  const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${query}&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();

  if (data.artists.length === 0) {
    throw new Error(`No artist found with name: ${name}`);
  }

  return data.artists[0].id;
}

async function getArtistRelationships(artistId) {
  await sleep(1000);
  const url = `https://musicbrainz.org/ws/2/artist/${artistId}?inc=release-rels&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();

  return data.relations || [];
}

function extractMixedReleases(relations) {
  const mixedAlbums = new Set();
  for (const rel of relations) {
    if (
      (rel.type.toLowerCase().includes("mix") ||
        rel.type.toLowerCase().includes("engineer")) &&
      rel["target-type"] === "release"
    ) {
      const title = rel.release?.title;

      if (title) mixedAlbums.add(title);
    }
  }

  return Array.from(mixedAlbums);
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getAlbumsMixedBy(engineerName) {
  try {
    const artistId = await getArtistId(engineerName);
    const relations = await getArtistRelationships(artistId);
    const albums = extractMixedReleases(relations);
    return albums;
  } catch (err) {
    console.error("Failed to load MusicBrainz mixed albums");
  }
}

// Change this name to test others
export async function getAlbumCreditsByName(album, artist) {
  try {
    const releaseGroup = await searchReleaseGroup(album, artist);
    if (!releaseGroup) {
      return [];
    }

    const releases = await getReleasesFromGroup(releaseGroup.id);

    const seenNames = new Set();
    const uniquePersonnel = [];

    for (const release of releases) {
      const releaseData = await getFullReleaseData(release.id);

      // 1. Release-level personnel
      const releaseRels = releaseData.relations || [];
      releaseRels.forEach((rel) => {
        const name = rel.artist?.name;

        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          uniquePersonnel.push({
            name,
            role: rel.type,
            source: "release",
          });
        }
      });

      // 2. Recording-level personnel
      const allMedia = releaseData.media || [];
      for (const medium of allMedia) {
        const tracks = medium.tracks || [];
        for (const track of tracks) {
          const recordingId = track.recording?.id;
          if (!recordingId) continue;

          const recCredits = await getRecordingCredits(recordingId);

          recCredits.forEach((rel) => {
            const name = rel.artist?.name;

            if (name && !seenNames.has(name)) {
              seenNames.add(name);
              uniquePersonnel.push({
                name,
                role: rel.type,
                source: "recording",
                track: track.title,
              });
            }
          });
        }
      }

      if (uniquePersonnel.length > 0) break; // remove if you want all releases checked
    }

    return uniquePersonnel;
  } catch (err) {
    console.error("Failed to load MusicBrainz album credits");
    return [];
  }
}

const extractWikipediaTitle = (resourceUrl) => {
  if (typeof resourceUrl !== "string" || !resourceUrl.includes("/wiki/")) {
    return null;
  }

  const title = resourceUrl.split("/wiki/")[1];
  return title ? decodeURIComponent(title) : null;
};

async function getWikipediaSummary(resourceUrl) {
  const title = extractWikipediaTitle(resourceUrl);
  if (!title) {
    return null;
  }

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title
  )}`;
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const summary =
    typeof data?.extract === "string" && data.extract.trim()
      ? data.extract.trim()
      : null;

  return summary;
}

const normalizeSearchLabel = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

async function searchArtist(artistName) {
  await sleep(1000);
  const query = encodeURIComponent(`artist:${artistName}`);
  const url = `${BASE_URL}/artist/?query=${query}&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const artists = Array.isArray(data?.artists) ? data.artists : [];

  if (artists.length === 0) {
    return null;
  }

  const normalizedQuery = normalizeSearchLabel(artistName);
  const exactMatch = artists.find((artist) => {
    const name = normalizeSearchLabel(artist?.name);
    const sortName = normalizeSearchLabel(artist?.["sort-name"]);
    return name === normalizedQuery || sortName === normalizedQuery;
  });

  return exactMatch || artists[0];
}

async function getArtistMetadata(artistId) {
  await sleep(1000);
  const url = `${BASE_URL}/artist/${artistId}?inc=url-rels+annotation&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function getAlbumDescriptionFromMusicBrainz(album, artist) {
  try {
    const releaseGroup = await searchReleaseGroup(album, artist);
    if (!releaseGroup?.id) {
      return { description: "", source: null };
    }

    const metadata = await getReleaseGroupMetadata(releaseGroup.id);
    const wikipediaRelation = Array.isArray(metadata?.relations)
      ? metadata.relations.find((relation) => {
          const relationType = relation?.type?.toLowerCase?.() || "";
          const resource = relation?.url?.resource || "";
          return (
            relationType === "wikipedia" ||
            resource.includes("wikipedia.org/wiki/")
          );
        })
      : null;

    if (wikipediaRelation?.url?.resource) {
      const summary = await getWikipediaSummary(wikipediaRelation.url.resource);
      if (summary) {
        return {
          description: summary,
          source: "MusicBrainz-linked Wikipedia",
        };
      }
    }

    const annotation =
      typeof metadata?.annotation === "string" && metadata.annotation.trim()
        ? metadata.annotation.trim()
        : null;
    if (annotation) {
      return {
        description: annotation,
        source: "MusicBrainz annotation",
      };
    }

    const disambiguation =
      typeof metadata?.disambiguation === "string" && metadata.disambiguation.trim()
        ? metadata.disambiguation.trim()
        : typeof releaseGroup?.disambiguation === "string" &&
          releaseGroup.disambiguation.trim()
        ? releaseGroup.disambiguation.trim()
        : null;

    if (disambiguation) {
      return {
        description: disambiguation,
        source: "MusicBrainz release group",
      };
    }

    return { description: "", source: null };
  } catch (error) {
    console.error("Failed to load album description");
    return { description: "", source: null };
  }
}

export async function getArtistDescriptionFromMusicBrainz(artistName) {
  try {
    const artist = await searchArtist(artistName);
    if (!artist?.id) {
      return { description: "", source: null };
    }

    const metadata = await getArtistMetadata(artist.id);
    const wikipediaRelation = Array.isArray(metadata?.relations)
      ? metadata.relations.find((relation) => {
          const relationType = relation?.type?.toLowerCase?.() || "";
          const resource = relation?.url?.resource || "";
          return (
            relationType === "wikipedia" ||
            resource.includes("wikipedia.org/wiki/")
          );
        })
      : null;

    if (wikipediaRelation?.url?.resource) {
      const summary = await getWikipediaSummary(wikipediaRelation.url.resource);
      if (summary) {
        return {
          description: summary,
          source: "MusicBrainz-linked Wikipedia",
        };
      }
    }

    const annotation =
      typeof metadata?.annotation === "string" && metadata.annotation.trim()
        ? metadata.annotation.trim()
        : null;
    if (annotation) {
      return {
        description: annotation,
        source: "MusicBrainz annotation",
      };
    }

    const disambiguation =
      typeof metadata?.disambiguation === "string" && metadata.disambiguation.trim()
        ? metadata.disambiguation.trim()
        : typeof artist?.disambiguation === "string" && artist.disambiguation.trim()
        ? artist.disambiguation.trim()
        : null;

    if (disambiguation) {
      return {
        description: disambiguation,
        source: "MusicBrainz artist",
      };
    }

    return { description: "", source: null };
  } catch (error) {
    console.error("Failed to load artist description");
    return { description: "", source: null };
  }
}
