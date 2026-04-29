import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function LegalAccessLink({ onPress, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.linkButton, style]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#7c5d00" />
      </View>
      <Text style={styles.linkText}>Privacy, Safety & Support</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 246, 207, 0.92)",
    borderWidth: 1,
    borderColor: "#f1e5a8",
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff9de",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7c5d00",
  },
});
