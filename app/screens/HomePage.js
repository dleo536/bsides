import React, { useEffect, useState } from "react";
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
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { getAllReviews } from "../api/ReviewAPI.js";
import ReviewElement from "../components/reviewElement.js";
import ListElement from "../components/listElement.js";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { getAllLists, getHasMore } from "../api/ListAPI.js";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

const Tab = createMaterialTopTabNavigator();

const limit = 5;

const ReviewList = ({ fetchFunction }) => {
  const [data, setData] = useState([]);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedButton, setSelectedButton] = useState("List");
  const fetchData = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await getAllReviews(limit, offset);
      console.log(response);
      setData((prev) => [...prev, ...response]);
      setOffset((prev) => prev + response.length);

      if (response.length < limit) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {}, []);

  const onRefresh = () => {
    setRefreshing(true);
    setData([]);
    setOffset(0);
    setHasMore(true);
    setTimeout(() => {
      fetchData();
      setRefreshing(false);
    }, 1000);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
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
            return <ReviewElement review={item} />;
          } else if (selectedButton === "Grid") {
            return (
              <View style={styles.gridContainer}>
                <TouchableOpacity>
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
  const [data, setData] = useState([]);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await getAllLists(limit, offset);
      setData((prev) => [...prev, ...response]);
      setOffset((prev) => prev + response.length);

      if (response.length < limit) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {}, []);

  const onRefresh = () => {
    setRefreshing(true);
    setData([]);
    setOffset(0);
    setHasMore(true);
    setTimeout(() => {
      fetchData();
      setRefreshing(false);
    }, 1000);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      console.log("Loading more Lists nooooooo!!!");
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <ListElement list={item} />}
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
