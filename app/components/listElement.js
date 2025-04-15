import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Card, Title, Paragraph, IconButton } from "react-native-paper";
import { getUsernameByUID } from "../api/UserAPI";
import { getAlbum, getAlbumCover } from "../api/SpotifyAPI";

export default function ListElement({ list }) {
  const [username, setUsername] = useState();
  const [albumCovers, setAlbumCovers] = useState([]);

  console.log("ListElement album covers uris: ", albumCovers[0]);
  useEffect(() => {
    const fetchAlbumCovers = async () => {
      if (!list?.albumList) return;

      const covers = await Promise.all(
        list.albumList.map((album) => getAlbumCover(album))
      );
      setAlbumCovers(covers);
      console.log("ListElement album covers uris: ", albumCovers[0]);
    };
    getUsernameByUID(list.uid).then((username) => {
      setUsername(username);
    });
    fetchAlbumCovers();
  }, [list]);

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{list.listName}</Text>
        <Text style={styles.artist}>{username}</Text>
      </View>
      <View style={styles.imageListContainer}>
        {albumCovers.map((url, index) => (
          <Image key={index} source={{ uri: url }} style={styles.image} />
        ))}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
