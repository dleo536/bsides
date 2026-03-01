import React, { useEffect, useState } from "react";
import { getAlbum, getArtistPhotoByAlbum } from "../api/SpotifyAPI";
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
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../config/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { postReview } from "../api/ReviewAPI";
import { Review } from "../logic/Review";
import { getListByUID, patchAlbumList } from "../api/ListAPI";
import { List } from "../logic/List";
import { getAlbumsByArtist } from "../api/SpotifyAPI";
import { getDiscogsArtistImage } from "../api/Discogs";
import { getDiscogsArtistBio } from "../api/Discogs";

const ArtistPage = (route) => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;
  const insets = useSafeAreaInsets();

  const newRoute = useRoute(); // Get route object
  // console.log("Route Params:", newRoute.params); // Debugging log
  const { artist } = newRoute.params; // Correctly destructure the album parameter
  const [artistData, setArtistData] = useState(artist || {}); // Initialize state with passed album
  const navigation = useNavigation();
  const [artistPhoto, setArtistPhoto] = useState();
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState(false);
  const [listReturned, setListReturned] = useState();
  const [selectedIds, setSelectedIds] = useState([]);
  const [artistAlbums, setArtistAlbums] = useState([]);
  const [bio, setBio] = useState("");
  const [artistCoverPhoto, setArtistCoverPhoto] = useState();
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const BIO_MAX_LENGTH = 150; // Character limit before showing "See More"
  let newPhoto;

  useEffect(() => {
    getArtistAlbums();
    getArtistBio();
    // getArtistCoverPhoto();
  }, []);

  const getArtistCoverPhoto = async () => {
    const coverPhoto = await getDiscogsArtistImage(artistData.name);
    console.log("coverPhoto", coverPhoto);
    setArtistCoverPhoto(coverPhoto);
  };
  const getArtistAlbums = async () => {
    const albums = await getAlbumsByArtist(artistData.id);
    // console.log("albums", albums);
    setArtistAlbums(albums);
  };
  const getArtistBio = async () => {
    const bio = await getDiscogsArtistBio(artistData.name);
    console.log("bio", bio);
    setBio(bio);
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: "absolute",
            width: windowWidth,
            height: windowHeight / 4,
          }}
        />
        <View style={styles.container}>
          <View style={styles.pageData}>
            {artistData.images && artistData.images.length > 0 && (
              <Image source={artistData.images[0]} style={styles.image} />
            )}
            <View style={styles.columnContainer}>
              <Text style={{ padding: 5 }}>
                {artistData.name || "Unknown Artist"}
              </Text>
            </View>
          </View>
          <View style={styles.bioContainer}>
            <Text style={{ padding: 5 }}>
              {bio && bio.length > BIO_MAX_LENGTH && !isBioExpanded
                ? `${bio.substring(0, BIO_MAX_LENGTH)}... `
                : bio}
              {bio && bio.length > BIO_MAX_LENGTH && (
                <Text
                  style={styles.seeMoreText}
                  onPress={() => setIsBioExpanded(!isBioExpanded)}
                >
                  {isBioExpanded ? "See Less" : "See More"}
                </Text>
              )}
            </Text>
          </View>
          <View style={styles.albumsContainer}>
            <View style={styles.imageListContainer}>
              {artistAlbums.map((album, index) => (
                <View key={index} style={styles.albumItem}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.push("AlbumPage", {
                        album: album,
                        key: Math.round(Math.random() * 10000000),
                      })
                    }
                  >
                    <Image
                      source={{ uri: album.images[0].url }}
                      style={styles.albumImage}
                    />
                  </TouchableOpacity>
                  <Text style={styles.albumTitle} numberOfLines={2}>
                    {album.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.footer}>
            
            <Text style={styles.footerBrand}>bsides</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    width: 100,
    height: 100,
    borderRadius: 3,
  },
  albumItem: {
    width: 100,
    marginBottom: 12,
    alignItems: "center",
  },
  albumImage: {
    width: 100,
    height: 100,
    borderRadius: 2,
    marginBottom: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  albumTitle: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  gradient: {
    padding: 0,
    position: "absolute",
  },
  pageData: {
    zIndex: 3,
    paddingTop: "20%",
    paddingLeft: "5%",
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
  albumsContainer: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  imageListContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    width: "100%",
    gap: 4,
  },
  bioContainer: {
    padding: 10,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    contentWrap: "wrap",
  },
  seeMoreText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  footer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  footerBrand: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    letterSpacing: 1,
  },
});

export default ArtistPage;
