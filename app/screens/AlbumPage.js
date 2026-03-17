import React, {
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  getAlbum,
  getArtistById,
  getArtistPhotoByAlbum,
  getTrackListFromSpotify,
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
import { Ionicons } from "@expo/vector-icons";

import { auth } from "../config/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { postReview } from "../api/ReviewAPI";
import { Review } from "../logic/Review";
import { getListByUID, patchAlbumList, postList } from "../api/ListAPI";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import {
  getAlbumCreditsByName,
  getAlbumDescriptionFromMusicBrainz,
  searchReleaseGroup,
} from "../api/MusicBrainz";
import { resolveBackendUserId } from "../api/UserAPI";

const formatDetailDate = (dateString) => {
  if (!dateString) {
    return "Unknown";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatGenreLabel = (genre) =>
  typeof genre === "string" && genre.trim()
    ? genre
        .split(/[-_]/g)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : genre;

const DetailStat = ({ label, value }) => (
  <View style={styles.detailStatCard}>
    <Text style={styles.detailStatLabel}>{label}</Text>
    <Text style={styles.detailStatValue}>{value || "Unknown"}</Text>
  </View>
);

const PersonnelTab = ({ isFocused, albumData }) => {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFocused) return;
    setLoading(true);
    const getCredits = async () => {
      if (!albumData?.name || !albumData?.artists?.[0]?.name) {
        setCredits([]);
        setLoading(false);
        return;
      }

      const fetchedCredits = await getAlbumCreditsByName(
        albumData.name,
        albumData.artists[0].name
      );
      setCredits(fetchedCredits);
      setLoading(false);
    };

    getCredits();
  }, [albumData?.artists, albumData?.name, isFocused]);

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

const DetailsTab = ({
  albumData,
  artistGenres,
  albumDescription,
  albumDescriptionSource,
  detailsLoading,
}) => {
  const genres = Array.isArray(artistGenres) ? artistGenres.filter(Boolean) : [];

  return (
    <View style={styles.detailsContainer}>
      <View style={styles.detailsStatsGrid}>
        <DetailStat
          label="Release Date"
          value={formatDetailDate(albumData?.release_date)}
        />
        <DetailStat
          label="Tracks"
          value={
            typeof albumData?.total_tracks === "number"
              ? `${albumData.total_tracks}`
              : "Unknown"
          }
        />
        <DetailStat label="Label" value={albumData?.label || "Unknown"} />
        <DetailStat
          label="Type"
          value={formatGenreLabel(albumData?.album_type || "album")}
        />
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.detailsSectionTitle}>Genre</Text>
        {detailsLoading && genres.length === 0 ? (
          <View style={styles.detailsLoadingRow}>
            <ActivityIndicator size="small" color="#111827" />
            <Text style={styles.detailsMutedText}>Loading genre...</Text>
          </View>
        ) : genres.length > 0 ? (
          <View style={styles.genreChipRow}>
            {genres.map((genre) => (
              <View key={genre} style={styles.genreChip}>
                <Text style={styles.genreChipText}>{formatGenreLabel(genre)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.detailsMutedText}>
            Genre data is unavailable for this artist.
          </Text>
        )}
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.detailsSectionTitle}>Description</Text>
        {detailsLoading && !albumDescription ? (
          <View style={styles.detailsLoadingRow}>
            <ActivityIndicator size="small" color="#111827" />
            <Text style={styles.detailsMutedText}>Loading description...</Text>
          </View>
        ) : albumDescription ? (
          <>
            <Text style={styles.detailsBodyText}>{albumDescription}</Text>
            {albumDescriptionSource ? (
              <Text style={styles.detailsSourceText}>{albumDescriptionSource}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.detailsMutedText}>
            No description is available for this album.
          </Text>
        )}
      </View>
    </View>
  );
};
const TracksTab = ({ isFocused, trackList }) => {
  const navigation = useNavigation();
  useEffect(() => {
    if (!isFocused) return;
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

const AlbumPage = (route) => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const newRoute = useRoute(); // Get route object
  console.log("Route Params:", newRoute.params); // Debugging log
  const { album } = newRoute.params; // Correctly destructure the album parameter
  const [albumData, setAlbumData] = useState(album || {}); // Initialize state with passed album

  const [artistPhoto, setArtistPhoto] = useState();
  const [loading, setLoading] = useState(true);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [rating, setRating] = useState(false);
  const [description, setDescription] = useState(false);
  const [listReturned, setListReturned] = useState();
  const [selectedIds, setSelectedIds] = useState([]);
  const [trackList, setTrackList] = useState([]);
  const [artistGenres, setArtistGenres] = useState([]);
  const [albumDescription, setAlbumDescription] = useState("");
  const [albumDescriptionSource, setAlbumDescriptionSource] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [index, setIndex] = useState(0);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [createListModalVisible, setCreateListModalVisible] = useState(false);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState("");

  const navigation = useNavigation();
  useEffect(() => {
    let isMounted = true;

    async function loadAlbumPageData() {
      setLoading(true);
      setDetailsLoading(true);

      try {
        const [albumResult, photoResult, trackResult] = await Promise.allSettled([
          getAlbum(album.id),
          getArtistPhotoByAlbum(album.id),
          getTrackListFromSpotify(album.id),
        ]);

        const resolvedAlbum =
          albumResult.status === "fulfilled" && albumResult.value?.id
            ? albumResult.value
            : album;

        if (!isMounted) {
          return;
        }

        setAlbumData(resolvedAlbum || {});
        setArtistPhoto(
          photoResult.status === "fulfilled" ? photoResult.value || null : null
        );
        setTrackList(
          trackResult.status === "fulfilled" && Array.isArray(trackResult.value)
            ? trackResult.value
            : []
        );

        const primaryArtistId = resolvedAlbum?.artists?.[0]?.id;
        const primaryArtistName = resolvedAlbum?.artists?.[0]?.name;

        const [artistResult, descriptionResult] = await Promise.allSettled([
          primaryArtistId ? getArtistById(primaryArtistId) : Promise.resolve(null),
          resolvedAlbum?.name && primaryArtistName
            ? getAlbumDescriptionFromMusicBrainz(
                resolvedAlbum.name,
                primaryArtistName
              )
            : Promise.resolve({ description: "", source: null }),
        ]);

        if (!isMounted) {
          return;
        }

        const nextArtistGenres =
          artistResult.status === "fulfilled" &&
          Array.isArray(artistResult.value?.genres)
            ? artistResult.value.genres.filter(Boolean)
            : [];

        setArtistGenres(nextArtistGenres);
        setAlbumDescription(
          descriptionResult.status === "fulfilled"
            ? descriptionResult.value?.description || ""
            : ""
        );
        setAlbumDescriptionSource(
          descriptionResult.status === "fulfilled"
            ? descriptionResult.value?.source || ""
            : ""
        );
      } catch (error) {
        console.error("Error loading album page data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setDetailsLoading(false);
        }
      }
    }

    loadAlbumPageData();

    return () => {
      isMounted = false;
    };
  }, [album.id]);

  useEffect(() => {
    setActiveTab("details");
    setIndex(0);
  }, [album.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: albumData.name, // top header text
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setActionModalVisible(true)}
          style={{ marginRight: 10 }}
        >
          <Ionicons name="ellipsis-horizontal-outline" size={24} />
        </TouchableOpacity> // bottom tab label
      ), // Optional: also change title
    });
  }, [albumData.name, navigation]);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const onAddToListPress = async () => {
    setListsError("");
    setListsLoading(true);
    setListReturned([]);
    setShowCreateList(false);
    setSelectedIds([]);
    setNewListName("");
    setNewListDescription("");
    setListModalVisible(true);

    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setListsError("You must be signed in to load your lists.");
      setListsLoading(false);
      return;
    }

    try {
      const lists = await getListByUID(currentUid);
      if (!Array.isArray(lists)) {
        console.error("[AlbumPage] getListByUID returned non-array", lists);
        setListsError("Could not load your lists. Please try again.");
        setListReturned([]);
        setShowCreateList(false);
      } else {
        setListReturned(lists);
        setShowCreateList(lists.length === 0);
      }
    } catch (error) {
      console.error("[AlbumPage] failed to load lists for modal", error);
      setListsError("Could not load your lists. Please try again.");
      setListReturned([]);
      setShowCreateList(false);
    } finally {
      setListsLoading(false);
    }
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
      const firebaseUid = auth.currentUser?.uid;
      if (!firebaseUid) {
        alert("You must be logged in to submit a review");
        return;
      }

      const backendUserId = await resolveBackendUserId(firebaseUid);
      if (!backendUserId) {
        alert("Unable to resolve your user profile. Please try again.");
        return;
      }

      // Convert rating to ratingHalfSteps (0.5-5.0 stars -> 1-10 half-steps)
      let ratingHalfSteps = null;
      if (rating) {
        const ratingNum = parseFloat(rating);
        if (!isNaN(ratingNum) && ratingNum >= 0.5 && ratingNum <= 5.0) {
          ratingHalfSteps = Math.round(ratingNum * 2);
        }
      }

      // Get album and artist names for snapshots
      const albumTitle = albumData.name || '';
      const artistName = albumData.artists?.[0]?.name || '';
      
      if (!albumTitle || !artistName) {
        alert("Missing album information. Please try again.");
        return;
      }

      // Try to fetch MusicBrainz release group ID
      let releaseGroupMbId = null;
      try {
        const releaseGroup = await searchReleaseGroup(albumTitle, artistName);
        if (releaseGroup && releaseGroup.id) {
          releaseGroupMbId = releaseGroup.id;
        }
      } catch (mbError) {
        console.log("Could not fetch MusicBrainz ID:", mbError);
        // Continue without it - backend may need to handle this
      }

      // If we couldn't get MusicBrainz ID, use a placeholder
      // Note: Backend requires releaseGroupMbId, so this might fail validation
      // Consider making it optional in backend or always fetching it
      if (!releaseGroupMbId) {
        releaseGroupMbId = 'temp-' + albumData.id.substring(0, 31); // Use Spotify ID as fallback (max 36 chars)
      }

      // Create Review object with proper structure matching backend DTO
      const review = new Review({
        userId: backendUserId,
        spotifyAlbumId: albumData.id, // Store Spotify ID for reference
        releaseGroupMbId: releaseGroupMbId,
        albumTitleSnapshot: albumTitle,
        artistNameSnapshot: artistName,
        coverUrlSnapshot: albumData.images?.[0]?.url || null,
        ratingHalfSteps: ratingHalfSteps,
        body: description || null,
        isDraft: false,
        visibility: 'public',
      });

      await postReview(backendUserId, review);
      console.log("----------->>>>>>>>>> 999939393 ---->> review submitted: ", review);
      setReviewModalVisible(false);
      setRating("");
      setDescription("");
    } catch (error) {
      console.log("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
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
    setSelectedIds([]);
  };

  const createNewListAndAdd = async () => {
    if (!newListName.trim()) {
      alert("Please enter a list name");
      return;
    }

    try {
      const createdList = await postList(
        auth.currentUser.uid,
        newListDescription || null,
        newListName
      );
      const newListId = createdList?.insertedId || createdList?.id || createdList?._id;

      if (!newListId) {
        alert("Failed to create list. Please try again.");
        return;
      }

      await patchAlbumList([albumData.id], newListId);

      const lists = await getListByUID(auth.currentUser.uid);
      setListReturned(lists);
      setShowCreateList(false);
      setNewListName("");
      setNewListDescription("");
      setListModalVisible(false);
      setCreateListModalVisible(false);
      setSelectedIds([]);
    } catch (error) {
      console.error("Error creating list:", error);
      alert("Error creating list. Please try again.");
    }
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
                  {formatDate(albumData.release_date)}
                </Text>
                {albumData.artists?.[0] && (
                  <Text style={{ padding: 5 }}>
                    {albumData.artists[0].name}
                  </Text>
                )}
              </View>
            </View>

            {/* Mid Screen Tabs */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab("details");
                  setIndex(0);
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
                  setActiveTab("personnel");
                  setIndex(2);
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
            </View>

            <View style={styles.tabContent}>
              {activeTab === "details" && (
                <DetailsTab
                  albumData={albumData}
                  artistGenres={artistGenres}
                  albumDescription={albumDescription}
                  albumDescriptionSource={albumDescriptionSource}
                  detailsLoading={detailsLoading}
                />
              )}
              {activeTab === "tracks" && (
                <TracksTab isFocused={index === 1} trackList={trackList} />
              )}
              {activeTab === "personnel" && (
                <PersonnelTab albumData={albumData} isFocused={index === 2} />
              )}
            </View>

            {/* Action Modal - Choose Review or Add to List */}
            <Modal
              visible={actionModalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setActionModalVisible(false)}
            >
              <View style={styles.centeredView}>
                <View style={styles.actionModalView}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>What would you like to do?</Text>
                    <TouchableOpacity
                      onPress={() => setActionModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.actionModalContent}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setActionModalVisible(false);
                        setReviewModalVisible(true);
                      }}
                    >
                      <Ionicons name="star-outline" size={28} color="#007AFF" />
                      <Text style={styles.actionButtonText}>Review this album</Text>
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={async () => {
                        setActionModalVisible(false);
                        await onAddToListPress();
                      }}
                    >
                      <Ionicons name="list-outline" size={28} color="#007AFF" />
                      <Text style={styles.actionButtonText}>Add to list</Text>
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.modalFooter}>
                    <Pressable
                      style={[styles.modalButton, styles.buttonSecondary]}
                      onPress={() => setActionModalVisible(false)}
                    >
                      <Text style={styles.buttonSecondaryText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Review Modal */}
            <Modal
              visible={reviewModalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setReviewModalVisible(false)}
            >
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Write a Review</Text>
                    <TouchableOpacity
                      onPress={() => setReviewModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.modalContent}>
                    <Text style={styles.inputLabel}>Rating (0.5 - 5.0)</Text>
                    <TextInput
                      placeholder="e.g., 4.5"
                      value={rating}
                      onChangeText={setRating}
                      keyboardType="decimal-pad"
                      style={styles.modalInput}
                    />
                    
                    <Text style={styles.inputLabel}>Review</Text>
                    <TextInput
                      placeholder="Share your thoughts about this album..."
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      style={[styles.modalInput, styles.textArea]}
                    />
                  </View>
                  
                  <View style={styles.modalFooter}>
                    <Pressable
                      style={[styles.modalButton, styles.buttonSecondary]}
                      onPress={() => setReviewModalVisible(false)}
                    >
                      <Text style={styles.buttonSecondaryText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalButton, styles.buttonPrimary]}
                      onPress={() => submitReview(rating, description)}
                    >
                      <Text style={styles.buttonPrimaryText}>Submit Review</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>

            {/* List Modal */}
            <Modal 
              visible={listModalVisible} 
              transparent 
              animationType="slide"
              onRequestClose={() => setListModalVisible(false)}
            >
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add to List</Text>
                    <TouchableOpacity
                      onPress={() => setListModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.listContainer}>
                    {listsLoading ? (
                      <View style={styles.loadingState}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={styles.loadingText}>Loading your lists...</Text>
                      </View>
                    ) : listsError ? (
                      <View style={styles.errorState}>
                        <Text style={styles.errorText}>{listsError}</Text>
                        <View style={styles.errorActions}>
                          <Pressable
                            style={[styles.modalButton, styles.buttonSecondary]}
                            onPress={onAddToListPress}
                          >
                            <Text style={styles.buttonSecondaryText}>Retry</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.modalButton, styles.buttonPrimary]}
                            onPress={() => {
                              setListsError("");
                              setShowCreateList(true);
                            }}
                          >
                            <Text style={styles.buttonPrimaryText}>Create List</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : showCreateList || (listReturned && listReturned.length === 0) ? (
                      <View style={styles.createListContainer}>
                        <Text style={styles.createListTitle}>Create New List</Text>
                        <Text style={styles.createListSubtitle}>
                          Create a new list and add this album to it
                        </Text>
                        
                        <Text style={styles.inputLabel}>List Name *</Text>
                        <TextInput
                          placeholder="e.g., My Favorite Albums"
                          value={newListName}
                          onChangeText={setNewListName}
                          style={styles.modalInput}
                          autoFocus
                        />
                        
                        <Text style={styles.inputLabel}>Description (Optional)</Text>
                        <TextInput
                          placeholder="Add a description for your list..."
                          value={newListDescription}
                          onChangeText={setNewListDescription}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          style={[styles.modalInput, styles.textArea]}
                        />
                      </View>
                    ) : listReturned && listReturned.length > 0 ? (
                      <>
                        <TouchableOpacity
                          style={styles.createNewListButton}
                          onPress={() => setShowCreateList(true)}
                        >
                          <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                          <Text style={styles.createNewListButtonText}>Create New List</Text>
                        </TouchableOpacity>
                        <FlatList
                          data={listReturned}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[
                                styles.listItem,
                                selectedIds.includes(item.id) && styles.selectedListItem,
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
                              <Text style={styles.listItemText}>{item.listName}</Text>
                              {selectedIds.includes(item.id) && (
                                <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                              )}
                            </TouchableOpacity>
                          )}
                          style={styles.listFlatList}
                        />
                      </>
                    ) : (
                      <View style={styles.emptyListContainer}>
                        <Text style={styles.emptyListText}>No lists available</Text>
                        <TouchableOpacity
                          style={styles.createListButton}
                          onPress={() => {
                            setListModalVisible(false);
                            setCreateListModalVisible(true);
                          }}
                        >
                          <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                          <Text style={styles.createListButtonText}>Create a new list</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.modalFooter}>
                    <Pressable
                      style={[styles.modalButton, styles.buttonSecondary]}
                      onPress={() => {
                        setListModalVisible(false);
                        setShowCreateList(false);
                        setNewListName("");
                        setNewListDescription("");
                      }}
                    >
                      <Text style={styles.buttonSecondaryText}>Cancel</Text>
                    </Pressable>
                    {!listsLoading && !listsError && (
                      showCreateList || (listReturned && listReturned.length === 0) ? (
                        <Pressable
                          style={[
                            styles.modalButton, 
                            styles.buttonPrimary,
                            !newListName.trim() && styles.buttonDisabled
                          ]}
                          onPress={createNewListAndAdd}
                          disabled={!newListName.trim()}
                        >
                          <Text style={[
                            styles.buttonPrimaryText,
                            !newListName.trim() && styles.buttonDisabledText
                          ]}>
                            Create & Add
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[
                            styles.modalButton, 
                            styles.buttonPrimary,
                            selectedIds.length === 0 && styles.buttonDisabled
                          ]}
                          onPress={submitLists}
                          disabled={selectedIds.length === 0}
                        >
                          <Text style={[
                            styles.buttonPrimaryText,
                            selectedIds.length === 0 && styles.buttonDisabledText
                          ]}>
                            Add to {selectedIds.length > 0 ? `${selectedIds.length} ` : ''}List{selectedIds.length !== 1 ? 's' : ''}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
              </View>
            </Modal>

            {/* Create List Modal */}
            <Modal
              visible={createListModalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setCreateListModalVisible(false)}
            >
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Create New List</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setCreateListModalVisible(false);
                        setNewListName("");
                        setNewListDescription("");
                      }}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.modalContent}>
                    <Text style={styles.inputLabel}>List Name *</Text>
                    <TextInput
                      placeholder="e.g., My Favorite Albums"
                      value={newListName}
                      onChangeText={setNewListName}
                      style={styles.modalInput}
                      autoFocus
                    />
                    
                    <Text style={styles.inputLabel}>Description (Optional)</Text>
                    <TextInput
                      placeholder="Add a description for your list..."
                      value={newListDescription}
                      onChangeText={setNewListDescription}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={[styles.modalInput, styles.textArea]}
                    />
                  </View>
                  
                  <View style={styles.modalFooter}>
                    <Pressable
                      style={[styles.modalButton, styles.buttonSecondary]}
                      onPress={() => {
                        setCreateListModalVisible(false);
                        setNewListName("");
                        setNewListDescription("");
                      }}
                    >
                      <Text style={styles.buttonSecondaryText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.modalButton, 
                        styles.buttonPrimary,
                        !newListName.trim() && styles.buttonDisabled
                      ]}
                      onPress={createNewListAndAdd}
                      disabled={!newListName.trim()}
                    >
                      <Text style={[
                        styles.buttonPrimaryText,
                        !newListName.trim() && styles.buttonDisabledText
                      ]}>
                        Create
                      </Text>
                    </Pressable>
                  </View>
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
  centeredView: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: "#007AFF",
  },
  buttonSecondary: {
    backgroundColor: "#F5F5F5",
  },
  buttonDisabled: {
    backgroundColor: "#E0E0E0",
  },
  buttonPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondaryText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabledText: {
    color: "#999",
  },
  listContainer: {
    maxHeight: 300,
    minHeight: 200,
  },
  loadingState: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  errorState: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#B00020",
    textAlign: "center",
  },
  errorActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  listFlatList: {
    flexGrow: 0,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "white",
  },
  selectedListItem: {
    backgroundColor: "#F0F8FF",
  },
  listItemText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  emptyListContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  emptyListSubtext: {
    fontSize: 14,
    color: "#999",
  },
  createListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginTop: 16,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderStyle: "dashed",
  },
  createListButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  actionModalView: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionModalContent: {
    padding: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  actionModalView: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionModalContent: {
    padding: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  createListContainer: {
    padding: 20,
  },
  createListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  createListSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  createNewListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderStyle: "dashed",
  },
  createNewListButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Legacy styles for backward compatibility
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
  detailsContainer: {
    gap: 20,
  },
  detailsStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailStatCard: {
    width: "47%",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f7f7f8",
    borderWidth: 1,
    borderColor: "#ececec",
  },
  detailStatLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  detailStatValue: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  detailsSection: {
    gap: 10,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  detailsLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailsMutedText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },
  detailsBodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#374151",
  },
  detailsSourceText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  genreChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  genreChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
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
