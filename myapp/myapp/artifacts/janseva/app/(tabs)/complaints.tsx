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
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useLanguage } from "@/context/LanguageContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";

const statusLabelKeys: Record<ComplaintStatus, string> = {
  submitted: "submitted",
  assigned: "assigned",
  in_progress: "inProgress",
  resolved: "resolved",
  rejected: "rejected",
};

const statusConfig: Record<ComplaintStatus, { color: string; bg: string; icon: string }> = {
  submitted: { color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  assigned: { color: "#EA580C", bg: "#FFEDD5", icon: "user-check" },
  in_progress: { color: "#7C3AED", bg: "#EDE9FE", icon: "tool" },
  resolved: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  rejected: { color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
};

const categoryLabelKeys: Record<string, string> = {
  roads: "roads",
  water: "water",
  electricity: "electricity",
  garbage: "garbage",
  drainage: "drainage",
  streetlight: "streetLight",
  encroachment: "encroachment",
  other: "other",
};

const categoryConfig: Record<string, { icon: string; color: string }> = {
  roads: { icon: "truck", color: "#92400E" },
  water: { icon: "droplet", color: "#0369A1" },
  electricity: { icon: "zap", color: "#D97706" },
  garbage: { icon: "trash-2", color: "#059669" },
  drainage: { icon: "git-merge", color: "#0EA5E9" },
  streetlight: { icon: "sun", color: "#7C3AED" },
  encroachment: { icon: "alert-triangle", color: "#DC2626" },
  other: { icon: "more-horizontal", color: "#475569" },
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
  const { t } = useLanguage();
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
              <Text style={[styles.statusText, { color: st.color }]}>{t(statusLabelKeys[complaint.status])}</Text>
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

export default function ComplaintsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { complaints } = useComplaints();
  const { t } = useLanguage();
  const { handleScroll } = useTabBarVisibility();
  const [filter, setFilter] = useState("all");

  const filterTabs = [
    { id: "all", label: t("complaints"), icon: "file-text", color: "#92400E" },
    { id: "resolved", label: t("resolved"), icon: "check-circle", color: "#059669" },
    { id: "in_progress", label: t("inProgress"), icon: "tool", color: "#7C3AED" },
    { id: "rejected", label: t("rejected"), icon: "x-circle", color: "#DC2626" },
  ];

  const filtered = filter === "all"
    ? complaints
    : complaints.filter((c) => {
        if (filter === "in_progress") return c.status === "in_progress" || c.status === "assigned";
        if (filter === "rejected") return c.status === "rejected";
        return c.status === filter;
      });

  const counts = {
    all: complaints.length,
    submitted: complaints.filter((c) => c.status === "submitted").length,
    in_progress: complaints.filter((c) => c.status === "in_progress" || c.status === "assigned").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    rejected: complaints.filter((c) => c.status === "rejected").length,
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12, overflow: "hidden" }]}
      >
        <TopShade height={100} />
        <DecorativeCircles />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>{t("myComplaints")}</Text>
            <Text style={styles.headerSub}>{complaints.length} {t("total")}</Text>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push("/complaint/new")}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.newBtnText}>{t("new")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {filterTabs.map((tab) => {
            const isActive = filter === tab.id;
            const count = counts[tab.id as keyof typeof counts];
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setFilter(tab.id)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                activeOpacity={0.8}
              >
                <View style={[styles.filterChipIcon, isActive && { backgroundColor: tab.color + "12" }]}>
                  <Feather name={tab.icon as any} size={16} color={isActive ? tab.color : "rgba(255,255,255,0.55)"} />
                </View>
                <Text style={[styles.filterChipCount, isActive && styles.filterChipCountActive]}>
                  {count ?? 0}
                </Text>
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 8) + 80 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>{t("noComplaintsYet")}</Text>
            <Text style={styles.emptySub}>{t("tapNewToRaise")}</Text>
          </View>
        }
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
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
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    width: "23%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
  },
  filterChipActive: {
    backgroundColor: "white",
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  filterChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  filterChipCount: { fontSize: 20, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", lineHeight: 24 },
  filterChipCountActive: { color: "#111827" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.85)", fontFamily: "Inter_600SemiBold", textAlign: "center", lineHeight: 15 },
  filterChipTextActive: { color: "#C2410C" },
  filterChipBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterChipBadgeActive: { backgroundColor: "#EA580C" },
  filterChipBadgeText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.9)", fontFamily: "Inter_700Bold" },
  filterChipBadgeTextActive: { color: "white" },
  list: { padding: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#B45309",
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
});
