import fetch from "node-fetch";

const HEADERS = {
  "User-Agent": "bsides/1.0 (dleo536@gmail.com)",
};

const BASE_URL = "https://musicbrainz.org/ws/2";
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Search release group by album and artist
async function searchReleaseGroup(album, artist) {
  await sleep(1000);
  const query = encodeURIComponent(`release:"${album}" AND artist:"${artist}"`);
  const url = `${BASE_URL}/release-group/?query=${query}&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });
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
