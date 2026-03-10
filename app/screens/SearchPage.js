import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import debounce from "lodash/debounce";
import {
  getAlbumsByName,
  getArtistsByName,
  searchNewAlbums,
} from "../api/SpotifyAPI";
import { getMusicians } from "../api/Discogs";
import { getProfileImageForUser, getUsersByUsername } from "../api/UserAPI";
import defaultProfileImage from "../../assets/defaultProfilePicture.png";

const SEARCH_LIMIT = 10;

const LOCAL_ARTISTS_PLACEHOLDER = [
  {
    id: "local-artists-coming-soon",
    title: "Local artists coming soon",
    subtitle: "Are you an artist? Add yourself",
  },
];

const UserSearchResultRow = ({ item, onPress }) => {
  const [profileImage, setProfileImage] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfileImage = async () => {
      const imageUrl = await getProfileImageForUser(item);
      if (mounted) {
        setProfileImage(imageUrl || "");
      }
    };

    loadProfileImage();

    return () => {
      mounted = false;
    };
  }, [item?.id, item?.oauthId, item?.uid, item?.avatarUrl, item?.photoURL]);

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.resultRow}>
        <Image
          source={profileImage ? { uri: profileImage } : defaultProfileImage}
          style={styles.userProfileImage}
        />
        <View style={styles.resultMeta}>
          <Text style={styles.resultPrimaryText}>{item?.username}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SearchPage = () => {
  const navigation = useNavigation();
  const [searchVal, setSearchVal] = useState("");
  const [selectedButton, setSelectedButton] = useState("Album");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const [newReleaseCards, setNewReleaseCards] = useState([]);
  const [newReleasesLoading, setNewReleasesLoading] = useState(false);
  const [newReleasesError, setNewReleasesError] = useState("");
  const [newReleasesMarket, setNewReleasesMarket] = useState("US");

  const runSearch = useCallback(async (type, text, pageNumber = 0, append = false) => {
    if (!text?.trim()) {
      setResults([]);
      setHasMore(true);
      return;
    }

    try {
      setSearchLoading(true);
      let response = [];

      if (type === "Album") {
        response = await getAlbumsByName(text, pageNumber, SEARCH_LIMIT);
      } else if (type === "Artist") {
        response = await getArtistsByName(text, pageNumber, SEARCH_LIMIT);
      } else if (type === "User") {
        response = await getUsersByUsername(text);
      } else if (type === "Musician") {
        response = await getMusicians(text);
      }

      const normalized = Array.isArray(response) ? response : [];
      setResults((prev) => (append ? [...prev, ...normalized] : normalized));
      setHasMore(normalized.length >= SEARCH_LIMIT);
    } catch (error) {
      console.error("Search fetch error:", error);
      if (!append) {
        setResults([]);
      }
      setHasMore(false);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((type, text, pageNumber = 0, append = false) => {
      runSearch(type, text, pageNumber, append);
    }, 450),
    [runSearch]
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const fetchNewReleases = useCallback(async () => {
    try {
      setNewReleasesLoading(true);
      setNewReleasesError("");
      const response = await searchNewAlbums({ limit: 24, offset: 0 });
      const items = Array.isArray(response?.items) ? response.items : [];
      setNewReleaseCards(items.slice(0, 12));
      setNewReleasesMarket(response?.market || "US");
    } catch (error) {
      console.error("New releases fetch error:", error);
      setNewReleasesError("Could not load new releases.");
      setNewReleaseCards([]);
    } finally {
      setNewReleasesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNewReleases();
  }, [fetchNewReleases]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { year: "numeric" });
  };

  const handleButtonPress = (type) => {
    setSelectedButton(type);
    setPage(0);
    setHasMore(true);

    if (!searchVal.trim()) {
      setResults([]);
      return;
    }

    debouncedSearch(type, searchVal, 0, false);
  };

  const handleSearchChange = (text) => {
    setSearchVal(text);
    setPage(0);
    setHasMore(true);

    if (!text.trim()) {
      debouncedSearch.cancel();
      setResults([]);
      return;
    }

    debouncedSearch(selectedButton, text, 0, false);
  };

  const loadMoreResults = () => {
    if (!searchVal.trim() || searchLoading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    runSearch(selectedButton, searchVal, nextPage, true);
  };

  const navigateToYearPicker = () => navigation.push("YearPicker");
  const navigateToCountryPicker = () => navigation.push("CountryPicker");

  const renderNewReleaseCard = ({ item }) => (
    <TouchableOpacity
      style={styles.newReleaseCard}
      onPress={() => navigation.push("AlbumPage", { album: item.spotifyAlbum })}
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.newReleaseCover} />
      ) : (
        <View style={[styles.newReleaseCover, styles.newReleasePlaceholder]}>
          <Text style={styles.newReleasePlaceholderText}>NO COVER</Text>
        </View>
      )}
      <Text style={styles.newReleaseTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.newReleaseArtist} numberOfLines={1}>
        {item.artistSubtitle}
      </Text>
    </TouchableOpacity>
  );

  const renderLocalArtistPlaceholder = ({ item }) => (
    <View style={styles.localArtistCard}>
      <Text style={styles.localArtistTitle}>{item.title}</Text>
      <Text style={styles.localArtistSubtitle}>{item.subtitle}</Text>
    </View>
  );

  const renderSearchResult = ({ item }) => {
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
          <View style={styles.resultRow}>
            <Image source={{ uri: item?.images?.[0]?.url }} style={styles.resultImage} />
            <View style={styles.resultMeta}>
              <Text style={styles.resultPrimaryText}>{item?.name}</Text>
              <Text style={styles.resultSecondaryText}>
                {item?.artists?.[0]?.name || "Unknown Artist"}
              </Text>
              <Text style={styles.resultTertiaryText}>{formatDate(item?.release_date)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (selectedButton === "Artist") {
      return (
        <TouchableOpacity
          onPress={() =>
            navigation.push("ArtistPage", {
              artist: item,
              key: Math.round(Math.random() * 10000000),
            })
          }
        >
          <View style={styles.resultRow}>
            <Image source={{ uri: item?.images?.[0]?.url }} style={styles.resultImage} />
            <View style={styles.resultMeta}>
              <Text style={styles.resultPrimaryText}>{item?.name}</Text>
              <Text style={styles.resultSecondaryText}>
                {Array.isArray(item?.genres) ? item.genres.join(", ") : ""}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (selectedButton === "User") {
      return (
        <UserSearchResultRow
          item={item}
          onPress={() =>
            navigation.push("UserPage", {
              user: item,
              key: Math.round(Math.random() * 10000000),
            })
          }
        />
      );
    }

    if (selectedButton === "Musician") {
      return (
        <View style={styles.resultRow}>
          <Image source={{ uri: item?.cover_image }} style={styles.resultImage} />
          <View style={styles.resultMeta}>
            <Text style={styles.resultPrimaryText}>{item?.title}</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const hasSearchQuery = searchVal.trim().length > 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={hasSearchQuery ? results : []}
        keyExtractor={(item, index) =>
          item?.id?.toString?.() || item?.username || `result-${index}`
        }
        renderItem={renderSearchResult}
        onEndReached={loadMoreResults}
        onEndReachedThreshold={0.5}
        ListFooterComponent={searchLoading ? <ActivityIndicator style={styles.loader} /> : null}
        ListEmptyComponent={
          hasSearchQuery && !searchLoading ? (
            <Text style={styles.emptyResultsText}>No results found.</Text>
          ) : null
        }
        ListHeaderComponent={
          <View>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Search"
                value={searchVal}
                onChangeText={handleSearchChange}
                style={styles.input}
              />
            </View>

            <View style={styles.searchButtonContainer}>
              {["Artist", "Album", "User", "Musician"].map((option) => (
                <View key={option} style={styles.searchButton}>
                  <Button
                    title={option}
                    onPress={() => handleButtonPress(option)}
                    color={selectedButton === option ? "black" : "gray"}
                  />
                </View>
              ))}
            </View>

            {!hasSearchQuery ? (
              <>
                <View style={styles.browseRow}>
                  <TouchableOpacity style={styles.browseTile} onPress={navigateToYearPicker}>
                    <Text style={styles.browseTileTitle}>Year</Text>
                    <Text style={styles.browseTileSubtitle}>Browse by release year</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.browseTile}
                    onPress={navigateToCountryPicker}
                  >
                    <Text style={styles.browseTileTitle}>Location</Text>
                    <Text style={styles.browseTileSubtitle}>New in each country</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>New Releases</Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.push("NewReleasesResults", {
                        market: newReleasesMarket,
                      })
                    }
                  >
                    <Text style={styles.sectionAction}>See all</Text>
                  </TouchableOpacity>
                </View>
                {newReleasesLoading ? (
                  <ActivityIndicator style={styles.loader} />
                ) : newReleasesError ? (
                  <View style={styles.errorRow}>
                    <Text style={styles.errorText}>{newReleasesError}</Text>
                    <TouchableOpacity style={styles.retryInlineButton} onPress={fetchNewReleases}>
                      <Text style={styles.retryInlineText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={newReleaseCards}
                    keyExtractor={(item) => item.id}
                    renderItem={renderNewReleaseCard}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                  />
                )}

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Local Artists</Text>
                </View>
                <FlatList
                  data={LOCAL_ARTISTS_PLACEHOLDER}
                  keyExtractor={(item) => item.id}
                  renderItem={renderLocalArtistPlaceholder}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              </>
            ) : null}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inputContainer: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  searchButton: {
    flex: 1,
  },
  browseRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  browseTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#fafafa",
  },
  browseTileTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  browseTileSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  sectionAction: {
    fontSize: 13,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  horizontalList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  newReleaseCard: {
    width: 124,
  },
  newReleaseCover: {
    width: 124,
    height: 124,
    borderRadius: 0,
    backgroundColor: "#ddd",
  },
  newReleasePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  newReleasePlaceholderText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4a4a4a",
  },
  newReleaseTitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  newReleaseArtist: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
  },
  localArtistCard: {
    width: 220,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    justifyContent: "space-between",
    backgroundColor: "#fafafa",
  },
  localArtistTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  localArtistSubtitle: {
    marginTop: 10,
    fontSize: 13,
    color: "#444",
  },
  resultRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
    alignItems: "center",
  },
  resultImage: {
    width: 74,
    height: 74,
    borderRadius: 0,
    backgroundColor: "#ddd",
  },
  resultMeta: {
    flex: 1,
    marginLeft: 10,
  },
  resultPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#121212",
  },
  resultSecondaryText: {
    marginTop: 2,
    fontSize: 13,
    color: "#666",
  },
  resultTertiaryText: {
    marginTop: 4,
    fontSize: 12,
    color: "#777",
  },
  userProfileImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#ececec",
  },
  loader: {
    marginVertical: 12,
  },
  emptyResultsText: {
    textAlign: "center",
    color: "#666",
    marginVertical: 16,
  },
  errorRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  errorText: {
    color: "#b91c1c",
    marginBottom: 8,
  },
  retryInlineButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#444",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryInlineText: {
    fontWeight: "600",
    color: "#111",
  },
});

export default SearchPage;
