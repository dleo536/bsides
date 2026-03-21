import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ReviewElement from "../components/reviewElement";
import { getReviewsByAlbum } from "../api/ReviewAPI";
import { searchReleaseGroup } from "../api/MusicBrainz";

const PAGE_SIZE = 20;

const AlbumReviewsPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const album = route.params?.album || null;
  const albumId = route.params?.albumId || album?.id || null;
  const coverUrl = album?.images?.[0]?.url || null;
  const artistName = album?.artists?.[0]?.name || "Unknown Artist";

  const [reviews, setReviews] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const releaseGroupMbIdRef = useRef(route.params?.releaseGroupMbId || null);

  const resolveReleaseGroupId = useCallback(async () => {
    if (releaseGroupMbIdRef.current) {
      return releaseGroupMbIdRef.current;
    }

    if (!album?.name || !album?.artists?.[0]?.name) {
      return null;
    }

    try {
      const result = await searchReleaseGroup(album.name, album.artists[0].name);
      const nextReleaseGroupMbId = result?.id || null;
      if (nextReleaseGroupMbId) {
        releaseGroupMbIdRef.current = nextReleaseGroupMbId;
      }
      return nextReleaseGroupMbId;
    } catch (lookupError) {
      console.error("Release group lookup error:", lookupError);
      return null;
    }
  }, [album?.artists, album?.name]);

  const loadInitialReviews = useCallback(async () => {
    if (!albumId && !releaseGroupMbIdRef.current) {
      setReviews([]);
      setOffset(0);
      setHasMore(false);
      setTotalCount(0);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextReleaseGroupMbId = await resolveReleaseGroupId();
      const response = await getReviewsByAlbum(
        {
          spotifyAlbumId: albumId,
          releaseGroupMbId: nextReleaseGroupMbId || releaseGroupMbIdRef.current,
        },
        {
          offset: 0,
          limit: PAGE_SIZE,
        }
      );
      const nextData = Array.isArray(response?.data) ? response.data : [];

      setReviews(nextData);
      setOffset(nextData.length);
      setHasMore(Boolean(response?.hasMore));
      setTotalCount(Number(response?.totalCount || 0));
    } catch (fetchError) {
      console.error("Album reviews fetch error:", fetchError);
      setReviews([]);
      setOffset(0);
      setHasMore(false);
      setTotalCount(0);
      setError("Could not load reviews for this album.");
    } finally {
      setLoading(false);
    }
  }, [albumId, resolveReleaseGroupId]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: "Reviews" });
      loadInitialReviews();
    }, [loadInitialReviews, navigation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitialReviews().finally(() => setRefreshing(false));
  }, [loadInitialReviews]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || (!albumId && !releaseGroupMbIdRef.current)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextReleaseGroupMbId = await resolveReleaseGroupId();
      const response = await getReviewsByAlbum(
        {
          spotifyAlbumId: albumId,
          releaseGroupMbId: nextReleaseGroupMbId || releaseGroupMbIdRef.current,
        },
        {
          offset,
          limit: PAGE_SIZE,
        }
      );
      const nextData = Array.isArray(response?.data) ? response.data : [];

      setReviews((prev) => [...prev, ...nextData]);
      setOffset((currentOffset) => currentOffset + nextData.length);
      setHasMore(Boolean(response?.hasMore));
      setTotalCount(Number(response?.totalCount || 0));
    } catch (fetchError) {
      console.error("Album reviews pagination error:", fetchError);
      setHasMore(false);
      setError("Could not load more reviews for this album.");
    } finally {
      setLoading(false);
    }
  }, [albumId, hasMore, loading, offset, resolveReleaseGroupId]);

  const renderHeader = () => (
    <View style={styles.headerCard}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.coverImage} />
      ) : (
        <View style={[styles.coverImage, styles.coverFallback]}>
          <Text style={styles.coverFallbackText}>
            {(album?.name || "A").slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.headerMeta}>
        <Text style={styles.kicker}>Reviews</Text>
        <Text style={styles.title} numberOfLines={2}>
          {album?.name || "Unknown Album"}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {artistName}
        </Text>
      </View>
      <View style={styles.countPill}>
        <Text style={styles.countPillText}>
          {totalCount} review{totalCount === 1 ? "" : "s"}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {error ? "Could not load reviews." : "No reviews for this album yet."}
      </Text>
      <Text style={styles.emptyBody}>
        {error
          ? "Pull to refresh and try again."
          : "Once someone reviews this album, it will show up here."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading && !refreshing && reviews.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item, index) =>
            item?.id?.toString?.() || `album-review-${item?.releaseGroupMbId || index}`
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.push("ReviewPage", { review: item })}>
              <ReviewElement review={item} />
            </TouchableOpacity>
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            loading && reviews.length > 0 ? <ActivityIndicator style={styles.footerLoader} /> : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={
            reviews.length === 0 ? styles.emptyContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 28,
  },
  emptyContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  coverImage: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: "#d1d5db",
  },
  coverFallback: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  coverFallbackText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#374151",
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#6b7280",
  },
  title: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  countPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
  },
  footerLoader: {
    marginVertical: 18,
  },
});

export default AlbumReviewsPage;
