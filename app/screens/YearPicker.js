import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

const START_YEAR = 1960;

const YearPicker = () => {
  const navigation = useNavigation();
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let year = currentYear; year >= START_YEAR; year -= 1) {
      list.push(year.toString());
    }
    return list;
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={years}
        keyExtractor={(item) => item}
        numColumns={4}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.yearTile}
            onPress={() => navigation.navigate("YearResults", { year: item })}
          >
            <Text style={styles.yearText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 12,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  yearTile: {
    flex: 1,
    marginHorizontal: 3,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d0d0d0",
    backgroundColor: "#fafafa",
  },
  yearText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#121212",
  },
});

export default YearPicker;
