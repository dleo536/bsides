import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useEvent } from "expo";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../config/firebase";
import heroFallbackImage from "../../assets/ChatGPT Image Apr 2, 2025, 09_32_29 PM.png";
import logoImage from "../../assets/Color logo - no background.png";
import LegalAccessLink from "../components/LegalAccessLink";

const heroVideo = Platform.select({
  ios: require("../../assets/landing-bg-alpha.mov"),
  default: require("../../assets/landing-bg.mp4"),
});

function HeroMediaOverlay() {
  return (
    <LinearGradient
      colors={["rgba(255, 247, 210, 0.16)", "rgba(17, 24, 39, 0.12)", "rgba(17, 24, 39, 0.62)"]}
      locations={[0, 0.45, 1]}
      style={styles.heroMediaOverlay}
    />
  );
}

function StaticHeroMedia() {
  return (
    <>
      <Image
        source={heroFallbackImage}
        style={[StyleSheet.absoluteFill, styles.heroFallbackImage]}
        resizeMode="contain"
      />
    </>
  );
}

function VideoHeroMedia() {
  const [didRenderFirstFrame, setDidRenderFirstFrame] = useState(false);
  const player = useVideoPlayer(heroVideo, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
    error: undefined,
  });

  useEffect(() => {
    if (error) {
      console.warn("[Landing video error]", error);
    }
  }, [error]);

  useEffect(() => {
    if (status === "readyToPlay") {
      setDidRenderFirstFrame(true);
    }
  }, [status]);

  return (
    <>
      {!didRenderFirstFrame ? (
        <Image
          source={heroFallbackImage}
          style={[StyleSheet.absoluteFill, styles.heroFallbackImage]}
          resizeMode="contain"
        />
      ) : null}
      <VideoView
        player={player}
        style={[StyleSheet.absoluteFill, styles.heroVideo]}
        nativeControls={false}
        contentFit="contain"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        onFirstFrameRender={() => setDidRenderFirstFrame(true)}
      />
    </>
  );
}

export default function LandingPage() {
  const navigation = useNavigation();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableHeight = height - insets.top - insets.bottom;
  const compactLayout = availableHeight <= 760;
  const ultraCompactLayout = availableHeight <= 700;
  const reservedVerticalSpace =
    (ultraCompactLayout ? 236 : compactLayout ? 264 : 296) +
    (ultraCompactLayout ? 44 : compactLayout ? 56 : 76);
  const maxHeroHeight = Math.max(ultraCompactLayout ? 160 : 188, availableHeight - reservedVerticalSpace);
  const heroMediaSize = Math.min(
    width - (ultraCompactLayout ? 96 : compactLayout ? 84 : 60),
    Math.max(
      ultraCompactLayout ? 180 : 206,
      Math.min(
        ultraCompactLayout ? 220 : compactLayout ? 244 : 312,
        Math.round(
          Math.min(
            availableHeight * (ultraCompactLayout ? 0.22 : compactLayout ? 0.255 : 0.31),
            maxHeroHeight
          )
        )
      )
    )
  );
  const shouldUseVideoHero = true;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigation.replace("Welcome");
      }
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View
        style={[
          styles.page,
          {
            flex: 1,
            paddingTop: ultraCompactLayout ? 10 : compactLayout ? 14 : 20,
            paddingBottom: ultraCompactLayout ? 10 : compactLayout ? 14 : 20,
            gap: ultraCompactLayout ? 12 : compactLayout ? 14 : 18,
          },
        ]}
      >
        <View style={styles.pageGlowTop} />
        <View style={styles.pageGlowBottom} />

        <View style={styles.heroShell}>
          <Image
            source={logoImage}
            style={[
              styles.logoImage,
              compactLayout && styles.logoImageCompact,
              ultraCompactLayout && styles.logoImageUltraCompact,
            ]}
            resizeMode="contain"
          />

          <Text
            style={[
              styles.subtitle,
              compactLayout && styles.subtitleCompact,
              ultraCompactLayout && styles.subtitleUltraCompact,
            ]}
          >
            Log listens, write reviews, build lists, and shape a profile that reflects your taste.
          </Text>

          <View
            style={[
              styles.heroCard,
              compactLayout && styles.heroCardCompact,
              ultraCompactLayout && styles.heroCardUltraCompact,
            ]}
          >
            <View
              style={[
                styles.heroGlowPrimary,
                {
                  width: heroMediaSize + (ultraCompactLayout ? 44 : 68),
                  height: heroMediaSize + (ultraCompactLayout ? 34 : 52),
                },
              ]}
            />
            <View
              style={[
                styles.heroGlowSecondary,
                {
                  width: heroMediaSize * 0.72,
                  height: heroMediaSize * 0.72,
                },
              ]}
            />
            <View style={[styles.heroMediaShell, { width: heroMediaSize, height: heroMediaSize }]}>
              {shouldUseVideoHero ? (
                <VideoHeroMedia />
              ) : (
                <StaticHeroMedia />
              )}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.actionsCard,
            compactLayout && styles.actionsCardCompact,
            ultraCompactLayout && styles.actionsCardUltraCompact,
          ]}
        >
          <Text
            style={[
              styles.actionsTitle,
              compactLayout && styles.actionsTitleCompact,
            ]}
          >
            Get started
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryButton, compactLayout && styles.buttonCompact]}
            onPress={() => navigation.navigate("Sign In")}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.secondaryButton, compactLayout && styles.buttonCompact]}
            onPress={() => navigation.navigate("Sign Up")}
          >
            <Text style={styles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={[styles.footerRow, compactLayout && styles.footerRowCompact]}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>
              Albums, lists, reviews, and profile history in one place.
            </Text>
          </View>

          <LegalAccessLink
            onPress={() => navigation.navigate("LegalSupport")}
            style={styles.legalLink}
          />
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
    position: "relative",
    justifyContent: "flex-start",
    paddingHorizontal: 22,
    overflow: "hidden",
  },
  pageGlowTop: {
    position: "absolute",
    top: -72,
    right: -34,
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: "rgba(248, 216, 78, 0.22)",
  },
  pageGlowBottom: {
    position: "absolute",
    bottom: 88,
    left: -58,
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },
  heroShell: {
    alignItems: "center",
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "flex-start",
  },
  logoImage: {
    width: 180,
    height: 64,
    marginBottom: 8,
  },
  logoImageCompact: {
    width: 164,
    height: 56,
  },
  logoImageUltraCompact: {
    width: 152,
    height: 52,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
    textAlign: "center",
    maxWidth: 330,
    marginBottom: 14,
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 312,
    marginBottom: 12,
  },
  subtitleUltraCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  heroCard: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  heroCardCompact: {
    paddingVertical: 10,
  },
  heroCardUltraCompact: {
    paddingVertical: 8,
  },
  heroGlowPrimary: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(248, 216, 78, 0.18)",
    shadowColor: "#f8d84e",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
  },
  heroGlowSecondary: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  heroMediaShell: {
    alignSelf: "center",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  heroFallbackImage: {
    opacity: 1,
  },
  heroVideo: {
    backgroundColor: "transparent",
  },
  heroMediaOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroMediaCopy: {
    gap: 6,
  },
  heroMediaTitle: {
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    maxWidth: 220,
  },
  heroMediaTitleCompact: {
    fontSize: 20,
    lineHeight: 24,
    maxWidth: 190,
  },
  heroMediaBody: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 260,
  },
  heroMediaBodyCompact: {
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 220,
  },
  actionsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(17, 24, 39, 0.06)",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 20,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    marginTop: "auto",
  },
  actionsCardCompact: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  actionsCardUltraCompact: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  actionsTitleCompact: {
    fontSize: 20,
    marginBottom: 6,
  },
  actionsSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
    marginBottom: 18,
  },
  actionsSubtitleCompact: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  buttonCompact: {
    minHeight: 48,
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
    borderColor: "rgba(17, 24, 39, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
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
  footerRowCompact: {
    marginTop: 14,
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
  legalLink: {
    marginTop: 14,
  },
});
