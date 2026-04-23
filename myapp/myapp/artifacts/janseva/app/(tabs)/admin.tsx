import React, { useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Modal, TextInput, FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useComplaints, Complaint, ComplaintStatus } from "@/context/ComplaintContext";
import { useAlerts } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";

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

const nextStatusLabelKeys: Record<ComplaintStatus, string[]> = {
  submitted: ["assignToTeam", "reject"],
  assigned: ["markInProgress", "reject"],
  in_progress: ["markResolved", "reject"],
  resolved: [],
  rejected: [],
};

const nextStatusOptions: Record<ComplaintStatus, { status: ComplaintStatus; color: string }[]> = {
  submitted: [{ status: "assigned", color: "#EA580C" }, { status: "rejected", color: "#DC2626" }],
  assigned: [{ status: "in_progress", color: "#7C3AED" }, { status: "rejected", color: "#DC2626" }],
  in_progress: [{ status: "resolved", color: "#059669" }, { status: "rejected", color: "#DC2626" }],
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
  const { t } = useLanguage();
  const options = nextStatusOptions[complaint.status] || [];
  const optionLabelKeys = nextStatusLabelKeys[complaint.status] || [];

  return (
    <View style={modalStyles.overlay}>
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.title}>{t("updateComplaint")}</Text>
        <Text style={modalStyles.cmpId}># {complaint.id}</Text>
        <Text style={modalStyles.cmpName} numberOfLines={2}>{complaint.title}</Text>
        <View style={modalStyles.cmpLocation}>
          <Feather name="map-pin" size={12} color="#94A3B8" />
          <Text style={modalStyles.cmpLocationText}>{complaint.location}</Text>
        </View>

        <Text style={modalStyles.label}>{t("selectAction")}</Text>
        <View style={modalStyles.optionRow}>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={opt.status}
              style={[modalStyles.optionBtn, { borderColor: opt.color + "40" }, selectedStatus === opt.status && { backgroundColor: opt.color, borderColor: opt.color }]}
              onPress={() => setSelectedStatus(opt.status)}
              activeOpacity={0.8}
            >
              <Feather name={statusConfig[opt.status].icon as any} size={14} color={selectedStatus === opt.status ? "white" : opt.color} />
              <Text style={[modalStyles.optionText, { color: selectedStatus === opt.status ? "white" : opt.color }]}>{t(optionLabelKeys[idx])}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={modalStyles.label}>{t("noteResolution")}</Text>
        <TextInput style={modalStyles.noteInput} value={note} onChangeText={setNote} placeholder={t("addNoteForCitizen")} placeholderTextColor="#CBD5E1" multiline numberOfLines={3} textAlignVertical="top" />

        <View style={modalStyles.btnRow}>
          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={modalStyles.cancelBtnText}>{t("cancel")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.confirmBtn, !selectedStatus && { opacity: 0.5 }]}
            onPress={() => { if (!selectedStatus) return; onUpdate(selectedStatus, note); onClose(); }}
            disabled={!selectedStatus}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#EA580C", "#FB923C"]} style={modalStyles.confirmBtnGrad}>
              <Text style={modalStyles.confirmBtnText}>{t("updateStatus")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function DetailedComplaintCard({ complaint, onAction }: { complaint: Complaint; onAction: () => void }) {
  const { t } = useLanguage();
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
          <Text style={styles.cmpMeta}>{timeAgo(complaint.createdAt)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Feather name={st.icon as any} size={9} color={st.color} />
          <Text style={[styles.statusPillText, { color: st.color }]}>{t(statusLabelKeys[complaint.status])}</Text>
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

        <View style={styles.citizenInfoRow}>
          <View style={styles.citizenInfoChip}>
            <Feather name="user" size={10} color="#EA580C" />
            <Text style={styles.citizenInfoText}>{complaint.userName || t("citizen")}</Text>
          </View>
          <View style={styles.citizenInfoChip}>
            <Feather name="calendar" size={10} color="#64748B" />
            <Text style={styles.citizenInfoText}>{new Date(complaint.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
      {hasActions && (
        <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation?.(); onAction(); }} activeOpacity={0.85}>
          <LinearGradient colors={["#166534", "#16A34A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtnGrad}>
            <Feather name="edit-3" size={13} color="white" />
            <Text style={styles.actionBtnText}>{t("updateStatus")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {complaint.status === "resolved" && (
        <View style={styles.resolvedBar}>
          <Feather name="check-circle" size={12} color="#059669" />
          <Text style={styles.resolvedBarText}>{complaint.resolvedNote || t("issueResolved")}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, logout, updateUser } = useAuth();
  const { complaints, updateStatus } = useComplaints();
  const { alerts: allAlerts, removeAlert } = useAlerts();
  const alerts = allAlerts.filter((a) => a.postedById && user?.id ? a.postedById === user.id : a.postedBy === user?.name);
  const router = useRouter();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");
  const [active, setActive] = useState<Complaint | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWard, setEditWard] = useState("");
  const complaintListRef = useRef<FlatList<Complaint>>(null);

  if (!user || user.role !== "nagarsevak") {
    return (
      <View style={{ flex: 1, backgroundColor: "#ebeffc", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Feather name="lock" size={48} color="#CBD5E1" />
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#475569", marginTop: 16, fontFamily: "Inter_700Bold" }}>{t("nagarsevakOnly")}</Text>
        <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 8, textAlign: "center", fontFamily: "Inter_400Regular" }}>{t("nagarsevakOnlyDesc")}</Text>
        <TouchableOpacity onPress={() => router.push("/login")} style={{ backgroundColor: "#C2410C", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 24 }} activeOpacity={0.85}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" }}>{t("loginBtn")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wardComplaints = user?.ward ? complaints.filter((c) => c.ward === user.ward) : complaints;
  const filtered = filter === "all"
    ? wardComplaints
    : wardComplaints.filter((c) => {
        if (filter === "in_progress") return c.status === "in_progress" || c.status === "assigned";
        return c.status === filter;
      });
  const pending = wardComplaints.filter((c) => c.status === "submitted").length;
  const activeCount = wardComplaints.filter((c) => c.status === "in_progress" || c.status === "assigned").length;
  const resolvedCount = wardComplaints.filter((c) => c.status === "resolved").length;
  const rejectedCount = wardComplaints.filter((c) => c.status === "rejected").length;
  const dashboardFilters: {
    filter: ComplaintStatus;
    label: string;
    count: number;
    icon: string;
    color: string;
    bg: string;
  }[] = [
    { filter: "submitted", label: t("complaints"), count: pending, icon: "file-text", color: "#C2410C", bg: "#FFEDD5" },
    { filter: "in_progress", label: t("inProgress"), count: activeCount, icon: "tool", color: "#7C3AED", bg: "#EDE9FE" },
    { filter: "resolved", label: t("resolved"), count: resolvedCount, icon: "check-circle", color: "#059669", bg: "#D1FAE5" },
    { filter: "rejected", label: t("rejected"), count: rejectedCount, icon: "x-circle", color: "#DC2626", bg: "#FEE2E2" },
  ];
  const openComplaintTab = (nextFilter: ComplaintStatus) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push({ pathname: "/complaint/list", params: { status: nextFilter } } as any);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace("/login");
  };

  const openEditProfile = () => {
    setEditName(user?.name || "");
    setEditWard(user?.ward || "");
    setShowEditProfile(true);
  };

  const saveEditProfile = async () => {
    if (!editName.trim()) return;
    await updateUser({ name: editName.trim(), ward: editWard || user?.ward });
    setShowEditProfile(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#ebeffc" }}>
      <LinearGradient colors={["#166534", "#16A34A", "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.adminBadge}>
              <Feather name="briefcase" size={10} color="#6EE7B7" />
              <Text style={[styles.adminBadgeText, { color: "#6EE7B7" }]}>NAGARSEVAK</Text>
            </View>
            <Text style={styles.headerTitle}>{user?.name}</Text>
            <Text style={styles.headerSub}>{user?.ward || "Ambernath"}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowProfile(true)} style={styles.profileAvatarBtn} activeOpacity={0.8}>
            <Text style={styles.profileAvatarText}>{user?.name?.charAt(0)?.toUpperCase() || "N"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statPills}>
          {[
            { label: t("pending"), count: pending, color: "#FDE68A", icon: "clock" },
            { label: t("active"), count: activeCount, color: "#C4B5FD", icon: "tool" },
            { label: t("resolved"), count: resolvedCount, color: "#6EE7B7", icon: "check-circle" },
            { label: t("total"), count: wardComplaints.length, color: "#93C5FD", icon: "list" },
          ].map((s) => (
            <View key={s.label} style={styles.statPill}>
              <Feather name={s.icon as any} size={14} color={s.color} />
              <Text style={[styles.statPillNum, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.statPillLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

      </LinearGradient>

      {pending > 0 && (
        <View style={styles.urgentBanner}>
          <Feather name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.urgentText}>{pending} {t("complaints")} — {t("needsAttention")}</Text>
        </View>
      )}

      {/* ALERTS PANEL */}
      <TouchableOpacity style={styles.alertPanel} activeOpacity={0.9} onPress={() => router.push("/alert/list" as any)}>
        <View style={styles.alertPanelHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name="bell" size={14} color="#C2410C" />
            <Text style={styles.alertPanelTitle}>Alerts & News</Text>
            {alerts.length > 0 && (
              <View style={styles.alertCountBadge}>
                <Text style={styles.alertCountText}>{alerts.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.postAlertBtn}
            onPress={(event) => {
              event.stopPropagation?.();
              router.push("/alert/new" as any);
            }}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={13} color="white" />
            <Text style={styles.postAlertBtnText}>Post Alert</Text>
          </TouchableOpacity>
        </View>

        {alerts.length === 0 ? (
          <View style={styles.alertPanelEmpty}>
            <Feather name="bell-off" size={22} color="#CBD5E1" />
            <Text style={styles.alertPanelEmptyText}>No alerts posted yet</Text>
            <Text style={styles.alertPanelEmptySub}>Tap "Post Alert" to broadcast to all citizens</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingBottom: 4 }}>
            {alerts.map((a) => {
              const isAlert = a.type === "alert";
              const cardColor = isAlert ? "#DC2626" : "#EA580C";
              const cardBg = isAlert ? "#FEE2E2" : "#FFEDD5";
              return (
                <View key={a.id} style={[styles.alertChip, { borderColor: cardBg }]}>
                  <View style={[styles.alertChipPill, { backgroundColor: cardBg }]}>
                    <Text style={[styles.alertChipPillText, { color: cardColor }]}>
                      {isAlert ? "⚠ Alert" : "📢 News"}
                    </Text>
                  </View>
                  <Text style={styles.alertChipTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.alertChipBody} numberOfLines={2}>{a.body}</Text>
                  <TouchableOpacity
                    style={styles.alertChipDelete}
                    onPress={(event) => {
                      event.stopPropagation?.();
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      removeAlert(a.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="trash-2" size={12} color="#DC2626" />
                    <Text style={styles.alertChipDeleteText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}
      </TouchableOpacity>

      <View style={styles.dashboardGrid}>
        {dashboardFilters.map((item) => {
          const isActive = filter === item.filter;
          return (
            <TouchableOpacity
              key={item.filter}
              style={[
                styles.dashboardCard,
                {
                  backgroundColor: isActive ? item.bg : "white",
                  borderColor: item.color,
                  shadowColor: item.color,
                },
                isActive && styles.dashboardCardActive,
              ]}
              onPress={() => openComplaintTab(item.filter)}
              activeOpacity={0.85}
            >
              <Text style={styles.dashboardLabel}>{item.label}</Text>
              <View style={[styles.dashboardIcon, { backgroundColor: item.color + "15" }]}>
                <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={[styles.dashboardCount, { color: item.color }]}>{item.count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        ref={complaintListRef}
        data={filtered}
        extraData={filter}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <DetailedComplaintCard complaint={item} onAction={() => setActive(item)} />}
        contentContainerStyle={[{ padding: 14 }, { paddingBottom: Math.max(insets.bottom, 8) + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="check-circle" size={36} color="#CBD5E1" />
            <Text style={styles.emptyText}>{t("noComplaintsInCategory")}</Text>
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

      <Modal visible={showProfile} transparent animationType="slide" onRequestClose={() => setShowProfile(false)}>
        <View style={pStyles.root}>
          <LinearGradient colors={["#166534", "#16A34A", "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[pStyles.header, { paddingTop: topPad + 12 }]}>
            <View style={pStyles.profileHeaderRow}>
              <TouchableOpacity onPress={() => setShowProfile(false)} style={pStyles.profileNavBtn} activeOpacity={0.8}>
                <Feather name="chevron-left" size={20} color="white" />
                <Text style={pStyles.profileNavBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openEditProfile} style={pStyles.profileEditBtn} activeOpacity={0.8}>
                <Feather name="edit-2" size={15} color="white" />
                <Text style={pStyles.profileNavBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={pStyles.headerContent}>
              <View style={pStyles.avatarLarge}>
                <Text style={pStyles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "N"}</Text>
              </View>
              <View style={pStyles.headerText}>
                <Text style={pStyles.userName}>{user?.name}</Text>
                <View style={pStyles.rolePillRow}>
                  <View style={pStyles.rolePill}>
                    <Feather name="briefcase" size={11} color="rgba(255,255,255,0.9)" />
                    <Text style={pStyles.rolePillText}>Nagarsevak</Text>
                  </View>
                  <Text style={pStyles.roleSub}>Ward Officer</Text>
                </View>
                <View style={pStyles.infoRow}>
                  <View style={pStyles.infoChip}>
                    <Feather name="map-pin" size={10} color="rgba(255,255,255,0.55)" />
                    <Text style={pStyles.infoChipText}>{user?.ward || "Ambernath"}</Text>
                  </View>
                  <View style={pStyles.infoChip}>
                    <Feather name="phone" size={10} color="rgba(255,255,255,0.55)" />
                    <Text style={pStyles.infoChipText}>+91 {user?.mobile}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={pStyles.statsRow}>
              <View style={pStyles.statItem}>
                <Text style={pStyles.statNum}>{wardComplaints.length}</Text>
                <Text style={pStyles.statLabel}>{t("total")}</Text>
              </View>
              <View style={pStyles.statDiv} />
              <View style={pStyles.statItem}>
                <Text style={[pStyles.statNum, { color: "#FDE68A" }]}>{pending}</Text>
                <Text style={pStyles.statLabel}>{t("pending")}</Text>
              </View>
              <View style={pStyles.statDiv} />
              <View style={pStyles.statItem}>
                <Text style={[pStyles.statNum, { color: "#C4B5FD" }]}>{activeCount}</Text>
                <Text style={pStyles.statLabel}>{t("active")}</Text>
              </View>
              <View style={pStyles.statDiv} />
              <View style={pStyles.statItem}>
                <Text style={[pStyles.statNum, { color: "#6EE7B7" }]}>{resolvedCount}</Text>
                <Text style={pStyles.statLabel}>{t("resolved")}</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView style={pStyles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 8) + 30 }} showsVerticalScrollIndicator={false}>
            <View style={pStyles.section}>
              <Text style={pStyles.sectionLabel}>PARTY & DESIGNATION</Text>
              <View style={pStyles.card}>
                {[
                  { icon: "award" as const, label: "Nagarsevak ID", value: user?.nagarsevakId || "—" },
                  { icon: "briefcase" as const, label: "Designation", value: "Ward Officer / Nagarsevak" },
                  { icon: "map-pin" as const, label: t("ward"), value: user?.ward || "Ambernath" },
                ].map((item, idx, arr) => (
                  <View key={item.label} style={[pStyles.detailRow, idx < arr.length - 1 && pStyles.rowBorder]}>
                    <View style={[pStyles.detailIcon, { backgroundColor: "#DCFCE7" }]}>
                      <Feather name={item.icon} size={14} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={pStyles.detailLabel}>{item.label}</Text>
                      <Text style={pStyles.detailValue}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={pStyles.section}>
              <Text style={pStyles.sectionLabel}>ACCOUNT DETAILS</Text>
              <View style={pStyles.card}>
                {[
                  { icon: "user" as const, label: t("fullName") || "Full Name", value: user?.name || "—" },
                  { icon: "phone" as const, label: t("phone"), value: "+91 " + (user?.mobile || "—") },
                  ...(user?.email ? [{ icon: "mail" as const, label: t("email"), value: user.email }] : []),
                  ...(user?.address ? [{ icon: "home" as const, label: t("address"), value: user.address }] : []),
                  ...(user?.age ? [{ icon: "calendar" as const, label: t("age"), value: String(user.age) + " years" }] : []),
                  { icon: "clock" as const, label: t("memberSince"), value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—" },
                ].map((item, idx, arr) => (
                  <View key={item.label} style={[pStyles.detailRow, idx < arr.length - 1 && pStyles.rowBorder]}>
                    <View style={[pStyles.detailIcon, { backgroundColor: "#DCFCE7" }]}>
                      <Feather name={item.icon} size={14} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={pStyles.detailLabel}>{item.label}</Text>
                      <Text style={pStyles.detailValue}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={pStyles.section}>
              <Text style={pStyles.sectionLabel}>WARD JURISDICTION</Text>
              <View style={pStyles.card}>
                {[
                  { icon: "home" as const, label: "Corporation", value: "Ambernath Municipal Council (AMC)" },
                  { icon: "map" as const, label: "City", value: "Ambernath, Maharashtra" },
                  { icon: "compass" as const, label: "Area", value: user?.ward || "Ambernath" },
                ].map((item, idx, arr) => (
                  <View key={item.label} style={[pStyles.detailRow, idx < arr.length - 1 && pStyles.rowBorder]}>
                    <View style={[pStyles.detailIcon, { backgroundColor: "#FFEDD5" }]}>
                      <Feather name={item.icon} size={14} color="#EA580C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={pStyles.detailLabel}>{item.label}</Text>
                      <Text style={pStyles.detailValue}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={pStyles.appInfoCard}>
              <Text style={pStyles.appInfoBrand}>Connect T</Text>
              <Text style={pStyles.appInfoTagline}>BJP Member Services · सबका साथ, सबका विकास</Text>
              <Text style={pStyles.appInfoVersion}>v1.0 · AMC Ambernath</Text>
            </View>

            <TouchableOpacity style={pStyles.logoutBtn} onPress={() => { setShowProfile(false); setShowLogoutModal(true); }} activeOpacity={0.85}>
              <View style={pStyles.logoutInner}>
                <Feather name="log-out" size={18} color="#DC2626" />
                <Text style={pStyles.logoutText}>{t("logout")}</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          <Modal visible={showEditProfile} transparent animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <View style={{ backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
                <View style={{ width: 36, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 20 }}>Edit Profile</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 6 }}>FULL NAME</Text>
                <TextInput
                  style={{ backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular", marginBottom: 16, outlineWidth: 0 } as any}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor="#CBD5E1"
                />
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 6 }}>WARD</Text>
                <TextInput
                  style={{ backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular", marginBottom: 24, outlineWidth: 0 } as any}
                  value={editWard}
                  onChangeText={setEditWard}
                  placeholder="Your ward"
                  placeholderTextColor="#CBD5E1"
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9" }} onPress={() => setShowEditProfile(false)} activeOpacity={0.8}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" }}>{t("cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 2, borderRadius: 14, overflow: "hidden" }} onPress={saveEditProfile} activeOpacity={0.85} disabled={!editName.trim()}>
                    <LinearGradient colors={["#166534", "#16A34A"]} style={{ paddingVertical: 14, alignItems: "center" }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" }}>Save Changes</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </Modal>

      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalSheet}>
            <View style={styles.logoutModalIconWrap}>
              <Feather name="log-out" size={28} color="#DC2626" />
            </View>
            <Text style={styles.logoutModalTitle}>{t("logout")}</Text>
            <Text style={styles.logoutModalBody}>{t("logoutConfirm")}</Text>
            <View style={styles.logoutModalBtnRow}>
              <TouchableOpacity style={styles.logoutModalCancelBtn} onPress={() => setShowLogoutModal(false)} activeOpacity={0.8}>
                <Text style={styles.logoutModalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutModalConfirmBtn} onPress={handleLogout} activeOpacity={0.85}>
                <Feather name="log-out" size={15} color="white" />
                <Text style={styles.logoutModalConfirmText}>{t("yesLogout")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 8,
    paddingLeft: 2,
  },
  backBtnText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(110,231,183,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
  adminBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 2 },
  profileAvatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  profileAvatarText: { fontSize: 16, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  statPills: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 10, marginBottom: 12, alignItems: "center", gap: 0 },
  statPill: { flex: 1, alignItems: "center", gap: 2 },
  statPillNum: { fontSize: 20, fontWeight: "900", fontFamily: "Inter_700Bold" },
  statPillLabel: { fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },
  urgentBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#FECACA" },
  alertPanel: { backgroundColor: "white", marginHorizontal: 14, marginTop: 12, marginBottom: 4, borderRadius: 18, padding: 14, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  alertPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  alertPanelTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  alertCountBadge: { backgroundColor: "#FEE2E2", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  alertCountText: { fontSize: 10, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_700Bold" },
  postAlertBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#C2410C", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  postAlertBtnText: { fontSize: 12, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  alertPanelEmpty: { height: 80, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  alertPanelEmptyText: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  alertPanelEmptySub: { fontSize: 10, color: "#CBD5E1", fontFamily: "Inter_400Regular" },
  alertChip: { width: 200, backgroundColor: "#FAFAFA", borderRadius: 14, borderWidth: 1, padding: 12, gap: 4 },
  alertChipPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  alertChipPillText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_700Bold" },
  alertChipTitle: { fontSize: 12, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  alertChipBody: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 15 },
  alertChipDelete: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  alertChipDeleteText: { fontSize: 10, fontWeight: "600", color: "#DC2626", fontFamily: "Inter_600SemiBold" },
  urgentText: { fontSize: 12, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_600SemiBold" },
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  dashboardCard: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  dashboardCardActive: {
    shadowOpacity: 0.22,
    elevation: 6,
  },
  dashboardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardCount: { fontSize: 24, fontWeight: "900", fontFamily: "Inter_700Bold" },
  dashboardLabel: { width: "100%", fontSize: 16, fontWeight: "900", color: "#334155", fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 20 },
  card: { backgroundColor: "white", borderRadius: 16, marginBottom: 10, overflow: "hidden", shadowColor: "#166534", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
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
  citizenInfoRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  citizenInfoChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF7ED", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  citizenInfoText: { fontSize: 10, color: "#475569", fontFamily: "Inter_400Regular" },
  actionBtn: { marginHorizontal: 14, marginBottom: 14, borderRadius: 12, overflow: "hidden" },
  actionBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  resolvedBar: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#D1FAE5", paddingHorizontal: 14, paddingVertical: 8 },
  resolvedBarText: { fontSize: 11, color: "#166534", fontFamily: "Inter_400Regular", flex: 1 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  logoutModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 32 },
  logoutModalSheet: { backgroundColor: "white", borderRadius: 24, padding: 28, width: "100%", alignItems: "center", gap: 10 },
  logoutModalIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  logoutModalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  logoutModalBody: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  logoutModalBtnRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8 },
  logoutModalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  logoutModalCancelText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  logoutModalConfirmBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: "#DC2626" },
  logoutModalConfirmText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
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
  noteInput: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular", height: 90, marginBottom: 16, outlineWidth: 0 } as any,
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9" },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  confirmBtn: { flex: 2, borderRadius: 14, overflow: "hidden" },
  confirmBtnGrad: { paddingVertical: 14, alignItems: "center" },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});

const pStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0FDF4" },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  profileHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  profileNavBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingRight: 10, paddingLeft: 2 },
  profileEditBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  profileNavBtnText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.92)", fontFamily: "Inter_600SemiBold" },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  avatarText: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  headerText: { flex: 1 },
  userName: { fontSize: 20, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  rolePillRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  rolePillText: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.9)", fontFamily: "Inter_600SemiBold" },
  roleSub: { fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },
  infoRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  infoChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoChipText: { fontSize: 10, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6 },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statDiv: { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 4 },
  scroll: { flex: 1 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 8, paddingLeft: 2 },
  card: { backgroundColor: "white", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailLabel: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  appInfoCard: { alignItems: "center", paddingVertical: 20, marginBottom: 12 },
  appInfoBrand: { fontSize: 18, fontWeight: "900", color: "#C2410C", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  appInfoTagline: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 4 },
  appInfoVersion: { fontSize: 10, color: "#CBD5E1", fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: { backgroundColor: "#FEE2E2", borderRadius: 16, borderWidth: 1.5, borderColor: "#FECACA", marginBottom: 8 },
  logoutInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_700Bold" },
});
