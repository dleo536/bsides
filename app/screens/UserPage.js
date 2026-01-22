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
const UserPage = () => {
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const route = useRoute();
  const { user } = route.params; // 👈 user object passed in

  const [activeTab, setActiveTab] = useState("lists");
  const [lists, setLists] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [profileImage, setProfileImage] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const currentUid = auth?.currentUser?.uid;
  const isOwnProfile = currentUid && user?.uid && currentUid === user.uid;

  useEffect(() => {
    if (activeTab === "lists") {
      getLists();
    } else if (activeTab === "reviews") {
      getReviews();
    }
  }, [activeTab]);
  const getLists = async () => {
    const lists = await getListByUID(user.uid);
    setLists(lists);
  };
  const getReviews = async () => {
    const reviews = await getReviewsByUID(user.uid);
    setReviews(reviews);
  };
  const getProfileImage = async () => {
    const profileImage = await getProfileImage(user.uid);
    setProfileImage(profileImage);
  };

  // --- Follow handler ---
  const handleFollowPress = async () => {
    if (!currentUid) {
      Alert.alert("Sign in required", "Please sign in to follow users.");
      return;
    }
    if (!user?.uid) return;

    try {
      setFollowLoading(true);

      // For now, we just simulate success:
      await new Promise((res) => setTimeout(res, 500));

      setIsFollowing(true);
      // Optional: update follower counts here if you’re tracking them
      // setFollowerCount((c) => c + 1);
    } catch (e) {
      Alert.alert("Error", "Could not follow this user. Please try again.");
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
            source={{
              uri: profileImage || "https://via.placeholder.com/150",
            }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.nameText}>{user.name}</Text>
            <Text style={styles.usernameText}>@{user.username}</Text>
          </View>
          {/* --- Follow Button --- */}
          {!isOwnProfile && (
            <TouchableOpacity
              onPress={handleFollowPress}
              disabled={followLoading || isFollowing}
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
                (followLoading || isFollowing) && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isFollowing ? "Following" : "Follow"}
            >
              {followLoading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.followButtonText}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* --- Stats Section --- */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{0}</Text>
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
});

export default UserPage;
