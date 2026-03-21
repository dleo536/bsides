import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getAlbum,
  getAlbumsByName,
  getArtistById,
  getArtistByName,
} from "../api/SpotifyAPI";
import { getUserByIdentifier } from "../api/UserAPI";

const SPOTIFY_ID_LENGTH = 22;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isLikelySpotifyId = (value) =>
  typeof value === "string" && value.trim().length === SPOTIFY_ID_LENGTH;

const formatReviewDate = (value) => {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatRatingValue = (review) => {
  if (typeof review?.ratingHalfSteps === "number") {
    return `${(review.ratingHalfSteps / 2).toFixed(1)}`;
  }

  const numericRating = Number(review?.rating);
  if (Number.isFinite(numericRating)) {
    return `${numericRating.toFixed(1)}`;
  }

  return "Unrated";
};

const findBestAlbumMatch = (albums, albumName, artistName) => {
  if (!Array.isArray(albums) || albums.length === 0) {
    return null;
  }

  const normalizedAlbumName = normalizeText(albumName);
  const normalizedArtistName = normalizeText(artistName);

  return (
    albums.find(
      (album) =>
        normalizeText(album?.name) === normalizedAlbumName &&
        Array.isArray(album?.artists) &&
        album.artists.some(
          (artist) => normalizeText(artist?.name) === normalizedArtistName
        )
    ) ||
    albums.find((album) => normalizeText(album?.name) === normalizedAlbumName) ||
    albums.find(
      (album) =>
        Array.isArray(album?.artists) &&
        album.artists.some(
          (artist) => normalizeText(artist?.name) === normalizedArtistName
        )
    ) ||
    albums[0]
  );
};

const resolveAlbumFromReviewRecord = async (review) => {
  if (review?.albumData?.id) {
    return review.albumData;
  }

  const spotifyIdCandidates = [
    review?.spotifyAlbumId,
    isLikelySpotifyId(review?.albumID) ? review.albumID : null,
  ].filter(Boolean);

  for (const spotifyAlbumId of spotifyIdCandidates) {
    try {
      const album = await getAlbum(spotifyAlbumId);
      if (album?.id) {
        return album;
      }
    } catch (error) {
      console.error("Review album lookup error:", error);
    }
  }

  const albumName = review?.albumName || review?.albumTitleSnapshot;
  const artistName = review?.artistName || review?.artistNameSnapshot;

  if (!albumName) {
    return null;
  }

  try {
    const matches = await getAlbumsByName(albumName, 0, 10);
    return findBestAlbumMatch(matches, albumName, artistName);
  } catch (error) {
    console.error("Review album search fallback error:", error);
    return null;
  }
};

const buildArtistNavigationPayload = (review, albumData, artistData) => {
  if (artistData?.id || artistData?.name) {
    return artistData;
  }

  if (albumData?.artists?.[0]?.id || albumData?.artists?.[0]?.name) {
    return albumData.artists[0];
  }

  const artistName = review?.artistName || review?.artistNameSnapshot;
  if (artistName) {
    return { name: artistName };
  }

  return null;
};

const buildUserNavigationPayload = (review, authorUser) => {
  if (authorUser?.id || authorUser?.oauthId || authorUser?.uid) {
    return authorUser;
  }

  if (review?.userId || review?.userID) {
    return {
      id: review?.userId || review?.userID,
      username: review?.username || null,
    };
  }

  return null;
};

export default function ReviewPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const incomingReview = route.params?.review || route.params || {};

  const [reviewData, setReviewData] = useState(incomingReview);
  const [albumData, setAlbumData] = useState(incomingReview?.albumData || null);
  const [artistData, setArtistData] = useState(null);
  const [authorUser, setAuthorUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [albumActionLoading, setAlbumActionLoading] = useState(false);
  const [artistActionLoading, setArtistActionLoading] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(false);

  useEffect(() => {
    setReviewData(incomingReview);
    setAlbumData(incomingReview?.albumData || null);
    setArtistData(null);
    setAuthorUser(null);
  }, [incomingReview]);

  useEffect(() => {
    let mounted = true;

    const hydrateReviewPage = async () => {
      setPageLoading(true);

      const nextReview = incomingReview || {};
      const authorPromise =
        nextReview?.userId || nextReview?.userID
          ? getUserByIdentifier(nextReview.userId || nextReview.userID)
          : Promise.resolve(null);

      let resolvedAlbum = nextReview?.albumData || null;
      if (!resolvedAlbum?.id) {
        resolvedAlbum = await resolveAlbumFromReviewRecord(nextReview);
      }

      let resolvedArtist = null;
      const primaryArtistId =
        resolvedAlbum?.artists?.[0]?.id || nextReview?.primaryArtistId || null;
      const reviewArtistName =
        nextReview?.artistName || nextReview?.artistNameSnapshot || "";

      try {
        if (primaryArtistId) {
          resolvedArtist = await getArtistById(primaryArtistId);
        } else if (reviewArtistName) {
          resolvedArtist = await getArtistByName(reviewArtistName);
        }
      } catch (error) {
        console.error("Review artist lookup error:", error);
      }

      const resolvedAuthor = await authorPromise;

      if (!mounted) {
        return;
      }

      setAlbumData(resolvedAlbum || null);
      setArtistData(resolvedArtist || null);
      setAuthorUser(resolvedAuthor || null);
      setPageLoading(false);
    };

    hydrateReviewPage();

    return () => {
      mounted = false;
    };
  }, [incomingReview]);

  const rawAlbumTitle = reviewData?.albumName || reviewData?.albumTitleSnapshot || "";
  const rawArtistName = reviewData?.artistName || reviewData?.artistNameSnapshot || "";
  const reviewTitle = rawAlbumTitle || "Unknown Album";
  const reviewArtistName = rawArtistName || "Unknown Artist";
  const reviewBody = reviewData?.reviewBody || reviewData?.body || "";
  const reviewHeadline = reviewData?.headline || "";
  const reviewUsername =
    reviewData?.username || authorUser?.username || authorUser?.displayName || "Unknown user";
  const albumCoverUri =
    reviewData?.albumCover ||
    reviewData?.coverUrlSnapshot ||
    albumData?.images?.[0]?.url ||
    null;
  const formattedDate = formatReviewDate(
    reviewData?.createdAt || reviewData?.date || reviewData?.listenedOn
  );
  const ratingLabel = formatRatingValue(reviewData);
  const artistNavigationPayload = buildArtistNavigationPayload(
    reviewData,
    albumData,
    artistData
  );
  const userNavigationPayload = buildUserNavigationPayload(reviewData, authorUser);
  const canResolveAlbum = Boolean(
    albumData?.id ||
      reviewData?.albumData?.id ||
      reviewData?.spotifyAlbumId ||
      isLikelySpotifyId(reviewData?.albumID) ||
      rawAlbumTitle
  );

  const handleOpenAlbum = async () => {
    if (albumActionLoading || !canResolveAlbum) {
      return;
    }

    setAlbumActionLoading(true);

    try {
      const resolvedAlbum =
        albumData?.id ? albumData : await resolveAlbumFromReviewRecord(reviewData);

      if (!resolvedAlbum?.id) {
        Alert.alert("Album unavailable", "We could not load that album right now.");
        return;
      }

      setAlbumData(resolvedAlbum);
      navigation.push("AlbumPage", {
        album: resolvedAlbum,
        key: Math.round(Math.random() * 10000000),
      });
    } catch (error) {
      console.error("Review album navigation error:", error);
      Alert.alert("Album unavailable", "We could not open that album right now.");
    } finally {
      setAlbumActionLoading(false);
    }
  };

  const handleOpenArtist = async () => {
    if (artistActionLoading) {
      return;
    }

    setArtistActionLoading(true);

    try {
      let nextArtist = artistNavigationPayload;

      if (!nextArtist?.id && !nextArtist?.name) {
        const reviewArtist = rawArtistName || "";
        if (reviewArtist) {
          nextArtist = await getArtistByName(reviewArtist);
        }
      }

      if (!nextArtist?.id && !nextArtist?.name) {
        Alert.alert("Artist unavailable", "We could not load that artist right now.");
        return;
      }

      if (nextArtist?.id || nextArtist?.name) {
        setArtistData(nextArtist);
      }

      navigation.push("ArtistPage", {
        artist: nextArtist,
        key: Math.round(Math.random() * 10000000),
      });
    } catch (error) {
      console.error("Review artist navigation error:", error);
      Alert.alert("Artist unavailable", "We could not open that artist right now.");
    } finally {
      setArtistActionLoading(false);
    }
  };

  const handleOpenUser = async () => {
    if (userActionLoading) {
      return;
    }

    setUserActionLoading(true);

    try {
      let nextUser = userNavigationPayload;

      if (!nextUser?.id && reviewData?.userId) {
        nextUser = await getUserByIdentifier(reviewData.userId);
      }

      if (!nextUser?.id && !nextUser?.oauthId && !nextUser?.uid) {
        Alert.alert("User unavailable", "We could not load that user right now.");
        return;
      }

      if (nextUser?.id) {
        setAuthorUser(nextUser);
      }

      navigation.push("UserPage", {
        user: nextUser,
        key: Math.round(Math.random() * 10000000),
      });
    } catch (error) {
      console.error("Review user navigation error:", error);
      Alert.alert("User unavailable", "We could not open that profile right now.");
    } finally {
      setUserActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{reviewTitle}</Text>
        </View>

        <View style={styles.albumCoverContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={albumActionLoading || !canResolveAlbum}
            onPress={handleOpenAlbum}
          >
            {albumCoverUri ? (
              <Image source={{ uri: albumCoverUri }} style={styles.albumCover} />
            ) : (
              <View style={[styles.albumCover, styles.albumCoverFallback]}>
                {albumActionLoading ? (
                  <ActivityIndicator size="small" color="#111827" />
                ) : (
                  <Ionicons name="disc-outline" size={34} color="#6b7280" />
                )}
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.rating}>{ratingLabel}</Text>
        </View>

        <View style={styles.albumInfo}>
          <Text style={styles.albumName}>{reviewTitle}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenArtist}
            disabled={artistActionLoading}
          >
            <Text style={styles.artistName}>{reviewArtistName}</Text>
          </TouchableOpacity>
        </View>

        {reviewHeadline ? <Text style={styles.reviewHeadline}>{reviewHeadline}</Text> : null}
        <Text style={styles.reviewBody}>
          {reviewBody ? `"${reviewBody}"` : "No written review was added for this entry."}
        </Text>
        <Text style={styles.metaText}>Reviewed by {reviewUsername}</Text>
        <Text style={styles.metaText}>{formattedDate}</Text>

        <View style={styles.actionsSection}>
          <Text style={styles.actionsLabel}>Go to</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={artistActionLoading}
              onPress={handleOpenArtist}
              style={[styles.actionButton, artistActionLoading && styles.actionButtonDisabled]}
            >
              {artistActionLoading ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <Ionicons name="person-outline" size={20} color="#111827" />
              )}
              <Text style={styles.actionButtonText}>Artist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={userActionLoading}
              onPress={handleOpenUser}
              style={[styles.actionButton, userActionLoading && styles.actionButtonDisabled]}
            >
              {userActionLoading ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <Ionicons name="person-circle-outline" size={20} color="#111827" />
              )}
              <Text style={styles.actionButtonText}>User</Text>
            </TouchableOpacity>
          </View>
        </View>

        {pageLoading ? <ActivityIndicator style={styles.pageLoader} size="small" color="#111827" /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: "#ffffff",
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginLeft: 8,
  },
  albumCoverContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  albumCover: {
    width: 200,
    height: 200,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  albumCoverFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  rating: {
    fontSize: 40,
    marginTop: 4,
    paddingLeft: 10,
    color: "#111827",
    fontWeight: "500",
  },
  albumInfo: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  albumName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },
  artistName: {
    fontSize: 18,
    color: "#666",
    marginTop: 2,
  },
  reviewHeadline: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
  },
  reviewBody: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
    color: "#374151",
  },
  metaText: {
    fontSize: 16,
    marginVertical: 8,
    fontStyle: "italic",
    color: "#374151",
  },
  actionsSection: {
    marginTop: 12,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  actionsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  pageLoader: {
    marginTop: 16,
  },
});
