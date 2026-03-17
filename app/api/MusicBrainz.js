//import fetch from "node-fetch";

const HEADERS = {
  "User-Agent": "bsides/1.0 (dleo536@gmail.com)",
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
      "User-Agent": "BsidesApp/1.0.0 ( your@email.com )",
    },
  });

  const data = await res.json();
  console.log("response", data);
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
  console.log("-------------> relations " + JSON.stringify(relations));
  return relations.filter(
    (r) =>
      r.type?.toLowerCase().includes("mix") ||
      r.type?.toLowerCase().includes("engineer")
  );
}

// Main function
export async function findMixingCreditsFromMusicBrainz(album, artist) {
  try {
    console.log(`🔍 Searching for "${album}" by ${artist}...`);
    const releaseGroup = await searchReleaseGroup(album, artist);
    if (!releaseGroup) {
      console.log(`❌ No release group found.`);
      return [];
    }

    const releases = await getReleasesFromGroup(releaseGroup.id);
    console.log(
      `📦 Found ${releases.length} release(s) under "${releaseGroup.title}"`
    );

    for (const release of releases) {
      console.log(
        `🔎 Checking release: ${release.title} (${release.id || "no date"})`
      );
      const releaseData = await getFullReleaseData(release.id);

      // 1. Check release-level credits
      const releaseCredits = findMixingCredits(releaseData.relations || []);

      if (releaseCredits.length > 0) {
        console.log(
          `\n🎛 Release-level mixing/engineering credits: "${release.title}"`
        );
        releaseCredits.forEach((c) => {
          console.log(
            `- ${c.artist?.name} (${c.type}) ${c.attributes?.join(", ") || ""}`
          );
        });
        return releaseCredits;
      }

      // 2. Now check *recording-level* credits for each track in this release
      const allMedia = releaseData.media || [];

      for (const medium of allMedia) {
        const tracks = medium.tracks || [];
        for (const track of tracks) {
          const recordingId = track.recording?.id;
          if (!recordingId) continue;

          console.log(`🎵 Checking track: ${track.title} (${recordingId})`);
          const recCredits = await getRecordingCredits(recordingId);
          const mixers = findMixingCredits(recCredits);

          if (mixers.length > 0) {
            console.log(
              `\n🎚 Track-level mixing/engineering credits for "${release.title}":`
            );
            console.log(`Track: ${track.title}`);
            mixers.forEach((c) => {
              console.log(
                `- ${c.artist?.name} (${c.type}) ${
                  c.attributes?.join(", ") || ""
                }`
              );
            });
            console.log("is it returning early or whhhhhhattttttt?");
            return mixers;
          }
        }
      }
    }

    console.log(
      "🚫 No mixing/engineering credits found in any versions or tracks."
    );
    return [];
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
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
  console.log("relations " + JSON.stringify(relations));
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
    console.log(`🔍 Searching for artist: ${engineerName}`);
    const artistId = await getArtistId(engineerName);
    console.log(`✅ Found ID: ${artistId}`);

    console.log(`📦 Fetching relationships...`);
    const relations = await getArtistRelationships(artistId);

    console.log(`🎛 Filtering mixing credits...`);
    const albums = extractMixedReleases(relations);

    console.log(`\n🎧 Albums mixed by ${engineerName}:`);
    if (albums.length === 0) {
      console.log("No mixing credits found.");
    } else {
      albums.forEach((title) => console.log(`- ${title}`));
      return albums;
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

// Change this name to test others
export async function getAlbumCreditsByName(album, artist) {
  try {
    console.log(`🔍 Searching for "${album}" by ${artist}...`);
    const releaseGroup = await searchReleaseGroup(album, artist);
    if (!releaseGroup) {
      console.log(`❌ No release group found.`);
      return [];
    }

    const releases = await getReleasesFromGroup(releaseGroup.id);
    console.log(
      `📦 Found ${releases.length} release(s) under "${releaseGroup.title}"`
    );

    const seenNames = new Set();
    const uniquePersonnel = [];

    for (const release of releases) {
      console.log(
        `🔎 Checking release: ${release.title} (${release.id || "no date"})`
      );
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

          console.log(`🎵 Checking track: ${track.title} (${recordingId})`);
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

    console.log(
      `✅ Found ${uniquePersonnel[0].name} unique people (by name only).`
    );
    return uniquePersonnel;
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
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
    console.error("getAlbumDescriptionFromMusicBrainz error:", error);
    return { description: "", source: null };
  }
}
