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
import { getMusicianMixedCredits } from "../api/Discogs";
import { getAlbumList } from "../api/SpotifyAPI";
import ListElement from "../components/listElement";
import { getReviewsByUID } from "../api/ReviewAPI";
import ReviewElement from "../components/reviewElement";
import defaultProfileImage from "../../assets/defaultProfilePicture.png";
import {
  followUser,
  getFollowState,
  getProfileImageForUser,
  getUserByIdentifier,
  unfollowUser,
} from "../api/UserAPI";
const UserPage = () => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const route = useRoute();
  const { user } = route.params; // 👈 user object passed in

  const [profileUser, setProfileUser] = useState(user);
  const [activeTab, setActiveTab] = useState("lists");
  const [lists, setLists] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [profileImage, setProfileImage] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [followStateLoading, setFollowStateLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followError, setFollowError] = useState("");

  const currentUid = auth?.currentUser?.uid;
  const routeUserIdentifier = user?.id || user?.oauthId || user?.uid;
  const profileUserIdentifier =
    profileUser?.id || profileUser?.oauthId || profileUser?.uid || routeUserIdentifier;
  const isOwnProfile =
    !!currentUid &&
    (currentUid === profileUser?.oauthId ||
      currentUid === profileUser?.uid ||
      currentUid === profileUserIdentifier);
  const profileDisplayName =
    profileUser?.displayName || profileUser?.name || profileUser?.username || "User";
  const profileUsername = profileUser?.username || user?.username || "";
  const followersCount = profileUser?.followersCount ?? 0;
  const followingCount = profileUser?.followingCount ?? 0;

  useEffect(() => {
    setProfileUser(user);
  }, [user]);

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
    profileUser?.oauthId,
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* --- Top Profile Section --- */}
        <View style={styles.profileHeader}>
          <Image
            source={profileImage ? { uri: profileImage } : defaultProfileImage}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.nameText}>{profileDisplayName}</Text>
            <Text style={styles.usernameText}>@{profileUsername}</Text>
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
            onPress={() => setActiveTab("activity")}
            style={styles.tabButton}
          >
            <Text
              style={
                activeTab === "activity"
                  ? styles.activeTabText
                  : styles.inactiveTabText
              }
            >
              Activity
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
              ) : lists.length === 0 ? (
                <Text style={styles.emptyText}>No lists yet.</Text>
              ) : (
                lists.map((list) => <ListElement key={list.id} list={list} />)
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

          {activeTab === "activity" && (
            <View>
              <Text style={styles.sectionTitle}>Want to Listen</Text>
              {/* {user.want_to_listen.length === 0 ? (
                <Text style={styles.emptyText}>
                  No albums in Want to Listen yet.
                </Text>
              ) : (
                user.want_to_listen.map((album, index) => (
                  <Text key={index} style={styles.itemText}>
                    {album}
                  </Text>
                ))
              )} */}
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
  },
  nameText: {
    fontSize: 22,
    fontWeight: "bold",
  },
  usernameText: {
    fontSize: 16,
    color: "gray",
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
  itemText: {
    fontSize: 16,
    paddingVertical: 6,
  },
  followButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "black",
    alignSelf: "flex-start",
    marginLeft: 30,
    marginTop: 15,
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
});

export default UserPage;
