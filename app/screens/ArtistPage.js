import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getAlbumsByArtist,
  getArtistById,
  getArtistByName,
} from "../api/SpotifyAPI";
import { getDiscogsArtistImage } from "../api/Discogs";
import { getArtistDescriptionFromMusicBrainz } from "../api/MusicBrainz";

const BIO_COLLAPSE_LENGTH = 320;
const PAGE_PADDING = 20;
const CARD_PADDING = 18;
const GRID_GAP = 12;

const getArtistImageUrl = (artist) => {
  const firstImage = artist?.images?.[0];

  if (typeof firstImage?.url === "string" && firstImage.url.trim()) {
    return firstImage.url;
  }

  if (typeof firstImage === "string" && firstImage.trim()) {
    return firstImage;
  }

  return null;
};

const sanitizeBioText = (bio) => {
  if (typeof bio !== "string") {
    return "";
  }

  const cleaned = bio
    .replace(/\[url=[^\]]+\]([^\[]+)\[\/url\]/gi, "$1")
    .replace(/\[(?:a|r|m|l)=([^\]]+)\]/gi, "$1")
    .replace(/\[\/?(?:a|r|m|l|url)[^\]]*\]/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (
    !cleaned ||
    /^artist not found$/i.test(cleaned) ||
    /^no bio available\.?$/i.test(cleaned)
  ) {
    return "";
  }

  return cleaned;
};

const formatGenreLabel = (genre) =>
  typeof genre === "string" && genre.trim()
    ? genre
        .split(/[-_]/g)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : genre;

const formatCompactNumber = (value) => {
  if (typeof value !== "number") {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

const normalizeAlbums = (albums) => {
  if (!Array.isArray(albums)) {
    return [];
  }

  const seen = new Set();

  return albums
    .filter((album) => {
      const key = album?.id || `${album?.name || "album"}-${album?.release_date || ""}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftDate = left?.release_date || "";
      const rightDate = right?.release_date || "";

      return rightDate.localeCompare(leftDate);
    });
};

const StatPill = ({ icon, label }) => (
  <View style={styles.statPill}>
    <Ionicons name={icon} size={14} color="#374151" />
    <Text style={styles.statPillText}>{label}</Text>
  </View>
);

const GenreChip = ({ genre }) => (
  <View style={styles.genreChip}>
    <Text style={styles.genreChipText}>{formatGenreLabel(genre)}</Text>
  </View>
);

const AlbumTile = ({ album, width, onPress }) => {
  const coverUri = album?.images?.[0]?.url;
  const releaseYear =
    typeof album?.release_date === "string" && album.release_date.length >= 4
      ? album.release_date.slice(0, 4)
      : null;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.albumTile, { width }]}
    >
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={[styles.albumCover, { width, height: width }]} />
      ) : (
        <View style={[styles.albumCoverFallback, { width, height: width }]}>
          <Ionicons name="disc-outline" size={26} color="#6b7280" />
        </View>
      )}
      <Text style={styles.albumTitle} numberOfLines={2}>
        {album?.name || "Untitled Album"}
      </Text>
      <Text style={styles.albumSubtitle} numberOfLines={1}>
        {releaseYear || "Album"}
      </Text>
    </TouchableOpacity>
  );
};

export default function ArtistPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const initialArtist = route.params?.artist || {};

  const [artistData, setArtistData] = useState(initialArtist);
  const [artistImageUri, setArtistImageUri] = useState(getArtistImageUrl(initialArtist));
  const [bio, setBio] = useState("");
  const [bioSource, setBioSource] = useState(null);
  const [artistAlbums, setArtistAlbums] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [bioLoading, setBioLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const albumColumns = width >= 520 ? 4 : 3;
  const albumTileSize = Math.floor(
    (width - PAGE_PADDING * 2 - CARD_PADDING * 2 - GRID_GAP * (albumColumns - 1)) /
      albumColumns
  );
  const genreLabels = Array.isArray(artistData?.genres)
    ? artistData.genres.filter(Boolean).slice(0, 4)
    : [];
  const followersCount =
    typeof artistData?.followers?.total === "number" ? artistData.followers.total : null;
  const shouldCollapseBio = bio.length > BIO_COLLAPSE_LENGTH;
  const visibleBio =
    shouldCollapseBio && !isBioExpanded
      ? `${bio.slice(0, BIO_COLLAPSE_LENGTH).trimEnd()}...`
      : bio;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: artistData?.name || "Artist",
      headerBackTitle: "Back",
    });
  }, [artistData?.name, navigation]);

  useEffect(() => {
    let isMounted = true;

    const loadArtistPage = async () => {
      setPageLoading(true);
      setAlbumsLoading(true);
      setBioLoading(true);
      setIsBioExpanded(false);
      setBioSource(null);

      let resolvedArtist = initialArtist;

      try {
        if (initialArtist?.id) {
          const freshArtist = await getArtistById(initialArtist.id);
          if (freshArtist) {
            resolvedArtist = { ...initialArtist, ...freshArtist };
          }
        } else if (initialArtist?.name) {
          const searchedArtist = await getArtistByName(initialArtist.name);
          if (searchedArtist) {
            resolvedArtist = { ...initialArtist, ...searchedArtist };
          }
        }
      } catch (error) {
        console.error("Artist lookup error:", error);
      }

      if (!isMounted) {
        return;
      }

      setArtistData(resolvedArtist);

      const spotifyImageUri = getArtistImageUrl(resolvedArtist) || getArtistImageUrl(initialArtist);
      if (spotifyImageUri) {
        setArtistImageUri(spotifyImageUri);
      }

      const artistName = resolvedArtist?.name || initialArtist?.name || "";
      const artistId = resolvedArtist?.id || initialArtist?.id || "";

      const [albumsResult, bioResult, fallbackImageResult] = await Promise.allSettled([
        artistId ? getAlbumsByArtist(artistId) : Promise.resolve([]),
        artistName
          ? getArtistDescriptionFromMusicBrainz(artistName)
          : Promise.resolve({ description: "", source: null }),
        !spotifyImageUri && artistName
          ? getDiscogsArtistImage(artistName)
          : Promise.resolve(spotifyImageUri || null),
      ]);

      if (!isMounted) {
        return;
      }

      if (albumsResult.status === "fulfilled") {
        setArtistAlbums(normalizeAlbums(albumsResult.value));
      } else {
        setArtistAlbums([]);
      }
      setAlbumsLoading(false);

      if (bioResult.status === "fulfilled") {
        setBio(sanitizeBioText(bioResult.value?.description || ""));
        setBioSource(bioResult.value?.source || null);
      } else {
        setBio("");
        setBioSource(null);
      }
      setBioLoading(false);

      if (fallbackImageResult.status === "fulfilled") {
        setArtistImageUri(fallbackImageResult.value || spotifyImageUri || null);
      } else {
        setArtistImageUri(spotifyImageUri || null);
      }

      setPageLoading(false);
    };

    loadArtistPage();

    return () => {
      isMounted = false;
    };
  }, [initialArtist?.id, initialArtist?.name]);

  if (pageLoading && !artistData?.name && !artistImageUri) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#111827" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroShell}>
          <LinearGradient
            colors={["#fff5c4", "#ffffff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.artistImageFrame}>
                {artistImageUri ? (
                  <Image source={{ uri: artistImageUri }} style={styles.artistImage} />
                ) : (
                  <View style={styles.artistImageFallback}>
                    <Ionicons name="person-outline" size={38} color="#4b5563" />
                  </View>
                )}
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>Artist</Text>
                <Text style={styles.artistName}>{artistData?.name || "Unknown Artist"}</Text>
                <Text style={styles.heroSubcopy}>
                  {bio
                    ? "A closer look at the records, context, and catalog."
                    : "Explore the catalog and open albums directly from here."}
                </Text>
              </View>
            </View>

            <View style={styles.heroMetaRow}>
              <StatPill
                icon="albums-outline"
                label={`${artistAlbums.length} album${artistAlbums.length === 1 ? "" : "s"}`}
              />
              {followersCount ? (
                <StatPill icon="people-outline" label={`${formatCompactNumber(followersCount)} followers`} />
              ) : null}
            </View>

            {genreLabels.length > 0 ? (
              <View style={styles.genreRow}>
                {genreLabels.map((genre) => (
                  <GenreChip key={genre} genre={genre} />
                ))}
              </View>
            ) : null}
          </LinearGradient>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>About</Text>
              <Text style={styles.sectionTitle}>Artist description</Text>
            </View>
          </View>

          {bioLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#111827" />
              <Text style={styles.loadingText}>Loading description...</Text>
            </View>
          ) : bio ? (
            <>
              <Text style={styles.bioText}>{visibleBio}</Text>
              {bioSource ? <Text style={styles.bioSourceText}>{bioSource}</Text> : null}
              {shouldCollapseBio ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsBioExpanded((current) => !current)}
                  style={styles.readMoreButton}
                >
                  <Text style={styles.readMoreText}>
                    {isBioExpanded ? "Show less" : "Read more"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptySectionText}>
              No artist description is available right now.
            </Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Catalog</Text>
              <Text style={styles.sectionTitle}>Albums</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{artistAlbums.length}</Text>
            </View>
          </View>

          {albumsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#111827" />
              <Text style={styles.loadingText}>Loading albums...</Text>
            </View>
          ) : artistAlbums.length > 0 ? (
            <View style={styles.albumGrid}>
              {artistAlbums.map((album) => (
                <AlbumTile
                  key={album?.id || `${album?.name}-${album?.release_date}`}
                  album={album}
                  width={albumTileSize}
                  onPress={() =>
                    navigation.push("AlbumPage", {
                      album,
                      key: Math.round(Math.random() * 10000000),
                    })
                  }
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyAlbumsState}>
              <Ionicons name="disc-outline" size={24} color="#6b7280" />
              <Text style={styles.emptySectionText}>
                No albums are available for this artist right now.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f1e6",
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f1e6",
  },
  contentContainer: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 20,
    gap: 18,
  },
  heroShell: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroCard: {
    padding: CARD_PADDING,
    borderWidth: 1,
    borderColor: "#f3e7a3",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  artistImageFrame: {
    width: 122,
    height: 122,
    borderRadius: 26,
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.72)",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  artistImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    backgroundColor: "#e5e7eb",
  },
  artistImageFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    marginLeft: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#7c5d00",
    marginBottom: 6,
  },
  artistName: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  heroSubcopy: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  genreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  genreChip: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "#111827",
  },
  genreChipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    padding: CARD_PADDING,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "#9ca3af",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111827",
  },
  countBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countBadgeText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 14,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#374151",
  },
  bioSourceText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 16,
    color: "#9ca3af",
    fontWeight: "600",
  },
  readMoreButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 6,
  },
  readMoreText: {
    color: "#7c5d00",
    fontSize: 14,
    fontWeight: "700",
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  albumTile: {
    marginBottom: 4,
  },
  albumCover: {
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    marginBottom: 8,
  },
  albumCoverFallback: {
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  albumTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#111827",
  },
  albumSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
  },
  emptyAlbumsState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  emptySectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },
});
