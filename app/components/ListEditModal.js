import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const ROW_HEIGHT = 92;
const ROW_GAP = 10;
const ROW_SLOT_HEIGHT = ROW_HEIGHT + ROW_GAP;
const LONG_PRESS_DELAY = 180;
const MAX_MOVE_BEFORE_DRAG = 10;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getAlbumKey = (item, index = 0) =>
  item?.spotifyId || item?.id || `${item?.title || "album"}-${index}`;

const moveItem = (items, fromIndex, toIndex) => {
  if (
    !Array.isArray(items) ||
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const DragHandle = ({ disabled, index, onGrant, onMove, onRelease }) => {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => false,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          onGrant(index, event.nativeEvent.pageY);
        },
        onPanResponderMove: (event) => {
          onMove(event.nativeEvent.pageY);
        },
        onPanResponderRelease: () => {
          onRelease();
        },
        onPanResponderTerminate: () => {
          onRelease();
        },
      }),
    [disabled, index, onGrant, onMove, onRelease]
  );

  return (
    <View style={styles.dragHandle} {...panResponder.panHandlers}>
      <Ionicons name="reorder-three-outline" size={24} color="#dbe4ef" />
    </View>
  );
};

const ListEditModal = ({
  visible,
  listTitle,
  items,
  loading = false,
  saving = false,
  errorMessage = "",
  onClose,
  onSave,
}) => {
  const insets = useSafeAreaInsets();
  const [draftItems, setDraftItems] = useState(Array.isArray(items) ? items : []);
  const [activeDragKey, setActiveDragKey] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(-1);
  const dragTop = useRef(new Animated.Value(0)).current;
  const scrollOffsetRef = useRef(0);
  const draftItemsRef = useRef(draftItems);
  const placeholderIndexRef = useRef(-1);
  const dragStateRef = useRef({
    active: false,
    activeIndex: -1,
    sourceIndex: -1,
    item: null,
    itemKey: null,
    pendingIndex: -1,
    startPageY: 0,
    startTop: 0,
    startScrollOffset: 0,
    timer: null,
  });

  useEffect(() => {
    draftItemsRef.current = draftItems;
  }, [draftItems]);

  useEffect(() => {
    if (!visible) {
      clearPendingTimer();
      resetDragState();
      return;
    }

    setDraftItems(Array.isArray(items) ? items : []);
  }, [items, visible]);

  const hasOrderChanges = useMemo(() => {
    if (!Array.isArray(items) || items.length !== draftItems.length) {
      return true;
    }

    return draftItems.some(
      (item, index) => getAlbumKey(item, index) !== getAlbumKey(items[index], index)
    );
  }, [draftItems, items]);

  const clearPendingTimer = () => {
    if (dragStateRef.current.timer) {
      clearTimeout(dragStateRef.current.timer);
      dragStateRef.current.timer = null;
    }
  };

  const resetDragState = () => {
    clearPendingTimer();
    dragStateRef.current = {
      active: false,
      activeIndex: -1,
      sourceIndex: -1,
      item: null,
      itemKey: null,
      pendingIndex: -1,
      startPageY: 0,
      startTop: 0,
      startScrollOffset: 0,
      timer: null,
    };
    placeholderIndexRef.current = -1;
    setPlaceholderIndex(-1);
    setActiveDragKey(null);
    setIsDragging(false);
  };

  const activateDrag = (index, pageY) => {
    const nextItems = draftItemsRef.current;
    const item = nextItems[index];

    if (!item) {
      resetDragState();
      return;
    }

    dragStateRef.current.active = true;
    dragStateRef.current.activeIndex = index;
    dragStateRef.current.sourceIndex = index;
    dragStateRef.current.item = item;
    dragStateRef.current.itemKey = getAlbumKey(item, index);
    dragStateRef.current.startPageY = pageY;
    dragStateRef.current.startTop = index * ROW_SLOT_HEIGHT;
    dragStateRef.current.startScrollOffset = scrollOffsetRef.current;

    dragTop.setValue(index * ROW_SLOT_HEIGHT);
    placeholderIndexRef.current = index;
    setPlaceholderIndex(index);
    setActiveDragKey(getAlbumKey(item, index));
    setIsDragging(true);
  };

  const updateDraggedItemPosition = (pageY) => {
    const dragState = dragStateRef.current;
    const nextItems = draftItemsRef.current;

    if (!dragState.active || nextItems.length === 0) {
      return;
    }

    const maxTop = Math.max(0, (nextItems.length - 1) * ROW_SLOT_HEIGHT);
    const relativeTop =
      dragState.startTop +
      (pageY - dragState.startPageY) +
      (scrollOffsetRef.current - dragState.startScrollOffset);
    const nextTop = clamp(relativeTop, 0, maxTop);

    dragTop.setValue(nextTop);

    const hoveredIndex = clamp(
      Math.round(nextTop / ROW_SLOT_HEIGHT),
      0,
      nextItems.length - 1
    );

    if (hoveredIndex === placeholderIndexRef.current) {
      return;
    }

    placeholderIndexRef.current = hoveredIndex;
    setPlaceholderIndex(hoveredIndex);
  };

  const finishDrag = () => {
    clearPendingTimer();

    if (!dragStateRef.current.active) {
      dragStateRef.current.pendingIndex = -1;
      return;
    }

    const dragState = dragStateRef.current;
    const currentItems = draftItemsRef.current;
    const finalIndex = clamp(
      placeholderIndexRef.current,
      0,
      currentItems.length - 1
    );
    const reorderedItems = moveItem(
      currentItems,
      dragState.sourceIndex,
      finalIndex
    );

    Animated.spring(dragTop, {
      toValue: finalIndex * ROW_SLOT_HEIGHT,
      useNativeDriver: false,
      speed: 20,
      bounciness: 0,
    }).start(() => {
      draftItemsRef.current = reorderedItems;
      setDraftItems(reorderedItems);
      resetDragState();
    });
  };

  const handleDragGrant = (index, pageY) => {
    if (loading || saving) {
      return;
    }

    clearPendingTimer();
    dragStateRef.current.pendingIndex = index;
    dragStateRef.current.startPageY = pageY;
    dragStateRef.current.startScrollOffset = scrollOffsetRef.current;
    dragStateRef.current.timer = setTimeout(() => {
      activateDrag(index, pageY);
    }, LONG_PRESS_DELAY);
  };

  const handleDragMove = (pageY) => {
    if (dragStateRef.current.active) {
      updateDraggedItemPosition(pageY);
      return;
    }

    if (Math.abs(pageY - dragStateRef.current.startPageY) > MAX_MOVE_BEFORE_DRAG) {
      clearPendingTimer();
    }
  };

  const handleSavePress = () => {
    if (!hasOrderChanges || saving) {
      return;
    }

    onSave?.(draftItems);
  };

  const activeItem = dragStateRef.current.item;
  const itemCount = draftItems.length;
  const getRowTop = useCallback(
    (index) => {
      if (!isDragging) {
        return index * ROW_SLOT_HEIGHT;
      }

      const sourceIndex = dragStateRef.current.sourceIndex;
      const targetIndex = placeholderIndex;

      if (index === sourceIndex) {
        return sourceIndex * ROW_SLOT_HEIGHT;
      }

      if (targetIndex > sourceIndex) {
        if (index > sourceIndex && index <= targetIndex) {
          return (index - 1) * ROW_SLOT_HEIGHT;
        }
      } else if (targetIndex < sourceIndex) {
        if (index >= targetIndex && index < sourceIndex) {
          return (index + 1) * ROW_SLOT_HEIGHT;
        }
      }

      return index * ROW_SLOT_HEIGHT;
    },
    [isDragging, placeholderIndex]
  );

  const renderAlbumRow = (item, index, { floating = false } = {}) => {
    const albumKey = getAlbumKey(item, index);
    const isActiveRow = isDragging && activeDragKey === albumKey;

    return (
      <View
        key={floating ? `${albumKey}-floating` : albumKey}
        style={[
          styles.row,
          !floating && {
            position: "absolute",
            left: 0,
            right: 0,
            top: getRowTop(index),
          },
          isActiveRow && !floating && styles.rowGhost,
          floating && styles.rowFloating,
        ]}
      >
        {item?.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Ionicons name="disc-outline" size={22} color="#dbe4ef" />
          </View>
        )}

        <View style={styles.rowMeta}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item?.title || "Album unavailable"}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {item?.artistNames || "Unknown Artist"}
          </Text>
        </View>

        <DragHandle
          disabled={saving}
          index={index}
          onGrant={handleDragGrant}
          onMove={handleDragMove}
          onRelease={finishDrag}
        />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={saving ? () => {} : onClose}
    >
      <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, 18) + 6,
              paddingBottom: 14,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={saving}
            onPress={onClose}
            style={styles.headerAction}
          >
            <Text style={styles.headerActionText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Edit List</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {listTitle || "Your List"}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            disabled={saving || !hasOrderChanges}
            onPress={handleSavePress}
            style={[
              styles.headerAction,
              styles.headerSaveAction,
              (!hasOrderChanges || saving) && styles.headerActionDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.headerSaveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            Press and hold a handle to reorder
          </Text>
          <Text style={styles.summaryBody}>
            Drag albums into the order you want them to appear on the list page.
          </Text>
          <Text style={styles.summaryCount}>
            {itemCount} album{itemCount === 1 ? "" : "s"}
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        ) : itemCount === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>This list has no albums yet.</Text>
            <Text style={styles.emptyBody}>
              Add albums first, then come back here to reorder them.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listScroller}
            contentContainerStyle={[
              styles.listScrollerContent,
              { paddingBottom: Math.max(insets.bottom, 18) + 18 },
            ]}
            scrollEnabled={!isDragging}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            <View style={[styles.rowsContainer, { height: itemCount * ROW_SLOT_HEIGHT }]}>
              {draftItems.map((item, index) => renderAlbumRow(item, index))}
              {isDragging && activeItem ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.floatingRowContainer,
                    {
                      top: dragTop,
                    },
                  ]}
                >
                  {renderAlbumRow(activeItem, dragStateRef.current.activeIndex, {
                    floating: true,
                  })}
                </Animated.View>
              ) : null}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#50657b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(226, 232, 240, 0.22)",
  },
  headerAction: {
    minWidth: 76,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: "center",
  },
  headerActionText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#dbe4ef",
  },
  headerSaveAction: {
    alignItems: "flex-end",
  },
  headerSaveText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
  headerActionDisabled: {
    opacity: 0.55,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 14,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#dbe4ef",
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(226, 232, 240, 0.14)",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  summaryBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#dbe4ef",
  },
  summaryCount: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "#cdd8e5",
    textTransform: "uppercase",
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(127, 29, 29, 0.42)",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#fee2e2",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: "#dbe4ef",
  },
  listScroller: {
    flex: 1,
  },
  listScrollerContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  rowsContainer: {
    position: "relative",
  },
  rowGhost: {
    opacity: 0,
  },
  floatingRowContainer: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  row: {
    height: ROW_HEIGHT,
    marginBottom: ROW_GAP,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(226, 232, 240, 0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(226, 232, 240, 0.18)",
    flexDirection: "row",
    alignItems: "center",
  },
  rowFloating: {
    backgroundColor: "#60778f",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  cover: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowMeta: {
    flex: 1,
    paddingHorizontal: 14,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#dbe4ef",
  },
  dragHandle: {
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
});

export default ListEditModal;
