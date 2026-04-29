import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  LEGAL_LAST_UPDATED,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_URL,
  SUPPORT_URL,
} from "../config/legal";

const contactRows = [
  {
    key: "support",
    iconName: "help-buoy-outline",
    title: "Support page",
    body: "Reach the b.sides team for app issues, moderation follow-up, or account help.",
    actionLabel: "Open support",
    url: SUPPORT_URL,
    value: SUPPORT_URL.replace(/^https?:\/\//i, ""),
  },
  {
    key: "privacy",
    iconName: "document-text-outline",
    title: "Privacy policy",
    body: "Review what b.sides collects, why it is collected, and how deletion requests work.",
    actionLabel: "Open policy",
    url: PRIVACY_POLICY_URL,
    value: PRIVACY_POLICY_URL.replace(/^https?:\/\//i, ""),
  },
];

const privacyRows = [
  {
    key: "contact",
    iconName: "mail-outline",
    title: "Contact info",
    body: "Your account email is used for sign-in and account recovery flows.",
  },
  {
    key: "identifiers",
    iconName: "person-circle-outline",
    title: "Account identifiers",
    body: "b.sides stores your username plus internal account IDs to keep your profile, follows, and moderation state connected.",
  },
  {
    key: "content",
    iconName: "albums-outline",
    title: "User content",
    body: "Profile photos, bios, reviews, ratings, lists, and report submissions are stored so your profile and moderation tools work.",
  },
];

const controlsRows = [
  {
    key: "delete",
    iconName: "trash-outline",
    title: "Delete your account",
    body: "Available from the profile menu. This removes sign-in access plus your profile, lists, reviews, and stored profile image from active systems.",
  },
  {
    key: "report",
    iconName: "flag-outline",
    title: "Report objectionable content",
    body: "Profiles, reviews, and lists can be reported directly in-app.",
  },
  {
    key: "block",
    iconName: "ban-outline",
    title: "Block abusive users",
    body: "Open another user profile and use the overflow menu to block that account.",
  },
];

const openExternalUrl = async (url, label) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert(
      "Could not open link",
      `b.sides could not open the ${label.toLowerCase()} right now.`
    );
  }
};

const InfoRow = ({ iconName, title, body }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowIconWrap}>
      <Ionicons name={iconName} size={18} color="#111827" />
    </View>
    <View style={styles.infoRowCopy}>
      <Text style={styles.infoRowTitle}>{title}</Text>
      <Text style={styles.infoRowBody}>{body}</Text>
    </View>
  </View>
);

const LinkCard = ({ actionLabel, body, iconName, title, url, value }) => (
  <View style={styles.linkCard}>
    <View style={styles.linkCardTopRow}>
      <View style={styles.linkCardIconWrap}>
        <Ionicons name={iconName} size={18} color="#111827" />
      </View>
      <View style={styles.linkCardTitleWrap}>
        <Text style={styles.linkCardTitle}>{title}</Text>
        <Text style={styles.linkCardBody}>{body}</Text>
      </View>
    </View>

    <Text style={styles.linkCardValue}>{value}</Text>

    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => openExternalUrl(url, title)}
      style={styles.linkCardButton}
    >
      <Text style={styles.linkCardButtonText}>{actionLabel}</Text>
      <Ionicons name="open-outline" size={16} color="#111827" />
    </TouchableOpacity>
  </View>
);

export default function LegalSupportScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#fff5cc", "#ffffff", "#f3f4f6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#7c5d00" />
            <Text style={styles.heroBadgeText}>Privacy, Safety & Support</Text>
          </View>
          <Text style={styles.heroTitle}>Know how b.sides handles your account.</Text>
          <Text style={styles.heroBody}>
            This screen keeps the app’s privacy policy, support contact surface,
            and user safety controls in one place.
          </Text>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact and policy links</Text>
          <Text style={styles.sectionSubtitle}>
            These are the same destinations you can publish in App Store Connect.
          </Text>

          {contactRows.map((row) => (
            <LinkCard key={row.key} {...row} />
          ))}

          {SUPPORT_EMAIL ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => openExternalUrl(SUPPORT_EMAIL_URL, "support email")}
              style={styles.emailCard}
            >
              <Ionicons name="mail-open-outline" size={18} color="#111827" />
              <View style={styles.emailCardCopy}>
                <Text style={styles.emailCardTitle}>Email support</Text>
                <Text style={styles.emailCardValue}>{SUPPORT_EMAIL}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#111827" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App privacy at a glance</Text>
          <Text style={styles.sectionSubtitle}>
            Based on the current codebase, these are the main data types the app handles.
          </Text>

          {privacyRows.map((row) => (
            <InfoRow key={row.key} {...row} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety and account controls</Text>
          <Text style={styles.sectionSubtitle}>
            b.sides includes report, block, and deletion paths inside the app.
          </Text>

          {controlsRows.map((row) => (
            <InfoRow key={row.key} {...row} />
          ))}
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Last updated</Text>
          <Text style={styles.footerValue}>{LEGAL_LAST_UPDATED}</Text>
          <Text style={styles.footerBody}>
            If b.sides adds new data collection or support channels, this page
            and the published privacy policy should be updated before release.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f1e6",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 30,
  },
  hero: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#f1e5a8",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: "#7c5d00",
    textTransform: "uppercase",
  },
  heroTitle: {
    marginTop: 18,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#111827",
  },
  heroBody: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 23,
    color: "#4b5563",
  },
  section: {
    marginTop: 18,
    padding: 20,
    borderRadius: 26,
    backgroundColor: "#ffffff",
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
  },
  linkCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  linkCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  linkCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  linkCardTitleWrap: {
    flex: 1,
  },
  linkCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  linkCardBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#6b7280",
  },
  linkCardValue: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: "#4b5563",
  },
  linkCardButton: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#fff5cc",
  },
  linkCardButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  emailCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emailCardCopy: {
    flex: 1,
  },
  emailCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  emailCardValue: {
    marginTop: 2,
    fontSize: 13,
    color: "#6b7280",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 16,
  },
  infoRowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  infoRowCopy: {
    flex: 1,
  },
  infoRowTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  infoRowBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
  },
  footerCard: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: "#111827",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.72)",
  },
  footerValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  footerBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255, 255, 255, 0.8)",
  },
});
