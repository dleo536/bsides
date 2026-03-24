import React, { useEffect } from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../config/firebase";

import heroImage from "../../assets/ChatGPT Image Apr 2, 2025, 09_32_29 PM.png";
import logoImage from "../../assets/Color logo - no background.png";

export default function LandingPage() {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const heroImageHeight = Math.max(150, Math.min(220, Math.round(height * 0.24)));

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigation.replace("Welcome");
      }
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <View style={styles.heroShell}>
          <View style={styles.topBadge}>
            <Ionicons name="disc-outline" size={14} color="#7c5d00" />
            <Text style={styles.topBadgeText}>Track your taste</Text>
          </View>

          <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />

          <Text style={styles.subtitle}>
            Log listens, write reviews, build lists, and shape a profile that reflects your taste.
          </Text>

          <LinearGradient
            colors={["#fff6cf", "#ffffff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Image
              source={heroImage}
              style={[styles.heroImage, { height: heroImageHeight }]}
              resizeMode="cover"
            />
          </LinearGradient>
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Get started</Text>
          <Text style={styles.actionsSubtitle}>
            Sign in to continue where you left off, or create an account to start building your
            profile.
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Sign In")}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Sign Up")}
          >
            <Text style={styles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>
              Albums, lists, reviews, and profile history in one place.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f1e6",
  },
  page: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  heroShell: {
    alignItems: "center",
    flexShrink: 1,
    justifyContent: "center",
  },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fff6cf",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  topBadgeText: {
    color: "#7c5d00",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  logoImage: {
    width: 180,
    height: 64,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
    textAlign: "center",
    maxWidth: 330,
    marginBottom: 16,
  },
  heroCard: {
    width: "100%",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#f1e5a8",
    padding: 8,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroImage: {
    width: "100%",
    borderRadius: 22,
    backgroundColor: "#ffffff",
  },
  actionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 20,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginTop: 18,
  },
  actionsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  actionsSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
    marginBottom: 18,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f8d84e",
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },
});
