import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { getAlbumCover } from "../api/SpotifyAPI";

const windowWidth = Dimensions.get("window").width;

export default function ListPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const list = route.params?.list; // This should be an instance of your `List` class
  const [albumCovers, setAlbumCovers] = useState([]);
  if (!list) return <Text>Loading...</Text>;

  const formattedDate = new Date(list.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const fetchAlbumCovers = async () => {
      const albumCovers = await Promise.all(
        list.albumList.map((album) => getAlbumCover(album))
      );
      setAlbumCovers(albumCovers);
    };
    fetchAlbumCovers();
  }, [list]);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{list.listName}</Text>
      </View>

      {/* Metadata */}
      <Text style={styles.description}>{list.listDescription}</Text>
      <Text style={styles.creator}>By user ID: {list.userID}</Text>
      <Text style={styles.date}>{formattedDate}</Text>

      {/* Album Grid */}
      <View style={styles.albumGrid}>
        {list.albumList.map((album, index) => (
          <TouchableOpacity
            key={index}
            onPress={() =>
              navigation.navigate("AlbumPage", {
                album: album, // pass full object for AlbumPage to use
              })
            }
            style={styles.albumTile}
          >
            <Image
              source={{ uri: album.albumCover }}
              style={styles.albumCover}
            />
            <View style={styles.overlay}>
              <Text style={styles.albumTitle} numberOfLines={1}>
                {album.albumName}
              </Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {album.artistName}
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
    padding: 16,
    paddingBottom: 80,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  creator: {
    fontSize: 14,
    color: "#999",
  },
  date: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 16,
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  albumTile: {
    width: (windowWidth - 48) / 2, // two-column layout
    marginBottom: 16,
    position: "relative",
  },
  albumCover: {
    width: "100%",
    height: (windowWidth - 48) / 2,
    borderRadius: 8,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: "100%",
    padding: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  albumTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  artistName: {
    color: "#ccc",
    fontSize: 12,
  },
});
