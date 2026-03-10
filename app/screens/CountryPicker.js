import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

const COUNTRIES = [
  { code: "BR", name: "Brazil" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "JP", name: "Japan" },
];

const CountryPicker = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <FlatList
        data={COUNTRIES}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.countryRow}
            onPress={() =>
              navigation.navigate("CountryResults", {
                countryCode: item.code,
                countryName: item.name,
              })
            }
          >
            <Text style={styles.countryName}>{item.name}</Text>
            <Text style={styles.countryCode}>{item.code}</Text>
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
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countryRow: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fafafa",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#101010",
  },
  countryCode: {
    fontSize: 12,
    color: "#606060",
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});

export default CountryPicker;
