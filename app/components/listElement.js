import { Image, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { getUsernameByUID } from "../api/UserAPI";
import { getAlbumCover } from "../api/SpotifyAPI";

const PREVIEW_LIMIT = 4;

export default function ListElement({ list }) {
  const [username, setUsername] = useState("");
  const [albumCovers, setAlbumCovers] = useState([]);

  const previewAlbumIds = useMemo(
    () =>
      Array.isArray(list?.albumList)
        ? list.albumList.filter(Boolean).slice(0, PREVIEW_LIMIT)
        : [],
    [list?.albumList]
  );
  const previewAlbumIdsKey = previewAlbumIds.join("|");

  const itemCount = useMemo(() => {
    if (typeof list?.itemsCount === "number") {
      return list.itemsCount;
    }

    if (Array.isArray(list?.albumList)) {
      return list.albumList.length;
    }

    return 0;
  }, [list?.albumList, list?.itemsCount]);

  const likesCount = Number(list?.likesCount || list?.likes || 0);
  const previewTiles = useMemo(
    () =>
      Array.from({ length: PREVIEW_LIMIT }, (_, index) => ({
        key: `preview-${list?.id || list?.slug || "list"}-${index}`,
        coverUrl: albumCovers[index] || null,
      })),
    [albumCovers, list?.id, list?.slug]
  );

  useEffect(() => {
    let mounted = true;

    const fetchAlbumCovers = async () => {
      if (previewAlbumIds.length === 0) {
        if (mounted) {
          setAlbumCovers([]);
        }
        return;
      }

      const coverResults = await Promise.allSettled(
        previewAlbumIds.map((albumId) => getAlbumCover(albumId))
      );

      if (!mounted) {
        return;
      }

      setAlbumCovers(
        coverResults.map((result) =>
          result.status === "fulfilled" ? result.value : null
        )
      );
    };

    const fetchUsername = async () => {
      if (!list?.uid && !list?.ownerId) {
        if (mounted) {
          setUsername("");
        }
        return;
      }

      const resolvedUsername = await getUsernameByUID(list.uid || list.ownerId);
      if (mounted) {
        setUsername(resolvedUsername || "");
      }
    };

    fetchUsername();
    fetchAlbumCovers();

    return () => {
      mounted = false;
    };
  }, [list?.ownerId, list?.uid, previewAlbumIdsKey]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {list?.listName || list?.title || "Untitled List"}
          </Text>
          <Text style={styles.creator} numberOfLines={1}>
            {username ? `@${username}` : "Unknown creator"}
          </Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillText}>
            {itemCount} album{itemCount === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <View style={styles.previewRow}>
        {previewTiles.map((tile, index) =>
          tile.coverUrl ? (
            <Image key={tile.key} source={{ uri: tile.coverUrl }} style={styles.previewTile} />
          ) : (
            <View
              key={tile.key}
              style={[
                styles.previewTile,
                index < previewAlbumIds.length
                  ? styles.previewFallbackFilled
                  : styles.previewFallbackEmpty,
              ]}
            >
              <Text style={styles.previewFallbackText}>
                {index < previewAlbumIds.length ? "NO COVER" : ""}
              </Text>
            </View>
          )
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {likesCount} like{likesCount === 1 ? "" : "s"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eceff3",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  creator: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  previewRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  previewTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  previewFallbackFilled: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
  },
  previewFallbackEmpty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  previewFallbackText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: "#6b7280",
  },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
});
