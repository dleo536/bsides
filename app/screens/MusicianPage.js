import React, { useEffect, useState } from "react";
import {
  getAlbum,
  getAlbumsByName,
  getArtistPhotoByAlbum,
} from "../api/SpotifyAPI";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  FlatList,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { auth } from "../config/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { postReview } from "../api/ReviewAPI";
import { Review } from "../logic/Review";
import { getListByUID, patchAlbumList } from "../api/ListAPI";
import { List } from "../logic/List";
import { getAlbumsMixedBy } from "../api/MusicBrainz";
import { getMusicianMixedCredits } from "../api/Discogs";
import { getAlbumList } from "../api/SpotifyAPI";
const AlbumPage = (route) => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const newRoute = useRoute(); // Get route object
  // console.log("Route Params:", newRoute.params); // Debugging log
  const { musician } = newRoute.params; // Correctly destructure the album parameter
  const [musicianData, setMusicianData] = useState(musician || {}); // Initialize state with passed album
  const navigation = useNavigation();
  const [artistPhoto, setArtistPhoto] = useState();
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [rating, setRating] = useState(false);
  const [description, setDescription] = useState(false);
  const [listReturned, setListReturned] = useState();
  const [selectedIds, setSelectedIds] = useState([]);
  const [albums, setAlbums] = useState([]);
  let newPhoto;

  useEffect(() => {
    const fetchAlbums = async () => {
      const albums = await getMusicianMixedCredits(musicianData.artist.name);
      const uniqueAlbums = getUniqueAlbumsByTitle(albums);
      const albumsProcessed = await albumProcessing(uniqueAlbums);

      setAlbums(albumsProcessed);
    };
    fetchAlbums();
  }, []);
  async function albumProcessing(albums) {
    console.log("------------albums: ", albums);
    const albumsProcessed = await Promise.all(
      albums.map(async (album) => {
        const albumData = await getAlbumsByName(album.title);

        return albumData[0];
      })
    );

    return albumsProcessed;
  }
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  function getUniqueAlbumsByTitle(albums) {
    try {
      const results = albums || [];

      // Deduplicate based on title
      const seenTitles = new Set();
      const uniqueAlbums = [];

      for (const album of results) {
        if (!seenTitles.has(album.title)) {
          seenTitles.add(album.title);
          uniqueAlbums.push(album);
        }
      }

      return uniqueAlbums;
    } catch (error) {
      console.error("Error fetching or processing data:", error);
    }
  }

  return (
    <View style={styles.container}>
      <Text>Musician Page</Text>
      <Text>{musicianData.artist.name}</Text>
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.push("AlbumPage", {
                album: item,
                key: Math.round(Math.random() * 10000000),
              })
            }
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingLeft: 20,
    // paddingTop: 20,
    //flexDirection: "row",
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 3,
  },
  gradient: {
    padding: 0,
    position: "absolute",
  },
  pageData: {
    zIndex: 3,
    paddingTop: "50%",
    flexDirection: "row",
  },

  columnContainer: {
    flexDirection: "column",
    paddingHorizontal: 20,
    paddingVertical: 20,
    height: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  button: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderBottomWidth: 1,
    borderBottomColor: "purple",
    borderTopColor: "black",
  },
  buttonText: {},
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 40,

    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 40,
    width: 300,
    background:
      "linear-gradient(to right, rgba(255, 255, 255, 1), rgba(0, 0, 255, 0))",
  },
  listPreview: {
    flexGrow: 0,
    padding: 10,
  },
  selectedItem: {
    backgroundColor: "grey",
  },
  itemText: {
    fontSize: 16,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRadius: 2,
  },
});

export default AlbumPage;
