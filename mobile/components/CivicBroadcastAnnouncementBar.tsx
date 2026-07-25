import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { AppBroadcast } from "@/context/BroadcastContext";

const ORANGE = "#EA580C";

function categoryMeta(category: AppBroadcast["category"]) {
  if (category === "emergency") return { label: "Emergency", icon: "alert-triangle" as const, color: "#B91C1C", bg: "#FEE2E2" };
  if (category === "information") return { label: "Information", icon: "info" as const, color: "#1D4ED8", bg: "#DBEAFE" };
  if (category === "notice") return { label: "Notice", icon: "file-text" as const, color: "#6D28D9", bg: "#EDE9FE" };
  return { label: "Announcement", icon: "radio" as const, color: "#B45309", bg: "#FEF3C7" };
}

function relativeTime(value?: string) {
  if (!value) return "Recently";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CivicBroadcastAnnouncementBar({
  items,
  onOpen,
  onViewAll,
}: {
  items: AppBroadcast[];
  onOpen: (item: AppBroadcast) => void;
  onViewAll: () => void;
}) {
  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.liveDot} />
          <Text style={styles.headerTitle}>Announcements</Text>
          <View style={styles.countPill}><Text style={styles.countText}>{items.length}</Text></View>
        </View>
        <TouchableOpacity onPress={onViewAll} style={styles.viewAll} accessibilityRole="button" accessibilityLabel="View all announcements and news">
          <Text style={styles.viewAllText}>View all</Text>
          <Feather name="chevron-right" size={14} color={ORANGE} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {items.map((item) => {
          const meta = categoryMeta(item.category);
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.tile}
              onPress={() => onOpen(item)}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={`${meta.label}: ${item.title}`}
            >
              <View style={styles.tileTop}>
                <View style={[styles.typePill, { backgroundColor: meta.bg }]}>
                  <Feather name={meta.icon} size={11} color={meta.color} />
                  <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={styles.time}>{relativeTime(item.sentAt || item.createdAt)}</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
              <View style={styles.footer}>
                <View style={styles.mediaMeta}>
                  {item.mediaType ? <Feather name={item.mediaType === "video" ? "play-circle" : "image"} size={12} color="#64748B" /> : null}
                  <Text style={styles.footerText}>{item.ward || "All citizens"}</Text>
                </View>
                <Feather name="arrow-right" size={15} color={ORANGE} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  header: { marginBottom: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE },
  headerTitle: { color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" },
  countPill: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#FFEDD5" },
  countText: { color: "#C2410C", fontSize: 9.5, fontFamily: "Inter_700Bold" },
  viewAll: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 4 },
  viewAllText: { color: ORANGE, fontSize: 10.5, fontFamily: "Inter_700Bold" },
  list: { gap: 10, paddingRight: 4 },
  tile: { width: 260, minHeight: 145, borderRadius: 18, padding: 13, backgroundColor: "white", borderWidth: 1, borderColor: "#FED7AA", shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  typeText: { fontSize: 9.5, fontFamily: "Inter_700Bold" },
  time: { color: "#94A3B8", fontSize: 9, fontFamily: "Inter_500Medium" },
  title: { marginTop: 9, color: "#0F172A", fontSize: 13.5, lineHeight: 18, fontFamily: "Inter_700Bold" },
  body: { marginTop: 4, color: "#64748B", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" },
  footer: { marginTop: "auto", paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mediaMeta: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: { flex: 1, color: "#64748B", fontSize: 9.3, fontFamily: "Inter_500Medium" },
});
