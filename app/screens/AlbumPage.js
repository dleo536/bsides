import React, {
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { getAlbum, getArtistPhotoByAlbum } from "../api/SpotifyAPI";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
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
import { Ionicons } from "@expo/vector-icons";

import { auth } from "../config/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { postReview } from "../api/ReviewAPI";
import { Review } from "../logic/Review";
import { getListByUID, patchAlbumList } from "../api/ListAPI";
import { List } from "../logic/List";
import { findMixingCreditsFromMusicBrainz } from "../api/MusicBrainz";
import { getTrackListFromSpotify } from "../api/SpotifyAPI";
import { getArtistBio } from "../api/MusicBrainz";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { getAlbumCreditsByName } from "../api/MusicBrainz";
import { TabView, SceneMap } from "react-native-tab-view";
import { TabBar } from "react-native-tab-view";

const PersonnelTab = ({ isFocused, albumData }) => {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const route = useRoute();
  //const albumData = route.params?.albumData;

  useEffect(() => {
    if (!isFocused) return;
    console.log("UseCallback is being called for PersonnelTab");
    const getCredits = async () => {
      if (!albumData?.name || !albumData?.artists?.[0]?.name) return;

      console.log("Fetching credits for:", albumData.name);
      const fetchedCredits = await getAlbumCreditsByName(
        albumData.name,
        albumData.artists[0].name
      );
      setCredits(fetchedCredits);
      console.log("credits from album Page: ", fetchedCredits);
      setLoading(false);
    };

    getCredits();
  }, [albumData?.name]);

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.container}>
            <ActivityIndicator size="large" />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <View>
      {credits.length === 0 ? (
        <Text>No personnel found.</Text>
      ) : (
        <View>
          {credits.map((item, index) => (
            <Text key={`${item.name}-${index}`} style={styles.creditText}>
              {item.name} — {item.role}
              {item.track ? ` (Track: ${item.track})` : ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const DetailsTab = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View>
          <Text>Details</Text>
          <Text>Details</Text>
          <Text>Details</Text>
          <Text>Details</Text>
          <Text>Details</Text>
          <Text>Details</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};
const TracksTab = ({ isFocused, trackList }) => {
  const route = useRoute();

  const navigation = useNavigation();
  useEffect(() => {
    if (!isFocused) return;
    console.log("UseCallback is being called for TracksTab");
  }, [isFocused]);

  return (
    <View>
      <View>
        {trackList.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() =>
              navigation.push("MusicianPage", {
                musician: item,
                key: Math.round(Math.random() * 10000000),
              })
            }
            style={{ marginVertical: 8 }} // Optional: spacing between items
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
const MyMidScreenTabs = ({ albumData, trackList }) => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "personnel", title: "Personnel" },
    { key: "tracks", title: "Tracks" },
    { key: "details", title: "Details" },
  ]);
  const [tabViewHeight, setTabViewHeight] = useState(0);
  const renderScene = ({ route }) => {
    switch (route.key) {
      case "personnel":
        return (
          <View
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setTabViewHeight(height);
            }}
          >
            <PersonnelTab isFocused={index === 0} albumData={albumData} />
          </View>
        );
      case "tracks":
        return (
          <View
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setTabViewHeight(height);
            }}
          >
            <TracksTab isFocused={index === 1} trackList={trackList} />
          </View>
        );
      case "details":
        return <DetailsTab isFocused={index === 2} />;
      default:
        return null;
    }
  };
  return (
    <View>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get("window").width }}
        lazy={true}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: "blue" }}
            style={{ backgroundColor: "white" }}
            activeColor="blue"
            inactiveColor="gray"
          />
        )}
        style={{ marginTop: 20, height: tabViewHeight || 200 }}
      />
    </View>
  );
};

const AlbumPage = (route) => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const newRoute = useRoute(); // Get route object
  console.log("Route Params:", newRoute.params); // Debugging log
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
  const [activeTab, setActiveTab] = useState("personnel");
  const [index, setIndex] = useState(0);

  let newPhoto;
  const navigation = useNavigation();
  const Tab = createMaterialTopTabNavigator();
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
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: albumData.name, // top header text
      headerRight: () => (
        <TouchableOpacity
          onPress={() => onAddToListPress()}
          style={{ marginRight: 10 }}
        >
          <Ionicons name="ellipsis-horizontal-outline" size={24} />
        </TouchableOpacity> // bottom tab label
      ), // Optional: also change title
    });
  }, [navigation]);
  const getCredits = async () => {
    const credits = await getAlbumCreditsByName(
      albumData.name,
      albumData.artists[0].name
    );
    setCredits(credits);
    console.log("-------------> credits from album Page: ", credits);
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
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ paddingBottom: 20 }}>
            {/* Artist Photo and Gradient */}
            <View style={styles.gradient}>
              {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
              ) : (
                artistPhoto && (
                  <Image
                    source={{ uri: artistPhoto }}
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
                style={{
                  width: windowWidth,
                  height: windowHeight / 4,
                  position: "absolute",
                }}
              />
            </View>

            {/* Album Information */}
            <View style={styles.pageData}>
              {albumData.images?.[0] && (
                <Image source={albumData.images[0]} style={styles.image} />
              )}
              <View style={styles.columnContainer}>
                <Text style={{ padding: 5 }}>
                  {albumData.name || "Unknown Album"}
                </Text>
                <Text style={{ padding: 5 }}>
                  {new Date(albumData.release_date).toDateString()}
                </Text>
                {albumData.artists?.[0] && (
                  <Text style={{ padding: 5 }}>
                    {albumData.artists[0].name}
                  </Text>
                )}
              </View>
            </View>

            {/* Mid Screen Tabs */}
            {/* <MyMidScreenTabs albumData={albumData} trackList={trackList} /> */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab("personnel");
                  setIndex(0);
                }}
                style={styles.tabButton}
              >
                <Text
                  style={
                    activeTab === "personnel"
                      ? styles.activeTabText
                      : styles.inactiveTabText
                  }
                >
                  Personnel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab("tracks");
                  setIndex(1);
                }}
                style={styles.tabButton}
              >
                <Text
                  style={
                    activeTab === "tracks"
                      ? styles.activeTabText
                      : styles.inactiveTabText
                  }
                >
                  Tracks
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab("details");
                  setIndex(2);
                }}
                style={styles.tabButton}
              >
                <Text
                  style={
                    activeTab === "details"
                      ? styles.activeTabText
                      : styles.inactiveTabText
                  }
                >
                  Details
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tabContent}>
              {activeTab === "personnel" && (
                <PersonnelTab albumData={albumData} isFocused={index === 0} />
              )}
              {activeTab === "tracks" && (
                <TracksTab isFocused={index === 1} trackList={trackList} />
              )}
              {activeTab === "details" && (
                <DetailsTab isFocused={index === 2} />
              )}
            </View>

            {/* Review Modal */}
            <Modal
              visible={reviewModalVisible}
              transparent
              animationType="slide"
            >
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <TextInput
                    placeholder="Rating"
                    value={rating}
                    onChangeText={setRating}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Tell more!"
                    value={description}
                    onChangeText={setDescription}
                    style={styles.input}
                  />
                  <Pressable
                    style={[styles.button, styles.buttonClose]}
                    onPress={() => submitReview(rating, description)}
                  >
                    <Text>Submit Review</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            {/* List Modal */}
            <Modal visible={listModalVisible} transparent animationType="slide">
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <FlatList
                    data={listReturned}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.item,
                          selectedIds.includes(item.id) && styles.selectedItem,
                        ]}
                        onPress={() => {
                          if (selectedIds.includes(item.id)) {
                            setSelectedIds(
                              selectedIds.filter((id) => id !== item.id)
                            );
                          } else {
                            setSelectedIds([...selectedIds, item.id]);
                          }
                        }}
                      >
                        <Text>{item.listName}</Text>
                      </TouchableOpacity>
                    )}
                  />
                  <Pressable
                    style={[styles.button, styles.buttonClose]}
                    onPress={submitLists}
                  >
                    <Text>Submit Lists</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  image: { width: 150, height: 150, borderRadius: 3 },
  gradient: { position: "absolute", zIndex: 1 },
  pageData: { flexDirection: "row", paddingTop: "50%", zIndex: 2 },
  columnContainer: { paddingHorizontal: 20, paddingVertical: 20 },
  centeredView: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    padding: 40,
    borderRadius: 20,
  },
  input: { backgroundColor: "white", padding: 10, marginTop: 20, width: 300 },
  button: { padding: 10, alignItems: "center", marginTop: 10 },
  buttonClose: { backgroundColor: "purple" },
  selectedItem: { backgroundColor: "lightgray" },
  item: { padding: 10, borderBottomWidth: 1 },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  tabButton: {
    paddingHorizontal: 12,
  },
  activeTabText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
  inactiveTabText: {
    fontSize: 16,
    color: "gray",
  },
  tabContent: {
    padding: 16,
  },
  tabSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  tabText: {
    fontSize: 16,
    lineHeight: 22,
  },
});

export default AlbumPage;
