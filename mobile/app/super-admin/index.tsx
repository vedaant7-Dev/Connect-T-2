import React, { useState, useMemo, useCallback, memo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform, Dimensions, Modal, FlatList, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useComplaints, Complaint } from "@/context/ComplaintContext";
import { useOfficers, Officer } from "@/hooks/useOfficers";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

const categoryConfig: Record<string, { icon: string; color: string; label: string }> = {
  roads: { icon: "truck", color: "#92400E", label: "Roads" },
  water: { icon: "droplet", color: "#0369A1", label: "Water" },
  electricity: { icon: "zap", color: "#D97706", label: "Electricity" },
  garbage: { icon: "trash-2", color: "#059669", label: "Garbage" },
  drainage: { icon: "git-merge", color: "#0EA5E9", label: "Drainage" },
  streetlight: { icon: "sun", color: "#7C3AED", label: "Streetlight" },
  encroachment: { icon: "alert-triangle", color: "#DC2626", label: "Encroachment" },
  other: { icon: "more-horizontal", color: "#475569", label: "Other" },
};

const STATUS_COLOR: Record<string, string> = {
  submitted: "#D97706", assigned: "#7C3AED", in_progress: "#0EA5E9", resolved: "#059669", rejected: "#DC2626",
};
const STATUS_BG: Record<string, string> = {
  submitted: "#FEF3C7", assigned: "#EDE9FE", in_progress: "#E0F2FE", resolved: "#D1FAE5", rejected: "#FEE2E2",
};
const STATUS_LABEL: Record<string, string> = {
  submitted: "Pending", assigned: "Assigned", in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  const days = Math.floor(h / 24);
  if (days > 0) return `${days}d ago`;
  if (h > 0) return `${h}h ago`;
  return "just now";
}

const StatCard = memo(function StatCard({
  icon, label, value, color, bg, onPress,
}: {
  icon: string; label: string; value: string | number; color: string; bg: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.72 : 1}
      style={{ flex: 1, backgroundColor: "white", borderRadius: 14, padding: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: "center" }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center" }}>{label}</Text>
      {onPress && (
        <View style={{ position: "absolute", top: 5, right: 5, width: 14, height: 14, borderRadius: 7, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
          <Feather name="chevron-right" size={8} color={color} />
        </View>
      )}
    </TouchableOpacity>
  );
});

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 10, marginTop: 6 }}>
      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{title}</Text>
      {sub && <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{sub}</Text>}
    </View>
  );
}

const ComplaintRow = memo(function ComplaintRow({ c, onPress }: { c: Complaint; onPress: () => void }) {
  const cat = categoryConfig[c.category] || categoryConfig.other;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", flexDirection: "row", alignItems: "center" }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: cat.color + "18", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
        <Feather name={cat.icon as any} size={15} color={cat.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }} numberOfLines={1}>{c.title}</Text>
        <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A", marginTop: 1 }}>ID: {c.id}</Text>
        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>
          {c.ward} · {c.userName || "Unknown"} · {timeAgo(c.createdAt)}
        </Text>
      </View>
      <View style={{ backgroundColor: STATUS_BG[c.status] || "#F1F5F9", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
        <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: STATUS_COLOR[c.status] || "#64748B" }}>
          {STATUS_LABEL[c.status] || c.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

function ComplaintDetail({ c, onBack, officers }: { c: Complaint; onBack: () => void; officers?: Officer[] }) {
  const cat = categoryConfig[c.category] || categoryConfig.other;
  const officer = officers?.find((n) => n.ward === c.ward && n.approvalStatus === "approved");
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <Feather name="arrow-left" size={18} color="#16A34A" />
        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#16A34A", marginLeft: 6 }}>Back to list</Text>
      </TouchableOpacity>

      <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: cat.color + "18", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <Feather name={cat.icon as any} size={20} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{c.title}</Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{cat.label} · {c.id}</Text>
          </View>
          <View style={{ backgroundColor: STATUS_BG[c.status] || "#F1F5F9", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: STATUS_COLOR[c.status] || "#64748B" }}>
              {STATUS_LABEL[c.status] || c.status}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#334155", lineHeight: 20 }}>{c.description}</Text>
      </View>

      <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>Complaint Issued User Detail</Text>
        {[
          { label: "Name", value: c.userName || "—", icon: "user" },
          { label: "Mobile", value: c.userMobile || "—", icon: "phone" },
          { label: "Ward", value: c.ward, icon: "map-pin" },
          { label: "Location", value: c.location, icon: "navigation" },
          { label: "Address", value: c.userAddress || "—", icon: "home" },
          { label: "Age", value: c.userAge ? String(c.userAge) : "—", icon: "calendar" },
          { label: "Email", value: c.userEmail || "—", icon: "mail" },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
              <Feather name={item.icon as any} size={13} color="#16A34A" />
            </View>
            <Text style={{ width: 68, fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>{item.label}</Text>
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#0F172A" }}>{item.value}</Text>
          </View>
        ))}
      </View>

      {officer && (
        <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>Assigned Nagarsevak Officer Detail</Text>
          {[
            { label: "Officer", value: officer.name || "Not assigned", icon: "user-check" },
            { label: "Mobile", value: officer.mobile ? "+91 " + officer.mobile : "Not added", icon: "phone" },
            { label: "Ward", value: officer.ward || c.ward || "Not added", icon: "map-pin" },
            { label: "Ward Code", value: officer.wardCode || c.wardCode || "Not added", icon: "hash" },
            { label: "Nagarsevak ID", value: officer.id || c.assignedOfficerId || "Not added", icon: "credit-card" },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Feather name={item.icon as any} size={13} color="#16A34A" />
              </View>
              <Text style={{ width: 82, fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>{item.label}</Text>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#0F172A" }}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 12 }}>Status Timeline</Text>
        {c.timeline.map((t, idx) => (
          <View key={idx} style={{ flexDirection: "row", marginBottom: 10 }}>
            <View style={{ alignItems: "center", marginRight: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_COLOR[t.status] || "#64748B", marginTop: 3 }} />
              {idx < c.timeline.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: "#E2E8F0", marginTop: 4 }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 4 }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: STATUS_COLOR[t.status] || "#64748B" }}>
                {STATUS_LABEL[t.status] || t.status}
              </Text>
              {t.note && <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 1 }}>{t.note}</Text>}
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 1 }}>
                {t.updatedBy} · {new Date(t.timestamp).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

type CardType = "total" | "pending" | "inProgress" | "resolved" | "rejected" | "resolution" | "officers" | "wards";

export default function SuperAdminDashboard() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, logout } = useAuth();
  const { complaints } = useComplaints();
  const { officers: allOfficers } = useOfficers("approved");
  const router = useRouter();
  const [modal, setModal] = useState<{ type: CardType; title: string; sub: string } | null>(null);
  const [selectedC, setSelectedC] = useState<Complaint | null>(null);
  const [complaintSearch, setComplaintSearch] = useState("");

  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter((c) => c.status === "submitted").length;
    const inProgress = complaints.filter((c) => c.status === "in_progress" || c.status === "assigned").length;
    const resolved = complaints.filter((c) => c.status === "resolved").length;
    const rejected = complaints.filter((c) => c.status === "rejected").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const totalOfficers = allOfficers.length;
    const totalWards = new Set(allOfficers.map((n) => n.ward)).size;
    return { total, pending, inProgress, resolved, rejected, resolutionRate, totalOfficers, totalWards };
  }, [complaints, allOfficers]);

  const wardAnalytics = useMemo(() => (
    Object.entries(
      complaints.reduce((acc: Record<string, any>, c) => {
        const ward = c.ward || "Unknown";
        if (!acc[ward]) acc[ward] = { total: 0, pending: 0, resolved: 0, rejected: 0, inProgress: 0 };
        acc[ward].total++;
        if (c.status === "submitted") acc[ward].pending++;
        if (c.status === "resolved") acc[ward].resolved++;
        if (c.status === "rejected") acc[ward].rejected++;
        if (c.status === "in_progress" || c.status === "assigned") acc[ward].inProgress++;
        return acc;
      }, {})
    ).sort((a: any, b: any) => b[1].total - a[1].total)
  ), [complaints]);

  const monthlyData = useMemo(() => (
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { month: d.toLocaleString("default", { month: "short" }), count: complaints.filter((c) => c.createdAt.startsWith(monthKey)).length };
    })
  ), [complaints]);

  const maxMonthly = useMemo(() => Math.max(...monthlyData.map((m) => m.count), 1), [monthlyData]);

  const categoryAnalytics = useMemo(() => (
    Object.entries(complaints.reduce((acc: Record<string, number>, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])
  ), [complaints]);

  const searchableComplaints = useMemo(() => {
    const q = complaintSearch.trim().toLowerCase();
    if (!q) return complaints;
    return complaints.filter((c) => {
      const officer = allOfficers.find((n) => n.ward === c.ward);
      return [c.id, c.title, c.description, c.ward, c.category, c.status, c.userName, c.userMobile, officer?.name, officer?.id, officer?.mobile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [complaints, complaintSearch, allOfficers]);

  const recentComplaints = useMemo(() => (
    [...searchableComplaints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  ), [searchableComplaints]);

  const wardOfficers = useMemo(() => allOfficers.filter((n) => n.ward), [allOfficers]);

  const getFilteredComplaints = useCallback((type: CardType) => {
    const source = complaintSearch.trim() ? searchableComplaints : complaints;
    const sorted = [...source].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    switch (type) {
      case "total": return sorted;
      case "pending": return sorted.filter((c) => c.status === "submitted");
      case "inProgress": return sorted.filter((c) => c.status === "in_progress" || c.status === "assigned");
      case "resolved": return sorted.filter((c) => c.status === "resolved");
      case "rejected": return sorted.filter((c) => c.status === "rejected");
      default: return sorted;
    }
  }, [complaints, searchableComplaints, complaintSearch]);

  const openModal = useCallback((type: CardType, title: string, sub: string) => {
    setSelectedC(null);
    setModal({ type, title, sub });
  }, []);

  const closeModal = useCallback(() => { setModal(null); setSelectedC(null); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <LinearGradient
        colors={["#052E16", "#166534", "#16A34A"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 6 }}>
              <Feather name="shield" size={10} color="#6EE7B7" />
              <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: "#6EE7B7", marginLeft: 4, letterSpacing: 1.5 }}>SUPER ADMIN</Text>
            </View>
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "white" }}>Super Admin Dashboard</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>All Wards · AMC Ambernath · Live</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 }}>
          {[
            { label: "Total", value: stats.total, color: "#93C5FD" },
            { label: "Pending", value: stats.pending, color: "#FDE68A" },
            { label: "Active", value: stats.inProgress, color: "#C4B5FD" },
            { label: "Resolved", value: stats.resolved, color: "#6EE7B7" },
          ].map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{s.label}</Text>
              {i < 3 && <View style={{ position: "absolute", right: 0, top: "10%", height: "80%", width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />}
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Complaint Control Center" sub="Search by Complaint ID, citizen, Nagarsevak, ward or category" />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
          <Feather name="search" size={16} color="#94A3B8" />
          <TextInput
            value={complaintSearch}
            onChangeText={setComplaintSearch}
            placeholder="Search complaints, ID, ward officer..."
            placeholderTextColor="#CBD5E1"
            style={{ flex: 1, marginLeft: 10, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0F172A", outlineWidth: 0 } as any}
          />
          {complaintSearch.length > 0 && <TouchableOpacity onPress={() => setComplaintSearch("")}><Feather name="x" size={16} color="#94A3B8" /></TouchableOpacity>}
        </View>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatCard icon="file-text" label="Total Complaints" value={stats.total} color="#3B82F6" bg="#DBEAFE" onPress={() => openModal("total", "All Complaints", `${stats.total} complaints`)} />
            <StatCard icon="clock" label="Pending" value={stats.pending} color="#D97706" bg="#FEF3C7" onPress={() => openModal("pending", "Pending Complaints", `${stats.pending} awaiting action`)} />
            <StatCard icon="tool" label="In Progress" value={stats.inProgress} color="#7C3AED" bg="#EDE9FE" onPress={() => openModal("inProgress", "In Progress", `${stats.inProgress} active`)} />
            <StatCard icon="check-circle" label="Resolved" value={stats.resolved} color="#059669" bg="#D1FAE5" onPress={() => openModal("resolved", "Resolved", `${stats.resolved} completed`)} />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatCard icon="x-circle" label="Rejected" value={stats.rejected} color="#DC2626" bg="#FEE2E2" onPress={() => openModal("rejected", "Rejected", `${stats.rejected} rejected`)} />
            <StatCard icon="percent" label="Resolution %" value={`${stats.resolutionRate}%`} color="#0EA5E9" bg="#E0F2FE" onPress={() => openModal("resolution", "Resolution Rate", "Ward-wise analytics")} />
            <StatCard icon="users" label="Officers" value={stats.totalOfficers} color="#8B5CF6" bg="#EDE9FE" onPress={() => openModal("officers", "Ward Officers", `${stats.totalOfficers} officers`)} />
            <StatCard icon="map-pin" label="Wards Active" value={stats.totalWards} color="#16A34A" bg="#DCFCE7" onPress={() => openModal("wards", "Ward Breakdown", "All wards overview")} />
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Category Breakdown" sub="Complaints by type" />
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            {categoryAnalytics.length === 0 ? (
              <Text style={{ color: "#94A3B8", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 16 }}>No complaints yet</Text>
            ) : (
              categoryAnalytics.map(([cat, count]) => {
                const cfg = categoryConfig[cat] || categoryConfig.other;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <View key={cat} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: cfg.color + "18", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        <Feather name={cfg.icon as any} size={14} color={cfg.color} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155" }}>{cfg.label}</Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: cfg.color }}>{count}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, marginLeft: 38 }}>
                      <View style={{ height: 6, width: `${pct}%`, backgroundColor: cfg.color, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Recent Complaints" sub="Latest 5 across all wards" />
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            {recentComplaints.length === 0 ? (
              <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", paddingVertical: 16, fontFamily: "Inter_400Regular" }}>No complaints yet</Text>
            ) : (
              recentComplaints.map((c, idx) => {
                const cat = categoryConfig[c.category] || categoryConfig.other;
                return (
                  <TouchableOpacity key={c.id} onPress={() => { setModal({ type: "total", title: "Complaint Detail", sub: c.id }); setSelectedC(c); }} activeOpacity={0.8}
                    style={{ paddingVertical: 10, borderBottomWidth: idx < recentComplaints.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: cat.color + "18", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        <Feather name={cat.icon as any} size={13} color={cat.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }} numberOfLines={1}>{c.title}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
<Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>
                         <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#64748B" }}>{c.ward} · {timeAgo(c.createdAt)}</Text>
                      </View>
                      <View style={{ backgroundColor: STATUS_BG[c.status] || "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: STATUS_COLOR[c.status] || "#64748B" }}>{STATUS_LABEL[c.status] || c.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        {modal && (
          <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
            <View style={{ backgroundColor: "white", paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={closeModal} style={{ marginRight: 12, padding: 4 }}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{modal.title}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{modal.sub}</Text>
              </View>
            </View>

            {selectedC ? (
              <ComplaintDetail c={selectedC} onBack={() => setSelectedC(null)} officers={allOfficers} />
            ) : modal.type === "officers" ? (
              <FlatList
                data={wardOfficers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={{ backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#16A34A" }}>{item.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>{item.name}</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#16A34A" }}>{item.ward}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{item.mobile}</Text>
                    </View>
                    <View style={{ backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#16A34A" }}>Active</Text>
                    </View>
                  </View>
                )}
              />
            ) : modal.type === "resolution" ? (
              <FlatList
                data={wardAnalytics}
                keyExtractor={([ward]) => ward}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <View style={{ backgroundColor: "#16A34A", borderRadius: 16, padding: 16, marginBottom: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 36, fontFamily: "Inter_700Bold", color: "white" }}>{stats.resolutionRate}%</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" }}>Overall Resolution Rate</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
                      {stats.resolved} resolved of {stats.total} total
                    </Text>
                  </View>
                }
                renderItem={({ item: [ward, data], index }) => {
                  const d = data as any;
                  const rate = d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0;
                  const rateColor = rate >= 70 ? "#059669" : rate >= 40 ? "#D97706" : "#DC2626";
                  return (
                    <View style={{ backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                          <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>#{index + 1}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>{ward}</Text>
                        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: rateColor }}>{rate}%</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                        {[{ label: "Total", value: d.total, color: "#3B82F6", bg: "#DBEAFE" }, { label: "Resolved", value: d.resolved, color: "#059669", bg: "#D1FAE5" }, { label: "Pending", value: d.pending, color: "#D97706", bg: "#FEF3C7" }, { label: "Active", value: d.inProgress, color: "#7C3AED", bg: "#EDE9FE" }].map((s) => (
                          <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 8, padding: 6, alignItems: "center" }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
                            <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color + "AA" }}>{s.label}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={{ height: 5, backgroundColor: "#F1F5F9", borderRadius: 3 }}>
                        <View style={{ height: 5, width: `${rate}%`, backgroundColor: rateColor, borderRadius: 3 }} />
                      </View>
                    </View>
                  );
                }}
              />
            ) : modal.type === "wards" ? (
              <FlatList
                data={wardAnalytics}
                keyExtractor={([ward]) => ward}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: [ward, data], index }) => {
                  const d = data as any;
                  const officer = allOfficers.find((n) => n.ward === ward);
                  return (
                    <View style={{ backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: "#16A34A" }}>#{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>{ward}</Text>
                          {officer && <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{officer.name} · {officer.mobile}</Text>}
                        </View>
                        <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#334155" }}>{d.total}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {[{ label: "Pending", value: d.pending, color: "#D97706", bg: "#FEF3C7" }, { label: "Active", value: d.inProgress, color: "#7C3AED", bg: "#EDE9FE" }, { label: "Resolved", value: d.resolved, color: "#059669", bg: "#D1FAE5" }, { label: "Rejected", value: d.rejected, color: "#DC2626", bg: "#FEE2E2" }].map((s) => (
                          <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 8, padding: 6, alignItems: "center" }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
                            <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color + "AA" }}>{s.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                }}
              />
            ) : (
              <FlatList
                data={getFilteredComplaints(modal.type)}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", paddingVertical: 48 }}>
                    <Feather name="inbox" size={40} color="#CBD5E1" />
                    <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#94A3B8", marginTop: 12 }}>No complaints found</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={{ backgroundColor: "white", borderRadius: 14, marginBottom: 8, paddingHorizontal: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                    <ComplaintRow c={item} onPress={() => setSelectedC(item)} />
                  </View>
                )}
              />
            )}
          </View>
        )}
      </Modal>
    </View>
  );
}
