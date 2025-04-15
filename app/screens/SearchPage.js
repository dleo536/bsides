import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  FlatList,
  Image,
  TouchableOpacity,
  TouchableHighlight,
  Pressable,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import LastFmTopAlbums from "../api/LastFM";
import { getAlbumsByName, getArtistsByName } from "../api/SpotifyAPI";
import AlbumList from "../api/AlbumList";
import { useQuery } from "react-query";
import AlbumPage from "./AlbumPage";
import debounce from "lodash/debounce";
import { getLabels, getMusicians } from "../api/Discogs";
import ArtistPage from "./ArtistPage";

const CLIENT_ID = "35328aeb78ec43cbbb12afc948cdc687";
const SECRET = "e284561d79744d4db2086e526e9d15d0";
const redirectUrl = "eg:http://localhost:8080";

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = "user-read-private user-read-email";

const SearchPage = () => {
  //const [searchVal, setSearch] = useState("");
  const navigation = useNavigation();
  // let searchVal;
  const [searchVal, setSearchVal] = useState("");
  let limit = 10;
  const [searchType, setSearchType] = useState("Album");
  const [searchContainer, setSearchContainer] = useState("");
  const [selectedButton, setSelectedButton] = useState("Album");
  const [accessToken, setAccessToken] = useState("");
  const [albums, setAlbums] = useState("");
  const [searchResults, setSearchResults] = useState("");
  const [artists, setArtists] = useState([]);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const handleButtonPress = (buttonIndex) => {
    setSearchType(buttonIndex);
    setSelectedButton(buttonIndex);
    if (searchVal.length > 0) {
      debouncedSearch(buttonIndex, searchVal);
    }
  };

  const debouncedSearch = debounce(
    async (buttonIndex, text, pageNumber = 0, append = false) => {
      try {
        let response;
        console.log("text and buttonIndex", text, buttonIndex);
        console.log(text);
        if (buttonIndex === "Album") {
          console.log("Entering debouncer ");
          response = await getAlbumsByName(text, pageNumber, 10);
          //setAlbums((prev) => (append ? [...prev, ...response] : response));
        } else if (buttonIndex === "Artist") {
          response = await getArtistsByName(text, pageNumber, 10);
          console.log("switched to artist");
          //setAlbums((prev) => (append ? [...prev, ...response] : response));
        } else if (buttonIndex === "User") {
          response = await getUsersByName(text);
        } else if (buttonIndex === "Musician") {
          response = await getMusicians(text);
        } else {
          response = [];
        }

        setAlbums((prev) => (append ? [...prev, ...response] : response));
        if (response.length < limit) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    },
    500
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
    });
  };
  useEffect(() => {
    return () => {
      debouncedSearch.cancel(); // Cleanup on unmount
    };
  }, []);
  const loadMoreAlbums = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newAlbums = await debouncedSearch(
        searchType,
        searchVal,
        page,
        true
      );
      console.log("New albums ", searchVal);

      //setAlbums((prev) => [...prev, ...newAlbums]);
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error("Error loading albums:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={StyleSheet.container}>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Search"
          value={searchVal}
          onChangeText={async (text) => {
            try {
              setSearchVal(text);
              await debouncedSearch(searchType, text);
              //setAlbums(response); // Ensure state updates correctly

              //console.log("albums", albums);
            } catch (error) {
              //console.error("Error fetching albums: ", error);
            }
          }}
          style={styles.input}
        ></TextInput>
      </View>
      <View style={styles.searchButtonContainer}>
        {["Artist", "Album", "Musician", "Label"].map((index) => (
          <View key={index} style={styles.searchButton}>
            <Button
              title={index}
              onPress={() => {
                setAlbums([]);
                handleButtonPress(index);
              }}
              color={selectedButton === index ? "blue" : "gray"}
            />
          </View>
        ))}
      </View>
      <View style={styles.searchResults}>
        {/* <Text style={styles.title}>Top Albums for Somone</Text> */}
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (selectedButton === "Album") {
              return (
                <TouchableOpacity
                  onPress={() =>
                    navigation.push("AlbumPage", {
                      album: item,
                      key: Math.round(Math.random() * 10000000),
                    })
                  }
                >
                  <View style={styles.rowContainer}>
                    <Image source={item.images[0]} style={styles.image} />
                    <View style={styles.columnContainer}>
                      <Text style={styles.albumName}>{item.name}</Text>
                      {/* <Text style={styles.artistName}>{item.type}</Text> */}
                      <Text style={styles.artistName}>
                        {item.artists[0].name}
                      </Text>
                      <Text style={styles.artistName}>
                        {formatDate(item.release_date)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            } else if (selectedButton === "Artist") {
              return (
                // <TouchableOpacity
                //   onPress={() => navigation.navigate("ArtistPage", { artist: item })}
                // >
                <TouchableOpacity
                  onPress={() =>
                    navigation.push("ArtistPage", {
                      artist: item,
                      key: Math.round(Math.random() * 10000000),
                    })
                  }
                >
                  <View style={styles.rowContainer}>
                    <Image source={item.images[0]} style={styles.image} />
                    <View style={styles.columnContainer}>
                      <Text style={styles.artistName}>{item.name}</Text>
                      <Text style={styles.genre}>
                        {item.genres?.join(", ")}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                // </TouchableOpacity>
              );
            } else if (selectedButton === "Musician") {
              return (
                <View style={styles.rowContainer}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.push("MusicianPage", {
                        musician: item,
                        key: Math.round(Math.random() * 10000000),
                      })
                    }
                  >
                    <Image
                      source={{ uri: item.cover_image }}
                      style={styles.image}
                    />
                    <Text style={styles.albumName}>{item.title}</Text>
                  </TouchableOpacity>
                  {/* Customize more for Musician */}
                </View>
              );
            } else if (selectedButton === "Label") {
              return (
                <View style={styles.rowContainer}>
                  <Image
                    source={{ uri: item.cover_image }}
                    style={styles.image}
                  />
                  <Text style={styles.albumName}>{item.title}</Text>
                  {/* Customize more for Musician */}
                </View>
              );
            } else {
              return null;
            }
          }}
          onEndReached={loadMoreAlbums}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading ? <ActivityIndicator /> : null}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    width: "95%",
    paddingLeft: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  input: {
    backgroundColor: "white",

    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  albumName: {
    fontSize: 20,
    fontWeight: "bold",
    paddingLeft: 5,
  },
  artistName: {
    padding: 3,
  },
  searchButtonContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  searchButton: {
    color: "black",
    paddingVertical: 5,
    paddingHorizontal: 10,

    borderRadius: 4,
  },
  rowContainer: {
    flexDirection: "row",
    paddingHorizontal: 2,
    paddingVertical: 5,
    height: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderBottomWidth: 1,
    borderBottomColor: "purple",
  },
  columnContainer: {
    flexDirection: "column",
    paddingLeft: 10,
  },

  searchButtonText: {
    color: "black",
    fontSize: 15,
    fontFamily: "Cochin",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  searchResults: {
    justifyContent: "center",
    width: "95%",

    paddingLeft: 10,
  },
  image: {
    width: "28%",
    height: "100%",
    borderRadius: 3,
  },
});

export default SearchPage;
