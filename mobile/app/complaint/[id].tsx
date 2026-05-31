import { API_BASE_URL } from "@/constants/api";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ComplaintStatus } from "@/context/ComplaintContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

type ComplaintDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  photoUri?: string | null;
  location: string;
  ward: string;
  status: ComplaintStatus;
  assignedTo?: string | null;
  resolvedNote?: string | null;
  userName?: string | null;
  userMobile?: string | null;
  userAddress?: string | null;
  userAge?: number | null;
  userEmail?: string | null;
  createdAt: string;
  updatedAt?: string;
  timeline: {
    status: ComplaintStatus;
    timestamp: string;
    note?: string | null;
    updatedBy?: string | null;
  }[];
};

const ORANGE = "#EA580C";
const DARK = "#C2410C";

const statusLabelKeys: Record<ComplaintStatus, string> = {
  submitted: "submitted",
  assigned: "assigned",
  in_progress: "inProgress",
  resolved: "resolved",
  rejected: "rejected",
};

const statusConfig: Record<ComplaintStatus, { color: string; bg: string; icon: string }> = {
  submitted: { color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  assigned: { color: ORANGE, bg: "#FFEDD5", icon: "user-check" },
  in_progress: { color: "#7C3AED", bg: "#EDE9FE", icon: "tool" },
  resolved: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  rejected: { color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
};

const categoryLabelKeys: Record<string, string> = {
  roads: "roads",
  water: "waterSupply",
  electricity: "electricity",
  garbage: "garbage",
  drainage: "drainage",
  streetlight: "streetLight",
  encroachment: "encroachment",
  other: "other",
};

const categoryConfig: Record<string, { icon: string; color: string; bg: string }> = {
  roads: { icon: "truck", color: "#92400E", bg: "#FEF3C7" },
  water: { icon: "droplet", color: "#0369A1", bg: "#BAE6FD" },
  electricity: { icon: "zap", color: "#D97706", bg: "#FEF3C7" },
  garbage: { icon: "trash-2", color: "#059669", bg: "#D1FAE5" },
  drainage: { icon: "git-merge", color: "#0EA5E9", bg: "#FFF7ED" },
  streetlight: { icon: "sun", color: "#7C3AED", bg: "#EDE9FE" },
  encroachment: { icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2" },
  other: { icon: "more-horizontal", color: "#475569", bg: "#F1F5F9" },
};

const timelineSteps: ComplaintStatus[] = ["submitted", "assigned", "in_progress", "resolved"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function goBack(router: any, user: any) {
  if (router.canGoBack?.()) router.back();
  else if (user?.role === "nagarsevak") router.replace("/nagarsevak" as any);
  else if (user?.role === "super_admin") router.replace("/super-admin" as any);
  else router.replace("/(tabs)/complaints" as any);
}

function AppNotice({
  visible,
  title,
  message,
  tone = "info",
  confirmText,
  cancelText,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  tone?: "info" | "success" | "danger";
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm?: () => void;
}) {
  const color = tone === "danger" ? "#DC2626" : tone === "success" ? "#059669" : ORANGE;
  const bg = tone === "danger" ? "#FEF2F2" : tone === "success" ? "#D1FAE5" : "#FFF7ED";
  const icon = tone === "danger" ? "alert-triangle" : tone === "success" ? "check-circle" : "info";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.noticeOverlay}>
        <View style={styles.noticeCard}>
          <View style={[styles.noticeIcon, { backgroundColor: bg }]}>
            <Feather name={icon as any} size={26} color={color} />
          </View>
          <Text style={styles.noticeTitle}>{title}</Text>
          <Text style={styles.noticeMsg}>{message}</Text>
          <View style={styles.noticeButtons}>
            {onConfirm ? (
              <TouchableOpacity style={styles.noticeCancel} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.noticeCancelText}>{cancelText || "Cancel"}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.noticeOk, { backgroundColor: color }]} onPress={onConfirm || onClose} activeOpacity={0.85}>
              <Text style={styles.noticeOkText}>{confirmText || "OK"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ComplaintDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isOfficer = user?.role === "nagarsevak" || user?.role === "super_admin";

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<ComplaintStatus | null>(null);
  const [notice, setNotice] = useState({ visible: false, title: "", message: "", tone: "info" as "info" | "success" | "danger", onConfirm: undefined as undefined | (() => void), confirmText: undefined as undefined | string });
  const fadeAnim = useRef(new Animated.Value(fresh === "1" ? 0 : 1)).current;

  const closeNotice = () => setNotice((prev) => ({ ...prev, visible: false, onConfirm: undefined }));
  const showNotice = (title: string, message: string, tone: "info" | "success" | "danger" = "info") => setNotice({ visible: true, title, message, tone, onConfirm: undefined, confirmText: undefined });

  const loadComplaint = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/complaints/${id}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        setComplaint(null);
        return;
      }
      const apiComplaint = data.complaint;
      const createdAt = apiComplaint.created_at || apiComplaint.createdAt || new Date().toISOString();
      setComplaint({
        id: String(apiComplaint.id),
        title: apiComplaint.title || "Complaint",
        description: apiComplaint.description || "",
        category: apiComplaint.category || "other",
        photoUri: apiComplaint.photo_url || apiComplaint.photoUri || null,
        location: apiComplaint.location || "",
        ward: apiComplaint.ward || apiComplaint.ward_code || "Ward Pending",
        status: apiComplaint.status || "submitted",
        assignedTo: apiComplaint.assigned_to || apiComplaint.assignedTo,
        resolvedNote: apiComplaint.resolved_note || apiComplaint.resolvedNote,
        userName: apiComplaint.user_name || apiComplaint.userName,
        userMobile: apiComplaint.user_mobile || apiComplaint.userMobile,
        userAddress: apiComplaint.user_address || apiComplaint.userAddress,
        userAge: apiComplaint.user_age || apiComplaint.userAge,
        userEmail: apiComplaint.user_email || apiComplaint.userEmail,
        createdAt,
        updatedAt: apiComplaint.updated_at || apiComplaint.updatedAt,
        timeline: Array.isArray(apiComplaint.timeline) && apiComplaint.timeline.length
          ? apiComplaint.timeline.map((item: any) => ({
              status: item.status,
              timestamp: item.created_at || item.timestamp || createdAt,
              note: item.note,
              updatedBy: item.updated_by || item.updatedBy,
            }))
          : [{ status: apiComplaint.status || "submitted", timestamp: createdAt, note: "Complaint registered successfully", updatedBy: "System" }],
      });
    } catch (error) {
      console.error("Load complaint failed", error);
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  const updateComplaintStatus = async (nextStatus: ComplaintStatus, note: string) => {
    if (!complaint) return;
    try {
      setUpdatingStatus(nextStatus);
      const response = await fetch(`${API_BASE_URL}/api/complaints/${complaint.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          note,
          assigned_to: nextStatus === "assigned" ? user?.name || "Ward Officer" : undefined,
          resolved_note: nextStatus === "resolved" ? "Complaint resolved" : undefined,
          updated_by: user?.name || "Ward Officer",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Status update failed");
      await loadComplaint();
      showNotice("Updated", "Complaint status updated successfully.", "success");
    } catch (error) {
      console.error("Update complaint status failed", error);
      showNotice("Update failed", error instanceof Error ? error.message : "Status update failed", "danger");
    } finally {
      setUpdatingStatus(null);
    }
  };

  useEffect(() => {
    if (fresh === "1") {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [fresh, fadeAnim]);

  useEffect(() => {
    if (id) void loadComplaint();
  }, [id]);

  if (loading) {
    return <View style={[styles.root, styles.center]}><ActivityIndicator color={ORANGE} /><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  if (!complaint) {
    return <View style={[styles.root, styles.center]}><Text style={styles.loadingText}>{t("complaintNotFound")}</Text></View>;
  }

  const st = statusConfig[complaint.status] || statusConfig.submitted;
  const cat = categoryConfig[complaint.category] || categoryConfig.other;
  const currentStepIdx = complaint.status === "rejected" ? -1 : timelineSteps.indexOf(complaint.status);
  const officerActions = [
    { status: "assigned" as ComplaintStatus, label: "Assign", note: "Complaint assigned to ward officer", icon: "user-check", color: ORANGE, bg: "#FFEDD5", show: complaint.status === "submitted" },
    { status: "in_progress" as ComplaintStatus, label: "In Progress", note: "Work started on this complaint", icon: "tool", color: "#7C3AED", bg: "#EDE9FE", show: complaint.status === "submitted" || complaint.status === "assigned" },
    { status: "resolved" as ComplaintStatus, label: "Resolve", note: "Complaint resolved by ward officer", icon: "check-circle", color: "#059669", bg: "#D1FAE5", show: complaint.status === "submitted" || complaint.status === "assigned" || complaint.status === "in_progress" },
    { status: "rejected" as ComplaintStatus, label: "Reject", note: "Complaint rejected by ward officer", icon: "x-circle", color: "#DC2626", bg: "#FEE2E2", show: complaint.status === "submitted" || complaint.status === "assigned" || complaint.status === "in_progress" },
  ];

  const confirmStatusUpdate = (action: typeof officerActions[number]) => {
    setNotice({
      visible: true,
      title: "Update Complaint",
      message: `Mark this complaint as ${action.label}?`,
      tone: action.status === "rejected" ? "danger" : "info",
      confirmText: "Update",
      onConfirm: () => {
        closeNotice();
        void updateComplaintStatus(action.status, action.note);
      },
    });
  };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}> 
      <LinearGradient colors={fresh === "1" ? ["#166534", "#16A34A", "#22C55E"] : ["#C2410C", ORANGE, "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}> 
        <TouchableOpacity onPress={() => goBack(router, user)} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={styles.headerCenter}>
            {fresh === "1" && <View style={styles.successPill}><Feather name="check-circle" size={12} color="#6EE7B7" /><Text style={styles.successPillText}>{t("complaintRegistered")}</Text></View>}
            <Text style={styles.headerTitle} numberOfLines={2}>{complaint.title}</Text>
            <Text style={styles.headerSub}># {complaint.id}</Text>
          </View>
          <View style={styles.statusBadge}><Feather name={st.icon as any} size={12} color="white" /><Text style={styles.statusBadgeText}>{t(statusLabelKeys[complaint.status])}</Text></View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 8) + 40 }]} showsVerticalScrollIndicator={false}>
        {complaint.photoUri ? <View style={styles.photoCard}><Image source={{ uri: complaint.photoUri }} style={styles.photo} /><View style={styles.photoLabel}><Feather name="camera" size={12} color="#64748B" /><Text style={styles.photoLabelText}>{t("problemPhoto")}</Text></View></View> : null}

        {isOfficer && complaint.userName ? (
          <View style={styles.complainantCard}>
            <Text style={styles.detailSectionTitle}>{t("complainantProfile")}</Text>
            <View style={styles.complainantHeader}><View style={styles.complainantAvatar}><Text style={styles.complainantAvatarText}>{complaint.userName.charAt(0).toUpperCase()}</Text></View><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.complainantName}>{complaint.userName}</Text><Text style={styles.complainantRole}>{t("citizen")}</Text></View></View>
            <View style={styles.complainantDivider} />
            <View style={styles.complainantDetails}>
              {complaint.userMobile ? <InfoRow icon="phone" label={t("phone")} value={`+91 ${complaint.userMobile}`} color={ORANGE} bg="#FFEDD5" /> : null}
              {complaint.userEmail ? <InfoRow icon="mail" label={t("email")} value={complaint.userEmail} color="#DB2777" bg="#FCE7F3" /> : null}
              <InfoRow icon="map-pin" label={t("ward")} value={complaint.ward} color="#059669" bg="#D1FAE5" />
              {complaint.userAddress ? <InfoRow icon="home" label={t("address")} value={complaint.userAddress} color="#D97706" bg="#FEF3C7" /> : null}
              {complaint.userAge ? <InfoRow icon="calendar" label={t("age")} value={`${complaint.userAge} years`} color="#7C3AED" bg="#EDE9FE" /> : null}
            </View>
          </View>
        ) : null}

        <View style={styles.trackerCard}>
          <Text style={styles.trackerTitle}>{t("complaintStatus")}</Text>
          <View style={styles.trackerSteps}>{timelineSteps.map((step, idx) => {
            const done = idx < currentStepIdx;
            const active = idx === currentStepIdx;
            const sConfig = statusConfig[step];
            return <React.Fragment key={step}><View style={styles.trackerItem}><View style={[styles.trackerDot, done && { backgroundColor: "#059669", borderColor: "#059669" }, active && { backgroundColor: sConfig.color, borderColor: sConfig.color }, !done && !active && { backgroundColor: "white", borderColor: "#E2E8F0" }]}>{done ? <Feather name="check" size={10} color="white" /> : <Feather name={sConfig.icon as any} size={10} color={active ? "white" : "#CBD5E1"} />}</View><Text style={[styles.trackerLabel, active && { color: sConfig.color, fontFamily: "Inter_700Bold" }, done && { color: "#059669" }]}>{t(statusLabelKeys[step])}</Text></View>{idx < timelineSteps.length - 1 && <View style={[styles.trackerLine, { backgroundColor: done ? "#FACC15" : "#E2E8F0" }]} />}</React.Fragment>;
          })}</View>
        </View>

        {isOfficer && officerActions.some((action) => action.show) ? (
          <View style={styles.officerActionCard}>
            <Text style={styles.detailSectionTitle}>Officer Actions</Text>
            <View style={styles.officerActionGrid}>{officerActions.filter((action) => action.show).map((action) => {
              const isUpdating = updatingStatus === action.status;
              return <TouchableOpacity key={action.status} style={[styles.officerActionBtn, { backgroundColor: action.bg, borderColor: action.color, opacity: updatingStatus && !isUpdating ? 0.5 : 1 }]} activeOpacity={0.85} disabled={!!updatingStatus} onPress={() => confirmStatusUpdate(action)}>{isUpdating ? <ActivityIndicator color={action.color} /> : <><Feather name={action.icon as any} size={16} color={action.color} /><Text style={[styles.officerActionText, { color: action.color }]}>{action.label}</Text></>}</TouchableOpacity>;
            })}</View>
          </View>
        ) : null}

        <View style={styles.detailCard}>
          <Text style={styles.detailSectionTitle}>{t("complaintDetails")}</Text>
          <DetailRow icon={cat.icon} iconBg={cat.bg} iconColor={cat.color} label={t("category")} value={t(categoryLabelKeys[complaint.category] || "other")} />
          <View style={styles.divider} />
          <DetailRow icon="map-pin" iconBg="#FFF7ED" iconColor={ORANGE} label={t("location")} value={complaint.location} sub={complaint.ward} />
          <View style={styles.divider} />
          <DetailRow icon="calendar" iconBg="#FFF7ED" iconColor={ORANGE} label={t("submittedOn")} value={formatDate(complaint.createdAt)} />
          <View style={styles.divider} />
          <Text style={styles.detailLabel}>{t("description")}</Text>
          <Text style={[styles.detailValue, { marginTop: 6, lineHeight: 20 }]}>{complaint.description}</Text>
          {complaint.assignedTo ? <><View style={styles.divider} /><DetailRow icon="user-check" iconBg="#FFEDD5" iconColor={ORANGE} label={t("assignedTo")} value={complaint.assignedTo} /></> : null}
          {complaint.resolvedNote ? <><View style={styles.divider} /><View style={styles.resolvedNote}><Feather name="check-circle" size={14} color="#059669" /><Text style={styles.resolvedNoteText}>{complaint.resolvedNote}</Text></View></> : null}
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.detailSectionTitle}>{t("activityTimeline")}</Text>
          {complaint.timeline.slice().reverse().map((entry, idx) => {
            const eSt = statusConfig[entry.status] || statusConfig.submitted;
            return <View key={`${entry.status}-${idx}`} style={styles.timelineEntry}><View style={styles.timelineLeft}><View style={[styles.tlDot, { backgroundColor: eSt.bg }]}><Feather name={eSt.icon as any} size={10} color={eSt.color} /></View>{idx < complaint.timeline.length - 1 && <View style={styles.tlLine} />}</View><View style={styles.timelineRight}><View style={styles.tlHeader}><Text style={[styles.tlStatus, { color: eSt.color }]}>{t(statusLabelKeys[entry.status])}</Text><Text style={styles.tlTime}>{formatDate(entry.timestamp)}</Text></View>{entry.note ? <Text style={styles.tlNote}>{entry.note}</Text> : null}{entry.updatedBy ? <Text style={styles.tlBy}>— {entry.updatedBy}</Text> : null}</View></View>;
          })}
        </View>
      </ScrollView>

      <AppNotice visible={notice.visible} title={notice.title} message={notice.message} tone={notice.tone} confirmText={notice.confirmText} onClose={closeNotice} onConfirm={notice.onConfirm} />
    </Animated.View>
  );
}

function InfoRow({ icon, label, value, color, bg }: { icon: any; label: string; value: string; color: string; bg: string }) {
  return <View style={styles.complainantRow}><View style={[styles.complainantIcon, { backgroundColor: bg }]}><Feather name={icon} size={13} color={color} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.complainantLabel}>{label}</Text><Text style={styles.complainantValue}>{value}</Text></View></View>;
}

function DetailRow({ icon, iconBg, iconColor, label, value, sub }: { icon: any; iconBg: string; iconColor: string; label: string; value: string; sub?: string }) {
  return <View style={styles.detailRow}><View style={[styles.catIconWrap, { backgroundColor: iconBg }]}><Feather name={icon} size={14} color={iconColor} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text>{sub ? <Text style={styles.detailSub}>{sub}</Text> : null}</View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ebeffc" },
  center: { alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#64748B", marginTop: 10, fontFamily: "Inter_400Regular" },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10, alignSelf: "flex-start", paddingVertical: 4, paddingRight: 8, paddingLeft: 2 },
  backBtnText: { color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headerCenter: { flex: 1, minWidth: 0 },
  successPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(110,231,183,0.15)", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginBottom: 6 },
  successPillText: { fontSize: 10, fontWeight: "700", color: "#6EE7B7", fontFamily: "Inter_600SemiBold" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0, backgroundColor: "rgba(255,255,255,0.2)" },
  statusBadgeText: { fontSize: 10, fontWeight: "700", color: "white", fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  content: { padding: 14 },
  photoCard: { borderRadius: 16, overflow: "hidden", marginBottom: 14, backgroundColor: "white", shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  photo: { width: "100%", height: 200 },
  photoLabel: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  photoLabelText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },
  trackerCard: { backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  trackerTitle: { fontSize: 13, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 16 },
  trackerSteps: { flexDirection: "row", alignItems: "flex-start" },
  trackerItem: { alignItems: "center", gap: 6, flexShrink: 0 },
  trackerDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  trackerLine: { flex: 1, height: 2, borderRadius: 1, marginTop: 13, marginHorizontal: 4 },
  trackerLabel: { fontSize: 9, fontWeight: "600", color: "#94A3B8", fontFamily: "Inter_500Medium", textAlign: "center", maxWidth: 60 },
  officerActionCard: { backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  officerActionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  officerActionBtn: { width: "47%", minHeight: 46, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, paddingVertical: 10, paddingHorizontal: 8 },
  officerActionText: { fontSize: 12, fontWeight: "800", fontFamily: "Inter_700Bold" },
  detailCard: { backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  detailSectionTitle: { fontSize: 13, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 14 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  catIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailLabel: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  detailSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  resolvedNote: { flexDirection: "row", gap: 8, backgroundColor: "#D1FAE5", borderRadius: 10, padding: 10, alignItems: "flex-start" },
  resolvedNoteText: { flex: 1, fontSize: 12, color: "#065F46", fontFamily: "Inter_400Regular", lineHeight: 18 },
  timelineCard: { backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  timelineEntry: { flexDirection: "row", gap: 12, marginBottom: 4 },
  timelineLeft: { alignItems: "center", width: 28, flexShrink: 0 },
  tlDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tlLine: { flex: 1, width: 2, backgroundColor: "#F1F5F9", marginTop: 4 },
  timelineRight: { flex: 1, paddingBottom: 16 },
  tlHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 },
  tlStatus: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  tlTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  tlNote: { fontSize: 12, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 2 },
  tlBy: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", fontStyle: "italic" },
  complainantCard: { backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  complainantHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  complainantAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
  complainantAvatarText: { fontSize: 18, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  complainantName: { fontSize: 15, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  complainantRole: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 1 },
  complainantDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  complainantDetails: { gap: 10 },
  complainantRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  complainantIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  complainantLabel: { fontSize: 9, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 1 },
  complainantValue: { fontSize: 13, fontWeight: "600", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  noticeOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", padding: 22 },
  noticeCard: { width: "100%", maxWidth: 350, backgroundColor: "white", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  noticeIcon: { width: 56, height: 56, borderRadius: 21, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  noticeTitle: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" },
  noticeMsg: { marginTop: 6, fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  noticeButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 18 },
  noticeCancel: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  noticeCancelText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_700Bold" },
  noticeOk: { flex: 1.2, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  noticeOkText: { fontSize: 13, color: "white", fontFamily: "Inter_700Bold" },
});
