import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Button,
  TouchableOpacity,
  Image,
} from "react-native";
// import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { SafeAreaView, SafeAreaProvider } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getAllReviews } from "../api/ReviewAPI.js";
import ReviewElement from "../components/reviewElement.js";
import ListElement from "../components/listElement.js";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { getAllLists, getHasMore } from "../api/ListAPI.js";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { auth } from "../config/firebase";

const Tab = createMaterialTopTabNavigator();

const limit = 5;

const ReviewList = ({ fetchFunction }) => {
  const navigation = useNavigation();
  const viewerUid = auth?.currentUser?.uid ?? null;
  const [data, setData] = useState([]);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedButton, setSelectedButton] = useState("List");
  const fetchData = async (nextOffset = offset, reset = false) => {
    if ((loading || !hasMore) && !reset) return;

    setLoading(true);
    try {
      const response = await getAllReviews(limit, nextOffset, viewerUid);
      const nextData = Array.isArray(response) ? response : [];
      setData((prev) => (reset ? nextData : [...prev, ...nextData]));
      setOffset(nextOffset + nextData.length);

      if (nextData.length < limit) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetAndFetch = async () => {
    setData([]);
    setOffset(0);
    setHasMore(true);
    await fetchData(0, true);
  };

  useFocusEffect(
    useCallback(() => {
      resetAndFetch();
    }, [viewerUid])
  );

  const onRefresh = () => {
    setRefreshing(true);
    resetAndFetch().finally(() => setRefreshing(false));
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchData(offset, false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.reviewButtonContainer}>
        {["List", "Grid"].map((index) => (
          <View key={index} style={styles.searchButton}>
            <Button
              title={index}
              onPress={() => {
                setSelectedButton(index);
                console.log("button pressed", index);
              }}
              color={selectedButton === index ? "blue" : "gray"}
            />
          </View>
        ))}
      </View>
      <FlatList
        data={data}
        style={{ paddingBottom: 20 }}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          if (selectedButton === "List") {
            return (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("ReviewPage", { review: item })
                }
              >
                <ReviewElement review={item} />
              </TouchableOpacity>
            );
          } else if (selectedButton === "Grid") {
            return (
              <View style={styles.gridContainer}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("ReviewPage", { review: item })
                  }
                >
                  <Image
                    source={{ uri: item.albumCover }}
                    style={[
                      styles.gridImage,
                      selectedButton === "Grid" && styles.reviewBox,
                      {
                        padding: 10 - item.rating,
                      },
                    ]}
                  />
                </TouchableOpacity>
              </View>
            );
          }
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator /> : null}
        contentContainerStyle={[
          styles.reviews,
          selectedButton === "List" && styles.listReviews,
          selectedButton === "Grid" && styles.gridReviews,
        ]}
      />
    </View>
  );
};
const ListList = ({ fetchFunction }) => {
  const navigation = useNavigation();
  const viewerUid = auth?.currentUser?.uid ?? null;
  const [data, setData] = useState([]);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = async (nextOffset = offset, reset = false) => {
    if ((loading || !hasMore) && !reset) return;

    setLoading(true);
    try {
      const response = await getAllLists(limit, nextOffset, viewerUid);
      const nextData = Array.isArray(response) ? response : [];
      setData((prev) => (reset ? nextData : [...prev, ...nextData]));
      setOffset(nextOffset + nextData.length);

      if (nextData.length < limit) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetAndFetch = async () => {
    setData([]);
    setOffset(0);
    setHasMore(true);
    await fetchData(0, true);
  };

  useFocusEffect(
    useCallback(() => {
      resetAndFetch();
    }, [viewerUid])
  );

  const onRefresh = () => {
    setRefreshing(true);
    resetAndFetch().finally(() => setRefreshing(false));
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      console.log("Loading more Lists nooooooo!!!");
      fetchData(offset, false);
    }
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate("ListPage", { list: item })}
        >
          <ListElement list={item} />
        </TouchableOpacity>
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <ActivityIndicator /> : null}
      contentContainerStyle={styles.reviews}
    />
  );
};

// const FirstRoute = () => <ReviewList fetchFunction={getAllReviews} />;
// const SecondRoute = () => <ListList fetchFunction={getAllLists} />; // Replace with different API if needed

const HomePage = () => {
  //const layout = Dimensions.get("window");
  const navigation = useNavigation();
  return (
    <Tab.Navigator>
      <Tab.Screen name="Reviews" component={ReviewList} />
      <Tab.Screen name="Lists" component={ListList} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  reviewButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  reviews: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  gridImage: {
    width: 110,
    height: 110,

    borderRadius: 2,
    flexDirection: "row",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  listReviews: {
    flexDirection: "column",
  },
  gridReviews: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
});

export default HomePage;
