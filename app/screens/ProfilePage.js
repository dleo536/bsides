import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import defaultProfileImage from "../../assets/defaultProfilePicture.png";
import { auth } from "../config/firebase";
import { getListByUID, getMyLikedLists, postList } from "../api/ListAPI";
import { getReviewsByUID } from "../api/ReviewAPI";
import { getAlbum } from "../api/SpotifyAPI";
import ListElement from "../components/listElement";

const Tab = createMaterialTopTabNavigator();
const TOP_ALBUM_LIMIT = 5;
const BACKLOG_GRID_GAP = 10;
const BACKLOG_GRID_PADDING = 16;
const BACKLOG_TILE_SIZE =
  (Dimensions.get("window").width - BACKLOG_GRID_PADDING * 2 - BACKLOG_GRID_GAP * 3) / 4;

const normalizeListValue = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const findFavoritesList = (lists) => {
  if (!Array.isArray(lists)) {
    return null;
  }

  return (
    lists.find((list) => normalizeListValue(list?.listType) === "favorites") ||
    lists.find((list) => {
      const normalizedTitle = normalizeListValue(list?.title || list?.listName);
      const normalizedSlug = normalizeListValue(list?.slug);

      return (
        normalizedSlug === "favorites" ||
        normalizedTitle === "favorites" ||
        normalizedTitle === "favorite albums"
      );
    }) ||
    null
  );
};

const isBacklogList = (list) => {
  const normalizedTitle = normalizeListValue(list?.title || list?.listName);
  const normalizedSlug = normalizeListValue(list?.slug);

  return normalizedSlug === "backlog" || normalizedTitle === "backlog";
};

const findBacklogList = (lists) => {
  if (!Array.isArray(lists)) {
    return null;
  }

  return lists.find((list) => isBacklogList(list)) || null;
};

const formatJoinLabel = (creationTime) => {
  if (!creationTime) {
    return "Member";
  }

  const date = new Date(creationTime);
  if (Number.isNaN(date.getTime())) {
    return "Member";
  }

  return `Joined ${date.getFullYear()}`;
};

const formatHistoryDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const ProfileActionSheet = ({ visible, onClose, onSignOut, user }) => (
  <Modal
    animationType="fade"
    transparent
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.sheetRoot}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Profile actions</Text>
        <Text style={styles.sheetSubtitle}>
          {user?.email || user?.displayName || "Manage your account"}
        </Text>
        <Pressable style={styles.sheetActionButton} onPress={onSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#9f1239" />
          <Text style={styles.sheetActionText}>Sign out</Text>
        </Pressable>
        <Pressable style={styles.sheetCancelButton} onPress={onClose}>
          <Text style={styles.sheetCancelText}>Close</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const TopAlbumCard = ({ album, index }) => {
  const artistNames =
    Array.isArray(album?.artists) && album.artists.length > 0
      ? album.artists.map((artist) => artist?.name).filter(Boolean).join(", ")
      : "Unknown Artist";
  const coverUri = album?.images?.[0]?.url;

  if (!album) {
    return (
      <View style={[styles.topAlbumCard, styles.topAlbumPlaceholderCard]}>
        <View style={styles.topAlbumPlaceholderCover}>
          <Ionicons name="add" size={22} color="#6b7280" />
        </View>
        <Text style={styles.topAlbumPlaceholderTitle}>Open slot</Text>
        <Text style={styles.topAlbumPlaceholderSubtitle}>Add more favorites</Text>
      </View>
    );
  }

  return (
    <View style={styles.topAlbumCard}>
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={styles.topAlbumCover} />
      ) : (
        <View style={[styles.topAlbumCover, styles.topAlbumCoverFallback]}>
          <Text style={styles.topAlbumCoverFallbackText}>
            {(album?.name || "Album").slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.rankBadge}>
        <Text style={styles.rankBadgeText}>#{index + 1}</Text>
      </View>
      <Text style={styles.topAlbumTitle} numberOfLines={1}>
        {album?.name || "Untitled Album"}
      </Text>
      <Text style={styles.topAlbumArtist} numberOfLines={1}>
        {artistNames}
      </Text>
    </View>
  );
};

const toBacklogAlbumEntry = (albumId, albumData) => {
  const artistNames =
    Array.isArray(albumData?.artists) && albumData.artists.length > 0
      ? albumData.artists.map((artist) => artist?.name).filter(Boolean).join(", ")
      : "Unknown Artist";
  const releaseYear =
    typeof albumData?.release_date === "string" && albumData.release_date.length >= 4
      ? albumData.release_date.slice(0, 4)
      : null;

  return {
    id: albumData?.id || albumId,
    spotifyId: albumId,
    albumData: albumData || null,
    title: albumData?.name || "Album unavailable",
    artistNames,
    releaseYear,
    coverUrl: albumData?.images?.[0]?.url || null,
  };
};

const BacklogAlbumTile = ({ album, onPress }) => (
  <TouchableOpacity
    style={styles.backlogAlbumTile}
    onPress={onPress}
    disabled={!album?.albumData}
    activeOpacity={album?.albumData ? 0.84 : 1}
  >
    {album?.coverUrl ? (
      <Image source={{ uri: album.coverUrl }} style={styles.backlogAlbumCover} />
    ) : (
      <View style={[styles.backlogAlbumCover, styles.backlogAlbumCoverFallback]}>
        <Text style={styles.backlogAlbumCoverFallbackText}>
          {(album?.title || "Album").slice(0, 1).toUpperCase()}
        </Text>
      </View>
    )}
    <View style={styles.backlogAlbumMetaWrap}>
      <Text style={styles.backlogAlbumTitle} numberOfLines={1}>
        {album?.title || "Untitled Album"}
      </Text>
      <Text style={styles.backlogAlbumArtist} numberOfLines={1}>
        {album?.artistNames || "Unknown Artist"}
      </Text>
      {album?.releaseYear ? (
        <Text style={styles.backlogAlbumMeta}>{album.releaseYear}</Text>
      ) : null}
    </View>
  </TouchableOpacity>
);

const HistoryReviewCard = ({ review }) => {
  const createdLabel = formatHistoryDate(review?.createdAt || review?.date);
  const ratingLabel =
    review?.ratingHalfSteps || review?.ratingHalfSteps === 0
      ? `${(Number(review.ratingHalfSteps) / 2).toFixed(1)}/5`
      : review?.rating
      ? `${review.rating}/5`
      : null;

  return (
    <View style={styles.historyReviewCard}>
      <View style={styles.historyReviewRow}>
        {review?.albumCover ? (
          <Image source={{ uri: review.albumCover }} style={styles.historyReviewCover} />
        ) : (
          <View style={[styles.historyReviewCover, styles.historyReviewCoverFallback]}>
            <Text style={styles.historyReviewCoverFallbackText}>
              {(review?.albumName || "A").slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.historyReviewContent}>
          <Text style={styles.historyReviewAlbum} numberOfLines={1}>
            {review?.albumName || "Unknown Album"}
          </Text>
          <Text style={styles.historyReviewArtist} numberOfLines={1}>
            {review?.artistName || "Unknown Artist"}
          </Text>

          <View style={styles.historyMetaRow}>
            {ratingLabel ? (
              <View style={styles.historyMetaPill}>
                <Text style={styles.historyMetaPillText}>{ratingLabel}</Text>
              </View>
            ) : null}
            {createdLabel ? (
              <Text style={styles.historyReviewDate}>Reviewed {createdLabel}</Text>
            ) : null}
          </View>

          {review?.reviewBody ? (
            <Text style={styles.historyReviewBody} numberOfLines={4}>
              {review.reviewBody}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const ProfileEntryCard = ({
  title,
  subtitle,
  countLabel,
  iconName,
  onPress,
  integrated = false,
}) => (
  <TouchableOpacity
    style={[styles.profileEntryCard, integrated && styles.profileEntryCardIntegrated]}
    onPress={onPress}
    activeOpacity={0.88}
  >
    <View
      style={[
        styles.profileEntryIconWrap,
        integrated && styles.profileEntryIconWrapIntegrated,
      ]}
    >
      <Ionicons
        name={iconName}
        size={20}
        color={integrated ? "#111827" : "#111827"}
      />
    </View>
    <View style={styles.profileEntryTextWrap}>
      <Text
        style={[styles.profileEntryTitle, integrated && styles.profileEntryTitleIntegrated]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.profileEntrySubtitle,
          integrated && styles.profileEntrySubtitleIntegrated,
        ]}
      >
        {subtitle}
      </Text>
    </View>
    <View style={styles.profileEntryMetaWrap}>
      <Text
        style={[styles.profileEntryCount, integrated && styles.profileEntryCountIntegrated]}
      >
        {countLabel}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={integrated ? "#6b7280" : "#6b7280"}
      />
    </View>
  </TouchableOpacity>
);

const ProfileTab = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(auth.currentUser);
  const [lists, setLists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [likedListsCount, setLikedListsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [topAlbumsLoading, setTopAlbumsLoading] = useState(false);
  const [profileDataLoading, setProfileDataLoading] = useState(true);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  const favoritesList = useMemo(() => findFavoritesList(lists), [lists]);
  const favoriteCount = Array.isArray(favoritesList?.albumIds)
    ? favoritesList.albumIds.length
    : 0;
  const topAlbumSlots = useMemo(
    () => Array.from({ length: TOP_ALBUM_LIMIT }, (_, index) => topAlbums[index] || null),
    [topAlbums]
  );
  const joinLabel = useMemo(
    () => formatJoinLabel(user?.metadata?.creationTime),
    [user?.metadata?.creationTime]
  );

  const loadTopAlbums = useCallback(async (resolvedLists) => {
    const nextFavoritesList = findFavoritesList(resolvedLists);
    const favoriteAlbumIds = Array.isArray(nextFavoritesList?.albumIds)
      ? nextFavoritesList.albumIds.filter(Boolean).slice(0, TOP_ALBUM_LIMIT)
      : [];

    if (favoriteAlbumIds.length === 0) {
      setTopAlbums([]);
      setTopAlbumsLoading(false);
      return;
    }

    setTopAlbumsLoading(true);

    try {
      const results = await Promise.allSettled(
        favoriteAlbumIds.map((albumId) => getAlbum(albumId))
      );
      const resolvedAlbums = results.flatMap((result) =>
        result.status === "fulfilled" && result.value ? [result.value] : []
      );
      setTopAlbums(resolvedAlbums);
    } finally {
      setTopAlbumsLoading(false);
    }
  }, []);

  const loadProfileData = useCallback(
    async (firebaseUser = auth.currentUser) => {
      if (!firebaseUser?.uid) {
        setLists([]);
        setTopAlbums([]);
        setLikedListsCount(0);
        setTopAlbumsLoading(false);
        setProfileDataLoading(false);
        return;
      }

      setProfileDataLoading(true);

      try {
        const [listsResult, likedListsResult] = await Promise.allSettled([
          getListByUID(firebaseUser.uid),
          getMyLikedLists(firebaseUser.uid, { offset: 0, limit: 1 }),
        ]);
        const nextLists =
          listsResult.status === "fulfilled" && Array.isArray(listsResult.value)
            ? listsResult.value
            : [];
        const nextLikedListsCount =
          likedListsResult.status === "fulfilled"
            ? Number(likedListsResult.value?.totalCount || 0)
            : 0;

        setLists(nextLists);
        setLikedListsCount(nextLikedListsCount);
        await loadTopAlbums(nextLists);
      } catch (error) {
        console.error("Profile data load error:", error);
        setLists([]);
        setTopAlbums([]);
        setLikedListsCount(0);
        setTopAlbumsLoading(false);
      } finally {
        setProfileDataLoading(false);
      }
    },
    [loadTopAlbums]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        setUser(nextUser);
        loadProfileData(nextUser);
      } else {
        navigation.replace("Landing");
      }
    });

    return () => unsubscribe();
  }, [loadProfileData, navigation]);

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();

      parent?.setOptions({
        headerTitle: user?.displayName || "Profile",
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setActionModalVisible(true)}
            style={styles.headerActionButton}
          >
            <Ionicons name="ellipsis-horizontal-outline" size={22} color="#111827" />
          </TouchableOpacity>
        ),
      });

      if (auth.currentUser?.uid) {
        loadProfileData(auth.currentUser);
      }

      return () => {
        setActionModalVisible(false);
      };
    }, [loadProfileData, navigation, user?.displayName])
  );

  const handleSignOut = useCallback(() => {
    setActionModalVisible(false);
    signOut(auth)
      .then(() => {
        navigation.replace("Landing");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    if (!auth.currentUser) {
      return;
    }

    setRefreshing(true);

    try {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
      await loadProfileData(auth.currentUser);
    } catch (error) {
      console.error("Profile refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadProfileData]);

  const openLikedLists = useCallback(() => {
    navigation.navigate("LikedListsPage");
  }, [navigation]);

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.profileScreen}>
        <ProfileActionSheet
          visible={actionModalVisible}
          onClose={() => setActionModalVisible(false)}
          onSignOut={handleSignOut}
          user={user}
        />
        <ScrollView
          contentContainerStyle={styles.profileScrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <LinearGradient
            colors={["#fff5cc", "#ffffff", "#f3f4f6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCanvas}
          >
            <View style={styles.profileHeroSection}>
              <Image
                source={user.photoURL ? { uri: user.photoURL } : defaultProfileImage}
                style={styles.profileImage}
              />
              <Text style={styles.heroTitle}>
                {user.displayName || "Make this profile yours"}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{joinLabel}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{favoriteCount} in Favorites</Text>
                </View>
              </View>
            </View>

            <View style={styles.canvasDivider} />

            <View style={styles.inlineSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionEyebrow}>TASTE SHELF</Text>
                  <Text style={styles.sectionTitle}>Top 5 Albums</Text>
                  <Text style={styles.sectionSubtitle}>
                    {favoritesList
                      ? "Pulled from the first five albums in your Favorites list."
                      : "Fill your Favorites list to start showing off your taste."}
                  </Text>
                </View>
                <View style={styles.sectionPill}>
                  <Text style={styles.sectionPillText}>{topAlbums.length}/5</Text>
                </View>
              </View>

              {topAlbumsLoading ? (
                <View style={styles.loadingShelfRow}>
                  <ActivityIndicator size="small" color="#111827" />
                  <Text style={styles.loadingShelfText}>Curating your shelf...</Text>
                </View>
              ) : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topAlbumsRail}
              >
                {topAlbumSlots.map((album, index) => (
                  <TopAlbumCard
                    key={album?.id || `top-album-slot-${index}`}
                    album={album}
                    index={index}
                  />
                ))}
              </ScrollView>

              {!profileDataLoading && !topAlbumsLoading && topAlbums.length === 0 ? (
                <Text style={styles.emptyShelfText}>
                  Your Favorites list is still blank. Add a few albums from the Lists tab and
                  this profile shelf will start to feel like you.
                </Text>
              ) : null}
            </View>

            <View style={styles.canvasDivider} />

            <View style={styles.inlineSection}>
              <ProfileEntryCard
                title="Liked Lists"
                subtitle="Revisit the lists you gave a thumbs up."
                countLabel={`${likedListsCount}`}
                iconName="thumbs-up-outline"
                onPress={openLikedLists}
                integrated
              />
            </View>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const HistoryTab = () => {
  const navigation = useNavigation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!auth.currentUser?.uid) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await getReviewsByUID(auth.currentUser.uid);
      setReviews(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("History fetch error:", error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({
        headerTitle: "History",
        headerRight: () => null,
      });

      loadReviews();
    }, [loadReviews, navigation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReviews().finally(() => {
      setRefreshing(false);
    });
  }, [loadReviews]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={(item, index) =>
              item?.id?.toString?.() || `history-review-${index}`
            }
            renderItem={({ item }) => <HistoryReviewCard review={item} />}
            contentContainerStyle={
              reviews.length === 0 ? styles.historyEmptyContent : styles.historyListContent
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListHeaderComponent={
              reviews.length > 0 ? (
                <View style={styles.historyHeader}>
                  <Text style={styles.historyHeaderTitle}>Review History</Text>
                  <View style={styles.historyCountPill}>
                    <Text style={styles.historyCountPillText}>
                      {reviews.length} review{reviews.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.historyEmptyState}>
                <Text style={styles.historyEmptyTitle}>No reviews yet.</Text>
                <Text style={styles.historyEmptyBody}>
                  Reviews you write will show up here with the date they were created.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const BacklogTab = () => {
  const navigation = useNavigation();
  const [backlogAlbums, setBacklogAlbums] = useState([]);
  const [backlogItemCount, setBacklogItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBacklogAlbums = useCallback(async () => {
    if (!auth.currentUser?.uid) {
      setBacklogAlbums([]);
      setBacklogItemCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await getListByUID(auth.currentUser.uid);
      const userLists = Array.isArray(response) ? response : [];
      const backlogList = findBacklogList(userLists);
      const backlogAlbumIds = Array.isArray(backlogList?.albumIds)
        ? backlogList.albumIds.filter(Boolean)
        : Array.isArray(backlogList?.albumList)
        ? backlogList.albumList.filter(Boolean)
        : [];
      setBacklogItemCount(backlogAlbumIds.length);

      if (backlogAlbumIds.length === 0) {
        setBacklogAlbums([]);
        return;
      }

      const results = await Promise.allSettled(
        backlogAlbumIds.map((albumId) => getAlbum(albumId))
      );
      const nextAlbums = results.map((result, index) =>
        toBacklogAlbumEntry(
          backlogAlbumIds[index],
          result.status === "fulfilled" ? result.value : null
        )
      );

      setBacklogAlbums(nextAlbums);
    } catch (error) {
      console.error("Backlog fetch error:", error);
      setBacklogAlbums([]);
      setBacklogItemCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({
        headerTitle: "Backlog",
        headerRight: () => null,
      });

      loadBacklogAlbums();
    }, [loadBacklogAlbums, navigation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBacklogAlbums().finally(() => {
      setRefreshing(false);
    });
  }, [loadBacklogAlbums]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={backlogAlbums}
            numColumns={4}
            keyExtractor={(item, index) =>
              item?.id?.toString?.() || item?.spotifyId || `backlog-album-${index}`
            }
            renderItem={({ item }) => (
              <BacklogAlbumTile
                album={item}
                onPress={() =>
                  item?.albumData
                    ? navigation.navigate("AlbumPage", { album: item.albumData })
                    : null
                }
              />
            )}
            contentContainerStyle={styles.backlogGridContent}
            columnWrapperStyle={styles.backlogGridRow}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListHeaderComponent={
              <View style={styles.backlogSectionHeader}>
                <Text style={styles.backlogSectionTitle}>Backlog</Text>
                <View style={styles.backlogCountPill}>
                  <Text style={styles.backlogCountPillText}>
                    {backlogItemCount} album{backlogItemCount === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.backlogEmptyState}>
                <Text style={styles.backlogEmptyTitle}>Your backlog is empty.</Text>
                <Text style={styles.backlogEmptyBody}>
                  Add albums to your backlog and they will show up here.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const ListsTab = () => {
  const navigation = useNavigation();
  const [lists, setLists] = useState([]);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const visibleLists = useMemo(
    () => lists.filter((list) => !isBacklogList(list)),
    [lists]
  );

  const fetchUserLists = useCallback(async () => {
    if (!auth.currentUser) return;
    const response = await getListByUID(auth.currentUser.uid);
    setLists(Array.isArray(response) ? response : []);
  }, []);

  useEffect(() => {
    if (auth.currentUser) {
      fetchUserLists();
    }
  }, [fetchUserLists]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserLists().finally(() => {
      setRefreshing(false);
    });
  }, [fetchUserLists]);

  const createNewList = async () => {
    if (!auth.currentUser) return;
    await postList(auth.currentUser.uid, listDescription, listName);
    setListModalVisible(false);
    setListName("");
    setListDescription("");
    fetchUserLists();
  };

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setListModalVisible(true)}
            style={styles.headerActionButton}
          >
            <Ionicons name="add-outline" size={24} color="#111827" />
          </TouchableOpacity>
        ),
        headerTitle: "My Lists",
      });
    }, [navigation])
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Modal
          animationType="slide"
          transparent
          visible={listModalVisible}
          onRequestClose={() => setListModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Create a List!</Text>
              <TextInput
                placeholder="List Name"
                value={listName}
                onChangeText={(text) => setListName(text)}
                style={styles.input}
              />
              <TextInput
                placeholder="List Description"
                value={listDescription}
                onChangeText={(text) => setListDescription(text)}
                style={styles.input}
              />
              <Pressable
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={createNewList}
              >
                <Text style={styles.modalPrimaryButtonText}>Create List</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalSecondaryButton]}
                onPress={() => {
                  setListModalVisible(false);
                  setListName("");
                  setListDescription("");
                }}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <ScrollView
          contentContainerStyle={styles.listScrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.lists}>
            {visibleLists.length > 0 ? (
              <FlatList
                data={visibleLists}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ListElement list={item} />}
                style={styles.listElement}
              />
            ) : (
              <Text style={styles.noListsText}>No Lists Created Yet</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const ProfilePage = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Profile" component={ProfileTab} />
      <Tab.Screen name="Lists" component={ListsTab} />
      <Tab.Screen name="History" component={HistoryTab} />
      <Tab.Screen name="Backlog" component={BacklogTab} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileScreen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  profileScrollContent: {
    paddingTop: 0,
    paddingBottom: 28,
  },
  headerActionButton: {
    marginRight: 12,
    padding: 4,
  },
  profileCanvas: {
    overflow: "hidden",
  },
  profileHeroSection: {
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#ffffff",
    marginBottom: 18,
    backgroundColor: "#d1d5db",
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111827",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    justifyContent: "center",
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17, 24, 39, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(17, 24, 39, 0.04)",
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  canvasDivider: {
    height: 1,
    backgroundColor: "rgba(17, 24, 39, 0.08)",
  },
  inlineSection: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: "#6b7280",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },
  sectionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17, 24, 39, 0.06)",
  },
  sectionPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  loadingShelfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  loadingShelfText: {
    color: "#6b7280",
    fontSize: 13,
  },
  topAlbumsRail: {
    gap: 10,
    paddingTop: 18,
    paddingBottom: 4,
    paddingRight: 18,
  },
  topAlbumCard: {
    width: 104,
  },
  topAlbumCover: {
    width: 104,
    height: 104,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    borderWidth: 1,
    borderColor: "rgba(17, 24, 39, 0.08)",
  },
  topAlbumCoverFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  topAlbumCoverFallbackText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#4b5563",
  },
  rankBadge: {
    alignSelf: "flex-start",
    marginTop: 9,
    marginBottom: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(17, 24, 39, 0.08)",
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
  },
  topAlbumTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  topAlbumArtist: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  topAlbumPlaceholderCard: {
    justifyContent: "flex-start",
  },
  topAlbumPlaceholderCover: {
    width: 104,
    height: 104,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9ca3af",
    backgroundColor: "rgba(17, 24, 39, 0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  topAlbumPlaceholderTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  topAlbumPlaceholderSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  emptyShelfText: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: "#6b7280",
  },
  profileEntryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  profileEntryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileEntryTextWrap: {
    flex: 1,
  },
  profileEntryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  profileEntrySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
  profileEntryMetaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileEntryCount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  profileEntryCardIntegrated: {
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  profileEntryIconWrapIntegrated: {
    backgroundColor: "rgba(17, 24, 39, 0.06)",
  },
  profileEntryTitleIntegrated: {
    color: "#111827",
  },
  profileEntrySubtitleIntegrated: {
    color: "#6b7280",
  },
  profileEntryCountIntegrated: {
    color: "#111827",
  },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  sheetSubtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: "#6b7280",
  },
  sheetActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#fff1f2",
  },
  sheetActionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9f1239",
  },
  sheetCancelButton: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.22)",
    paddingHorizontal: 20,
  },
  modalView: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalText: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  input: {
    width: "100%",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 12,
  },
  modalButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 14,
  },
  modalPrimaryButton: {
    backgroundColor: "#111827",
  },
  modalPrimaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  modalSecondaryButton: {
    backgroundColor: "#f3f4f6",
  },
  modalSecondaryButtonText: {
    color: "#111827",
    fontWeight: "700",
  },
  listScrollContent: {
    flexGrow: 1,
    paddingVertical: 12,
  },
  historyListContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  historyEmptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  historyHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  historyCountPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  historyCountPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  historyEmptyState: {
    alignItems: "center",
  },
  historyEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  historyEmptyBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
  },
  historyReviewCard: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eceff3",
  },
  historyReviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  historyReviewCover: {
    width: 74,
    height: 74,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  historyReviewCoverFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  historyReviewCoverFallbackText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4b5563",
  },
  historyReviewContent: {
    flex: 1,
    marginLeft: 14,
  },
  historyReviewAlbum: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  historyReviewArtist: {
    marginTop: 2,
    fontSize: 13,
    color: "#6b7280",
  },
  historyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  historyMetaPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  historyMetaPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  historyReviewDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  historyReviewBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
  backlogGridContent: {
    paddingHorizontal: BACKLOG_GRID_PADDING,
    paddingTop: 14,
    paddingBottom: 28,
  },
  backlogGridRow: {
    justifyContent: "flex-start",
    gap: BACKLOG_GRID_GAP,
  },
  backlogSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backlogSectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  backlogCountPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  backlogCountPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  backlogEmptyState: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 28,
  },
  backlogEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  backlogEmptyBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
  },
  backlogAlbumTile: {
    width: BACKLOG_TILE_SIZE,
    marginBottom: 18,
  },
  backlogAlbumCover: {
    width: BACKLOG_TILE_SIZE,
    height: BACKLOG_TILE_SIZE,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  backlogAlbumCoverFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  backlogAlbumCoverFallbackText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4b5563",
  },
  backlogAlbumMetaWrap: {
    paddingTop: 8,
  },
  backlogAlbumTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 14,
  },
  backlogAlbumArtist: {
    marginTop: 2,
    fontSize: 10,
    color: "#6b7280",
  },
  backlogAlbumMeta: {
    marginTop: 3,
    fontSize: 10,
    color: "#9ca3af",
  },
  lists: {
    width: "100%",
    paddingHorizontal: 16,
  },
  listElement: {
    width: "100%",
  },
  noListsText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 30,
  },
});

export default ProfilePage;
