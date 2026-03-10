import {
  View,
  Text,
  StyleSheet,
  Image,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { getUsernameByUID } from "../api/UserAPI";
import { getAlbumCover } from "../api/SpotifyAPI";

export default function ListElement({ list }) {
  const [username, setUsername] = useState();
  const [albumCovers, setAlbumCovers] = useState([]);
  const previewAlbumIds = useMemo(
    () => (Array.isArray(list?.albumList) ? list.albumList.slice(0, 4) : []),
    [list?.albumList]
  );
  const previewAlbumIdsKey = previewAlbumIds.join("|");

  useEffect(() => {
    const fetchAlbumCovers = async () => {
      if (previewAlbumIds.length === 0) {
        setAlbumCovers([]);
        return;
      }

      const coverResults = await Promise.allSettled(
        previewAlbumIds.map((album) => getAlbumCover(album))
      );
      const covers = coverResults.map((result) =>
        result.status === "fulfilled" ? result.value : null
      );
      setAlbumCovers(covers);
    };
    if (list?.uid || list?.ownerId) {
      getUsernameByUID(list.uid || list.ownerId).then((resolvedUsername) => {
        setUsername(resolvedUsername);
      });
    }
    fetchAlbumCovers();
  }, [list, previewAlbumIdsKey]);

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{list.listName}</Text>
        <Text style={styles.artist}>{username}</Text>
      </View>
      <View style={styles.imageListContainer}>
        {previewAlbumIds.length === 0 ? (
          <View style={styles.emptyPreviewCard}>
            <Text style={styles.emptyPreviewText}>No albums yet</Text>
          </View>
        ) : (
          albumCovers.map((url, index) =>
            url ? (
              <Image key={index} source={{ uri: url }} style={styles.image} />
            ) : (
              <View key={index} style={[styles.image, styles.imageFallback]}>
                <Text style={styles.imageFallbackText}>NO COVER</Text>
              </View>
            )
          )
        )}
      </View>
      <View style={styles.reviewData}>
        <View style={styles.columnContainer}>
          <Text style={styles.artist}>{username}</Text>
          {/* <Text style={styles.artist}>{username}</Text> */}
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    gap: 5,
    marginBottom: 5,
    borderRadius: 10,
    borderCurve: "continuous",
    padding: 10,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderWidth: 0.5,
    borderBottomColor: "gray",
    shadowColor: "#000",
  },
  image: {
    width: 100,
    height: 100,
    padding: 5,
    borderRadius: 2,
  },
  imageFallback: {
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  imageFallbackText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6b7280",
  },
  card: {
    margin: 0,
    borderRadius: 10,
    overflow: "hidden",
    width: "100%",
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "black",
    padding: 0,
  },
  content: {
    padding: 0,
    gap: 5,
    borderBottomWidth: 0.5,
  },
  cardContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  cover: {
    height: 125,
    width: 125,
    backgroundColor: "transparent",
    borderRadius: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 8,
  },
  artist: {
    fontSize: 16,
    color: "#666",
  },
  ratingContainer: {
    flexDirection: "row",
    marginTop: 0,
  },
  review: {
    marginTop: 10,
    fontSize: 14,
    color: "#444",
  },
  columnContainer: {
    flexDirection: "column",
    paddingHorizontal: 10,
  },
  reviewData: {
    flexDirection: "row",
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
  imageListContainer: {
    flex: 1,
    flexDirection: "row",
  },
  emptyPreviewCard: {
    width: "100%",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  emptyPreviewText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
