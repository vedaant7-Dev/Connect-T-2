import { Feather } from "@expo/vector-icons";
import { useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { AppBroadcast, useBroadcasts } from "@/context/BroadcastContext";

const ORANGE = "#EA580C";
const GREEN = "#16A34A";

function categoryMeta(category: AppBroadcast["category"]) {
  if (category === "emergency") return { label: "Emergency", icon: "alert-triangle" as const, color: "#B91C1C", bg: "#FEE2E2" };
  if (category === "information") return { label: "Information", icon: "info" as const, color: "#1D4ED8", bg: "#DBEAFE" };
  if (category === "notice") return { label: "Notice", icon: "file-text" as const, color: "#6D28D9", bg: "#EDE9FE" };
  return { label: "Announcement", icon: "radio" as const, color: "#B45309", bg: "#FEF3C7" };
}

function relativeTime(value?: string) {
  if (!value) return "Recently";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function BroadcastAnnouncementBar({ items, onOpen }: { items: AppBroadcast[]; onOpen: (item: AppBroadcast) => void }) {
  if (!items.length) return null;

  return (
    <View style={styles.floatingBar} accessibilityLabel="Official announcements">
      <View style={styles.barHeading}>
        <View style={styles.liveDot} />
        <Text style={styles.barHeadingText}>Official announcements</Text>
        <View style={styles.countPill}><Text style={styles.countText}>{items.length}</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barList}>
        {items.map((item) => {
          const meta = categoryMeta(item.category);
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.announcementTile}
              onPress={() => onOpen(item)}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={`${meta.label}: ${item.title}`}
            >
              <View style={[styles.tileIcon, { backgroundColor: meta.bg }]}>
                <Feather name={item.mediaType === "video" ? "play-circle" : item.mediaType === "image" ? "image" : meta.icon} size={16} color={meta.color} />
              </View>
              <View style={styles.tileCopy}>
                <Text style={styles.tileTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.tileBody} numberOfLines={1}>{item.body}</Text>
              </View>
              <Text style={styles.tileTime}>{relativeTime(item.sentAt || item.createdAt)}</Text>
              <Feather name="chevron-right" size={16} color={ORANGE} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function BroadcastDetailModal({ item, onClose }: { item: AppBroadcast | null; onClose: () => void }) {
  if (!item) return null;
  const meta = categoryMeta(item.category);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop} accessibilityViewIsModal>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={[styles.modalIcon, { backgroundColor: meta.bg }]}>
              <Feather name={item.mediaType === "video" ? "play-circle" : item.mediaType === "image" ? "image" : meta.icon} size={24} color={meta.color} />
            </View>
            <View style={styles.modalHeaderCopy}>
              <Text style={[styles.modalType, { color: meta.color }]}>{meta.label}</Text>
              <Text style={styles.modalDate}>{new Date(item.sentAt || item.createdAt).toLocaleString("en-IN")}</Text>
            </View>
            <TouchableOpacity style={styles.closeIcon} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close announcement">
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{item.title}</Text>
            <Text style={styles.modalBody}>{item.body}</Text>

            {item.mediaType === "image" && item.mediaUri ? (
              <Image source={{ uri: item.mediaUri }} style={styles.fullImage} resizeMode="contain" />
            ) : null}

            {item.mediaType === "video" && item.mediaUri ? (
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => void Linking.openURL(item.mediaUri!)}
                accessibilityRole="button"
                accessibilityLabel="Play attached broadcast video"
              >
                <Feather name="play-circle" size={22} color="white" />
                <Text style={styles.playText}>Play attached video</Text>
                {item.mediaDurationSeconds ? <Text style={styles.durationText}>{Math.ceil(item.mediaDurationSeconds / 60)} min</Text> : null}
              </TouchableOpacity>
            ) : null}

            <View style={styles.metaRow}>
              <View style={styles.metaPill}><Feather name="users" size={12} color="#64748B" /><Text style={styles.metaText}>{item.ward || "All citizens"}</Text></View>
              <View style={styles.metaPill}><Feather name="user" size={12} color="#64748B" /><Text style={styles.metaText}>{item.createdByName || "Connect-T"}</Text></View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.doneText}>Back to Alerts & News</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function CivicBroadcastExperience() {
  const router = useRouter();
  const segments = useSegments();
  const params = useGlobalSearchParams<{ broadcastId?: string | string[] }>();
  const { user } = useAuth();
  const { broadcasts, refreshBroadcasts, markBroadcastRead } = useBroadcasts();
  const openedReadId = useRef<string | null>(null);

  const sentBroadcasts = useMemo(
    () => broadcasts
      .filter((item) => item.status === "sent")
      .sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime()),
    [broadcasts],
  );

  const requestedId = Array.isArray(params.broadcastId) ? params.broadcastId[0] : params.broadcastId;
  const selectedBroadcast = requestedId ? sentBroadcasts.find((item) => item.id === requestedId) || null : null;
  const firstSegment = String(segments[0] || "");
  const secondSegment = String(segments[1] || "");
  const isCitizenHome = user?.role === "citizen" && firstSegment === "(tabs)" && (!secondSegment || secondSegment === "index");
  const isNewsRoute = firstSegment === "alert" && secondSegment === "list";

  useEffect(() => {
    if (requestedId && !selectedBroadcast) void refreshBroadcasts().catch(() => undefined);
  }, [refreshBroadcasts, requestedId, selectedBroadcast]);

  useEffect(() => {
    if (!selectedBroadcast || selectedBroadcast.isRead || openedReadId.current === selectedBroadcast.id) return;
    openedReadId.current = selectedBroadcast.id;
    void markBroadcastRead(selectedBroadcast.id).catch(() => {
      openedReadId.current = null;
    });
  }, [markBroadcastRead, selectedBroadcast]);

  const openBroadcast = (item: AppBroadcast) => {
    router.push({ pathname: "/alert/list", params: { broadcastId: item.id } } as any);
  };

  const closeBroadcast = () => {
    router.replace("/alert/list" as any);
  };

  return (
    <>
      {isCitizenHome ? <BroadcastAnnouncementBar items={sentBroadcasts} onOpen={openBroadcast} /> : null}
      <BroadcastDetailModal item={isNewsRoute ? selectedBroadcast : null} onClose={closeBroadcast} />
    </>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    position: "absolute",
    zIndex: 80,
    left: 10,
    right: 10,
    bottom: Platform.OS === "web" ? 82 : 78,
    maxWidth: 760,
    alignSelf: "center",
    borderRadius: 18,
    padding: 9,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "#FED7AA",
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  barHeading: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, marginBottom: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE },
  barHeadingText: { color: "#0F172A", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  countPill: { minWidth: 20, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#FFEDD5" },
  countText: { color: "#C2410C", fontSize: 9, fontFamily: "Inter_700Bold" },
  barList: { gap: 7, paddingRight: 4 },
  announcementTile: { width: Platform.OS === "web" ? 330 : 292, minHeight: 58, borderRadius: 13, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FFEDD5" },
  tileIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  tileCopy: { flex: 1, minWidth: 0 },
  tileTitle: { color: "#0F172A", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  tileBody: { marginTop: 2, color: "#64748B", fontSize: 9.5, fontFamily: "Inter_400Regular" },
  tileTime: { color: "#94A3B8", fontSize: 8.5, fontFamily: "Inter_500Medium" },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18, backgroundColor: "rgba(15,23,42,0.66)" },
  modalCard: { width: "100%", maxWidth: 520, maxHeight: "92%", borderRadius: 24, backgroundColor: "white", padding: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalHeaderCopy: { flex: 1 },
  modalType: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  modalDate: { marginTop: 3, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" },
  closeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  modalScroll: { marginTop: 14 },
  modalContent: { paddingBottom: 10 },
  modalTitle: { color: "#0F172A", fontSize: 21, lineHeight: 28, fontFamily: "Inter_700Bold" },
  modalBody: { marginTop: 10, color: "#475569", fontSize: 13, lineHeight: 21, fontFamily: "Inter_400Regular" },
  fullImage: { marginTop: 14, width: "100%", height: 300, borderRadius: 16, backgroundColor: "#F8FAFC" },
  playButton: { marginTop: 14, minHeight: 54, borderRadius: 15, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: ORANGE },
  playText: { color: "white", fontSize: 12.5, fontFamily: "Inter_700Bold" },
  durationText: { marginLeft: "auto", color: "rgba(255,255,255,0.82)", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  metaRow: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: "#F8FAFC" },
  metaText: { color: "#64748B", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  doneButton: { marginTop: 14, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: GREEN },
  doneText: { color: "white", fontSize: 12.5, fontFamily: "Inter_700Bold" },
});