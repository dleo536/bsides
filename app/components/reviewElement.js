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
    <View style={styles.content}>
      <Text style={styles.title}>{review.username}</Text>
      <View style={styles.reviewData}>
        <Image source={{ uri: review.albumCover }} style={styles.cover} />
        <View style={styles.columnContainer}>
          <Text style={styles.title}>{review.albumName}</Text>
          <Text style={styles.artist}>{review.artistName}</Text>
          <Text style={styles.artist}>{review.rating}/10</Text>
          <Text style={styles.reviewBody}>{review.reviewBody}</Text>
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
    width: "100%",
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
    flexWrap: "wrap",
  },
  reviewBody: {
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
    width: "70%",
  },
  reviewData: {
    flexDirection: "row",
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
});
