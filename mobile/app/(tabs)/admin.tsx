import { AppScrollView } from "@/components/AppScrollView";
import AppTimePicker, { formatTimeLabel } from "@/components/AppTimePicker";
import UtilityStatusManager from "@/components/UtilityStatusManager";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useComplaints, Complaint, ComplaintStatus } from "@/context/ComplaintContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { wardMatchesNagarsevak } from "@/data/wards";
import { displayUtilityStatus, postUtilityStatus, UtilityType } from "@/lib/utilityStatusApi";
import { apiGet, getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const ORANGE = "#EA580C";

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

const nextStatusOptions: Record<ComplaintStatus, { status: ComplaintStatus; label: string; color: string }[]> = {
  submitted: [
    { status: "assigned", label: "Assign to Team", color: "#EA580C" },
    { status: "rejected", label: "Reject", color: "#DC2626" },
  ],
  assigned: [
    { status: "in_progress", label: "Mark In Progress", color: "#7C3AED" },
    { status: "rejected", label: "Reject", color: "#DC2626" },
  ],
  in_progress: [
    { status: "resolved", label: "Mark Resolved", color: "#059669" },
    { status: "rejected", label: "Reject", color: "#DC2626" },
  ],
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

function timeToMinutes(value: string) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function utilityDurationHours(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return "";
  let difference = endMinutes - startMinutes;
  if (difference <= 0) difference += 24 * 60;
  const hours = difference / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, "");
}

function utilityScheduleLabel(start: string, end: string) {
  if (!start || !end) return "";
  return `${formatTimeLabel(start)} to ${formatTimeLabel(end)}`;
}

function ActionModal({ complaint, onClose, onUpdate }: { complaint: Complaint; onClose: () => void; onUpdate: (status: ComplaintStatus, note: string) => void }) {
  const [note, setNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | null>(null);
  const { t } = useLanguage();
  const options = nextStatusOptions[complaint.status] || [];

  return (
    <View style={modalStyles.overlay}>
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.title}>{t("updateComplaint")}</Text>
        <Text style={modalStyles.complaintId}># {complaint.id}</Text>
        <Text style={modalStyles.complaintName} numberOfLines={2}>{complaint.title}</Text>
        <View style={modalStyles.locationRow}>
          <Feather name="map-pin" size={12} color="#94A3B8" />
          <Text style={modalStyles.locationText}>{complaint.location}</Text>
        </View>

        <Text style={modalStyles.label}>{t("selectAction")}</Text>
        <View style={modalStyles.optionRow}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.status}
              style={[
                modalStyles.optionButton,
                { borderColor: `${option.color}40` },
                selectedStatus === option.status && { backgroundColor: option.color, borderColor: option.color },
              ]}
              onPress={() => setSelectedStatus(option.status)}
              activeOpacity={0.8}
            >
              <Feather name={statusConfig[option.status].icon as any} size={14} color={selectedStatus === option.status ? "white" : option.color} />
              <Text style={[modalStyles.optionText, { color: selectedStatus === option.status ? "white" : option.color }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={modalStyles.label}>{t("noteResolution")}</Text>
        <TextInput
          style={modalStyles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={t("addNoteForCitizen")}
          placeholderTextColor="#CBD5E1"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={modalStyles.buttonRow}>
          <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={modalStyles.cancelText}>{t("cancel")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.confirmButton, !selectedStatus && { opacity: 0.5 }]}
            onPress={() => {
              if (!selectedStatus) return;
              onUpdate(selectedStatus, note);
              onClose();
            }}
            disabled={!selectedStatus}
            activeOpacity={0.85}
          >
            <Text style={modalStyles.confirmText}>{t("updateStatus")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ComplaintCard({ complaint, onAction }: { complaint: Complaint; onAction: () => void }) {
  const { t } = useLanguage();
  const router = useRouter();
  const status = statusConfig[complaint.status];
  const category = categoryConfig[complaint.category] || categoryConfig.other;
  const hasActions = (nextStatusOptions[complaint.status] || []).length > 0;

  return (
    <TouchableOpacity
      style={styles.complaintCard}
      onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: complaint.id } })}
      activeOpacity={0.92}
    >
      <View style={styles.complaintHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: `${category.color}18` }]}>
          <Feather name={category.icon as any} size={15} color={category.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.complaintTitle} numberOfLines={1}>{complaint.title}</Text>
          <Text style={styles.complaintMeta}>ID: {complaint.id} · {timeAgo(complaint.createdAt)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusPillText, { color: status.color }]}>{t(statusLabelKeys[complaint.status])}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Feather name="map-pin" size={11} color="#94A3B8" />
        <Text style={styles.metaText} numberOfLines={1}>{complaint.location}</Text>
      </View>
      <Text style={styles.descriptionText} numberOfLines={2}>{complaint.description}</Text>

      {hasActions ? (
        <TouchableOpacity style={styles.updateButton} onPress={(event) => { event.stopPropagation?.(); onAction(); }} activeOpacity={0.85}>
          <Feather name="edit-3" size={13} color="white" />
          <Text style={styles.updateText}>{t("updateStatus")}</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const { complaints, refreshComplaints } = useComplaints();
  const router = useRouter();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");
  const [assignedWard, setAssignedWard] = useState(user?.ward || "");
  const [assignedWardCode, setAssignedWardCode] = useState(String(user?.wardCode || ""));
  const [utilityType, setUtilityType] = useState<UtilityType>("water");
  const [utilityStatus, setUtilityStatus] = useState("normal");
  const [utilityStartTime, setUtilityStartTime] = useState("");
  const [utilityEndTime, setUtilityEndTime] = useState("");
  const [utilityDescription, setUtilityDescription] = useState("");
  const [utilitySaving, setUtilitySaving] = useState(false);
  const [utilityResult, setUtilityResult] = useState<"success" | "error" | "">("");

  const refreshAssignedWard = useCallback(async () => {
    try {
      const session = await apiGet<any>("/api/auth/session");
      const nextWard = String(session?.user?.ward || "");
      const nextCode = String(session?.user?.wardCode || session?.user?.ward_code || "");
      setAssignedWard(nextWard);
      setAssignedWardCode(nextCode);
    } catch {
      setAssignedWard(user?.ward || "");
      setAssignedWardCode(String(user?.wardCode || ""));
    }
  }, [user?.ward, user?.wardCode]);

  useEffect(() => {
    setAssignedWard(user?.ward || "");
    setAssignedWardCode(String(user?.wardCode || ""));
    void refreshAssignedWard();
  }, [refreshAssignedWard, user?.ward, user?.wardCode]);

  if (!user || user.role !== "nagarsevak") {
    return (
      <View style={styles.lockedScreen}>
        <Feather name="lock" size={48} color="#CBD5E1" />
        <Text style={styles.lockedTitle}>{t("nagarsevakOnly")}</Text>
        <TouchableOpacity onPress={() => router.replace("/login" as any)} style={styles.loginButton} activeOpacity={0.85}>
          <Text style={styles.loginText}>{t("loginBtn")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wardComplaints = assignedWard || assignedWardCode
    ? complaints.filter((complaint) => {
        if (assignedWardCode && String(complaint.wardCode || "") === assignedWardCode) return true;
        return assignedWard ? wardMatchesNagarsevak(complaint.ward, assignedWard) : false;
      })
    : [];
  const pendingCount = wardComplaints.filter((complaint) => complaint.status === "submitted").length;
  const activeCount = wardComplaints.filter((complaint) => complaint.status === "in_progress" || complaint.status === "assigned").length;
  const resolvedCount = wardComplaints.filter((complaint) => complaint.status === "resolved").length;
  const rejectedCount = wardComplaints.filter((complaint) => complaint.status === "rejected").length;
  const scheduleText = utilityScheduleLabel(utilityStartTime, utilityEndTime);
  const hoursPerDay = utilityDurationHours(utilityStartTime, utilityEndTime);
  const canPostUtility = !!assignedWard && !!utilityStartTime && !!utilityEndTime && !!utilityDescription.trim() && !utilitySaving;

  const dashboardFilters: { filter: ComplaintStatus; label: string; count: number; icon: string; color: string; bg: string }[] = [
    { filter: "submitted", label: t("complaints"), count: pendingCount, icon: "file-text", color: "#C2410C", bg: "#FFEDD5" },
    { filter: "in_progress", label: t("inProgress"), count: activeCount, icon: "tool", color: "#7C3AED", bg: "#EDE9FE" },
    { filter: "resolved", label: t("resolved"), count: resolvedCount, icon: "check-circle", color: "#059669", bg: "#D1FAE5" },
    { filter: "rejected", label: t("rejected"), count: rejectedCount, icon: "x-circle", color: "#DC2626", bg: "#FEE2E2" },
  ];

  const openComplaintList = (nextFilter: ComplaintStatus) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setFilter(nextFilter);
    router.push({ pathname: "/complaint/list" as any, params: { status: nextFilter } });
  };

  const saveUtilityStatus = async () => {
    if (!canPostUtility) return;
    setUtilitySaving(true);
    setUtilityResult("");
    try {
      await postUtilityStatus({
        utilityType,
        title: utilityType === "water" ? "Water Supply" : "Electricity",
        status: utilityStatus,
        hoursPerDay,
        scheduleText,
        description: utilityDescription.trim(),
        helpline: utilityType === "water" ? "AMC Water Helpline: 0251-2604100" : "MSEDCL Helpline: 1912",
        source: utilityType === "water" ? "AMC Water Department" : "MSEDCL Ambernath Division",
      });
      setUtilityResult("success");
      setUtilityStartTime("");
      setUtilityEndTime("");
      setUtilityDescription("");
    } catch (error: any) {
      void getUserErrorMessage(error, "Unable to post utility update.");
      setUtilityResult("error");
    } finally {
      setUtilitySaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#166534", GREEN, "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.roleBadge}><Feather name="briefcase" size={10} color="#6EE7B7" /><Text style={styles.roleBadgeText}>NAGARSEVAK</Text></View>
        <Text style={styles.headerTitle}>{user.name}</Text>
        <Text style={styles.headerSubtitle}>{assignedWard || "Not assigned"}</Text>
        <View style={styles.statPills}>
          {[
            { label: t("pending"), count: pendingCount, color: "#FDE68A", icon: "clock" },
            { label: t("active"), count: activeCount, color: "#C4B5FD", icon: "tool" },
            { label: t("resolved"), count: resolvedCount, color: "#6EE7B7", icon: "check-circle" },
            { label: t("total"), count: wardComplaints.length, color: "#93C5FD", icon: "list" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statPill}>
              <Feather name={stat.icon as any} size={14} color={stat.color} />
              <Text style={[styles.statNumber, { color: stat.color }]}>{stat.count}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <AppScrollView
        onAppRefresh={() => Promise.all([refreshComplaints(), refreshAssignedWard()]).then(() => undefined)}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 8) + 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Complaint status summary stays at the top of Work Progress */}
        <View style={styles.dashboardGrid}>
          {dashboardFilters.map((item) => (
            <TouchableOpacity key={item.filter} style={[styles.dashboardCard, { borderColor: item.color }]} onPress={() => openComplaintList(item.filter)} activeOpacity={0.85}>
              <Text style={styles.dashboardLabel}>{item.label}</Text>
              <View style={[styles.dashboardIcon, { backgroundColor: `${item.color}15` }]}><Feather name={item.icon as any} size={20} color={item.color} /></View>
              <Text style={[styles.dashboardCount, { color: item.color }]}>{item.count}</Text>
            </TouchableOpacity>
          ))}
        </View>


        {/* Utility status follows the complaint summary */}
        <View style={styles.utilityPanel}>
          <View style={styles.panelTitleRow}>
            <View style={styles.panelIcon}><Feather name="zap" size={15} color="#C2410C" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>Ward Utility Status</Text>
            </View>
          </View>

          <View style={styles.utilityTypeRow}>
            {(["water", "electricity"] as UtilityType[]).map((type) => {
              const selected = utilityType === type;
              return (
                <TouchableOpacity key={type} style={[styles.utilityTypeButton, selected && styles.utilityTypeButtonActive]} onPress={() => setUtilityType(type)} activeOpacity={0.85}>
                  <Feather name={type === "water" ? "droplet" : "zap"} size={14} color={selected ? "white" : "#C2410C"} />
                  <Text style={[styles.utilityTypeText, selected && styles.utilityTypeTextActive]}>{type === "water" ? "Water" : "Electricity"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.statusRow}>
            {["normal", "reduced", "maintenance", "outage"].map((status) => {
              const selected = utilityStatus === status;
              return (
                <TouchableOpacity key={status} style={[styles.statusChip, selected && styles.statusChipActive]} onPress={() => setUtilityStatus(status)} activeOpacity={0.85}>
                  <Text style={[styles.statusChipText, selected && styles.statusChipTextActive]}>{displayUtilityStatus(status)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.timeSectionHeader}>
            <Text style={styles.formSectionLabel}>SUPPLY / MAINTENANCE TIME</Text>
            <TouchableOpacity style={styles.fullDayButton} onPress={() => { setUtilityStartTime("00:00"); setUtilityEndTime("00:00"); }} activeOpacity={0.8}>
              <Feather name="sun" size={12} color="#15803D" /><Text style={styles.fullDayText}>24 Hours</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timePickerRow}>
            <View style={styles.timePickerField}><Text style={styles.inputLabel}>START TIME</Text><AppTimePicker value={utilityStartTime} onChange={setUtilityStartTime} placeholder="Start time" accessibilityLabel="Utility start time" /></View>
            <View style={styles.timePickerField}><Text style={styles.inputLabel}>END TIME</Text><AppTimePicker value={utilityEndTime} onChange={setUtilityEndTime} placeholder="End time" accessibilityLabel="Utility end time" /></View>
          </View>

          {scheduleText ? (
            <View style={styles.timeSummary}>
              <Feather name="clock" size={14} color="#7C3AED" />
              <View style={{ flex: 1 }}><Text style={styles.timeSummaryTitle}>{scheduleText}</Text><Text style={styles.timeSummaryText}>{hoursPerDay} hours</Text></View>
            </View>
          ) : null}

          <TextInput
            style={styles.publicMessageInput}
            value={utilityDescription}
            onChangeText={setUtilityDescription}
            placeholder="Public message for citizens"
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
          />

          {utilityResult ? (
            <Text style={[styles.resultText, { color: utilityResult === "success" ? "#047857" : "#DC2626" }]}>
              {utilityResult === "success" ? "Update posted." : "Unable to post update."}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.postUtilityButton, !canPostUtility && styles.postUtilityButtonDisabled]}
            onPress={saveUtilityStatus}
            disabled={!canPostUtility}
            activeOpacity={0.85}
          >
            <Feather name={assignedWard ? "send" : "map-pin"} size={14} color="white" />
            <Text style={styles.postUtilityText}>{utilitySaving ? "Posting..." : assignedWard ? "Post Utility Update" : "Ward Not Assigned"}</Text>
          </TouchableOpacity>
        </View>

        <UtilityStatusManager ward={assignedWard} wardCode={assignedWardCode} />

      </AppScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EBEFFC" },
  lockedScreen: { flex: 1, backgroundColor: "#EBEFFC", alignItems: "center", justifyContent: "center", padding: 32 },
  lockedTitle: { fontSize: 18, color: "#475569", marginTop: 16, fontFamily: "Inter_700Bold" },
  loginButton: { backgroundColor: "#C2410C", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 24 },
  loginText: { fontSize: 15, color: "white", fontFamily: "Inter_700Bold" },
  header: { paddingHorizontal: 20, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  roleBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.13)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  roleBadgeText: { color: "#A7F3D0", fontSize: 8.5, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  headerTitle: { color: "white", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 9 },
  headerSubtitle: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statPills: { flexDirection: "row", marginTop: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.13)" },
  statPill: { flex: 1, alignItems: "center", gap: 2 },
  statNumber: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.68)", fontSize: 9, fontFamily: "Inter_500Medium" },
  utilityPanel: { margin: 12, padding: 14, borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  panelTitleRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 12 },
  panelIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  panelTitle: { color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" },
  panelSubtitle: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_400Regular", marginTop: 1 },
  utilityTypeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  utilityTypeButton: { flex: 1, minHeight: 42, borderRadius: 13, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  utilityTypeButtonActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  utilityTypeText: { color: "#C2410C", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  utilityTypeTextActive: { color: "white" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  statusChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: "#F1F5F9" },
  statusChipActive: { backgroundColor: GREEN },
  statusChipText: { color: "#475569", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  statusChipTextActive: { color: "white" },
  timeSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  formSectionLabel: { color: "#64748B", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  fullDayButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", flexDirection: "row", alignItems: "center", gap: 5 },
  fullDayText: { color: "#15803D", fontSize: 10, fontFamily: "Inter_700Bold" },
  timePickerRow: { flexDirection: "row", gap: 8 },
  timePickerField: { flex: 1 },
  inputLabel: { color: "#64748B", fontSize: 8.5, letterSpacing: 0.6, fontFamily: "Inter_700Bold", marginBottom: 5 },
  timeSummary: { flexDirection: "row", alignItems: "center", gap: 9, padding: 11, marginTop: 9, borderRadius: 13, backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE" },
  timeSummaryTitle: { color: "#6D28D9", fontSize: 11, fontFamily: "Inter_700Bold" },
  timeSummaryText: { color: "#8B5CF6", fontSize: 9.5, fontFamily: "Inter_500Medium", marginTop: 1 },
  publicMessageInput: { minHeight: 82, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", padding: 12, color: "#0F172A", fontFamily: "Inter_400Regular" },
  resultText: { fontSize: 10.5, fontFamily: "Inter_700Bold", marginTop: 8 },
  postUtilityButton: { minHeight: 46, marginTop: 10, borderRadius: 14, backgroundColor: "#C2410C", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  postUtilityButtonDisabled: { backgroundColor: "#94A3B8", opacity: 0.72 },
  postUtilityText: { color: "white", fontSize: 12, fontFamily: "Inter_700Bold" },
  dashboardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 12, paddingTop: 12 },
  dashboardCard: { width: "48%", minHeight: 105, borderRadius: 18, backgroundColor: "white", borderWidth: 1.5, padding: 13 },
  dashboardLabel: { color: "#334155", fontSize: 11, fontFamily: "Inter_700Bold" },
  dashboardIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 10 },
  dashboardCount: { position: "absolute", right: 14, bottom: 10, fontSize: 25, fontFamily: "Inter_700Bold" },
  listSection: { paddingHorizontal: 12, paddingTop: 12 },
  complaintCard: { backgroundColor: "white", borderRadius: 18, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  complaintHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  categoryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  complaintTitle: { color: "#0F172A", fontSize: 13, fontFamily: "Inter_700Bold" },
  complaintMeta: { color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  statusPillText: { fontSize: 8.5, fontFamily: "Inter_700Bold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
  metaText: { flex: 1, color: "#64748B", fontSize: 10.5, fontFamily: "Inter_400Regular" },
  descriptionText: { color: "#475569", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 7 },
  updateButton: { minHeight: 40, marginTop: 10, borderRadius: 12, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  updateText: { color: "white", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  empty: { backgroundColor: "white", borderRadius: 18, padding: 28, alignItems: "center" },
  emptyText: { color: "#64748B", fontSize: 11.5, fontFamily: "Inter_500Medium", marginTop: 8, textAlign: "center" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.58)" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 28 },
  handle: { width: 44, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 14 },
  title: { color: "#0F172A", fontSize: 19, fontFamily: "Inter_700Bold" },
  complaintId: { color: ORANGE, fontSize: 10.5, fontFamily: "Inter_700Bold", marginTop: 5 },
  complaintName: { color: "#334155", fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 3 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  locationText: { color: "#94A3B8", fontSize: 10.5, fontFamily: "Inter_400Regular" },
  label: { color: "#64748B", fontSize: 9.5, letterSpacing: 0.7, fontFamily: "Inter_700Bold", marginTop: 16, marginBottom: 7 },
  optionRow: { flexDirection: "row", gap: 8 },
  optionButton: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  optionText: { fontSize: 10.5, fontFamily: "Inter_700Bold" },
  noteInput: { minHeight: 76, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", padding: 11, color: "#0F172A", fontFamily: "Inter_400Regular" },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 12, fontFamily: "Inter_700Bold" },
  confirmButton: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  confirmText: { color: "white", fontSize: 12, fontFamily: "Inter_700Bold" },
});
