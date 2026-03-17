import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Button,
  TouchableOpacity,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getAllReviews } from "../api/ReviewAPI.js";
import ReviewElement from "../components/reviewElement.js";
import ListElement from "../components/listElement.js";
import { getAllLists } from "../api/ListAPI.js";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { auth } from "../config/firebase";

const Tab = createMaterialTopTabNavigator();
const PAGE_SIZE = 12;

const TILE_GUTTER = 8;
const HORIZONTAL_PADDING = 8;
const RATING_SIZE_SCALE = {
  XS: 0.7,
  S: 0.8,
  M: 0.88,
  L: 0.94,
  XL: 1.0,
};

const getMasonryColumnCount = (width) => {
  if (width >= 980) return 4;
  if (width >= 680) return 3;
  return 2;
};

const toNumberOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

// Reviews can be 0.5-5.0 or 1-10 depending on source payload, normalize to 1-10.
const getRatingOnTenScale = (review) => {
  const halfSteps = toNumberOrNull(review?.ratingHalfSteps);
  if (halfSteps !== null) {
    return Math.max(0, Math.min(10, halfSteps));
  }

  const rawRating = toNumberOrNull(review?.rating);
  if (rawRating === null) return 0;

  const normalized = rawRating <= 5 ? rawRating * 2 : rawRating;
  return Math.max(0, Math.min(10, normalized));
};

const getRatingSizeClass = (ratingOnTenScale) => {
  if (ratingOnTenScale >= 9) return "XL";
  if (ratingOnTenScale >= 8) return "L";
  if (ratingOnTenScale >= 7) return "M";
  if (ratingOnTenScale >= 6) return "S";
  return "XS";
};

const buildMasonryColumns = (reviews, columnCount, columnWidth) => {
  const columns = Array.from({ length: columnCount }, () => []);
  const columnHeights = Array.from({ length: columnCount }, () => 0);

  reviews.forEach((review, index) => {
    const ratingOnTenScale = getRatingOnTenScale(review);
    const sizeClass = getRatingSizeClass(ratingOnTenScale);
    const visualSize = Math.max(
      74,
      Math.round(columnWidth * RATING_SIZE_SCALE[sizeClass])
    );
    const tileHeight = visualSize + 6;

    let shortestColumnIndex = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (columnHeights[i] < columnHeights[shortestColumnIndex]) {
        shortestColumnIndex = i;
      }
    }

    const stableKey =
      review?.id?.toString?.() ||
      `${review?.userId || "user"}-${review?.releaseGroupMbId || "album"}-${index}`;

    columns[shortestColumnIndex].push({
      key: stableKey,
      review,
      tileHeight,
      visualSize,
      coverUri: review?.albumCover || review?.coverUrlSnapshot || null,
      ratingLabel: ratingOnTenScale ? ratingOnTenScale.toFixed(1) : "—",
    });

    columnHeights[shortestColumnIndex] += tileHeight + TILE_GUTTER;
  });

  return columns;
};

const MasonryReviewGrid = ({
  reviews,
  refreshing,
  onRefresh,
  onEndReached,
  onPressReview,
  loading,
  hasMore,
}) => {
  const { width } = useWindowDimensions();
  const columnCount = getMasonryColumnCount(width);
  const usableWidth =
    width - HORIZONTAL_PADDING * 2 - TILE_GUTTER * (columnCount - 1);
  const columnWidth = Math.max(90, Math.floor(usableWidth / columnCount));

  const masonryColumns = useMemo(
    () => buildMasonryColumns(reviews, columnCount, columnWidth),
    [reviews, columnCount, columnWidth]
  );

  const handleGridScroll = useCallback(
    (event) => {
      if (loading || !hasMore) return;

      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const nearBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 420;

      if (nearBottom) {
        onEndReached?.();
      }
    },
    [hasMore, loading, onEndReached]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.masonryContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onScroll={handleGridScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.masonryRow}>
        {masonryColumns.map((column, columnIndex) => (
          <View
            key={`column-${columnIndex}`}
            style={[
              styles.masonryColumn,
              {
                width: columnWidth,
                marginRight: columnIndex === columnCount - 1 ? 0 : TILE_GUTTER,
              },
            ]}
          >
            {column.map((tile) => (
              <TouchableOpacity
                key={tile.key}
                onPress={() => onPressReview(tile.review)}
                activeOpacity={0.9}
                style={[
                  styles.masonryTile,
                  { height: tile.tileHeight, marginBottom: TILE_GUTTER },
                ]}
              >
                <View
                  style={[
                    styles.masonrySleeve,
                    { width: tile.visualSize, height: tile.visualSize },
                  ]}
                >
                  {tile.coverUri ? (
                    <Image source={{ uri: tile.coverUri }} style={styles.masonryImage} />
                  ) : (
                    <View style={styles.missingCoverTile}>
                      <Text style={styles.missingCoverText}>NO COVER</Text>
                    </View>
                  )}
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingBadgeText}>{tile.ratingLabel}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
      {loading ? <ActivityIndicator style={styles.masonryFooterLoader} /> : null}
      {!loading && reviews.length === 0 ? (
        <Text style={styles.emptyStateText}>No reviews yet.</Text>
      ) : null}
    </ScrollView>
  );
};

const ReviewList = () => {
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
      const response = await getAllReviews(PAGE_SIZE, nextOffset, viewerUid);
      const nextData = Array.isArray(response) ? response : [];
      setData((prev) => (reset ? nextData : [...prev, ...nextData]));
      setOffset(nextOffset + nextData.length);

      if (nextData.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
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
        {["List", "Grid"].map((option) => (
          <View key={option} style={styles.searchButton}>
            <Button
              title={option}
              onPress={() => setSelectedButton(option)}
              color={selectedButton === option ? "black" : "gray"}
            />
          </View>
        ))}
      </View>

      {selectedButton === "List" ? (
        <FlatList
          data={data}
          keyExtractor={(item, index) =>
            item?.id?.toString?.() || `review-${item?.releaseGroupMbId || index}`
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate("ReviewPage", { review: item })}
            >
              <ReviewElement review={item} />
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading ? <ActivityIndicator /> : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <MasonryReviewGrid
          reviews={data}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          onPressReview={(review) =>
            navigation.navigate("ReviewPage", { review })
          }
          loading={loading}
          hasMore={hasMore}
        />
      )}
    </View>
  );
};

const ListList = () => {
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
      const response = await getAllLists(PAGE_SIZE, nextOffset, viewerUid);
      const nextData = Array.isArray(response) ? response : [];
      setData((prev) => (reset ? nextData : [...prev, ...nextData]));
      setOffset(nextOffset + nextData.length);

      if (nextData.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching lists:", error);
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
    <FlatList
      data={data}
      keyExtractor={(item, index) =>
        item?.id?.toString?.() || `list-${item?.slug || index}`
      }
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate("ListPage", { list: item })}>
          <ListElement list={item} />
        </TouchableOpacity>
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <ActivityIndicator /> : null}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const HomePage = () => {
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
    backgroundColor: "#ffffff",
  },
  reviewButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  searchButton: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  masonryContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 4,
    paddingBottom: 24,
  },
  masonryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  masonryColumn: {
    flexDirection: "column",
  },
  masonryTile: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  masonrySleeve: {
    position: "relative",
    backgroundColor: "#d6d6d6",
    borderRadius: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  masonryImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 2,
  },
  missingCoverTile: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c8c8c8",
  },
  missingCoverText: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: "#444",
    fontWeight: "700",
  },
  ratingBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 0,
  },
  ratingBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  masonryFooterLoader: {
    marginTop: 8,
  },
  emptyStateText: {
    marginTop: 18,
    color: "#555",
    textAlign: "center",
  },
});

export default HomePage;
