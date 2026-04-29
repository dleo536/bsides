import React, {
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  getAlbum,
  getArtistById,
  getAlbumsByArtist,
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { auth } from "../config/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { postReview } from "../api/ReviewAPI";
import { Review } from "../logic/Review";
import { getListByUID, patchAlbumList, postList } from "../api/ListAPI";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import {
  getAlbumDescriptionFromMusicBrainz,
  searchReleaseGroup,
} from "../api/MusicBrainz";

const RATING_INPUT_PATTERN = /^(?:10(?:\.0?)?|[0-9](?:\.\d?)?)?$/;
const REVIEW_VISIBILITY_OPTIONS = [
  {
    value: "public",
    label: "Public",
    description: "Visible to everyone who can view this album.",
    icon: "globe-outline",
  },
  {
    value: "private",
    label: "Private",
    description: "Only visible to you on your account.",
    icon: "lock-closed-outline",
  },
];

const parseReviewRatingInput = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue || !RATING_INPUT_PATTERN.test(normalizedValue)) {
    return null;
  }

  const parsed = Number.parseFloat(normalizedValue);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
    return null;
  }

  return Number(parsed.toFixed(1));
};

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

const buildOtherAlbums = (albums, currentAlbumId) => {
  if (!Array.isArray(albums)) {
    return [];
  }

  const seen = new Set();

  return albums
    .filter((album) => {
      const albumId = album?.id;
      if (!albumId || albumId === currentAlbumId || seen.has(albumId)) {
        return false;
      }

      seen.add(albumId);
      return true;
    })
    .sort((left, right) => {
      const leftDate = left?.release_date || "";
      const rightDate = right?.release_date || "";
      return rightDate.localeCompare(leftDate);
    });
};

const OtherAlbumsTab = ({ isFocused, albumData }) => {
  const navigation = useNavigation();
  const [otherAlbums, setOtherAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFocused) return;

    setLoading(true);
    setError("");

    const loadOtherAlbums = async () => {
      const primaryArtistId = albumData?.artists?.[0]?.id;

      if (!primaryArtistId) {
        setOtherAlbums([]);
        setError("Artist information is unavailable for this album.");
        setLoading(false);
        return;
      }

      try {
        const fetchedAlbums = await getAlbumsByArtist(primaryArtistId);
        setOtherAlbums(buildOtherAlbums(fetchedAlbums, albumData?.id));
      } catch (fetchError) {
        console.error("Error loading other albums:", fetchError);
        setOtherAlbums([]);
        setError("Could not load other albums right now.");
      } finally {
        setLoading(false);
      }
    };

    loadOtherAlbums();
  }, [albumData?.artists, albumData?.id, isFocused]);

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
    <View style={styles.otherAlbumsContainer}>
      {error ? (
        <Text style={styles.otherAlbumsEmptyText}>{error}</Text>
      ) : otherAlbums.length === 0 ? (
        <Text style={styles.otherAlbumsEmptyText}>
          No other albums found for this artist.
        </Text>
      ) : (
        <View style={styles.otherAlbumsGrid}>
          {otherAlbums.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.otherAlbumTile}
              onPress={() =>
                navigation.push("AlbumPage", {
                  album: item,
                  key: Math.round(Math.random() * 10000000),
                })
              }
            >
              {item?.images?.[0]?.url ? (
                <Image
                  source={{ uri: item.images[0].url }}
                  style={styles.otherAlbumImage}
                />
              ) : (
                <View style={[styles.otherAlbumImage, styles.otherAlbumFallback]}>
                  <Ionicons name="disc-outline" size={22} color="#6b7280" />
                </View>
              )}
              <Text style={styles.otherAlbumTitle} numberOfLines={2}>
                {item?.name || "Untitled Album"}
              </Text>
              <Text style={styles.otherAlbumMeta} numberOfLines={1}>
                {typeof item?.release_date === "string" && item.release_date.length >= 4
                  ? item.release_date.slice(0, 4)
                  : "Album"}
              </Text>
            </TouchableOpacity>
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
  useEffect(() => {
    if (!isFocused) return;
  }, [isFocused]);

  return (
    <View>
      <View>
        {trackList.map((item) => (
          <View key={item.id} style={{ marginVertical: 8 }}>
            <Text>{item.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const AlbumPage = (route) => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const newRoute = useRoute(); // Get route object
  const { album } = newRoute.params; // Correctly destructure the album parameter
  const [albumData, setAlbumData] = useState(album || {}); // Initialize state with passed album

  const [artistPhoto, setArtistPhoto] = useState();
  const [loading, setLoading] = useState(true);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [rating, setRating] = useState("");
  const [description, setDescription] = useState("");
  const [reviewVisibility, setReviewVisibility] = useState("public");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
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
  const openReviewComposer = useCallback(() => {
    setReviewError("");
    setReviewModalVisible(true);
  }, []);

  const closeReviewComposer = useCallback(() => {
    setReviewModalVisible(false);
    setReviewError("");
    setReviewSubmitting(false);
    setRating("");
    setDescription("");
    setReviewVisibility("public");
  }, []);

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
        console.error("Failed to load lists");
        setListsError("Could not load your lists. Please try again.");
        setListReturned([]);
        setShowCreateList(false);
      } else {
        setListReturned(lists);
        setShowCreateList(lists.length === 0);
      }
    } catch (error) {
      console.error("Failed to load lists");
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
  };
  const submitReview = async (rating, description) => {
    //create review object with local data and data from review modal
    //send to reviewAPI

    try {
      const firebaseUid = auth.currentUser?.uid;
      if (!firebaseUid) {
        setReviewError("You need to be signed in to post a review.");
        return;
      }

      setReviewSubmitting(true);
      setReviewError("");

      let ratingHalfSteps = null;
      if (typeof rating === "string" && rating.trim()) {
        ratingHalfSteps = parseReviewRatingInput(rating);
        if (ratingHalfSteps === null) {
          setReviewError("Ratings can use at most one decimal place, like 9.2.");
          setReviewSubmitting(false);
          return;
        }
      }

      // Get album and artist names for snapshots
      const albumTitle = albumData.name || '';
      const artistName = albumData.artists?.[0]?.name || '';
      
      if (!albumTitle || !artistName) {
        setReviewError("Album information is missing. Please try again.");
        setReviewSubmitting(false);
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
        console.error("Could not resolve MusicBrainz release group");
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
        spotifyAlbumId: albumData.id, // Store Spotify ID for reference
        releaseGroupMbId: releaseGroupMbId,
        albumTitleSnapshot: albumTitle,
        artistNameSnapshot: artistName,
        coverUrlSnapshot: albumData.images?.[0]?.url || null,
        ratingHalfSteps: ratingHalfSteps,
        body: description || null,
        isDraft: false,
        visibility: reviewVisibility,
      });

      const reviewResult = await postReview(null, review);
      if (reviewResult?.error) {
        throw new Error("Review creation failed");
      }
      closeReviewComposer();
    } catch (error) {
      console.error("Failed to submit review");
      setReviewError("Failed to submit review. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const submitLists = async () => {
    //for each item in ListArray
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
                  setActiveTab("otherAlbums");
                  setIndex(2);
                }}
                style={styles.tabButton}
              >
                <Text
                  style={
                    activeTab === "otherAlbums"
                      ? styles.activeTabText
                      : styles.inactiveTabText
                  }
                >
                  Other Albums
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
              {activeTab === "otherAlbums" && (
                <OtherAlbumsTab albumData={albumData} isFocused={index === 2} />
              )}
            </View>

            <View style={styles.bottomNavSection}>
              <Text style={styles.bottomNavTitle}>Explore this album</Text>
              <View style={styles.bottomNavRow}>
                <TouchableOpacity
                  style={styles.bottomNavButton}
                  onPress={() =>
                    navigation.push("AlbumListsPage", {
                      album: albumData,
                      albumId: albumData?.id || album?.id || null,
                    })
                  }
                >
                  <View style={styles.bottomNavIconWrap}>
                    <Ionicons name="list-outline" size={20} color="#111827" />
                  </View>
                  <View style={styles.bottomNavMeta}>
                    <Text style={styles.bottomNavLabel}>Lists</Text>
                    <Text style={styles.bottomNavCaption}>
                      See every list that includes it
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomNavButton}
                  onPress={() =>
                    navigation.push("AlbumReviewsPage", {
                      album: albumData,
                      albumId: albumData?.id || album?.id || null,
                    })
                  }
                >
                  <View style={styles.bottomNavIconWrap}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={20}
                      color="#111827"
                    />
                  </View>
                  <View style={styles.bottomNavMeta}>
                    <Text style={styles.bottomNavLabel}>Reviews</Text>
                    <Text style={styles.bottomNavCaption}>
                      Read what other listeners wrote
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Modal - Choose Review or Add to List */}
            <Modal
              visible={actionModalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setActionModalVisible(false)}
            >
              <View style={styles.reviewSheetOverlay}>
                <Pressable
                  style={styles.reviewSheetBackdrop}
                  onPress={() => setActionModalVisible(false)}
                />
                <SafeAreaView
                  style={styles.reviewSheetSafeArea}
                  edges={["top", "bottom"]}
                >
                  <View style={styles.actionSheet}>
                    <View style={styles.reviewSheetHandle} />
                    <View style={styles.reviewSheetHeader}>
                      <View>
                        <Text style={styles.reviewSheetEyebrow}>Album actions</Text>
                        <Text style={styles.actionSheetTitle}>
                          What would you like to do?
                        </Text>
                        <Text style={styles.actionSheetSubtitle}>
                          Add this album to your writing or your lists.
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setActionModalVisible(false)}
                        style={styles.reviewSheetCloseButton}
                      >
                        <Ionicons name="close" size={22} color="#111827" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.actionSheetContent}>
                      <TouchableOpacity
                        style={styles.actionChoiceButton}
                        onPress={() => {
                          setActionModalVisible(false);
                          openReviewComposer();
                        }}
                        activeOpacity={0.88}
                      >
                        <View style={styles.actionChoiceIconWrap}>
                          <Ionicons
                            name="create-outline"
                            size={20}
                            color="#111827"
                          />
                        </View>
                        <View style={styles.actionChoiceCopy}>
                          <Text style={styles.actionChoiceTitle}>
                            Review this album
                          </Text>
                          <Text style={styles.actionChoiceDescription}>
                            Rate it, write your thoughts, and choose public or private.
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#9ca3af"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionChoiceButton}
                        onPress={async () => {
                          setActionModalVisible(false);
                          await onAddToListPress();
                        }}
                        activeOpacity={0.88}
                      >
                        <View style={styles.actionChoiceIconWrap}>
                          <Ionicons
                            name="list-outline"
                            size={20}
                            color="#111827"
                          />
                        </View>
                        <View style={styles.actionChoiceCopy}>
                          <Text style={styles.actionChoiceTitle}>Add to list</Text>
                          <Text style={styles.actionChoiceDescription}>
                            Drop it into one of your lists or create a new one.
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#9ca3af"
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.reviewSheetFooter}>
                      <Pressable
                        style={[
                          styles.reviewFooterButton,
                          styles.reviewFooterButtonSecondary,
                        ]}
                        onPress={() => setActionModalVisible(false)}
                      >
                        <Text style={styles.reviewFooterButtonSecondaryText}>
                          Cancel
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </SafeAreaView>
              </View>
            </Modal>

            {/* Review Modal */}
            <Modal
              visible={reviewModalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => {
                if (!reviewSubmitting) {
                  closeReviewComposer();
                }
              }}
            >
              <View style={styles.reviewSheetOverlay}>
                <Pressable
                  style={styles.reviewSheetBackdrop}
                  onPress={closeReviewComposer}
                  disabled={reviewSubmitting}
                />
                <SafeAreaView style={styles.reviewSheetSafeArea} edges={["top", "bottom"]}>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.reviewSheetKeyboard}
                  >
                    <View style={styles.reviewSheet}>
                      <View style={styles.reviewSheetHandle} />
                      <View style={styles.reviewSheetHeader}>
                        <View>
                          <Text style={styles.reviewSheetEyebrow}>New review</Text>
                          <Text style={styles.reviewSheetTitle}>
                            Write about this album
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={closeReviewComposer}
                          style={styles.reviewSheetCloseButton}
                          disabled={reviewSubmitting}
                        >
                          <Ionicons name="close" size={22} color="#111827" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView
                        style={styles.reviewSheetScroll}
                        contentContainerStyle={styles.reviewSheetContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                      >
                        <View style={styles.reviewAlbumCard}>
                          {albumData?.images?.[0]?.url ? (
                            <Image
                              source={{ uri: albumData.images[0].url }}
                              style={styles.reviewAlbumArt}
                            />
                          ) : (
                            <View
                              style={[
                                styles.reviewAlbumArt,
                                styles.reviewAlbumArtFallback,
                              ]}
                            >
                              <Ionicons name="disc-outline" size={24} color="#6b7280" />
                            </View>
                          )}
                          <View style={styles.reviewAlbumMeta}>
                            <Text style={styles.reviewAlbumTitle} numberOfLines={2}>
                              {albumData?.name || "Unknown album"}
                            </Text>
                            <Text style={styles.reviewAlbumArtist} numberOfLines={1}>
                              {albumData?.artists?.[0]?.name || "Unknown artist"}
                            </Text>
                          </View>
                        </View>

                        {reviewError ? (
                          <View style={styles.reviewErrorBanner}>
                            <Ionicons
                              name="alert-circle-outline"
                              size={18}
                              color="#b91c1c"
                            />
                            <Text style={styles.reviewErrorBannerText}>
                              {reviewError}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.reviewSection}>
                          <Text style={styles.reviewSectionLabel}>Rating</Text>
                          <TextInput
                            placeholder="e.g., 9.2"
                            value={rating}
                            onChangeText={(nextValue) => {
                              const normalizedValue = nextValue.replace(/,/g, ".");
                              if (RATING_INPUT_PATTERN.test(normalizedValue)) {
                                setRating(normalizedValue);
                              }
                            }}
                            keyboardType="decimal-pad"
                            style={styles.reviewTextInput}
                            placeholderTextColor="#9ca3af"
                          />
                          <Text style={styles.reviewSectionHelper}>
                            Optional. Use up to one decimal place, like 9.2.
                          </Text>
                        </View>

                        <View style={styles.reviewSection}>
                          <Text style={styles.reviewSectionLabel}>Review</Text>
                          <TextInput
                            placeholder="Share what stood out, what hit hardest, or what fell flat..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={7}
                            textAlignVertical="top"
                            style={[styles.reviewTextInput, styles.reviewTextArea]}
                            placeholderTextColor="#9ca3af"
                          />
                        </View>

                        <View style={styles.reviewSection}>
                          <Text style={styles.reviewSectionLabel}>Visibility</Text>
                          <Text style={styles.reviewSectionHelper}>
                            Choose who can read this review.
                          </Text>
                          <View style={styles.reviewVisibilityList}>
                            {REVIEW_VISIBILITY_OPTIONS.map((option) => {
                              const isSelected = reviewVisibility === option.value;
                              return (
                                <Pressable
                                  key={option.value}
                                  style={[
                                    styles.reviewVisibilityOption,
                                    isSelected &&
                                      styles.reviewVisibilityOptionSelected,
                                  ]}
                                  onPress={() => setReviewVisibility(option.value)}
                                >
                                  <View
                                    style={[
                                      styles.reviewVisibilityIconWrap,
                                      isSelected &&
                                        styles.reviewVisibilityIconWrapSelected,
                                    ]}
                                  >
                                    <Ionicons
                                      name={option.icon}
                                      size={18}
                                      color={isSelected ? "#111827" : "#6b7280"}
                                    />
                                  </View>
                                  <View style={styles.reviewVisibilityCopy}>
                                    <Text style={styles.reviewVisibilityLabel}>
                                      {option.label}
                                    </Text>
                                    <Text
                                      style={styles.reviewVisibilityDescription}
                                    >
                                      {option.description}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.reviewVisibilityRadio,
                                      isSelected &&
                                        styles.reviewVisibilityRadioSelected,
                                    ]}
                                  >
                                    {isSelected ? (
                                      <View
                                        style={styles.reviewVisibilityRadioDot}
                                      />
                                    ) : null}
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      </ScrollView>

                      <View style={styles.reviewSheetFooter}>
                        <Pressable
                          style={[
                            styles.reviewFooterButton,
                            styles.reviewFooterButtonSecondary,
                          ]}
                          onPress={closeReviewComposer}
                          disabled={reviewSubmitting}
                        >
                          <Text style={styles.reviewFooterButtonSecondaryText}>
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.reviewFooterButton,
                            styles.reviewFooterButtonPrimary,
                            reviewSubmitting && styles.reviewFooterButtonDisabled,
                          ]}
                          onPress={() => submitReview(rating, description)}
                          disabled={reviewSubmitting}
                        >
                          {reviewSubmitting ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.reviewFooterButtonPrimaryText}>
                              Save review
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                </SafeAreaView>
              </View>
            </Modal>

            {/* List Modal */}
            <Modal 
              visible={listModalVisible} 
              transparent 
              animationType="slide"
              onRequestClose={() => setListModalVisible(false)}
            >
              <View style={styles.reviewSheetOverlay}>
                <Pressable
                  style={styles.reviewSheetBackdrop}
                  onPress={() => setListModalVisible(false)}
                />
                <SafeAreaView
                  style={styles.reviewSheetSafeArea}
                  edges={["top", "bottom"]}
                >
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.reviewSheetKeyboard}
                  >
                    <View style={styles.listSheet}>
                      <View style={styles.reviewSheetHandle} />
                      <View style={styles.reviewSheetHeader}>
                        <View>
                          <Text style={styles.reviewSheetEyebrow}>Add to list</Text>
                          <Text style={styles.listSheetTitle}>Save this album to a list</Text>
                          <Text style={styles.listSheetSubtitle}>
                            Pick one of your lists or create a new one for it.
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setListModalVisible(false)}
                          style={styles.reviewSheetCloseButton}
                        >
                          <Ionicons name="close" size={22} color="#111827" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView
                        style={styles.listSheetScroll}
                        contentContainerStyle={styles.listSheetContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                      >
                        <View style={styles.reviewAlbumCard}>
                          {albumData?.images?.[0]?.url ? (
                            <Image
                              source={{ uri: albumData.images[0].url }}
                              style={styles.reviewAlbumArt}
                            />
                          ) : (
                            <View
                              style={[
                                styles.reviewAlbumArt,
                                styles.reviewAlbumArtFallback,
                              ]}
                            >
                              <Ionicons name="disc-outline" size={24} color="#6b7280" />
                            </View>
                          )}
                          <View style={styles.reviewAlbumMeta}>
                            <Text style={styles.reviewAlbumTitle} numberOfLines={2}>
                              {albumData?.name || "Unknown album"}
                            </Text>
                            <Text style={styles.reviewAlbumArtist} numberOfLines={1}>
                              {albumData?.artists?.[0]?.name || "Unknown artist"}
                            </Text>
                          </View>
                        </View>

                        {listsLoading ? (
                          <View style={styles.listSheetStatusCard}>
                            <ActivityIndicator size="small" color="#111827" />
                            <Text style={styles.listSheetStatusText}>
                              Loading your lists...
                            </Text>
                          </View>
                        ) : listsError ? (
                          <View style={styles.reviewErrorBanner}>
                            <Ionicons
                              name="alert-circle-outline"
                              size={18}
                              color="#b91c1c"
                            />
                            <View style={styles.listSheetErrorCopy}>
                              <Text style={styles.reviewErrorBannerText}>
                                {listsError}
                              </Text>
                              <View style={styles.listSheetErrorActions}>
                                <Pressable
                                  style={[
                                    styles.reviewFooterButton,
                                    styles.reviewFooterButtonSecondary,
                                  ]}
                                  onPress={onAddToListPress}
                                >
                                  <Text
                                    style={styles.reviewFooterButtonSecondaryText}
                                  >
                                    Retry
                                  </Text>
                                </Pressable>
                                <Pressable
                                  style={[
                                    styles.reviewFooterButton,
                                    styles.reviewFooterButtonPrimary,
                                  ]}
                                  onPress={() => {
                                    setListsError("");
                                    setShowCreateList(true);
                                  }}
                                >
                                  <Text
                                    style={styles.reviewFooterButtonPrimaryText}
                                  >
                                    Create list
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        ) : showCreateList || (listReturned && listReturned.length === 0) ? (
                          <View style={styles.listCreateCard}>
                            <Text style={styles.listCreateTitle}>Create a new list</Text>
                            <Text style={styles.listCreateSubtitle}>
                              Start a fresh list and add this album right away.
                            </Text>

                            <View style={styles.reviewSection}>
                              <Text style={styles.reviewSectionLabel}>List name</Text>
                              <TextInput
                                placeholder="e.g., My Favorite Albums"
                                value={newListName}
                                onChangeText={setNewListName}
                                style={styles.reviewTextInput}
                                autoFocus
                                placeholderTextColor="#9ca3af"
                              />
                            </View>

                            <View style={styles.reviewSection}>
                              <Text style={styles.reviewSectionLabel}>
                                Description
                              </Text>
                              <TextInput
                                placeholder="Add a short note for this list..."
                                value={newListDescription}
                                onChangeText={setNewListDescription}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                style={[styles.reviewTextInput, styles.listCreateTextArea]}
                                placeholderTextColor="#9ca3af"
                              />
                            </View>
                          </View>
                        ) : listReturned && listReturned.length > 0 ? (
                          <View style={styles.listSelectionSection}>
                            <TouchableOpacity
                              style={styles.listCreateInlineButton}
                              onPress={() => setShowCreateList(true)}
                              activeOpacity={0.88}
                            >
                              <Ionicons
                                name="add-circle-outline"
                                size={18}
                                color="#111827"
                              />
                              <Text style={styles.listCreateInlineButtonText}>
                                Create new list
                              </Text>
                            </TouchableOpacity>

                            <FlatList
                              data={listReturned}
                              keyExtractor={(item) => item.id}
                              scrollEnabled={false}
                              contentContainerStyle={styles.listSelectionList}
                              renderItem={({ item }) => {
                                const isSelected = selectedIds.includes(item.id);
                                return (
                                  <TouchableOpacity
                                    style={[
                                      styles.listSelectionCard,
                                      isSelected && styles.listSelectionCardSelected,
                                    ]}
                                    onPress={() => {
                                      if (isSelected) {
                                        setSelectedIds(
                                          selectedIds.filter((id) => id !== item.id)
                                        );
                                      } else {
                                        setSelectedIds([...selectedIds, item.id]);
                                      }
                                    }}
                                    activeOpacity={0.88}
                                  >
                                    <View style={styles.listSelectionTextWrap}>
                                      <Text
                                        style={styles.listSelectionTitle}
                                        numberOfLines={1}
                                      >
                                        {item.title || item.listName || "Untitled List"}
                                      </Text>
                                      <Text
                                        style={styles.listSelectionMeta}
                                        numberOfLines={1}
                                      >
                                        {typeof item?.itemsCount === "number"
                                          ? `${item.itemsCount} album${
                                              item.itemsCount === 1 ? "" : "s"
                                            }`
                                          : "Album list"}
                                      </Text>
                                    </View>
                                    <View
                                      style={[
                                        styles.listSelectionCheck,
                                        isSelected &&
                                          styles.listSelectionCheckSelected,
                                      ]}
                                    >
                                      {isSelected ? (
                                        <Ionicons
                                          name="checkmark"
                                          size={14}
                                          color="#ffffff"
                                        />
                                      ) : null}
                                    </View>
                                  </TouchableOpacity>
                                );
                              }}
                            />
                          </View>
                        ) : (
                          <View style={styles.listEmptyCard}>
                            <Text style={styles.listEmptyTitle}>No lists yet</Text>
                            <Text style={styles.listEmptySubtitle}>
                              Create your first list and add this album to it.
                            </Text>
                            <TouchableOpacity
                              style={styles.listCreateInlineButton}
                              onPress={() => setShowCreateList(true)}
                              activeOpacity={0.88}
                            >
                              <Ionicons
                                name="add-circle-outline"
                                size={18}
                                color="#111827"
                              />
                              <Text style={styles.listCreateInlineButtonText}>
                                Create a new list
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </ScrollView>

                      <View style={styles.reviewSheetFooter}>
                        <Pressable
                          style={[
                            styles.reviewFooterButton,
                            styles.reviewFooterButtonSecondary,
                          ]}
                          onPress={() => {
                            setListModalVisible(false);
                            setShowCreateList(false);
                            setNewListName("");
                            setNewListDescription("");
                          }}
                        >
                          <Text style={styles.reviewFooterButtonSecondaryText}>
                            Cancel
                          </Text>
                        </Pressable>
                        {!listsLoading && !listsError && (
                          showCreateList || (listReturned && listReturned.length === 0) ? (
                            <Pressable
                              style={[
                                styles.reviewFooterButton,
                                styles.reviewFooterButtonPrimary,
                                !newListName.trim() && styles.reviewFooterButtonDisabled,
                              ]}
                              onPress={createNewListAndAdd}
                              disabled={!newListName.trim()}
                            >
                              <Text style={styles.reviewFooterButtonPrimaryText}>
                                Create & add
                              </Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              style={[
                                styles.reviewFooterButton,
                                styles.reviewFooterButtonPrimary,
                                selectedIds.length === 0 &&
                                  styles.reviewFooterButtonDisabled,
                              ]}
                              onPress={submitLists}
                              disabled={selectedIds.length === 0}
                            >
                              <Text style={styles.reviewFooterButtonPrimaryText}>
                                Add to{" "}
                                {selectedIds.length > 0 ? `${selectedIds.length} ` : ""}
                                List{selectedIds.length !== 1 ? "s" : ""}
                              </Text>
                            </Pressable>
                          )
                        )}
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                </SafeAreaView>
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
  reviewSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  reviewSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  reviewSheetKeyboard: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  reviewSheetSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
    paddingTop: 12,
  },
  reviewSheet: {
    backgroundColor: "#f7f7f5",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderBottomWidth: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 18,
  },
  reviewSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
    marginTop: 12,
  },
  reviewSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fafaf9",
  },
  reviewSheetEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 4,
  },
  reviewSheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#111827",
  },
  reviewSheetCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reviewSheetScroll: {
    maxHeight: 520,
  },
  reviewSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 18,
  },
  reviewAlbumCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    gap: 14,
  },
  reviewAlbumArt: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  reviewAlbumArtFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAlbumMeta: {
    flex: 1,
    minWidth: 0,
  },
  reviewAlbumTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  reviewAlbumArtist: {
    fontSize: 14,
    lineHeight: 19,
    color: "#6b7280",
  },
  reviewErrorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  reviewErrorBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#991b1b",
  },
  reviewSection: {
    gap: 8,
  },
  reviewSectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  reviewSectionHelper: {
    fontSize: 12,
    lineHeight: 17,
    color: "#6b7280",
  },
  reviewTextInput: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#111827",
  },
  reviewTextArea: {
    minHeight: 156,
    paddingTop: 14,
  },
  reviewVisibilityList: {
    gap: 10,
  },
  reviewVisibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  reviewVisibilityOptionSelected: {
    borderColor: "#111827",
    backgroundColor: "#f3f4f6",
  },
  reviewVisibilityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  reviewVisibilityIconWrapSelected: {
    backgroundColor: "#e5e7eb",
  },
  reviewVisibilityCopy: {
    flex: 1,
    minWidth: 0,
  },
  reviewVisibilityLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  reviewVisibilityDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#6b7280",
  },
  reviewVisibilityRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  reviewVisibilityRadioSelected: {
    borderColor: "#111827",
  },
  reviewVisibilityRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#111827",
  },
  reviewSheetFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fafaf9",
  },
  reviewFooterButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  reviewFooterButtonPrimary: {
    backgroundColor: "#111827",
  },
  reviewFooterButtonSecondary: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  reviewFooterButtonDisabled: {
    opacity: 0.6,
  },
  reviewFooterButtonPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  reviewFooterButtonSecondaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  listSheet: {
    backgroundColor: "#f7f7f5",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderBottomWidth: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 18,
    maxHeight: "100%",
  },
  listSheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#111827",
  },
  listSheetSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },
  listSheetScroll: {
    maxHeight: 540,
  },
  listSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 18,
  },
  listSheetStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
  },
  listSheetStatusText: {
    fontSize: 14,
    color: "#6b7280",
  },
  listSheetErrorCopy: {
    flex: 1,
    gap: 12,
  },
  listSheetErrorActions: {
    flexDirection: "row",
    gap: 10,
  },
  listCreateCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 16,
    gap: 14,
  },
  listCreateTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "#111827",
  },
  listCreateSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },
  listCreateTextArea: {
    minHeight: 110,
    paddingTop: 14,
  },
  listSelectionSection: {
    gap: 12,
  },
  listCreateInlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
  },
  listCreateInlineButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  listSelectionList: {
    gap: 10,
  },
  listSelectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  listSelectionCardSelected: {
    backgroundColor: "#f3f4f6",
    borderColor: "#111827",
  },
  listSelectionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  listSelectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  listSelectionMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: "#6b7280",
  },
  listSelectionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  listSelectionCheckSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  listEmptyCard: {
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  listEmptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  listEmptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 4,
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
  inputHelperText: {
    fontSize: 12,
    color: "#6B7280",
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
  actionSheet: {
    backgroundColor: "#f7f7f5",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderBottomWidth: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 18,
  },
  actionSheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#111827",
  },
  actionSheetSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },
  actionSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 12,
  },
  actionChoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    paddingVertical: 15,
    gap: 12,
  },
  actionChoiceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  actionChoiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionChoiceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  actionChoiceDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#6b7280",
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
  otherAlbumsContainer: {
    minHeight: 120,
  },
  otherAlbumsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  otherAlbumTile: {
    width: "30.5%",
    minWidth: 92,
  },
  otherAlbumImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginBottom: 8,
  },
  otherAlbumFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  otherAlbumTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#111827",
  },
  otherAlbumMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  otherAlbumsEmptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },
  bottomNavSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  bottomNavTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  bottomNavRow: {
    gap: 12,
  },
  bottomNavButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bottomNavIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bottomNavMeta: {
    flex: 1,
    minWidth: 0,
  },
  bottomNavLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  bottomNavCaption: {
    marginTop: 3,
    fontSize: 13,
    color: "#6b7280",
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
