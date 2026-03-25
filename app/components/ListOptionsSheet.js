import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ListOptionsSheet = ({
  visible,
  listTitle,
  itemCount = 0,
  onClose,
  onEditList,
}) => {
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
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {listTitle || "Your List"}
            </Text>
            <Text style={styles.sheetSubtitle}>
              {itemCount} album{itemCount === 1 ? "" : "s"}
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onEditList}
              style={styles.actionRow}
            >
              <Text style={styles.actionText}>Edit List</Text>
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
};

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
    borderRadius: 18,
    backgroundColor: "#5a6f86",
    overflow: "hidden",
  },
  sheetTitle: {
    paddingTop: 18,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
  },
  sheetSubtitle: {
    paddingTop: 4,
    paddingBottom: 14,
    textAlign: "center",
    fontSize: 14,
    color: "#dbe4ef",
  },
  actionRow: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(226, 232, 240, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#f8fafc",
  },
  doneButton: {
    borderRadius: 18,
    backgroundColor: "#5a6f86",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  doneText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f8fafc",
  },
});

export default ListOptionsSheet;
