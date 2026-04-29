import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

const USE_REACT_MINIMAL_DIAGNOSTIC = false;

export default function App() {
  if (USE_REACT_MINIMAL_DIAGNOSTIC) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.eyebrow}>React Startup Diagnostic</Text>
          <Text style={styles.title}>React rendered successfully.</Text>
          <Text style={styles.body}>
            This screen avoids navigation, Firebase, and the normal app imports.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const FullApp = require("./App.full").default;
  return <FullApp />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8a5a00",
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#111827",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },
});
