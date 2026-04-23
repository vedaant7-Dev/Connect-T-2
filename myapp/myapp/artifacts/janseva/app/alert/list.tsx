import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { AppAlert, useAlerts, wardKey } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";

function formatDate(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function AlertRow({ item, onRemove }: { item: AppAlert; onRemove: (id: string) => void }) {
  const isAlert = item.type === "alert";
  const color = isAlert ? "#DC2626" : "#EA580C";
  const bg = isAlert ? "#FEE2E2" : "#FFEDD5";

  return (
    <View style={styles.rowCard}>
      {item.media?.type === "image" ? (
        <Image source={{ uri: item.media.uri }} style={styles.rowImage} />
      ) : item.media?.type === "video" ? (
        <View style={[styles.rowVideo, { backgroundColor: bg }]}>
          <Feather name="play-circle" size={24} color={color} />
        </View>
      ) : (
        <View style={[styles.rowIcon, { backgroundColor: bg }]}>
          <Feather name={isAlert ? "alert-triangle" : "radio"} size={20} color={color} />
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <View style={[styles.typePill, { backgroundColor: bg }]}>
            <Text style={[styles.typeText, { color }]}>{isAlert ? "Alert" : "News"}</Text>
          </View>
          <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <View style={styles.metaRow}>
          {!!item.location && (
            <View style={styles.metaChip}>
              <Feather name="map-pin" size={10} color="#64748B" />
              <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          {!!item.priority && (
            <View style={styles.metaChip}>
              <Feather name="flag" size={10} color="#64748B" />
              <Text style={styles.metaText}>{item.priority}</Text>
            </View>
          )}
          {!!item.media && (
            <View style={styles.metaChip}>
              <Feather name={item.media.type === "video" ? "video" : "image"} size={10} color="#64748B" />
              <Text style={styles.metaText}>{item.media.type}</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onRemove(item.id);
        }}
        activeOpacity={0.85}
      >
        <Feather name="trash-2" size={15} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );
}

export default function AlertListScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 54 : insets.top;
  const { alerts: allAlerts, removeAlert } = useAlerts();
  const { user } = useAuth();
  const alerts = user?.role === "nagarsevak"
    ? allAlerts.filter((a) => a.postedById ? a.postedById === user.id : a.postedBy === user.name)
    : allAlerts.filter((a) => !a.ward || (!!user?.ward && wardKey(a.ward) === wardKey(user.ward)));
  const alertCount = alerts.filter((item) => item.type === "alert").length;
  const newsCount = alerts.filter((item) => item.type === "news").length;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#166534", "#16A34A", "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
            <Feather name="chevron-left" size={20} color="white" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/alert/new" as any)} style={styles.addBtn} activeOpacity={0.85}>
            <Feather name="plus" size={14} color="#166534" />
            <Text style={styles.addText}>Post</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Alerts & News</Text>
        <Text style={styles.headerSub}>All posted alerts and news shown in rows</Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{alertCount}</Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{newsCount}</Text>
            <Text style={styles.statLabel}>News</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlertRow item={item} onRemove={removeAlert} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Feather name="bell-off" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No alerts or news yet</Text>
            <Text style={styles.emptySub}>Tap Post to broadcast updates to citizens.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingRight: 10 },
  backText: { fontSize: 14, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  addText: { fontSize: 12, fontWeight: "900", color: "#166534", fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular", marginTop: 5 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  statChip: { flex: 1, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", borderRadius: 16, paddingVertical: 10, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_600SemiBold", fontWeight: "600", marginTop: 1 },
  listContent: { padding: 14, gap: 10 },
  rowCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "white", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#166534", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  rowIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowImage: { width: 58, height: 58, borderRadius: 15, backgroundColor: "#F8FAFC", flexShrink: 0 },
  rowVideo: { width: 58, height: 58, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeText: { fontSize: 10, fontWeight: "900", fontFamily: "Inter_700Bold" },
  timeText: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", flexShrink: 0 },
  title: { fontSize: 14, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 3 },
  body: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 17 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4, maxWidth: "100%" },
  metaText: { fontSize: 10, color: "#64748B", fontWeight: "700", fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  deleteBtn: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#FEF2F2", flexShrink: 0 },
  emptyCard: { alignItems: "center", justifyContent: "center", backgroundColor: "white", borderRadius: 20, padding: 28, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#CBD5E1", marginTop: 20 },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: "#475569", fontFamily: "Inter_700Bold", marginTop: 10 },
  emptySub: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "center" },
});