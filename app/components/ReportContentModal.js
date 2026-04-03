import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const REPORT_REASON_OPTIONS = [
  { value: "harassment", label: "Harassment" },
  { value: "hate", label: "Hate or abuse" },
  { value: "spam", label: "Spam" },
  { value: "impersonation", label: "Impersonation" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "other", label: "Other" },
];

export default function ReportContentModal({
  visible,
  title = "Report Content",
  targetLabel = "this content",
  onClose,
  onSubmit,
  submitting = false,
}) {
  const [selectedReason, setSelectedReason] = useState("harassment");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!visible) {
      setSelectedReason("harassment");
      setDetails("");
    }
  }, [visible]);

  const handleSubmit = () => {
    onSubmit?.({
      reason: selectedReason,
      details: details.trim(),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={submitting ? undefined : onClose} />
        <View style={styles.sheetStack}>
          <View style={styles.sheetCard}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Tell us what is wrong with {targetLabel}. We will review the report.
            </Text>

            <View style={styles.reasonGrid}>
              {REPORT_REASON_OPTIONS.map((option) => {
                const selected = selectedReason === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.85}
                    disabled={submitting}
                    onPress={() => setSelectedReason(option.value)}
                    style={[styles.reasonChip, selected && styles.reasonChipSelected]}
                  >
                    <Text
                      style={[styles.reasonChipText, selected && styles.reasonChipTextSelected]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              multiline
              editable={!submitting}
              maxLength={500}
              placeholder="Add optional details"
              placeholderTextColor="#9ca3af"
              style={styles.detailsInput}
              value={details}
              onChangeText={setDetails}
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={submitting}
                onPress={onClose}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={submitting}
                onPress={handleSubmit}
                style={styles.primaryButton}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  },
  sheetCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  reasonChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reasonChipSelected: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  reasonChipTextSelected: {
    color: "#ffffff",
  },
  detailsInput: {
    minHeight: 112,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 20,
    color: "#111827",
    textAlignVertical: "top",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  primaryButton: {
    flex: 1.25,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
