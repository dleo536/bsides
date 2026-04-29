import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function StartupDiagnosticScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Startup Diagnostic</Text>
        <Text style={styles.title}>React rendered successfully.</Text>
        <Text style={styles.body}>
          If you can see this screen in Release/TestFlight, the black screen is
          in the normal app startup flow rather than native launch itself.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Isolation mode</Text>
          <Text style={styles.statusValue}>
            No Firebase import. No normal app screens loaded until you tap a button.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.replace("Landing")}
        >
          <Text style={styles.primaryButtonText}>Open Normal Landing Screen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.replace("Welcome")}
        >
          <Text style={styles.secondaryButtonText}>Jump To Welcome Screen</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fffdf5",
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
  statusCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#6b7280",
  },
  statusValue: {
    fontSize: 15,
    color: "#111827",
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
});
