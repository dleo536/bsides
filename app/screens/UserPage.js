import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  getAlbum,
  getAlbumsByName,
  getArtistPhotoByAlbum,
} from "../api/SpotifyAPI";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
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
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { auth } from "../config/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { postReview } from "../api/ReviewAPI";
import { Review } from "../logic/Review";
import { getListByUID, patchAlbumList } from "../api/ListAPI";
import { List } from "../logic/List";
import { getAlbumsMixedBy } from "../api/MusicBrainz";
import { getAlbumList } from "../api/SpotifyAPI";
import { getProfileIdentity } from "../logic/profileIdentity";
import ListElement from "../components/listElement";
import { getReviewsByUID } from "../api/ReviewAPI";
import ReviewElement from "../components/reviewElement";
import defaultProfileImage from "../../assets/defaultProfilePicture.png";
import {
  followUser,
  getCurrentUserProfile,
  getFollowState,
  getProfileImageForUser,
  getUserByIdentifier,
  unfollowUser,
} from "../api/UserAPI";
import {
  blockUserAccount,
  getUserBlockState,
  submitContentReport,
  unblockUserAccount,
} from "../api/ModerationAPI";
import ReportContentModal from "../components/ReportContentModal";
import UserSafetySheet from "../components/UserSafetySheet";

const BACKLOG_GRID_GAP = 10;
const BACKLOG_GRID_PADDING = 16;
const BACKLOG_TILE_SIZE =
  (Dimensions.get("window").width - BACKLOG_GRID_PADDING * 2 - BACKLOG_GRID_GAP * 3) / 4;

const normalizeListValue = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

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

const UserPage = () => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const navigation = useNavigation();
  const route = useRoute();
  const { user } = route.params; // 👈 user object passed in

  const [profileUser, setProfileUser] = useState(user);
  const [currentAppUser, setCurrentAppUser] = useState(null);
  const [activeTab, setActiveTab] = useState("lists");
  const [lists, setLists] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [backlogAlbums, setBacklogAlbums] = useState([]);
  const [backlogItemCount, setBacklogItemCount] = useState(0);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [profileImage, setProfileImage] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [followStateLoading, setFollowStateLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followError, setFollowError] = useState("");
  const [blockState, setBlockState] = useState({
    blocked: false,
    blockedByYou: false,
    blockedByUser: false,
    isSelf: false,
  });
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [safetySheetVisible, setSafetySheetVisible] = useState(false);

  const currentUid = auth?.currentUser?.uid;
  const routeUserIdentifier = user?.id || user?.uid;
  const profileUserIdentifier =
    profileUser?.id || profileUser?.uid || routeUserIdentifier;
  const profileIdentity = getProfileIdentity({
    ...(user || {}),
    ...(profileUser || {}),
  });
  const isOwnProfile =
    !!currentUid &&
    (currentUid === profileUser?.uid ||
      currentAppUser?.id === profileUser?.id ||
      currentAppUser?.id === profileUserIdentifier ||
      currentUid === profileUserIdentifier);
  const profileDisplayName = profileIdentity.title;
  const profileUsername = profileIdentity.username;
  const profileHandle = profileIdentity.handle;
  const profileSecondaryLabel = profileIdentity.subtitle;
  const followersCount = profileUser?.followersCount ?? 0;
  const followingCount = profileUser?.followingCount ?? 0;
  const blockedByYou = Boolean(blockState?.blockedByYou);
  const blockedByUser = Boolean(blockState?.blockedByUser);
  const showSafetyMenu = Boolean(profileUserIdentifier && !isOwnProfile);
  const visibleLists = useMemo(
    () => (Array.isArray(lists) ? lists.filter((list) => !isBacklogList(list)) : []),
    [lists]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: profileHandle || profileDisplayName,
      headerRight: showSafetyMenu
        ? () => (
            <TouchableOpacity
              onPress={() => setSafetySheetVisible(true)}
              style={styles.headerActionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="ellipsis-horizontal-outline"
                size={22}
                color="#111827"
              />
            </TouchableOpacity>
          )
        : () => null,
    });
  }, [
    navigation,
    profileDisplayName,
    profileHandle,
    profileUsername,
    showSafetyMenu,
  ]);

  useEffect(() => {
    setProfileUser(user);
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const loadCurrentAppUser = async () => {
      if (!currentUid) {
        if (mounted) {
          setCurrentAppUser(null);
        }
        return;
      }

      const currentUser = await getCurrentUserProfile();
      if (mounted) {
        setCurrentAppUser(currentUser || null);
      }
    };

    loadCurrentAppUser();

    return () => {
      mounted = false;
    };
  }, [currentUid]);

  useEffect(() => {
    if (!routeUserIdentifier) return;

    let mounted = true;
    const loadProfileUser = async () => {
      const latestUser = await getUserByIdentifier(routeUserIdentifier);
      if (mounted && latestUser) {
        setProfileUser((currentUser) => ({
          ...(currentUser || {}),
          ...latestUser,
        }));
      }
    };

    loadProfileUser();

    return () => {
      mounted = false;
    };
  }, [routeUserIdentifier]);

  useEffect(() => {
    if (activeTab === "lists") {
      getLists();
    } else if (activeTab === "reviews") {
      getReviews();
    } else if (activeTab === "backlog") {
      getBacklogAlbums();
    }
  }, [activeTab, profileUserIdentifier]);
  useEffect(() => {
    let mounted = true;
    const loadProfileImage = async () => {
      const image = await getProfileImageForUser(profileUser);
      if (mounted) {
        setProfileImage(image || "");
      }
    };

    loadProfileImage();

    return () => {
      mounted = false;
    };
  }, [
    profileUser?.id,
    profileUser?.uid,
    profileUser?.avatarUrl,
    profileUser?.photoURL,
  ]);

  useEffect(() => {
    if (!currentUid || !profileUserIdentifier || isOwnProfile) {
      setIsFollowing(false);
      setFollowStateLoading(false);
      setFollowError("");
      return;
    }

    let mounted = true;
    const loadFollowState = async () => {
      setFollowStateLoading(true);
      setFollowError("");
      try {
        const followState = await getFollowState(currentUid, profileUserIdentifier);
        if (mounted) {
          setIsFollowing(Boolean(followState?.following));
        }
      } catch (error) {
        console.error("loadFollowState error:", error);
        if (mounted) {
          setFollowError("Could not load follow status.");
        }
      } finally {
        if (mounted) {
          setFollowStateLoading(false);
        }
      }
    };

    loadFollowState();

    return () => {
      mounted = false;
    };
  }, [currentUid, isOwnProfile, profileUserIdentifier]);

  useEffect(() => {
    if (!currentUid || !profileUserIdentifier || isOwnProfile) {
      setBlockState({
        blocked: false,
        blockedByYou: false,
        blockedByUser: false,
        isSelf: Boolean(isOwnProfile),
      });
      return;
    }

    let mounted = true;

    const loadBlockState = async () => {
      try {
        const nextBlockState = await getUserBlockState(profileUserIdentifier);
        if (mounted) {
          setBlockState(
            nextBlockState || {
              blocked: false,
              blockedByYou: false,
              blockedByUser: false,
              isSelf: false,
            }
          );
        }
      } catch (error) {
        console.error("loadBlockState error:", error);
        if (mounted) {
          setBlockState({
            blocked: false,
            blockedByYou: false,
            blockedByUser: false,
            isSelf: false,
          });
        }
      }
    };

    loadBlockState();

    return () => {
      mounted = false;
    };
  }, [currentUid, isOwnProfile, profileUserIdentifier]);

  const getLists = async () => {
    if (!profileUserIdentifier) {
      setLists([]);
      return;
    }
    const userLists = await getListByUID(profileUserIdentifier);
    setLists(Array.isArray(userLists) ? userLists : []);
  };
  const getReviews = async () => {
    if (!profileUserIdentifier) {
      setReviews([]);
      return;
    }
    const userReviews = await getReviewsByUID(profileUserIdentifier);
    setReviews(Array.isArray(userReviews) ? userReviews : []);
  };

  const getBacklogAlbums = async () => {
    if (!profileUserIdentifier) {
      setBacklogAlbums([]);
      setBacklogItemCount(0);
      return;
    }

    setBacklogLoading(true);

    try {
      const userLists = await getListByUID(profileUserIdentifier);
      const backlogList = findBacklogList(Array.isArray(userLists) ? userLists : []);
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
      setBacklogLoading(false);
    }
  };

  const refreshProfileUser = async () => {
    if (!profileUserIdentifier) {
      return null;
    }

    const latestUser = await getUserByIdentifier(profileUserIdentifier);
    if (latestUser) {
      setProfileUser((currentUser) => ({
        ...(currentUser || {}),
        ...latestUser,
      }));
    }
    return latestUser;
  };

  // --- Follow handler ---
  const handleFollowPress = async () => {
    if (!currentUid) {
      Alert.alert("Sign in required", "Please sign in to follow users.");
      return;
    }
    if (!profileUserIdentifier) return;
    if (isOwnProfile) {
      Alert.alert("Unavailable", "You cannot follow yourself.");
      return;
    }
    if (blockedByYou || blockedByUser) {
      Alert.alert(
        "Unavailable",
        blockedByYou
          ? "Unblock this user before following them."
          : "Following is unavailable because one of you has blocked the other."
      );
      return;
    }

    try {
      setFollowLoading(true);
      setFollowError("");

      if (isFollowing) {
        const response = await unfollowUser(currentUid, profileUserIdentifier);
        setIsFollowing(Boolean(response?.following));
      } else {
        const response = await followUser(currentUid, profileUserIdentifier);
        setIsFollowing(Boolean(response?.following));
      }

      await refreshProfileUser();
    } catch (e) {
      console.error("handleFollowPress error:", e);
      setFollowError("Could not update follow status. Please try again.");
      Alert.alert("Error", "Could not update follow status. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSubmitReport = async ({ reason, details }) => {
    if (!profileUser?.id) {
      Alert.alert("Profile unavailable", "We could not resolve this profile for reporting.");
      return;
    }

    setReportSubmitting(true);

    try {
      await submitContentReport({
        targetType: "user",
        targetId: profileUser.id,
        reason,
        details,
      });
      setReportVisible(false);
      Alert.alert("Report received", "Thanks. We will review this profile.");
    } catch (error) {
      console.error("User report error:", error);
      Alert.alert("Could not report profile", "Please try again in a moment.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleOpenReport = () => {
    setSafetySheetVisible(false);

    if (!currentUid) {
      Alert.alert("Sign in required", "Please sign in to report profiles.");
      return;
    }

    setReportVisible(true);
  };

  const executeBlockToggle = async () => {
    if (!profileUserIdentifier) {
      return;
    }

    setBlockSubmitting(true);

    try {
      const response = blockedByYou
        ? await unblockUserAccount(profileUserIdentifier)
        : await blockUserAccount(profileUserIdentifier);

      setBlockState((currentState) => ({
        ...(currentState || {}),
        blocked: Boolean(response?.blocked),
        blockedByYou: Boolean(response?.blocked),
      }));
      setIsFollowing(false);

      if (response?.blocked) {
        setLists([]);
        setReviews([]);
        setBacklogAlbums([]);
        setBacklogItemCount(0);
        Alert.alert(
          "User blocked",
          "You will no longer see this user's profile, reviews, or lists in your feeds."
        );
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      } else {
        Alert.alert("User unblocked", "You can interact with this profile again.");
        await refreshProfileUser();
      }
    } catch (error) {
      console.error("Block toggle error:", error);
      Alert.alert(
        blockedByYou ? "Could not unblock user" : "Could not block user",
        "Please try again in a moment."
      );
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleBlockToggle = () => {
    setSafetySheetVisible(false);

    if (!currentUid) {
      Alert.alert("Sign in required", "Please sign in to manage blocked users.");
      return;
    }

    if (!profileUserIdentifier || isOwnProfile) {
      return;
    }

    Alert.alert(
      blockedByYou ? "Unblock user?" : "Block user?",
      blockedByYou
        ? "This user will be able to appear in your feeds again."
        : "You will stop seeing this user's profile, reviews, and lists.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: blockedByYou ? "Unblock" : "Block",
          style: blockedByYou ? "default" : "destructive",
          onPress: () => {
            executeBlockToggle();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <UserSafetySheet
        visible={safetySheetVisible}
        profileUsername={profileUsername}
        blocked={blockedByYou}
        blockSubmitting={blockSubmitting}
        onClose={() => {
          if (!blockSubmitting) {
            setSafetySheetVisible(false);
          }
        }}
        onReport={handleOpenReport}
        onToggleBlock={handleBlockToggle}
      />
      <ReportContentModal
        visible={reportVisible}
        title="Report Profile"
        targetLabel={`@${profileUsername || "this user"}`}
        onClose={() => {
          if (!reportSubmitting) {
            setReportVisible(false);
          }
        }}
        onSubmit={handleSubmitReport}
        submitting={reportSubmitting}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* --- Top Profile Section --- */}
        <View style={styles.profileHeader}>
          <Image
            source={profileImage ? { uri: profileImage } : defaultProfileImage}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.nameText} numberOfLines={2}>
              {profileDisplayName}
            </Text>
            {profileSecondaryLabel ? (
              <Text style={styles.usernameText} numberOfLines={1}>
                {profileSecondaryLabel}
              </Text>
            ) : null}
          </View>
          {/* --- Follow Button --- */}
          {!isOwnProfile && (
            <TouchableOpacity
              onPress={handleFollowPress}
              disabled={followLoading || followStateLoading}
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
                (followLoading || followStateLoading) && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isFollowing ? "Following" : "Follow"}
            >
              {followLoading || followStateLoading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text
                  style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText,
                  ]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        {followError ? <Text style={styles.followErrorText}>{followError}</Text> : null}

        {blockedByUser && !blockedByYou ? (
          <Text style={styles.blockNoticeText}>
            This user has blocked you. Follow and profile actions are limited.
          </Text>
        ) : null}

        {/* --- Stats Section --- */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* --- Tabs --- */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => {
              setActiveTab("lists");
              getLists();
            }}
            style={styles.tabButton}
          >
            <Text
              style={
                activeTab === "lists"
                  ? styles.activeTabText
                  : styles.inactiveTabText
              }
            >
              Lists
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setActiveTab("reviews");
              getReviews();
            }}
            style={styles.tabButton}
          >
            <Text
              style={
                activeTab === "reviews"
                  ? styles.activeTabText
                  : styles.inactiveTabText
              }
            >
              Reviews
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("backlog")}
            style={styles.tabButton}
          >
            <Text
              style={
                activeTab === "backlog"
                  ? styles.activeTabText
                  : styles.inactiveTabText
              }
            >
              Backlog
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- Tab Content --- */}
        <View style={styles.tabContent}>
          {activeTab === "lists" && (
            <View>
              <Text style={styles.sectionTitle}>My Lists</Text>

              {!Array.isArray(lists) ? (
                <Text style={styles.emptyText}>Loading lists...</Text>
              ) : visibleLists.length === 0 ? (
                <Text style={styles.emptyText}>No lists yet.</Text>
              ) : (
                visibleLists.map((list) => (
                  <ListElement
                    key={list.id}
                    list={list}
                    onPress={() =>
                      navigation.push("ListPage", {
                        list,
                        listId: list?.id || null,
                      })
                    }
                  />
                ))
              )}
            </View>
          )}

          {activeTab === "reviews" && (
            <View>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {!Array.isArray(reviews) ? (
                <Text style={styles.emptyText}>Loading reviews...</Text>
              ) : reviews.length === 0 ? (
                <Text style={styles.emptyText}>No reviews yet.</Text>
              ) : (
                reviews.map((review) => (
                  <ReviewElement key={review.id} review={review} />
                ))
              )}
            </View>
          )}

          {activeTab === "backlog" && (
            <View>
              <View style={styles.backlogSectionHeader}>
                <Text style={styles.sectionTitle}>Backlog</Text>
                <View style={styles.backlogCountPill}>
                  <Text style={styles.backlogCountPillText}>
                    {backlogItemCount} album{backlogItemCount === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
              {backlogLoading ? (
                <ActivityIndicator style={styles.loader} />
              ) : backlogAlbums.length === 0 ? (
                <View style={styles.backlogEmptyState}>
                  <Text style={styles.backlogEmptyTitle}>Backlog is empty.</Text>
                  <Text style={styles.backlogEmptyBody}>
                    This user has not added any albums to their backlog.
                  </Text>
                </View>
              ) : (
                <View style={styles.backlogGrid}>
                  {backlogAlbums.map((album, index) => (
                    <BacklogAlbumTile
                      key={album?.id?.toString?.() || album?.spotifyId || `backlog-album-${index}`}
                      album={album}
                      onPress={() =>
                        album?.albumData
                          ? navigation.push("AlbumPage", { album: album.albumData })
                          : null
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ccc",
  },
  profileInfo: {
    marginLeft: 16,
    marginRight: 12,
    flex: 1,
    minWidth: 0,
  },
  nameText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    flexShrink: 1,
  },
  usernameText: {
    fontSize: 16,
    color: "gray",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    color: "gray",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "white",
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "gray",
  },
  loader: {
    marginVertical: 12,
  },
  itemText: {
    fontSize: 16,
    paddingVertical: 6,
  },
  backlogSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
  backlogGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BACKLOG_GRID_GAP,
  },
  backlogEmptyState: {
    alignItems: "center",
    paddingTop: 32,
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
  followButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "black",
    marginLeft: 12,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  followingButton: {
    backgroundColor: "black",
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "black",
  },
  followingButtonText: {
    color: "white",
  },
  followErrorText: {
    color: "red",
    fontSize: 13,
    paddingHorizontal: 16,
    marginTop: -8,
    marginBottom: 8,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  blockNoticeText: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },
});

export default UserPage;
