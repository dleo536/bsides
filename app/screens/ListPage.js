import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../config/firebase";
import { getAlbum } from "../api/SpotifyAPI";
import {
  getListById,
  getListLikeState,
  likeList,
  unlikeList,
} from "../api/ListAPI";
import { getUsernameByUID } from "../api/UserAPI";

const windowWidth = Dimensions.get("window").width;
const GRID_GAP = 10;
const GRID_PADDING = 16;
const TILE_WIDTH = (windowWidth - GRID_PADDING * 2 - GRID_GAP * 3) / 4;

const toAlbumEntry = (albumId, albumData) => {
  const artistNames =
    Array.isArray(albumData?.artists) && albumData.artists.length > 0
      ? albumData.artists.map((artist) => artist?.name).filter(Boolean).join(", ")
      : "Unknown Artist";

  return {
    id: albumData?.id || albumId,
    spotifyId: albumId,
    albumData: albumData || null,
    title: albumData?.name || "Album unavailable",
    artistNames,
    coverUrl: albumData?.images?.[0]?.url || null,
  };
};

export default function ListPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialList = route.params?.list;
  const [listData, setListData] = useState(initialList || null);
  const [albumEntries, setAlbumEntries] = useState([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [creatorName, setCreatorName] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const currentUid = auth?.currentUser?.uid || null;
  const listId = listData?.id || initialList?.id || null;
  const albumIds = Array.isArray(listData?.albumList) ? listData.albumList : [];
  const albumIdsKey = useMemo(() => albumIds.join("|"), [albumIds]);

  const formattedDate = useMemo(() => {
    const sourceDate = listData?.date || listData?.createdAt;
    if (!sourceDate) {
      return "";
    }

    const parsedDate = new Date(sourceDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    return parsedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [listData?.createdAt, listData?.date]);

  const refreshListData = useCallback(async () => {
    if (!listId) {
      return null;
    }

    const latestList = await getListById(listId);
    if (latestList) {
      setListData(latestList);
      return latestList;
    }

    return null;
  }, [listId]);

  useEffect(() => {
    refreshListData();
  }, [refreshListData]);

  useEffect(() => {
    if (!listData?.ownerId && !listData?.userID) {
      setCreatorName("");
      return;
    }

    let mounted = true;
    const loadCreator = async () => {
      const username = await getUsernameByUID(listData?.ownerId || listData?.userID);
      if (mounted) {
        setCreatorName(username || "");
      }
    };

    loadCreator();

    return () => {
      mounted = false;
    };
  }, [listData?.ownerId, listData?.userID]);

  useEffect(() => {
    if (!currentUid || !listId) {
      setIsLiked(false);
      return;
    }

    let mounted = true;
    const loadLikeState = async () => {
      try {
        const response = await getListLikeState(currentUid, listId);
        if (mounted) {
          setIsLiked(Boolean(response?.liked));
          if (typeof response?.likesCount === "number") {
            setListData((currentList) =>
              currentList
                ? {
                    ...currentList,
                    likesCount: response.likesCount,
                  }
                : currentList
            );
          }
        }
      } catch (error) {
        console.error("List like state error:", error);
      }
    };

    loadLikeState();

    return () => {
      mounted = false;
    };
  }, [currentUid, listId]);

  useEffect(() => {
    let mounted = true;

    const hydrateAlbums = async () => {
      if (albumIds.length === 0) {
        if (mounted) {
          setAlbumEntries([]);
          setAlbumsLoading(false);
        }
        return;
      }

      setAlbumsLoading(true);

      try {
        const results = await Promise.allSettled(albumIds.map((albumId) => getAlbum(albumId)));
        const nextEntries = results.map((result, index) =>
          toAlbumEntry(
            albumIds[index],
            result.status === "fulfilled" ? result.value : null
          )
        );

        if (mounted) {
          setAlbumEntries(nextEntries);
        }
      } finally {
        if (mounted) {
          setAlbumsLoading(false);
        }
      }
    };

    hydrateAlbums();

    return () => {
      mounted = false;
    };
  }, [albumIdsKey, albumIds]);

  const handleLikePress = async () => {
    if (!currentUid) {
      Alert.alert("Sign in required", "Please sign in to like lists.");
      return;
    }
    if (!listId || likeLoading) {
      return;
    }

    setLikeLoading(true);

    try {
      const response = isLiked
        ? await unlikeList(currentUid, listId)
        : await likeList(currentUid, listId);

      setIsLiked(Boolean(response?.liked));
      if (typeof response?.likesCount === "number") {
        setListData((currentList) =>
          currentList
            ? {
                ...currentList,
                likesCount: response.likesCount,
              }
            : currentList
        );
      }
    } catch (error) {
      console.error("List like toggle error:", error);
      Alert.alert("Error", "Could not update the like for this list.");
    } finally {
      setLikeLoading(false);
    }
  };

  if (!listData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.title}>{listData.listName}</Text>
          {creatorName ? <Text style={styles.creator}>By @{creatorName}</Text> : null}
        </View>
        <TouchableOpacity
          onPress={handleLikePress}
          style={styles.likeButton}
          disabled={likeLoading}
        >
          {likeLoading ? (
            <ActivityIndicator size="small" color="#111827" />
          ) : (
            <>
              <Ionicons
                name={isLiked ? "thumbs-up" : "thumbs-up-outline"}
                size={20}
                color={isLiked ? "#2563eb" : "#111827"}
              />
              <Text style={[styles.likeCount, isLiked && styles.likeCountActive]}>
                {Number(listData?.likesCount || 0)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {listData.listDescription ? (
        <Text style={styles.description}>{listData.listDescription}</Text>
      ) : (
        <Text style={styles.descriptionMuted}>No description yet.</Text>
      )}
      {formattedDate ? <Text style={styles.date}>{formattedDate}</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Albums</Text>
        <Text style={styles.sectionMeta}>
          {albumEntries.length || albumIds.length} item
          {(albumEntries.length || albumIds.length) === 1 ? "" : "s"}
        </Text>
      </View>

      {albumsLoading ? (
        <View style={styles.loadingAlbumsRow}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingAlbumsText}>Loading album art...</Text>
        </View>
      ) : null}

      {!albumsLoading && albumEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No albums in this list yet.</Text>
          <Text style={styles.emptyStateBody}>Add albums to the list to see the grid here.</Text>
        </View>
      ) : null}

      <View style={styles.albumGrid}>
        {albumEntries.map((album) => (
          <TouchableOpacity
            key={album.id}
            onPress={() =>
              album.albumData
                ? navigation.navigate("AlbumPage", {
                    album: album.albumData,
                  })
                : null
            }
            disabled={!album.albumData}
            style={styles.albumTile}
            activeOpacity={album.albumData ? 0.86 : 1}
          >
            {album.coverUrl ? (
              <Image source={{ uri: album.coverUrl }} style={styles.albumCover} />
            ) : (
              <View style={[styles.albumCover, styles.albumCoverFallback]}>
                <Text style={styles.albumCoverFallbackText}>
                  {(album.title || "Album").slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.albumMeta}>
              <Text style={styles.albumTitle} numberOfLines={1}>
                {album.title}
              </Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {album.artistNames}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 18,
    paddingBottom: 80,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIconButton: {
    marginRight: 10,
  },
  headerTitleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  creator: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    minWidth: 74,
    justifyContent: "center",
  },
  likeCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  likeCountActive: {
    color: "#2563eb",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
  },
  descriptionMuted: {
    fontSize: 15,
    lineHeight: 22,
    color: "#9ca3af",
  },
  date: {
    marginTop: 8,
    fontSize: 13,
    color: "#9ca3af",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  sectionMeta: {
    fontSize: 13,
    color: "#6b7280",
  },
  loadingAlbumsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  loadingAlbumsText: {
    color: "#6b7280",
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptyStateBody: {
    marginTop: 6,
    color: "#6b7280",
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    columnGap: GRID_GAP,
    rowGap: 18,
  },
  albumTile: {
    width: TILE_WIDTH,
  },
  albumCover: {
    width: "100%",
    height: TILE_WIDTH,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  albumCoverFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  albumCoverFallbackText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4b5563",
  },
  albumMeta: {
    paddingTop: 8,
  },
  albumTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 14,
  },
  artistName: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 10,
  },
});
