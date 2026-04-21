import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Complaint, ComplaintStatus, useComplaints } from "@/context/ComplaintContext";
import { useAuth } from "@/context/AuthContext";

const statusMeta: Record<ComplaintStatus, { title: string; subtitle: string; icon: string; color: string; bg: string }> = {
  submitted: { title: "New Complaints", subtitle: "All newly submitted complaints", icon: "file-text", color: "#C2410C", bg: "#FFEDD5" },
  assigned: { title: "Assigned Complaints", subtitle: "Complaints assigned to ward team", icon: "user-check", color: "#EA580C", bg: "#FFEDD5" },
  in_progress: { title: "In Progress Complaints", subtitle: "Assigned and active complaints", icon: "tool", color: "#7C3AED", bg: "#EDE9FE" },
  resolved: { title: "Resolved Complaints", subtitle: "Complaints marked as resolved", icon: "check-circle", color: "#059669", bg: "#D1FAE5" },
  rejected: { title: "Rejected Complaints", subtitle: "Complaints that were rejected", icon: "x-circle", color: "#DC2626", bg: "#FEE2E2" },
};

const categoryIcon: Record<string, string> = {
  roads: "truck",
  water: "droplet",
  electricity: "zap",
  garbage: "trash-2",
  drainage: "git-merge",
  streetlight: "sun",
  encroachment: "alert-triangle",
  other: "more-horizontal",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

function ComplaintRow({ complaint }: { complaint: Complaint }) {
  const meta = statusMeta[complaint.status];

  return (
    <TouchableOpacity
      style={styles.rowCard}
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: complaint.id } })}
    >
      <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
        <Feather name={(categoryIcon[complaint.category] || "file-text") as any} size={19} color={meta.color} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{complaint.title}</Text>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Feather name={meta.icon as any} size={10} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.title.replace(" Complaints", "")}</Text>
          </View>
        </View>
        <Text style={styles.rowDesc} numberOfLines={2}>{complaint.description}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Feather name="map-pin" size={10} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{complaint.location}</Text>
          </View>
          <View style={styles.metaChip}>
            <Feather name="home" size={10} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{complaint.ward}</Text>
          </View>
          <View style={styles.metaChip}>
            <Feather name="clock" size={10} color="#64748B" />
            <Text style={styles.metaText}>{timeAgo(complaint.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.citizenRow}>
          <Feather name="user" size={11} color="#EA580C" />
          <Text style={styles.citizenText}>{complaint.userName || "Citizen"}</Text>
          {!!complaint.userMobile && <Text style={styles.citizenText}>· {complaint.userMobile}</Text>}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function ComplaintListScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 54 : insets.top;
  const params = useLocalSearchParams<{ status?: ComplaintStatus }>();
  const selectedStatus = params.status && statusMeta[params.status] ? params.status : "submitted";
  const pageMeta = statusMeta[selectedStatus];
  const { complaints } = useComplaints();
  const { user } = useAuth();

  const wardComplaints = user?.ward ? complaints.filter((item) => item.ward === user.ward) : complaints;
  const filtered = wardComplaints
    .filter((item) => selectedStatus === "in_progress" ? item.status === "in_progress" || item.status === "assigned" : item.status === selectedStatus)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#166534", "#16A34A", "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
            <Feather name="chevron-left" size={20} color="white" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{filtered.length}</Text>
          </View>
        </View>
        <View style={styles.headerTitleRow}>
          <View style={[styles.headerIcon, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
            <Feather name={pageMeta.icon as any} size={24} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{pageMeta.title}</Text>
            <Text style={styles.headerSub}>{pageMeta.subtitle}</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ComplaintRow complaint={item} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Feather name={pageMeta.icon as any} size={38} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No {pageMeta.title.toLowerCase()}</Text>
            <Text style={styles.emptySub}>Complaints for this status will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingRight: 10 },
  backText: { fontSize: 14, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  countPill: { minWidth: 38, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  countPillText: { fontSize: 15, fontWeight: "900", color: "#166534", fontFamily: "Inter_700Bold" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular", marginTop: 3 },
  listContent: { padding: 14, gap: 10 },
  rowCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "white", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#166534", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  rowIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
  statusText: { fontSize: 9, fontWeight: "900", fontFamily: "Inter_700Bold" },
  rowDesc: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 17 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4, maxWidth: "100%" },
  metaText: { fontSize: 10, color: "#64748B", fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  citizenRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  citizenText: { fontSize: 11, color: "#475569", fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  emptyCard: { alignItems: "center", justifyContent: "center", backgroundColor: "white", borderRadius: 20, padding: 28, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#CBD5E1", marginTop: 20 },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: "#475569", fontFamily: "Inter_700Bold", marginTop: 10 },
  emptySub: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "center" },
});