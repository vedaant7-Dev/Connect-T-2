import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Modal, TextInput, FlatList, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useComplaints, Complaint, ComplaintStatus } from "@/context/ComplaintContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";

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

const nextStatusOptions: Record<ComplaintStatus, { status: ComplaintStatus; label: string; color: string }[]> = {
  submitted: [{ status: "assigned", label: "Assign to Team", color: "#2563EB" }, { status: "rejected", label: "Reject", color: "#DC2626" }],
  assigned: [{ status: "in_progress", label: "Mark In Progress", color: "#7C3AED" }, { status: "rejected", label: "Reject", color: "#DC2626" }],
  in_progress: [{ status: "resolved", label: "Mark Resolved", color: "#059669" }, { status: "rejected", label: "Reject", color: "#DC2626" }],
  resolved: [],
  rejected: [],
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

function ActionModal({ complaint, onClose, onUpdate }: { complaint: Complaint; onClose: () => void; onUpdate: (s: ComplaintStatus, note: string) => void }) {
  const [note, setNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | null>(null);
  const options = nextStatusOptions[complaint.status] || [];

  return (
    <View style={modalStyles.overlay}>
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.title}>Update Complaint</Text>
        <Text style={modalStyles.cmpId}># {complaint.id} · {categoryConfig[complaint.category]?.label}</Text>
        <Text style={modalStyles.cmpName} numberOfLines={2}>{complaint.title}</Text>
        <View style={modalStyles.cmpLocation}>
          <Feather name="map-pin" size={12} color="#94A3B8" />
          <Text style={modalStyles.cmpLocationText}>{complaint.location}</Text>
        </View>

        <Text style={modalStyles.label}>SELECT ACTION</Text>
        <View style={modalStyles.optionRow}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.status}
              style={[modalStyles.optionBtn, { borderColor: opt.color + "40" }, selectedStatus === opt.status && { backgroundColor: opt.color, borderColor: opt.color }]}
              onPress={() => setSelectedStatus(opt.status)}
              activeOpacity={0.8}
            >
              <Feather name={statusConfig[opt.status].icon as any} size={14} color={selectedStatus === opt.status ? "white" : opt.color} />
              <Text style={[modalStyles.optionText, { color: selectedStatus === opt.status ? "white" : opt.color }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={modalStyles.label}>NOTE / RESOLUTION (optional)</Text>
        <TextInput style={modalStyles.noteInput} value={note} onChangeText={setNote} placeholder="Add a note for the citizen..." placeholderTextColor="#CBD5E1" multiline numberOfLines={3} textAlignVertical="top" />

        <View style={modalStyles.btnRow}>
          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={modalStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.confirmBtn, !selectedStatus && { opacity: 0.5 }]}
            onPress={() => { if (!selectedStatus) return; onUpdate(selectedStatus, note); onClose(); }}
            disabled={!selectedStatus}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#1E40AF", "#2563EB"]} style={modalStyles.confirmBtnGrad}>
              <Text style={modalStyles.confirmBtnText}>Update Status</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ComplaintCard({ complaint, onAction }: { complaint: Complaint; onAction: () => void }) {
  const st = statusConfig[complaint.status];
  const cat = categoryConfig[complaint.category] || categoryConfig.other;
  const hasActions = (nextStatusOptions[complaint.status] || []).length > 0;
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: complaint.id } })}
      activeOpacity={0.92}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.catDot, { backgroundColor: cat.color + "20" }]}>
          <Feather name={cat.icon as any} size={14} color={cat.color} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cmpTitle} numberOfLines={1}>{complaint.title}</Text>
          <Text style={styles.cmpMeta}>{cat.label} · {timeAgo(complaint.createdAt)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Feather name={st.icon as any} size={9} color={st.color} />
          <Text style={[styles.statusPillText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={11} color="#94A3B8" />
          <Text style={styles.metaText} numberOfLines={1}>{complaint.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="home" size={11} color="#94A3B8" />
          <Text style={styles.metaText}>{complaint.ward}</Text>
        </View>
        <Text style={styles.descText} numberOfLines={2}>{complaint.description}</Text>
      </View>
      {hasActions && (
        <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation?.(); onAction(); }} activeOpacity={0.85}>
          <LinearGradient colors={["#1E40AF", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtnGrad}>
            <Feather name="edit-3" size={13} color="white" />
            <Text style={styles.actionBtnText}>Update Status</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {complaint.status === "resolved" && (
        <View style={styles.resolvedBar}>
          <Feather name="check-circle" size={12} color="#059669" />
          <Text style={styles.resolvedBarText}>{complaint.resolvedNote || "Issue resolved"}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── NAGARSEVAK PANEL ────────────────────────────────────────────────────────

function NagarsevakPanel() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const { user, logout } = useAuth();
  const { complaints, updateStatus } = useComplaints();
  const router = useRouter();
  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");
  const [active, setActive] = useState<Complaint | null>(null);

  const wardComplaints = complaints.filter((c) => c.ward === user?.ward || true);
  const filtered = filter === "all" ? wardComplaints : wardComplaints.filter((c) => c.status === filter);
  const pending = wardComplaints.filter((c) => c.status === "submitted").length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <LinearGradient colors={["#065F46", "#047857", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.adminBadge}>
              <Feather name="briefcase" size={10} color="#6EE7B7" />
              <Text style={[styles.adminBadgeText, { color: "#6EE7B7" }]}>NAGARSEVAK</Text>
            </View>
            <Text style={styles.headerTitle}>{user?.name}</Text>
            <Text style={styles.headerSub}>{user?.ward}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Feather name="log-out" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
        <View style={styles.statPills}>
          {[
            { label: "Pending", count: pending, color: "#FDE68A" },
            { label: "Active", count: wardComplaints.filter((c) => c.status === "in_progress").length, color: "#C4B5FD" },
            { label: "Resolved", count: wardComplaints.filter((c) => c.status === "resolved").length, color: "#6EE7B7" },
          ].map((s) => (
            <View key={s.label} style={styles.statPill}>
              <Text style={[styles.statPillNum, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.statPillLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
          {(["all", "submitted", "assigned", "in_progress", "resolved"] as const).map((s) => (
            <TouchableOpacity key={s} style={[styles.filterChip, filter === s && styles.filterChipActive]} onPress={() => setFilter(s)} activeOpacity={0.8}>
              <Text style={[styles.filterText, filter === s && { color: "white" }]}>
                {s === "all" ? "All" : statusConfig[s]?.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {pending > 0 && (
        <View style={styles.urgentBanner}>
          <Feather name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.urgentText}>{pending} complaint{pending > 1 ? "s" : ""} need your attention</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ComplaintCard complaint={item} onAction={() => setActive(item)} />}
        contentContainerStyle={[{ padding: 14 }, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="check-circle" size={36} color="#CBD5E1" />
            <Text style={styles.emptyText}>No complaints in this category</Text>
          </View>
        }
      />

      {active && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setActive(null)}>
          <ActionModal complaint={active} onClose={() => setActive(null)} onUpdate={(st, note) => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            updateStatus(active.id, st, note, user?.name || "Nagarsevak");
          }} />
        </Modal>
      )}
    </View>
  );
}

// ─── HEAD ADMIN PANEL ─────────────────────────────────────────────────────────

const WARD_NAMES = ["All Wards", "Ward 8 — Dadar", "Ward 5 — Dharavi", "Ward 6 — Sion", "Ward 11 — Kurla", "Ward 13 — Andheri"];

const DEMO_OFFICERS = [
  { name: "Ward Officer Patil", ward: "Ward 8 — Dadar", resolved: 12, active: 3, avatar: "#059669" },
  { name: "Officer Sharma", ward: "Ward 5 — Dharavi", resolved: 8, active: 5, avatar: "#2563EB" },
  { name: "Officer Desai", ward: "Ward 6 — Sion", resolved: 15, active: 1, avatar: "#7C3AED" },
  { name: "Officer Khan", ward: "Ward 11 — Kurla", resolved: 6, active: 4, avatar: "#D97706" },
];

function HeadAdminPanel() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const { user, logout } = useAuth();
  const { complaints, updateStatus } = useComplaints();
  const [tab, setTab] = useState<"complaints" | "officers" | "services">("complaints");
  const [filterWard, setFilterWard] = useState("All Wards");
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | "all">("all");
  const [active, setActive] = useState<Complaint | null>(null);

  const wardFiltered = filterWard === "All Wards" ? complaints : complaints.filter((c) => c.ward === filterWard);
  const statusFiltered = filterStatus === "all" ? wardFiltered : wardFiltered.filter((c) => c.status === filterStatus);
  const pending = complaints.filter((c) => c.status === "submitted").length;
  const active2 = complaints.filter((c) => c.status === "assigned" || c.status === "in_progress").length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <LinearGradient colors={["#0F172A", "#1E3A8A", "#4C1D95"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.adminBadge}>
              <Feather name="shield" size={10} color="#A78BFA" />
              <Text style={[styles.adminBadgeText, { color: "#A78BFA" }]}>HEAD ADMIN</Text>
            </View>
            <Text style={styles.headerTitle}>{user?.name}</Text>
            <Text style={styles.headerSub}>Full Control · All Wards</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Feather name="log-out" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        <View style={styles.bigStatRow}>
          {[
            { label: "Pending", count: pending, color: "#FDE68A", icon: "clock" },
            { label: "Active", count: active2, color: "#C4B5FD", icon: "tool" },
            { label: "Resolved", count: resolved, color: "#6EE7B7", icon: "check-circle" },
            { label: "Total", count: complaints.length, color: "#93C5FD", icon: "list" },
          ].map((s) => (
            <View key={s.label} style={styles.bigStat}>
              <Feather name={s.icon as any} size={16} color={s.color} />
              <Text style={[styles.bigStatNum, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.bigStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.adminTabRow}>
          {([
            { id: "complaints", label: "Complaints", icon: "file-text" },
            { id: "officers", label: "Officers", icon: "users" },
            { id: "services", label: "Services", icon: "map-pin" },
          ] as const).map((t) => (
            <TouchableOpacity key={t.id} style={[styles.adminTab, tab === t.id && styles.adminTabActive]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
              <Feather name={t.icon as any} size={13} color={tab === t.id ? "white" : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.adminTabText, tab === t.id && { color: "white" }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {tab === "complaints" && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <View style={styles.filterBar}>
              {WARD_NAMES.map((w) => (
                <TouchableOpacity key={w} style={[styles.filterChipWard, filterWard === w && styles.filterChipWardActive]} onPress={() => setFilterWard(w)} activeOpacity={0.8}>
                  <Text style={[styles.filterChipWardText, filterWard === w && { color: "#2563EB" }]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <View style={styles.filterBar}>
              {(["all", "submitted", "in_progress", "resolved", "rejected"] as const).map((s) => (
                <TouchableOpacity key={s} style={[styles.filterChipStatus, filterStatus === s && styles.filterChipStatusActive]} onPress={() => setFilterStatus(s)} activeOpacity={0.8}>
                  <Text style={[styles.filterChipStatusText, filterStatus === s && { color: "white" }]}>
                    {s === "all" ? "All Status" : statusConfig[s]?.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <FlatList
            data={statusFiltered}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => <ComplaintCard complaint={item} onAction={() => setActive(item)} />}
            contentContainerStyle={[{ padding: 14 }, { paddingBottom: bottomPad + 90 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<View style={styles.empty}><Feather name="inbox" size={36} color="#CBD5E1" /><Text style={styles.emptyText}>No complaints found</Text></View>}
          />
        </>
      )}

      {tab === "officers" && (
        <ScrollView contentContainerStyle={[{ padding: 14 }, { paddingBottom: bottomPad + 90 }]}>
          <Text style={styles.sectionHeading}>Nagarsevak Performance</Text>
          {DEMO_OFFICERS.map((o, i) => (
            <View key={i} style={styles.officerCard}>
              <View style={[styles.officerAvatar, { backgroundColor: o.avatar }]}>
                <Text style={styles.officerAvatarText}>{o.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</Text>
              </View>
              <View style={styles.officerInfo}>
                <Text style={styles.officerName}>{o.name}</Text>
                <Text style={styles.officerWard}>{o.ward}</Text>
                <View style={styles.officerStats}>
                  <View style={styles.officerStat}>
                    <Text style={[styles.officerStatNum, { color: "#059669" }]}>{o.resolved}</Text>
                    <Text style={styles.officerStatLabel}>Resolved</Text>
                  </View>
                  <View style={styles.officerStat}>
                    <Text style={[styles.officerStatNum, { color: "#7C3AED" }]}>{o.active}</Text>
                    <Text style={styles.officerStatLabel}>Active</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.contactOfficerBtn} activeOpacity={0.8}>
                <Feather name="phone" size={14} color="#2563EB" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {tab === "services" && (
        <ScrollView contentContainerStyle={[{ padding: 14 }, { paddingBottom: bottomPad + 90 }]}>
          <View style={styles.servicesAdminHeader}>
            <Text style={styles.sectionHeading}>Service Management</Text>
            <TouchableOpacity style={styles.addServiceBtn} activeOpacity={0.8}>
              <LinearGradient colors={["#1E40AF", "#2563EB"]} style={styles.addServiceBtnGrad}>
                <Feather name="plus" size={14} color="white" />
                <Text style={styles.addServiceBtnText}>Add Service</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {[
            { category: "Hospitals", count: 12, icon: "activity", color: "#DC2626", bg: "#FEE2E2" },
            { category: "Police Stations", count: 6, icon: "shield", color: "#1E40AF", bg: "#DBEAFE" },
            { category: "Schools", count: 18, icon: "book-open", color: "#7C3AED", bg: "#EDE9FE" },
            { category: "Clinics", count: 9, icon: "plus-circle", color: "#059669", bg: "#D1FAE5" },
            { category: "Banks & ATMs", count: 14, icon: "credit-card", color: "#D97706", bg: "#FEF3C7" },
            { category: "Post Offices", count: 5, icon: "mail", color: "#0EA5E9", bg: "#BAE6FD" },
            { category: "Crematoriums", count: 4, icon: "wind", color: "#475569", bg: "#F1F5F9" },
          ].map((svc, i) => (
            <View key={i} style={styles.serviceCatCard}>
              <View style={[styles.serviceCatIcon, { backgroundColor: svc.bg }]}>
                <Feather name={svc.icon as any} size={18} color={svc.color} />
              </View>
              <View style={styles.serviceCatInfo}>
                <Text style={styles.serviceCatName}>{svc.category}</Text>
                <Text style={styles.serviceCatCount}>{svc.count} services listed</Text>
              </View>
              <View style={styles.serviceCatActions}>
                <TouchableOpacity style={styles.serviceCatBtn} activeOpacity={0.8}>
                  <Feather name="plus" size={14} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.serviceCatBtn, { backgroundColor: "#F8FAFC" }]} activeOpacity={0.8}>
                  <Feather name="edit-2" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {active && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setActive(null)}>
          <ActionModal complaint={active} onClose={() => setActive(null)} onUpdate={(st, note) => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            updateStatus(active.id, st, note, user?.name || "Head Admin");
            setActive(null);
          }} />
        </Modal>
      )}
    </View>
  );
}

// ─── LOGIN GATE ───────────────────────────────────────────────────────────────

function LoginGate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <LinearGradient colors={["#1E3A8A", "#1E40AF", "#2563EB"]} style={[{ paddingTop: topPad + 20, paddingHorizontal: 20, paddingBottom: 60, alignItems: "center" }]}>
        <Feather name="shield" size={48} color="rgba(255,255,255,0.3)" />
        <Text style={{ fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", marginTop: 12 }}>Admin Panel</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 4 }}>Login to access officer controls</Text>
      </LinearGradient>
      <View style={{ padding: 24, alignItems: "center", gap: 16, marginTop: -20 }}>
        <View style={{ backgroundColor: "white", borderRadius: 20, padding: 24, width: "100%", alignItems: "center", gap: 12, shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" }}>Please Login First</Text>
          <Text style={{ fontSize: 13, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular" }}>You need to login as Nagarsevak or Head Admin to access this panel</Text>
          <TouchableOpacity onPress={() => router.push("/login")} style={{ backgroundColor: "#1E40AF", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, width: "100%" }} activeOpacity={0.85}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "white", textAlign: "center", fontFamily: "Inter_700Bold" }}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const { user } = useAuth();

  if (!user || user.role === "citizen") return <LoginGate />;
  if (user.role === "nagarsevak") return <NagarsevakPanel />;
  return <HeadAdminPanel />;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(167,139,250,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
  adminBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  statPills: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 10, marginBottom: 12, alignItems: "center" },
  statPill: { flex: 1, alignItems: "center" },
  statPillNum: { fontSize: 22, fontWeight: "900", fontFamily: "Inter_700Bold" },
  statPillLabel: { fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", marginTop: 1 },
  bigStatRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 12, marginBottom: 12, gap: 0 },
  bigStat: { flex: 1, alignItems: "center", gap: 3 },
  bigStatNum: { fontSize: 20, fontWeight: "900", fontFamily: "Inter_700Bold" },
  bigStatLabel: { fontSize: 8, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },
  adminTabRow: { flexDirection: "row", gap: 6, marginBottom: 2 },
  adminTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" },
  adminTabActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  adminTabText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.5)", fontFamily: "Inter_600SemiBold" },
  filterScroll: { paddingHorizontal: 14, paddingVertical: 6 },
  filterBar: { flexDirection: "row", gap: 6 },
  filterChipWard: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1.5, borderColor: "#E2E8F0" },
  filterChipWardActive: { backgroundColor: "#EFF6FF", borderColor: "#2563EB" },
  filterChipWardText: { fontSize: 11, fontWeight: "700", color: "#64748B", fontFamily: "Inter_600SemiBold" },
  filterChipStatus: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1.5, borderColor: "#E2E8F0" },
  filterChipStatusActive: { backgroundColor: "#1E40AF", borderColor: "#1E40AF" },
  filterChipStatusText: { fontSize: 11, fontWeight: "700", color: "#64748B", fontFamily: "Inter_600SemiBold" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)" },
  filterChipActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", fontFamily: "Inter_600SemiBold" },
  urgentBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#FECACA" },
  urgentText: { fontSize: 12, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_600SemiBold" },
  card: { backgroundColor: "white", borderRadius: 16, marginBottom: 10, overflow: "hidden", shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 10 },
  catDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardHeaderText: { flex: 1 },
  cmpTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  cmpMeta: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  statusPillText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  cardBody: { paddingHorizontal: 14, paddingBottom: 10, gap: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", flex: 1 },
  descText: { fontSize: 12, color: "#475569", fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 4 },
  actionBtn: { marginHorizontal: 14, marginBottom: 14, borderRadius: 12, overflow: "hidden" },
  actionBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  resolvedBar: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#D1FAE5", paddingHorizontal: 14, paddingVertical: 8 },
  resolvedBarText: { fontSize: 11, color: "#065F46", fontFamily: "Inter_400Regular", flex: 1 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  sectionHeading: { fontSize: 15, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 12 },
  officerCard: { backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  officerAvatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  officerAvatarText: { fontSize: 16, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  officerInfo: { flex: 1 },
  officerName: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  officerWard: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 2, marginBottom: 6 },
  officerStats: { flexDirection: "row", gap: 16 },
  officerStat: { alignItems: "center" },
  officerStatNum: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  officerStatLabel: { fontSize: 9, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  contactOfficerBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  servicesAdminHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  addServiceBtn: { borderRadius: 10, overflow: "hidden" },
  addServiceBtnGrad: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8 },
  addServiceBtnText: { fontSize: 12, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  serviceCatCard: { backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  serviceCatIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  serviceCatInfo: { flex: 1 },
  serviceCatName: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  serviceCatCount: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 2 },
  serviceCatActions: { flexDirection: "row", gap: 8 },
  serviceCatBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 4 },
  cmpId: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 2 },
  cmpName: { fontSize: 13, color: "#475569", fontFamily: "Inter_400Regular", marginBottom: 4, lineHeight: 18 },
  cmpLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  cmpLocationText: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  label: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  optionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  optionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, backgroundColor: "white" },
  optionText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  noteInput: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular", height: 90, marginBottom: 16 },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9" },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  confirmBtn: { flex: 2, borderRadius: 14, overflow: "hidden" },
  confirmBtnGrad: { paddingVertical: 14, alignItems: "center" },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
