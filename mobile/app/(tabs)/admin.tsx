import { AppScrollView } from "@/components/AppScrollView";
import AppTimePicker, { formatTimeLabel } from "@/components/AppTimePicker";
import React, { useState } from "react";
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
import { getUserErrorMessage } from "@/lib/api";

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
  const optionLabelKeys = nextStatusLabelKeys[complaint.status] || [];

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
          {options.map((option, index) => (
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
              <Text style={[modalStyles.optionText, { color: selectedStatus === option.status ? "white" : option.color }]}>{t(optionLabelKeys[index])}</Text>
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
            <LinearGradient colors={["#EA580C", "#FB923C"]} style={modalStyles.confirmGradient}>
              <Text style={modalStyles.confirmText}>{t("updateStatus")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function DetailedComplaintCard({ complaint, onAction }: { complaint: Complaint; onAction: () => void }) {
  const { t } = useLanguage();
  const status = statusConfig[complaint.status];
  const category = categoryConfig[complaint.category] || categoryConfig.other;
  const hasActions = (nextStatusOptions[complaint.status] || []).length > 0;
  const router = useRouter();

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
        <View style={styles.complaintHeaderText}>
          <Text style={styles.complaintTitle} numberOfLines={1}>{complaint.title}</Text>
          <Text style={styles.complaintMeta}>ID: {complaint.id} · {timeAgo(complaint.createdAt)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Feather name={status.icon as any} size={10} color={status.color} />
          <Text style={[styles.statusPillText, { color: status.color }]}>{t(statusLabelKeys[complaint.status])}</Text>
        </View>
      </View>

      <View style={styles.complaintBody}>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={11} color="#94A3B8" />
          <Text style={styles.metaText} numberOfLines={1}>{complaint.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="home" size={11} color="#94A3B8" />
          <Text style={styles.metaText}>{complaint.ward}</Text>
        </View>
        <Text style={styles.descriptionText} numberOfLines={2}>{complaint.description}</Text>
        <View style={styles.citizenRow}>
          <View style={styles.citizenChip}>
            <Feather name="user" size={10} color="#EA580C" />
            <Text style={styles.citizenText}>{complaint.userName || t("citizen")}</Text>
          </View>
          <View style={styles.citizenChip}>
            <Feather name="calendar" size={10} color="#64748B" />
            <Text style={styles.citizenText}>{new Date(complaint.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      {hasActions ? (
        <TouchableOpacity style={styles.updateButton} onPress={(event) => { event.stopPropagation?.(); onAction(); }} activeOpacity={0.85}>
          <LinearGradient colors={["#166534", "#16A34A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.updateGradient}>
            <Feather name="edit-3" size={13} color="white" />
            <Text style={styles.updateText}>{t("updateStatus")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      {complaint.status === "resolved" ? (
        <View style={styles.resolvedBar}>
          <Feather name="check-circle" size={12} color="#059669" />
          <Text style={styles.resolvedText}>{complaint.resolvedNote || t("issueResolved")}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const { complaints, updateStatus, refreshComplaints } = useComplaints();
  const router = useRouter();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [utilityType, setUtilityType] = useState<UtilityType>("water");
  const [utilityStatus, setUtilityStatus] = useState("normal");
  const [utilityStartTime, setUtilityStartTime] = useState("");
  const [utilityEndTime, setUtilityEndTime] = useState("");
  const [utilityDescription, setUtilityDescription] = useState("");
  const [utilitySaving, setUtilitySaving] = useState(false);
  const [utilityMessage, setUtilityMessage] = useState("");
  const [utilityMessageTone, setUtilityMessageTone] = useState<"success" | "error" | "">("");

  if (!user || user.role !== "nagarsevak") {
    return (
      <View style={styles.lockedScreen}>
        <Feather name="lock" size={48} color="#CBD5E1" />
        <Text style={styles.lockedTitle}>{t("nagarsevakOnly")}</Text>
        <Text style={styles.lockedDescription}>{t("nagarsevakOnlyDesc")}</Text>
        <TouchableOpacity onPress={() => router.replace("/login" as any)} style={styles.loginButton} activeOpacity={0.85}>
          <Text style={styles.loginText}>{t("loginBtn")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wardComplaints = user.ward
    ? complaints.filter((complaint) => wardMatchesNagarsevak(complaint.ward, user.ward || ""))
    : [];
  const filteredComplaints = filter === "all"
    ? wardComplaints
    : wardComplaints.filter((complaint) => {
        if (filter === "in_progress") return complaint.status === "in_progress" || complaint.status === "assigned";
        return complaint.status === filter;
      });
  const pendingCount = wardComplaints.filter((complaint) => complaint.status === "submitted").length;
  const activeCount = wardComplaints.filter((complaint) => complaint.status === "in_progress" || complaint.status === "assigned").length;
  const resolvedCount = wardComplaints.filter((complaint) => complaint.status === "resolved").length;
  const rejectedCount = wardComplaints.filter((complaint) => complaint.status === "rejected").length;
  const scheduleText = utilityScheduleLabel(utilityStartTime, utilityEndTime);
  const hoursPerDay = utilityDurationHours(utilityStartTime, utilityEndTime);

  const dashboardFilters: {
    filter: ComplaintStatus;
    label: string;
    count: number;
    icon: string;
    color: string;
    bg: string;
  }[] = [
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

  const showUtilityError = (message: string) => {
    setUtilityMessageTone("error");
    setUtilityMessage(message);
  };

  const saveUtilityStatus = async () => {
    if (!utilityStartTime || !utilityEndTime) {
      showUtilityError("Select both start time and end time.");
      return;
    }
    if (!utilityDescription.trim()) {
      showUtilityError("Add a short public update message.");
      return;
    }

    setUtilitySaving(true);
    setUtilityMessage("");
    setUtilityMessageTone("");

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

      setUtilityMessageTone("success");
      setUtilityMessage(`${utilityType === "water" ? "Water" : "Electricity"} update posted to your assigned ward.`);
      setUtilityStartTime("");
      setUtilityEndTime("");
      setUtilityDescription("");
    } catch (error: any) {
      const message = getUserErrorMessage(error, "Unable to post utility update.");
      if (/valid ward|ward is required|ward assignment|ward.*missing/i.test(message)) {
        showUtilityError("Your ward assignment is missing. Please ask the Super Admin to assign your ward.");
      } else {
        showUtilityError(message);
      }
    } finally {
      setUtilitySaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#166534", "#16A34A", "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.roleBadge}>
              <Feather name="briefcase" size={10} color="#6EE7B7" />
              <Text style={styles.roleBadgeText}>NAGARSEVAK</Text>
            </View>
            <Text style={styles.headerTitle}>{user.name}</Text>
            <Text style={styles.headerSubtitle}>{user.ward || "Ward assignment pending"}</Text>
          </View>
        </View>

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
        onAppRefresh={() => refreshComplaints()}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 8) + 96 }}
        showsVerticalScrollIndicator={false}
      >
        {pendingCount > 0 ? (
          <View style={styles.urgentBanner}>
            <Feather name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.urgentText}>{pendingCount} {t("complaints")} — {t("needsAttention")}</Text>
          </View>
        ) : null}

        <View style={styles.utilityPanel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleRow}>
              <View style={styles.panelIcon}>
                <Feather name="zap" size={15} color="#C2410C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Ward Utility Status</Text>
                <Text style={styles.panelSubtitle}>Post water or electricity timing for citizens.</Text>
              </View>
            </View>
          </View>

          <View style={styles.autoWardInfo}>
            <Feather name="shield" size={16} color="#15803D" />
            <View style={{ flex: 1 }}>
              <Text style={styles.autoWardTitle}>Assigned ward is automatic</Text>
              <Text style={styles.autoWardText}>
                {user.ward ? `This update will be visible only to citizens in ${user.ward}.` : "Your secure server-side ward assignment will be used when you post."}
              </Text>
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
            <View>
              <Text style={styles.formSectionLabel}>SUPPLY / MAINTENANCE TIME</Text>
              <Text style={styles.formSectionHelp}>Choose exact start and end time.</Text>
            </View>
            <TouchableOpacity style={styles.fullDayButton} onPress={() => { setUtilityStartTime("00:00"); setUtilityEndTime("00:00"); }} activeOpacity={0.8}>
              <Feather name="sun" size={12} color="#15803D" />
              <Text style={styles.fullDayText}>24 Hours</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timePickerRow}>
            <View style={styles.timePickerField}>
              <Text style={styles.inputLabel}>START TIME</Text>
              <AppTimePicker value={utilityStartTime} onChange={setUtilityStartTime} placeholder="Start time" accessibilityLabel="Utility start time" />
            </View>
            <View style={styles.timePickerField}>
              <Text style={styles.inputLabel}>END TIME</Text>
              <AppTimePicker value={utilityEndTime} onChange={setUtilityEndTime} placeholder="End time" accessibilityLabel="Utility end time" />
            </View>
          </View>

          {scheduleText ? (
            <View style={styles.timeSummary}>
              <View style={styles.timeSummaryIcon}>
                <Feather name="clock" size={14} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeSummaryTitle}>{scheduleText}</Text>
                <Text style={styles.timeSummaryText}>{hoursPerDay} hours total duration</Text>
              </View>
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

          {utilityMessage ? (
            <View style={[styles.utilityMessage, utilityMessageTone === "success" ? styles.utilityMessageSuccess : styles.utilityMessageError]}>
              <Feather name={utilityMessageTone === "success" ? "check-circle" : "alert-circle"} size={14} color={utilityMessageTone === "success" ? "#047857" : "#DC2626"} />
              <Text style={[styles.utilityMessageText, { color: utilityMessageTone === "success" ? "#047857" : "#DC2626" }]}>{utilityMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.postUtilityButton, utilitySaving && { opacity: 0.65 }]} onPress={saveUtilityStatus} disabled={utilitySaving} activeOpacity={0.85}>
            <Feather name="send" size={14} color="white" />
            <Text style={styles.postUtilityText}>{utilitySaving ? "Posting..." : "Post Utility Update"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dashboardGrid}>
          {dashboardFilters.map((item) => {
            const selected = filter === item.filter;
            return (
              <TouchableOpacity
                key={item.filter}
                style={[
                  styles.dashboardCard,
                  { backgroundColor: selected ? item.bg : "white", borderColor: item.color, shadowColor: item.color },
                  selected && styles.dashboardCardActive,
                ]}
                onPress={() => openComplaintList(item.filter)}
                activeOpacity={0.85}
              >
                <Text style={styles.dashboardLabel}>{item.label}</Text>
                <View style={[styles.dashboardIcon, { backgroundColor: `${item.color}15` }]}>
                  <Feather name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.dashboardCount, { color: item.color }]}>{item.count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.complaintList}>
          {filteredComplaints.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="check-circle" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>{user.ward ? t("noComplaintsInCategory") : "Your ward complaints will appear after the Super Admin assigns your ward."}</Text>
            </View>
          ) : (
            filteredComplaints.map((complaint) => (
              <DetailedComplaintCard key={complaint.id} complaint={complaint} onAction={() => setActiveComplaint(complaint)} />
            ))
          )}
        </View>
      </AppScrollView>

      {activeComplaint ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setActiveComplaint(null)}>
          <ActionModal
            complaint={activeComplaint}
            onClose={() => setActiveComplaint(null)}
            onUpdate={(status, note) => {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              updateStatus(activeComplaint.id, status, note, user.name || "Nagarsevak");
            }}
          />
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EBEFFC" },
  lockedScreen: { flex: 1, backgroundColor: "#EBEFFC", alignItems: "center", justifyContent: "center", padding: 32 },
  lockedTitle: { fontSize: 18, color: "#475569", marginTop: 16, fontFamily: "Inter_700Bold" },
  lockedDescription: { fontSize: 13, color: "#94A3B8", marginTop: 8, textAlign: "center", fontFamily: "Inter_400Regular" },
  loginButton: { backgroundColor: "#C2410C", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 24 },
  loginText: { fontSize: 15, color: "white", fontFamily: "Inter_700Bold" },
  header: { paddingHorizontal: 19, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roleBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 8, paddingVertical: 4 },
  roleBadgeText: { color: "#6EE7B7", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  headerTitle: { marginTop: 8, color: "white", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSubtitle: { marginTop: 3, color: "rgba(255,255,255,0.78)", fontSize: 12, fontFamily: "Inter_500Medium" },
  statPills: { marginTop: 16, flexDirection: "row", borderRadius: 17, backgroundColor: "rgba(255,255,255,0.13)", overflow: "hidden" },
  statPill: { flex: 1, minHeight: 72, alignItems: "center", justifyContent: "center", gap: 2 },
  statNumber: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.64)", fontSize: 9, fontFamily: "Inter_500Medium" },
  urgentBanner: { marginHorizontal: 14, marginTop: 12, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", flexDirection: "row", alignItems: "center", gap: 8 },
  urgentText: { flex: 1, color: "#B91C1C", fontSize: 11, fontFamily: "Inter_700Bold" },
  utilityPanel: { marginHorizontal: 14, marginTop: 12, padding: 15, borderRadius: 20, backgroundColor: "white", shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  panelHeader: { marginBottom: 10 },
  panelTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  panelIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED" },
  panelTitle: { color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold" },
  panelSubtitle: { marginTop: 2, color: "#64748B", fontSize: 11, fontFamily: "Inter_400Regular" },
  autoWardInfo: { marginBottom: 12, borderRadius: 14, padding: 11, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", flexDirection: "row", alignItems: "flex-start", gap: 9 },
  autoWardTitle: { color: "#166534", fontSize: 11, fontFamily: "Inter_700Bold" },
  autoWardText: { marginTop: 2, color: "#15803D", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" },
  utilityTypeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  utilityTypeButton: { flex: 1, minHeight: 42, borderRadius: 13, borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  utilityTypeButtonActive: { borderColor: "#EA580C", backgroundColor: "#EA580C" },
  utilityTypeText: { color: "#C2410C", fontSize: 12, fontFamily: "Inter_700Bold" },
  utilityTypeTextActive: { color: "white" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 15 },
  statusChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "#F1F5F9" },
  statusChipActive: { backgroundColor: "#16A34A" },
  statusChipText: { color: "#475569", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  statusChipTextActive: { color: "white" },
  timeSectionHeader: { marginBottom: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  formSectionLabel: { color: "#475569", fontSize: 9.5, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  formSectionHelp: { marginTop: 2, color: "#94A3B8", fontSize: 10, fontFamily: "Inter_400Regular" },
  fullDayButton: { minHeight: 34, borderRadius: 11, paddingHorizontal: 10, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", flexDirection: "row", alignItems: "center", gap: 5 },
  fullDayText: { color: "#15803D", fontSize: 10, fontFamily: "Inter_700Bold" },
  timePickerRow: { flexDirection: "row", gap: 9 },
  timePickerField: { flex: 1, minWidth: 0 },
  inputLabel: { marginBottom: 5, color: "#64748B", fontSize: 9, letterSpacing: 0.7, fontFamily: "Inter_700Bold" },
  timeSummary: { marginTop: 10, borderRadius: 14, padding: 11, backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", flexDirection: "row", alignItems: "center", gap: 9 },
  timeSummaryIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  timeSummaryTitle: { color: "#5B21B6", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  timeSummaryText: { marginTop: 2, color: "#7C3AED", fontSize: 10, fontFamily: "Inter_400Regular" },
  publicMessageInput: { minHeight: 82, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 11, color: "#0F172A", fontSize: 12.5, fontFamily: "Inter_400Regular" },
  utilityMessage: { marginTop: 9, borderRadius: 12, padding: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  utilityMessageSuccess: { backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0" },
  utilityMessageError: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  utilityMessageText: { flex: 1, fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_600SemiBold" },
  postUtilityButton: { minHeight: 44, marginTop: 10, borderRadius: 13, backgroundColor: "#C2410C", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  postUtilityText: { color: "white", fontSize: 12.5, fontFamily: "Inter_700Bold" },
  dashboardGrid: { paddingHorizontal: 14, paddingTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dashboardCard: { width: "48%", minHeight: 105, borderRadius: 18, borderWidth: 1, padding: 13, backgroundColor: "white", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  dashboardCardActive: { borderWidth: 1.5 },
  dashboardLabel: { color: "#475569", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dashboardIcon: { position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dashboardCount: { marginTop: 18, fontSize: 28, fontFamily: "Inter_700Bold" },
  complaintList: { paddingHorizontal: 14, paddingTop: 14 },
  emptyState: { minHeight: 150, borderRadius: 18, backgroundColor: "white", alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { marginTop: 10, color: "#94A3B8", fontSize: 12, lineHeight: 18, textAlign: "center", fontFamily: "Inter_500Medium" },
  complaintCard: { marginBottom: 11, borderRadius: 18, backgroundColor: "white", overflow: "hidden", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  complaintHeader: { padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  categoryIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  complaintHeaderText: { flex: 1, minWidth: 0 },
  complaintTitle: { color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_700Bold" },
  complaintMeta: { marginTop: 3, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  statusPillText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  complaintBody: { paddingHorizontal: 13, paddingBottom: 12 },
  metaRow: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { flex: 1, color: "#64748B", fontSize: 10.5, fontFamily: "Inter_400Regular" },
  descriptionText: { marginTop: 9, color: "#475569", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" },
  citizenRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  citizenChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center", gap: 5 },
  citizenText: { color: "#64748B", fontSize: 9.5, fontFamily: "Inter_600SemiBold" },
  updateButton: { borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  updateGradient: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  updateText: { color: "white", fontSize: 11, fontFamily: "Inter_700Bold" },
  resolvedBar: { minHeight: 38, paddingHorizontal: 13, borderTopWidth: 1, borderTopColor: "#D1FAE5", backgroundColor: "#ECFDF5", flexDirection: "row", alignItems: "center", gap: 7 },
  resolvedText: { flex: 1, color: "#047857", fontSize: 10.5, fontFamily: "Inter_600SemiBold" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.55)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", padding: 20, paddingBottom: 28 },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", marginBottom: 15 },
  title: { color: "#0F172A", fontSize: 19, fontFamily: "Inter_700Bold" },
  complaintId: { marginTop: 5, color: "#EA580C", fontSize: 10, fontFamily: "Inter_700Bold" },
  complaintName: { marginTop: 4, color: "#334155", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  locationRow: { marginTop: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  locationText: { flex: 1, color: "#94A3B8", fontSize: 10.5, fontFamily: "Inter_400Regular" },
  label: { marginTop: 17, marginBottom: 8, color: "#64748B", fontSize: 10, letterSpacing: 0.7, fontFamily: "Inter_700Bold" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionButton: { minHeight: 42, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  optionText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  noteInput: { minHeight: 90, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 11, color: "#0F172A", fontSize: 12, fontFamily: "Inter_400Regular" },
  buttonRow: { marginTop: 17, flexDirection: "row", gap: 10 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 12, fontFamily: "Inter_700Bold" },
  confirmButton: { flex: 1, borderRadius: 14, overflow: "hidden" },
  confirmGradient: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  confirmText: { color: "white", fontSize: 12, fontFamily: "Inter_700Bold" },
});
