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
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { auth } from "../config/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { postReview } from "../api/ReviewAPI";
import { Review } from "../logic/Review";
import { getListByUID, patchAlbumList } from "../api/ListAPI";
import { List } from "../logic/List";
import { findMixingCreditsFromMusicBrainz } from "../api/MusicBrainz";
import { getTrackListFromSpotify } from "../api/SpotifyAPI";
import { getArtistBio } from "../api/MusicBrainz";
const AlbumPage = (route) => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const newRoute = useRoute(); // Get route object
  // console.log("Route Params:", newRoute.params); // Debugging log
  const { album } = newRoute.params; // Correctly destructure the album parameter
  const [albumData, setAlbumData] = useState(album || {}); // Initialize state with passed album

  const [artistPhoto, setArtistPhoto] = useState();
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [rating, setRating] = useState(false);
  const [description, setDescription] = useState(false);
  const [listReturned, setListReturned] = useState();
  const [selectedIds, setSelectedIds] = useState([]);
  const [credits, setCredits] = useState([]);
  const [trackList, setTrackList] = useState([]);

  let newPhoto;
  const navigation = useNavigation();
  useEffect(() => {
    async function setPhoto() {
      try {
        const photoFromAPI = await getArtistPhotoByAlbum(album.id);
        if (photoFromAPI) {
          setArtistPhoto(photoFromAPI);
        }
      } catch (error) {
        console.error("Error fetching image:", error);
      } finally {
        setLoading(false);
      }

      console.log("aristphoto: ", album.id);
    }
    setPhoto();
    getCredits();
    getTrackList();
  }, [album.id]);
  const getCredits = async () => {
    const credits = await findMixingCreditsFromMusicBrainz(
      albumData.name,
      albumData.artists[0].name
    );
    setCredits(credits);
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const onAddToListPress = async () => {
    //call ListAPI and return all lists with UID == currentUID
    let lists = await getListByUID(auth.currentUser.uid);
    setListReturned(lists);

    //if null return createListOption
    setListModalVisible(true);
    //else return selectable lists
  };
  const handleItemPress = (listSelected) => {
    setSelectedIds((prevIds) =>
      prevIds.includes(listSelected)
        ? prevIds.filter((prevId) => prevId !== listSelected)
        : [...prevIds, listSelected]
    );
    console.log(selectedIds);
  };
  const submitReview = async (rating, description) => {
    //create review object with local data and data from review modal
    //send to reviewAPI

    try {
      await postReview(rating, description, albumData.id);
      setModalVisible(!modalVisible);
    } catch (error) {
      console.log("Error submitting review:", error);
    }
  };
  const getTrackList = async () => {
    const trackList = await getTrackListFromSpotify(albumData.id);
    setTrackList(trackList);
  };
  const submitLists = async () => {
    //for each item in ListArray
    console.log(selectedIds);
    selectedIds.forEach(async (id) => {
      let currentList = listReturned.find((list) => list.id === id);

      let currentAlbumList = currentList.albumList;

      currentAlbumList.push(albumData.id);

      //console.log("Current List albumList : " + currentList.albumList);
      //console.log("Lists in list" + listReturned);
      await patchAlbumList(currentAlbumList, id);
    });
    //call a ListAPI method that pushes albumId to list
    setListModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          artistPhoto && (
            <Image
              source={{
                uri: artistPhoto,
              }}
              style={{
                width: windowWidth,
                height: windowHeight / 4,
                position: "absolute",
              }}
            />
          )
        )}
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
      </View>
      <View style={styles.pageData}>
        {albumData.images && albumData.images.length > 0 && (
          <Image source={albumData.images[0]} style={styles.image} />
        )}
        <View style={styles.columnContainer}>
          <Text style={{ padding: 5 }}>
            {albumData.name || "Unknown Album"}
          </Text>

          <Text style={{ padding: 5 }}>
            {formatDate(albumData.release_date)}
          </Text>
          {albumData.artists && albumData.artists.length > 0 && (
            <Text style={{ padding: 5 }}>{albumData.artists[0].name}</Text>
          )}
        </View>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={reviewModalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          setReviewModalVisible(!reviewModalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>{albumData.name}</Text>
            <TextInput
              placeholder="Rating"
              value={rating}
              onChangeText={(text) => setRating(text)}
              style={styles.input}
            ></TextInput>
            <TextInput
              placeholder="Tell more!"
              value={description}
              onChangeText={(text) => setDescription(text)}
              style={styles.input}
            ></TextInput>
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={() => submitReview(rating, description)}
            >
              <Text style={styles.textStyle}>Submit Review</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={listModalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          setReviewModalVisible(!listModalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>
              Add {albumData.name} to a List!
            </Text>

            <FlatList
              data={listReturned}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.item,
                    selectedIds.includes(item.id) && styles.selectedItem,
                  ]}
                  onPress={() => handleItemPress(item.id)}
                >
                  <Text style={styles.itemText}>{item.listName}</Text>
                </TouchableOpacity>
              )}
              style={styles.listPreview}
            />
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={() => submitLists()}
            >
              <Text style={styles.textStyle}>Submit List</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <TouchableOpacity onPress={() => setListModalVisible(true)}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Review</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onAddToListPress()}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Add To List</Text>
        </View>
      </TouchableOpacity>
      <Text>Mixing/Engineering Credits</Text>
      <FlatList
        data={credits}
        keyExtractor={(item) => item.artist.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.push("MusicianPage", {
                musician: item,
                key: Math.round(Math.random() * 10000000),
              })
            }
          >
            <Text>{item.artist.name}</Text>
          </TouchableOpacity>
        )}
      />
      <FlatList
        data={trackList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.push("MusicianPage", {
                musician: item,
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
