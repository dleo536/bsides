import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigation } from "@react-navigation/native";
import { auth, storage } from "../config/firebase";
import { updateCurrentUserProfile } from "../api/UserAPI";
import defaultProfileImage from "../../assets/defaultProfilePicture.png";
import { clearSignupOnboardingState } from "../logic/onboardingFlow";

const ProfilePicturePage = () => {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const compactLayout = height <= 760;
  const ultraCompactLayout = height <= 700;
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [isPicking, setIsPicking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const defaultProfileImageUri = Image.resolveAssetSource(defaultProfileImage).uri;

  const previewSource = selectedImageUri
    ? { uri: selectedImageUri }
    : defaultProfileImage;

  const primaryLabel = selectedImageUri ? "Save and continue" : "Choose a photo";
  const helperLabel = selectedImageUri
    ? "Nice pick. Save it now or swap it for another photo."
    : "Add a face to your profile. You can always change this later.";

  const finishOnboarding = async () => {
    await clearSignupOnboardingState();
    navigation.replace("Welcome");
  };

  const pickImage = async () => {
    if (isPicking || isSubmitting) {
      return;
    }

    setErrorMessage("");
    setIsPicking(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      setErrorMessage("Could not open your photo library. Please try again.");
    } finally {
      setIsPicking(false);
    }
  };

  const saveImage = async () => {
    if (!selectedImageUri || isSubmitting) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;

      if (!user?.uid) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const response = await fetch(selectedImageUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profileImages/${user.uid}`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL: downloadURL });
      await updateCurrentUserProfile({ avatarUrl: downloadURL });
      await user.reload();
      await finishOnboarding();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We could not save your photo right now.";

      setErrorMessage(message);
      Alert.alert("Could not save photo", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (selectedImageUri) {
      await saveImage();
      return;
    }

    await pickImage();
  };

  const handleSkip = async () => {
    if (isSubmitting || isPicking) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;

      if (user) {
        try {
          await updateProfile(user, { photoURL: defaultProfileImageUri });
          await user.reload();
        } catch (error) {}
      }

      await finishOnboarding();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
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
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>Step 3 of 3</Text>
          </View>
          <Text style={[styles.title, compactLayout && styles.titleCompact]}>
            Add a profile photo
          </Text>
          <Text
            style={[
              styles.subtitle,
              compactLayout && styles.subtitleCompact,
              ultraCompactLayout && styles.subtitleUltraCompact,
            ]}
          >
            Help people recognize you on lists, reviews, and your profile.
            You can always change this later.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            compactLayout && styles.cardCompact,
            ultraCompactLayout && styles.cardUltraCompact,
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={isSubmitting || isPicking}
            onPress={pickImage}
            style={[styles.previewButton, compactLayout && styles.previewButtonCompact]}
          >
            <LinearGradient
              colors={["#f8d84e", "#ffe9a5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.previewRing,
                compactLayout && styles.previewRingCompact,
                ultraCompactLayout && styles.previewRingUltraCompact,
              ]}
            >
              <Image source={previewSource} style={styles.previewImage} />
              <View style={styles.previewBadge}>
                <Ionicons
                  color="#111827"
                  name={selectedImageUri ? "checkmark" : "camera"}
                  size={20}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.previewTitle, compactLayout && styles.previewTitleCompact]}>
            {selectedImageUri ? "Preview ready" : "Choose something that feels like you"}
          </Text>
          <Text
            style={[
              styles.previewSubtitle,
              compactLayout && styles.previewSubtitleCompact,
            ]}
          >
            {helperLabel}
          </Text>

          {errorMessage ? (
            <View style={[styles.errorBanner, compactLayout && styles.errorBannerCompact]}>
              <Ionicons name="alert-circle" size={18} color="#b91c1c" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={isSubmitting || isPicking}
            onPress={handlePrimaryAction}
            style={[
              styles.primaryButton,
              compactLayout && styles.buttonCompact,
              (isSubmitting || isPicking) && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : isPicking ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            )}
          </TouchableOpacity>

          {selectedImageUri ? (
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSubmitting || isPicking}
              onPress={pickImage}
              style={[styles.secondaryButton, compactLayout && styles.secondaryButtonCompact]}
            >
              <Text style={styles.secondaryButtonText}>Choose a different photo</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isSubmitting || isPicking}
            onPress={handleSkip}
            style={[styles.skipButton, compactLayout && styles.skipButtonCompact]}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>

          <Text style={[styles.footnote, compactLayout && styles.footnoteCompact]}>
            {selectedImageUri
              ? "Your photo will be uploaded when you continue."
              : "You can keep going without a profile picture."}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f1e6",
  },
  page: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  pageCompact: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pageUltraCompact: {
    paddingVertical: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerCompact: {
    marginBottom: 12,
  },
  headerUltraCompact: {
    marginBottom: 10,
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
  optionalBadge: {
    backgroundColor: "#fff6cf",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  optionalBadgeText: {
    color: "#7c5d00",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
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
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 22,
    alignItems: "center",
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
    paddingVertical: 14,
  },
  previewButton: {
    marginBottom: 16,
  },
  previewButtonCompact: {
    marginBottom: 12,
  },
  previewRing: {
    width: 168,
    height: 168,
    borderRadius: 84,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  previewRingCompact: {
    width: 148,
    height: 148,
    borderRadius: 74,
  },
  previewRingUltraCompact: {
    width: 132,
    height: 132,
    borderRadius: 66,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  previewBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  previewTitleCompact: {
    fontSize: 18,
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  previewSubtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
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
    width: "100%",
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  buttonCompact: {
    minHeight: 46,
    marginBottom: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  secondaryButtonCompact: {
    minHeight: 42,
    marginBottom: 6,
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  skipButtonCompact: {
    paddingVertical: 10,
    marginTop: 0,
  },
  skipButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
  },
  footnote: {
    marginTop: 6,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 13,
    lineHeight: 18,
  },
  footnoteCompact: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
});

export default ProfilePicturePage;
