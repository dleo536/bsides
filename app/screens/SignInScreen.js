import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../config/firebase";
import LegalAccessLink from "../components/LegalAccessLink";

export default function SignInScreen() {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const compactLayout = height <= 760;
  const ultraCompactLayout = height <= 700;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !isSubmitting) {
        navigation.replace("Welcome");
      }
    });

    return unsubscribe;
  }, [isSubmitting, navigation]);

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      const errorCode = error?.code || "";

      if (
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password"
      ) {
        setErrorMessage("Your email or password is incorrect.");
      } else if (errorCode === "auth/invalid-email") {
        setErrorMessage("Enter a valid email address.");
      } else {
        setErrorMessage("Could not sign you in right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.page,
            compactLayout && styles.pageCompact,
            ultraCompactLayout && styles.pageUltraCompact,
          ]}
        >
          <View
            style={[
              styles.header,
              compactLayout && styles.headerCompact,
              ultraCompactLayout && styles.headerUltraCompact,
            ]}
          >
            <Text
              style={[
                styles.brand,
                compactLayout && styles.brandCompact,
                ultraCompactLayout && styles.brandUltraCompact,
              ]}
            >
              b.sides
            </Text>
            <Text
              style={[
                styles.title,
                compactLayout && styles.titleCompact,
              ]}
            >
              Welcome back
            </Text>
            <Text
              style={[
                styles.subtitle,
                compactLayout && styles.subtitleCompact,
                ultraCompactLayout && styles.subtitleUltraCompact,
              ]}
            >
              Sign in to pick up your lists, reviews, and profile where you left off.
            </Text>
          </View>

          <LinearGradient
            colors={["#fff6cf", "#ffffff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.card,
              compactLayout && styles.cardCompact,
              ultraCompactLayout && styles.cardUltraCompact,
            ]}
          >
            <View style={[styles.inputBlock, compactLayout && styles.inputBlockCompact]}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputShell, compactLayout && styles.inputShellCompact]}>
                <Ionicons name="mail-outline" size={18} color="#6b7280" />
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) {
                      setErrorMessage("");
                    }
                  }}
                  style={[styles.input, compactLayout && styles.inputCompact]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            <View style={[styles.inputBlock, compactLayout && styles.inputBlockCompact]}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputShell, compactLayout && styles.inputShellCompact]}>
                <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) {
                      setErrorMessage("");
                    }
                  }}
                  style={[styles.input, compactLayout && styles.inputCompact]}
                  secureTextEntry
                  textContentType="password"
                />
              </View>
            </View>

            {errorMessage ? (
              <View style={[styles.errorBanner, compactLayout && styles.errorBannerCompact]}>
                <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleLogin}
              disabled={isSubmitting}
              style={[
                styles.primaryButton,
                compactLayout && styles.buttonCompact,
                isSubmitting && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={[styles.signupRow, compactLayout && styles.signupRowCompact]}>
              <Text style={styles.signupPrompt}>Don’t have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Sign Up")}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>

            <LegalAccessLink
              onPress={() => navigation.navigate("LegalSupport")}
              style={[styles.legalLink, compactLayout && styles.legalLinkCompact]}
            />
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f1e6",
  },
  keyboardWrap: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  pageCompact: {
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  pageUltraCompact: {
    paddingVertical: 14,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerCompact: {
    marginBottom: 18,
  },
  headerUltraCompact: {
    marginBottom: 14,
  },
  brand: {
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1,
    color: "#1f2937",
    marginBottom: 12,
  },
  brandCompact: {
    fontSize: 34,
    marginBottom: 10,
  },
  brandUltraCompact: {
    fontSize: 30,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
    textAlign: "center",
    maxWidth: 320,
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 300,
  },
  subtitleUltraCompact: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 286,
  },
  card: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: "#f1e5a8",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardCompact: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  cardUltraCompact: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputBlock: {
    marginBottom: 16,
  },
  inputBlockCompact: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputShell: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  inputShellCompact: {
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    marginLeft: 10,
    paddingVertical: 14,
  },
  inputCompact: {
    fontSize: 15,
    paddingVertical: 10,
  },
  errorBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorBannerCompact: {
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.78,
  },
  signupRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  signupRowCompact: {
    marginTop: 14,
  },
  signupPrompt: {
    color: "#6b7280",
    fontSize: 14,
  },
  signupLink: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  legalLink: {
    marginTop: 16,
  },
  legalLinkCompact: {
    marginTop: 12,
  },
});
