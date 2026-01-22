import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { Card, Title, Paragraph, IconButton } from "react-native-paper";

export default function ReviewElement({ review }) {
  return (
    <View style={styles.container}>
      <Text style={styles.username}>{review.username}</Text>

      {/* Album + Review Info */}
      <View style={styles.reviewRow}>
        <Image source={{ uri: review.albumCover }} style={styles.albumCover} />

        <View style={styles.reviewContent}>
          {/* Album Name and Artist */}
          <Text style={styles.albumName}>{review.albumName}</Text>
          <Text style={styles.artistName}>{review.artistName}</Text>

          {/* Rating */}
          <Text style={styles.rating}>{review.rating}/10</Text>

          {/* Review Body */}
          {review.reviewBody && (
            <Text numberOfLines={4} style={styles.reviewBody}>
              {review.reviewBody}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "white",
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    marginBottom: 8,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  albumCover: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: "#ddd",
    marginRight: 16,
  },
  reviewContent: {
    flex: 1,
    flexDirection: "column",
  },
  albumName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
  },
  artistName: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  rating: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  reviewBody: {
    fontSize: 14,
    color: "#555",
    marginTop: 8,
    lineHeight: 20,
  },
});
