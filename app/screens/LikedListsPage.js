import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../config/firebase";
import { getMyLikedLists } from "../api/ListAPI";
import ListElement from "../components/listElement";

const LikedListsPage = () => {
  const navigation = useNavigation();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLikedLists = useCallback(async () => {
    const currentUid = auth?.currentUser?.uid;

    if (!currentUid) {
      setLists([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await getMyLikedLists(currentUid, {
        limit: 100,
        offset: 0,
      });
      setLists(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Liked lists fetch error:", error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: "Liked Lists" });
      loadLikedLists();
    }, [loadLikedLists, navigation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLikedLists().finally(() => setRefreshing(false));
  }, [loadLikedLists]);

  return (
    <SafeAreaView style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item, index) =>
            item?.id?.toString?.() || item?.slug || `liked-list-${index}`
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.push("ListPage", { list: item })}>
              <ListElement list={item} />
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={lists.length === 0 ? styles.emptyContent : styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.emptyTitle}>No liked lists yet.</Text>
              <Text style={styles.emptyBody}>
                Give a list a thumbs up and it will show up here.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  centerState: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
  },
});

export default LikedListsPage;
