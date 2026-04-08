import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useComplaints, Complaint, ComplaintStatus } from "@/context/ComplaintContext";

const statusConfig: Record<ComplaintStatus, { label: string; color: string; bg: string; icon: string }> = {
  submitted: { label: "Submitted", color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  assigned: { label: "Assigned", color: "#2563EB", bg: "#DBEAFE", icon: "user-check" },
  in_progress: { label: "In Progress", color: "#7C3AED", bg: "#EDE9FE", icon: "tool" },
  resolved: { label: "Resolved", color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
};

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  roads: { label: "Roads", icon: "truck", color: "#92400E" },
  water: { label: "Water", icon: "droplet", color: "#0369A1" },
  electricity: { label: "Electricity", icon: "zap", color: "#D97706" },
  garbage: { label: "Garbage", icon: "trash-2", color: "#059669" },
  drainage: { label: "Drainage", icon: "git-merge", color: "#0EA5E9" },
  streetlight: { label: "Street Light", icon: "sun", color: "#7C3AED" },
  encroachment: { label: "Encroachment", icon: "alert-triangle", color: "#DC2626" },
  other: { label: "Other", icon: "more-horizontal", color: "#475569" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function ComplaintCard({ complaint, onPress }: { complaint: Complaint; onPress: () => void }) {
  const st = statusConfig[complaint.status];
  const cat = categoryConfig[complaint.category] || categoryConfig.other;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.catIcon, { backgroundColor: cat.color + "18" }]}>
          <Feather name={cat.icon as any} size={18} color={cat.color} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{complaint.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
              <Feather name={st.icon as any} size={9} color={st.color} />
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{complaint.description}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={10} color="#94A3B8" />
              <Text style={styles.metaText} numberOfLines={1}>{complaint.location}</Text>
            </View>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaTime}>{timeAgo(complaint.createdAt)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cmpId}># {complaint.id}</Text>
        <View style={styles.timelineBar}>
          {(["submitted", "assigned", "in_progress", "resolved"] as ComplaintStatus[]).map((s, i) => {
            const steps = ["submitted", "assigned", "in_progress", "resolved"] as ComplaintStatus[];
            const currentIdx = steps.indexOf(complaint.status);
            const filled = i <= currentIdx && complaint.status !== "rejected";
            return (
              <View
                key={s}
                style={[styles.timelineStep, {
                  backgroundColor: filled ? statusConfig[s].color : "#E2E8F0",
                  flex: i < 3 ? 1 : 0,
                  width: i === 3 ? 20 : undefined,
                  height: i === 3 ? 20 : 4,
                  borderRadius: i === 3 ? 10 : 2,
                  alignItems: "center",
                  justifyContent: "center",
                }]}
              >
                {i === 3 && <Feather name="check" size={10} color={filled ? "white" : "#CBD5E1"} />}
              </View>
            );
          })}
        </View>
        <Feather name="chevron-right" size={14} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
}

const filterTabs = [
  { id: "all", label: "All" },
  { id: "submitted", label: "New" },
  { id: "in_progress", label: "Active" },
  { id: "resolved", label: "Done" },
];

export default function ComplaintsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const router = useRouter();
  const { complaints } = useComplaints();
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? complaints
    : complaints.filter((c) => {
        if (filter === "in_progress") return c.status === "in_progress" || c.status === "assigned";
        return c.status === filter;
      });

  const counts = {
    all: complaints.length,
    submitted: complaints.filter((c) => c.status === "submitted").length,
    in_progress: complaints.filter((c) => c.status === "in_progress" || c.status === "assigned").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1E3A8A", "#1E40AF", "#2563EB", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>My Complaints</Text>
            <Text style={styles.headerSub}>{complaints.length} total · Ward 14</Text>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push("/complaint/new")}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          {[
            { label: "Submitted", count: counts.submitted, color: "#FDE68A" },
            { label: "Active", count: counts.in_progress, color: "#C4B5FD" },
            { label: "Resolved", count: counts.resolved, color: "#6EE7B7" },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setFilter(tab.id)}
              style={[styles.filterChip, filter === tab.id && styles.filterChipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, filter === tab.id && styles.filterChipTextActive]}>
                {tab.label}
                {counts[tab.id as keyof typeof counts] !== undefined && (
                  <Text style={[styles.filterChipCount, filter === tab.id && styles.filterChipTextActive]}>
                    {" "}({counts[tab.id as keyof typeof counts]})
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ComplaintCard
            complaint={item}
            onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: item.id } })}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No complaints yet</Text>
            <Text style={styles.emptySub}>Tap "New" to raise your first complaint</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/complaint/new")}
        activeOpacity={0.85}
      >
        <LinearGradient colors={["#1E40AF", "#2563EB"]} style={styles.fabGrad}>
          <Feather name="camera" size={20} color="white" />
          <Text style={styles.fabText}>Report Problem</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  newBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  statRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 0,
  },
  statItem: { flex: 1, alignItems: "center" },
  statCount: { fontSize: 24, fontWeight: "900", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 2 },
  filterRow: { gap: 8, paddingRight: 4, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  filterChipActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)", fontFamily: "Inter_600SemiBold" },
  filterChipTextActive: { color: "white" },
  filterChipCount: { fontSize: 11 },
  list: { padding: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardTop: { flexDirection: "row", gap: 10, padding: 14, alignItems: "flex-start" },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", flex: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 6 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3, flex: 1 },
  metaText: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", flex: 1 },
  metaDot: { fontSize: 10, color: "#CBD5E1" },
  metaTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  cmpId: { fontSize: 10, fontWeight: "700", color: "#94A3B8", fontFamily: "Inter_600SemiBold" },
  timelineBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  timelineStep: {},
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#334155", fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  fab: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  fabGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  fabText: { fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
