import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const normalizeSearchValue = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export default function SearchablePickerModal({
  visible,
  title,
  subtitle,
  searchPlaceholder,
  items,
  emptyTitle,
  emptyDescription,
  onClose,
  onSelect,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
    }
  }, [visible]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchQuery);

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const searchableText = [
        item.label,
        item.subtitle,
        ...(Array.isArray(item.searchTerms) ? item.searchTerms : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [items, searchQuery]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardLayer}
        >
          <Pressable style={styles.backdropPressable} onPress={onClose} />

          <View style={styles.sheetStack}>
            <View style={styles.sheetCard}>
              <View style={styles.headerRow}>
                <View style={styles.headerText}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchInputWrap}>
                <Ionicons name="search-outline" size={18} color="#6b7280" />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setSearchQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#9ca3af"
                  style={styles.searchInput}
                  value={searchQuery}
                />
              </View>

              <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.key}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => onSelect?.(item)}
                    style={[
                      styles.optionRow,
                      item.kind === "manual" ? styles.optionRowManual : null,
                    ]}
                  >
                    <View style={styles.optionText}>
                      <Text
                        style={[
                          styles.optionLabel,
                          item.kind === "manual" ? styles.optionLabelManual : null,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                      ) : null}
                    </View>
                    <Ionicons
                      color={item.kind === "manual" ? "#7c5d00" : "#9ca3af"}
                      name={item.kind === "manual" ? "create-outline" : "chevron-forward"}
                      size={18}
                    />
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                    {emptyDescription ? (
                      <Text style={styles.emptyDescription}>{emptyDescription}</Text>
                    ) : null}
                  </View>
                }
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  keyboardLayer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropPressable: {
    flex: 1,
  },
  sheetStack: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  sheetCard: {
    height: "74%",
    minHeight: 360,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  searchInputWrap: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 15,
    color: "#111827",
  },
  list: {
    marginTop: 14,
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  optionRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ece8dc",
    marginBottom: 10,
  },
  optionRowManual: {
    backgroundColor: "#fff7d6",
    borderColor: "#f2e3a2",
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  optionLabelManual: {
    color: "#7c5d00",
  },
  optionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#6b7280",
  },
  emptyState: {
    paddingVertical: 28,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptyDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
    textAlign: "center",
  },
});
