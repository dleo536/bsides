import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserSafetySheet({
  visible,
  profileUsername,
  blocked = false,
  blockSubmitting = false,
  onClose,
  onReport,
  onToggleBlock,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
        <View style={styles.sheetStack}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>
              {profileUsername ? `@${profileUsername}` : "Profile options"}
            </Text>
            <Text style={styles.sheetSubtitle}>
              Manage safety actions for this profile.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onReport}
              style={styles.actionRow}
            >
              <Text style={styles.actionText}>Report Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={blockSubmitting}
              onPress={onToggleBlock}
              style={[styles.actionRow, styles.destructiveRow]}
            >
              {blockSubmitting ? (
                <ActivityIndicator size="small" color="#b91c1c" />
              ) : (
                <Text style={[styles.actionText, styles.destructiveText]}>
                  {blocked ? "Unblock User" : "Block User"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            style={styles.doneButton}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  backdropPressable: {
    flex: 1,
  },
  sheetStack: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  sheetCard: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  sheetTitle: {
    paddingTop: 18,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sheetSubtitle: {
    paddingTop: 4,
    paddingBottom: 14,
    paddingHorizontal: 24,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },
  actionRow: {
    minHeight: 54,
    paddingHorizontal: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  destructiveRow: {
    backgroundColor: "#fff5f5",
  },
  actionText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  destructiveText: {
    color: "#b91c1c",
  },
  doneButton: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  doneText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
});
