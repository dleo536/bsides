import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { getAlbum } from "../api/SpotifyAPI";
import { getArtistByName } from "../api/SpotifyAPI";

export default function ReviewPage(route) {
  const navigation = useNavigation();
  const newRoute = useRoute();
  const review = newRoute.params;
  const [reviewData, setReviewData] = useState(review.review || {});
  const [albumData, setAlbumData] = useState(null);
  const [artistData, setArtistData] = useState(null);
  const date = new Date(reviewData.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  console.log("reviewData", reviewData);
  useEffect(() => {
    const fetchAlbum = async () => {
      const album = await getAlbum(reviewData.albumID);
      console.log("album", album);
      console.log("artist", reviewData.artistName);
      setAlbumData(album);
    };
    const fetchArtist = async () => {
      const artist = await getArtistByName(reviewData.artistName);
      console.log("artist", artist);
      setArtistData(artist);
    };
    fetchAlbum();
    fetchArtist();
  }, [reviewData]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{reviewData.albumName}</Text>
      </View>
      <View style={styles.albumCoverContainer}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("AlbumPage", {
              album: albumData,
            })
          }
        >
          <Image
            source={{ uri: reviewData.albumCover }}
            style={styles.albumCover}
          />
        </TouchableOpacity>
        <Text style={styles.rating}>{reviewData.rating}/10</Text>
      </View>

      <View style={styles.albumInfo}>
        <Text style={styles.albumName}>{reviewData.albumName}</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ArtistPage", {
              artist: artistData,
            })
          }
        >
          <Text style={styles.artistName}>{reviewData.artistName}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.reviewBody}>"{reviewData.reviewBody}"</Text>
      <Text style={styles.username}>Reviewed by {reviewData.username}</Text>
      <Text style={styles.username}>{formattedDate}</Text>
      <Text style={styles.reviewLikes}>Other reviews by this user</Text>

      {/* <View style={styles.actions}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("AlbumPage", {
              album: albumData,
            })
          }
        >
          <Text style={styles.link}>View Album</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ArtistPage", {
              artist: artistData,
            })
          }
        >
          <Text style={styles.link}>View Artist</Text>
        </TouchableOpacity>
      </View> */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: "#fff",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
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
    marginBottom: 16,
  },
  albumInfo: {
    marginBottom: 16,
    borderTopWidth: 1,
    borderColor: "#ccc",
    paddingTop: 16,
  },
  albumName: {
    fontSize: 22,
    fontWeight: "bold",
  },
  artistName: {
    fontSize: 18,
    color: "#666",
  },
  rating: {
    fontSize: 40,
    marginTop: 4,
    paddingLeft: 10,
  },
  username: {
    fontSize: 16,
    marginVertical: 8,
    fontStyle: "italic",
  },
  reviewBody: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
  },
  link: {
    color: "#007AFF",
    fontWeight: "bold",
  },
});
