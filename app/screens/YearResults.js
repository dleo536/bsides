import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import { searchAlbumsByYear } from "../api/SpotifyAPI";

const PAGE_SIZE = 24;

const byReleaseDateDesc = (a, b) => {
  const aTime = a?.releaseDate ? Date.parse(a.releaseDate) : NaN;
  const bTime = b?.releaseDate ? Date.parse(b.releaseDate) : NaN;

  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return bTime - aTime;
};

const YearResults = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const year = route?.params?.year || new Date().getFullYear().toString();

  const [albums, setAlbums] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: year });
  }, [navigation, year]);

  const fetchAlbums = useCallback(
    async (nextOffset = 0, reset = false) => {
      if ((loading || !hasMore) && !reset) return;

      setLoading(true);
      setError(null);
      try {
        const response = await searchAlbumsByYear(year, {
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        const items = Array.isArray(response?.items) ? response.items : [];
        const merged = reset ? items : [...albums, ...items];
        merged.sort(byReleaseDateDesc);

        setAlbums(merged);
        setOffset(response?.nextOffset ?? nextOffset + items.length);
        setHasMore(Boolean(response?.hasMore));
      } catch (fetchError) {
        console.error("YearResults fetch error:", fetchError);
        setError("Could not load albums for this year.");
      } finally {
        setLoading(false);
      }
    },
    [albums, hasMore, loading, year]
  );

  useEffect(() => {
    setAlbums([]);
    setOffset(0);
    setHasMore(true);
    fetchAlbums(0, true);
  }, [year]);

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchAlbums(0, true).finally(() => setRefreshing(false));
  };

  const onRetry = () => {
    setHasMore(true);
    fetchAlbums(offset, albums.length === 0);
  };

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.albumRow}
        onPress={() => navigation.push("AlbumPage", { album: item.spotifyAlbum })}
      >
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText}>NO COVER</Text>
          </View>
        )}
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {item.artistSubtitle}
          </Text>
          <Text style={styles.releaseDate}>
            {item.releaseDate || "Unknown release date"}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  );

  const emptyState = useMemo(() => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyText}>No albums found for {year}.</Text>
      </View>
    );
  }, [error, loading, onRetry, year]);

  return (
    <View style={styles.container}>
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => fetchAlbums(offset, false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && albums.length > 0 ? <ActivityIndicator /> : null}
        ListEmptyComponent={emptyState}
      />
      {loading && albums.length === 0 ? (
        <View style={styles.initialLoader}>
          <ActivityIndicator />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  albumRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ececec",
    paddingVertical: 10,
  },
  cover: {
    width: 82,
    height: 82,
    borderRadius: 0,
    backgroundColor: "#d9d9d9",
  },
  coverPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  coverPlaceholderText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4f4f4f",
  },
  meta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  artist: {
    marginTop: 2,
    color: "#555",
    fontSize: 13,
  },
  releaseDate: {
    marginTop: 6,
    color: "#7a7a7a",
    fontSize: 12,
  },
  centerState: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#555",
  },
  errorText: {
    color: "#cc0000",
    marginBottom: 10,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  retryText: {
    fontWeight: "600",
    color: "#111",
  },
  initialLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default YearResults;
