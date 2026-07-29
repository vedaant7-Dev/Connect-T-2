import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import AppDateTimePicker from "@/components/AppDateTimePicker";
import BroadcastMediaPicker from "@/components/BroadcastMediaPicker";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import ComplaintMediaViewer from "@/components/ComplaintMediaViewer";
import { AppBroadcast, BroadcastAudience, BroadcastLanguage, BroadcastMediaUpload, useBroadcasts } from "@/context/BroadcastContext";
import { useAuth } from "@/context/AuthContext";
import { NAGARSEVAK_WARDS } from "@/data/wards";
import { getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const ORANGE = "#EA580C";
const BG = "#EEF2F7";

const CATEGORIES: Array<{ key: AppBroadcast["category"]; label: string; icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = [
  { key: "announcement", label: "Announcement", icon: "radio", color: "#B45309", bg: "#FEF3C7" },
  { key: "emergency", label: "Emergency", icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2" },
  { key: "information", label: "Information", icon: "info", color: "#2563EB", bg: "#DBEAFE" },
  { key: "notice", label: "Notice", icon: "file-text", color: "#7C3AED", bg: "#EDE9FE" },
];
const AUDIENCES: Array<{ key: BroadcastAudience; label: string }> = [
  { key: "all", label: "All users" }, { key: "citizen", label: "Citizens" }, { key: "nagarsevak", label: "Nagarsevaks" },
  { key: "seeker", label: "Job Seekers" }, { key: "employer", label: "Employers" },
];
const LANGUAGES: Array<{ key: BroadcastLanguage; label: string }> = [
  { key: "en", label: "English" }, { key: "mr", label: "मराठी" }, { key: "hi", label: "हिंदी" },
];

function formatDate(value?: string) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
function makeIdempotencyKey() { return `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`; }
function statusMeta(status: AppBroadcast["status"]) {
  if (status === "scheduled") return { label: "Scheduled", color: "#B45309", bg: "#FEF3C7" };
  if (status === "paused") return { label: "Paused", color: "#7C3AED", bg: "#EDE9FE" };
  if (status === "draft") return { label: "Draft", color: "#475569", bg: "#F1F5F9" };
  return { label: "Sent", color: "#166534", bg: "#DCFCE7" };
}

type CardProps = {
  item: AppBroadcast;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
};
function BroadcastCard({ item, onPause, onResume, onDelete }: CardProps) {
  const category = CATEGORIES.find((entry) => entry.key === item.category) || CATEGORIES[0];
  const status = statusMeta(item.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.categoryIcon, { backgroundColor: category.bg }]}><Feather name={category.icon} size={18} color={category.color} /></View>
        <View style={styles.cardCopy}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardMeta}>{item.ward || "All wards"} · {item.audienceRole} · {item.language.toUpperCase()}</Text></View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      {item.mediaUri ? <ComplaintMediaViewer uri={item.mediaUri} title={item.title} label={item.mediaType === "video" ? "Broadcast video" : "Broadcast image"} accentColor={ORANGE} /> : null}
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{item.deliveredCount}</Text><Text style={styles.metricLabel}>Delivered</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{item.readCount}</Text><Text style={styles.metricLabel}>Read</Text></View>
        <View style={styles.metric}><Text style={[styles.metricValue, styles.providerValue]}>{item.externalPushStatus === "not_configured" ? "In-app" : item.externalPushStatus}</Text><Text style={styles.metricLabel}>Delivery</Text></View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{formatDate(item.status === "scheduled" ? item.scheduledAt : item.sentAt || item.createdAt)}</Text>
        <View style={styles.actionRow}>
          {item.status === "paused" ? (
            <TouchableOpacity style={[styles.actionButton, styles.resumeButton]} onPress={onResume}><Feather name="play" size={14} color="#166534" /><Text style={styles.resumeText}>Resume</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.pauseButton]} onPress={onPause}><Feather name="pause" size={14} color="#7C3AED" /><Text style={styles.pauseText}>Pause</Text></TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}><Feather name="trash-2" size={14} color="#DC2626" /><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function BroadcastCenterMediaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { broadcasts, loading, error, refreshBroadcasts, createBroadcast, pauseBroadcast, resumeBroadcast, deleteBroadcast } = useBroadcasts();
  const isSuperAdmin = user?.role === "super_admin" || !!user?.isSuperAdmin;
  const [composeVisible, setComposeVisible] = useState(false);
  const [wardPickerVisible, setWardPickerVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const [category, setCategory] = useState<AppBroadcast["category"]>("announcement");
  const [audienceRole, setAudienceRole] = useState<BroadcastAudience>("all");
  const [language, setLanguage] = useState<BroadcastLanguage>("en");
  const [ward, setWard] = useState("All Wards"); const [scheduledAt, setScheduledAt] = useState("");
  const [media, setMedia] = useState<BroadcastMediaUpload | null>(null); const [formError, setFormError] = useState("");
  const [pendingAction, setPendingAction] = useState<{ kind: "pause" | "resume" | "delete"; item: AppBroadcast } | null>(null);
  const [actionBusy, setActionBusy] = useState(false); const [actionError, setActionError] = useState("");

  useFocusEffect(useCallback(() => { void refreshBroadcasts().catch(() => undefined); }, [refreshBroadcasts]));
  const active = broadcasts;
  const stats = useMemo(() => ({
    sent: active.filter((item) => item.status === "sent").length,
    scheduled: active.filter((item) => item.status === "scheduled").length,
    paused: active.filter((item) => item.status === "paused").length,
    read: active.reduce((total, item) => total + item.readCount, 0),
  }), [active]);

  const resetForm = () => { setTitle(""); setBody(""); setCategory("announcement"); setAudienceRole("all"); setLanguage("en"); setWard("All Wards"); setScheduledAt(""); setMedia(null); setFormError(""); };
  const send = async () => {
    if (sending) return; setFormError("");
    if (title.trim().length < 3) return setFormError("Enter a clear broadcast title.");
    if (body.trim().length < 5) return setFormError("Enter a detailed message.");
    if (scheduledAt && Number.isNaN(new Date(scheduledAt).getTime())) return setFormError("Choose a valid future date and time.");
    setSending(true);
    try {
      await createBroadcast({ title: title.trim(), body: body.trim(), category, audienceRole: isSuperAdmin ? audienceRole : "citizen", language,
        ward: isSuperAdmin && ward === "All Wards" ? undefined : isSuperAdmin ? ward : user?.ward,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined, idempotencyKey: makeIdempotencyKey(), media });
      setComposeVisible(false); resetForm(); await refreshBroadcasts();
    } catch (requestError) { setFormError(getUserErrorMessage(requestError, "Broadcast could not be created. Please try again.")); }
    finally { setSending(false); }
  };

  const runPendingAction = async () => {
    if (!pendingAction || actionBusy) return;
    setActionBusy(true); setActionError("");
    try {
      if (pendingAction.kind === "pause") await pauseBroadcast(pendingAction.item.id);
      else if (pendingAction.kind === "resume") await resumeBroadcast(pendingAction.item.id);
      else await deleteBroadcast(pendingAction.item.id);
      setPendingAction(null);
    } catch (requestError) { setActionError(getUserErrorMessage(requestError, "The broadcast could not be changed.")); }
    finally { setActionBusy(false); }
  };
  const actionTitle = pendingAction?.kind === "delete" ? "Delete broadcast?" : pendingAction?.kind === "pause" ? "Pause broadcast?" : "Resume broadcast?";
  const actionMessage = pendingAction?.kind === "delete"
    ? `Delete “${pendingAction?.item.title || "this broadcast"}”? This permanently removes the broadcast and its delivery history.`
    : pendingAction?.kind === "pause"
      ? `Pause “${pendingAction?.item.title || "this broadcast"}”? Citizens will stop seeing it until you resume it.`
      : `Resume “${pendingAction?.item.title || "this broadcast"}”? It will become visible again according to its schedule.`;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 10 }]}>
        <View style={styles.headerRow}><TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace("/super-admin" as any)}><Feather name="chevron-left" size={20} color="white" /><Text style={styles.backText}>Back</Text></TouchableOpacity><TouchableOpacity style={styles.createButton} onPress={() => setComposeVisible(true)}><Feather name="plus" size={15} color="#166534" /><Text style={styles.createText}>Create</Text></TouchableOpacity></View>
        <Text style={styles.headerTitle}>Broadcast Center</Text>
        <View style={styles.statsRow}><Stat value={stats.sent} label="Sent" /><Stat value={stats.scheduled} label="Scheduled" /><Stat value={stats.paused} label="Paused" /><Stat value={stats.read} label="Read" /></View>
      </LinearGradient>
      {error ? <TouchableOpacity style={styles.errorBanner} onPress={() => void refreshBroadcasts().catch(() => undefined)}><Feather name="alert-triangle" size={15} color="#B45309" /><Text style={styles.errorText}>{error}</Text><Text style={styles.retryText}>Retry</Text></TouchableOpacity> : null}
      <AppScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 28 }]} onAppRefresh={() => refreshBroadcasts()}>
        {loading && !active.length ? <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /><Text style={styles.centerText}>Loading broadcasts...</Text></View> : null}
        {!loading && !active.length ? <View style={styles.empty}><Feather name="radio" size={34} color={GREEN} /><Text style={styles.emptyTitle}>No broadcasts yet</Text></View> : null}
        {active.map((item) => <BroadcastCard key={item.id} item={item} onPause={() => setPendingAction({ kind: "pause", item })} onResume={() => setPendingAction({ kind: "resume", item })} onDelete={() => setPendingAction({ kind: "delete", item })} />)}
      </AppScrollView>

      <ConfirmActionModal visible={!!pendingAction} title={actionTitle} message={actionMessage} confirmLabel={pendingAction?.kind === "delete" ? "Delete" : pendingAction?.kind === "pause" ? "Pause" : "Resume"} confirmIcon={pendingAction?.kind === "delete" ? "trash-2" : pendingAction?.kind === "pause" ? "pause" : "play"} tone={pendingAction?.kind === "delete" ? "danger" : "primary"} busy={actionBusy} errorMessage={actionError} onCancel={() => { if (!actionBusy) { setPendingAction(null); setActionError(""); } }} onConfirm={runPendingAction} />

      <Modal visible={composeVisible} transparent animationType="slide" onRequestClose={() => !sending && setComposeVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHeader}><View style={styles.sheetHeaderCopy}><Text style={styles.sheetTitle}>Create Broadcast</Text></View><TouchableOpacity style={styles.closeButton} onPress={() => setComposeVisible(false)} disabled={sending}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
            <AppScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
              <Label text="CATEGORY" /><View style={styles.choiceWrap}>{CATEGORIES.map((item) => <TouchableOpacity key={item.key} style={[styles.choice, category === item.key && { backgroundColor: item.bg, borderColor: item.color }]} onPress={() => setCategory(item.key)}><Feather name={item.icon} size={14} color={category === item.key ? item.color : "#64748B"} /><Text style={[styles.choiceText, category === item.key && { color: item.color }]}>{item.label}</Text></TouchableOpacity>)}</View>
              <Label text="TITLE *" /><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Clear public title" placeholderTextColor="#94A3B8" returnKeyType="next" />
              <Label text="MESSAGE *" /><TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={setBody} placeholder="Write the complete public message" placeholderTextColor="#94A3B8" multiline textAlignVertical="top" />
              <Label text="ATTACHMENT (OPTIONAL)" /><BroadcastMediaPicker value={media} onChange={setMedia} onError={setFormError} disabled={sending} />
              <Label text="CONTENT LANGUAGE" /><View style={styles.choiceWrap}>{LANGUAGES.map((item) => <TouchableOpacity key={item.key} style={[styles.choice, language === item.key && styles.choiceActive]} onPress={() => setLanguage(item.key)}><Text style={[styles.choiceText, language === item.key && styles.choiceTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
              {isSuperAdmin ? <><Label text="AUDIENCE" /><View style={styles.choiceWrap}>{AUDIENCES.map((item) => <TouchableOpacity key={item.key} style={[styles.choice, audienceRole === item.key && styles.choiceActive]} onPress={() => setAudienceRole(item.key)}><Text style={[styles.choiceText, audienceRole === item.key && styles.choiceTextActive]}>{item.label}</Text></TouchableOpacity>)}</View><Label text="WARD" /><TouchableOpacity style={[styles.input, styles.picker]} onPress={() => setWardPickerVisible(true)}><Text style={styles.pickerText}>{ward}</Text><Feather name="chevron-down" size={16} color="#64748B" /></TouchableOpacity></> : null}
              <Label text="SCHEDULE (OPTIONAL)" /><AppDateTimePicker value={scheduledAt} onChange={setScheduledAt} placeholder="Select date and time" minimumDate={new Date(Date.now() + 60_000)} accessibilityLabel="Schedule date and time" />
              {formError ? <Text style={styles.formError} accessibilityLiveRegion="assertive">{formError}</Text> : null}
              <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={send} disabled={sending}>{sending ? <ActivityIndicator color="white" /> : <Feather name={scheduledAt ? "clock" : "send"} size={17} color="white" />}<Text style={styles.sendText}>{sending ? (media ? "Uploading..." : "Saving...") : scheduledAt ? "Schedule broadcast" : "Send in-app broadcast"}</Text></TouchableOpacity>
            </AppScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={wardPickerVisible} transparent animationType="slide" onRequestClose={() => setWardPickerVisible(false)}><View style={styles.modalOverlay}><View style={[styles.sheet, styles.wardSheet]}><View style={styles.handle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Select Ward</Text><TouchableOpacity style={styles.closeButton} onPress={() => setWardPickerVisible(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><AppScrollView contentContainerStyle={styles.wardList}>{["All Wards", ...NAGARSEVAK_WARDS].map((item) => <TouchableOpacity key={item} style={[styles.wardRow, ward === item && styles.wardActive]} onPress={() => { setWard(item); setWardPickerVisible(false); }}><Text style={[styles.wardText, ward === item && styles.choiceTextActive]}>{item}</Text>{ward === item ? <Feather name="check" size={16} color={ORANGE} /> : null}</TouchableOpacity>)}</AppScrollView></View></View></Modal>
    </View>
  );
}
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function Stat({ value, label }: { value: number; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG }, header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 }, backText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" }, createButton: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 13, backgroundColor: "white", paddingHorizontal: 13 }, createText: { color: "#166534", fontSize: 12, fontFamily: "Inter_700Bold" },
  headerTitle: { color: "white", fontSize: 23, fontFamily: "Inter_700Bold" }, headerSub: { marginTop: 4, color: "rgba(255,255,255,0.75)", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" }, statsRow: { marginTop: 14, flexDirection: "row", gap: 7 }, stat: { flex: 1, alignItems: "center", borderRadius: 13, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.14)" }, statValue: { color: "white", fontSize: 17, fontFamily: "Inter_700Bold" }, statLabel: { marginTop: 1, color: "rgba(255,255,255,0.68)", fontSize: 8.8, fontFamily: "Inter_500Medium" },
  content: { padding: 14, gap: 11 }, infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 15, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" }, infoText: { flex: 1, color: "#1D4ED8", fontSize: 10.5, lineHeight: 16, fontFamily: "Inter_400Regular" }, errorBanner: { margin: 14, marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 13, padding: 11, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" }, errorText: { flex: 1, color: "#92400E", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_500Medium" }, retryText: { color: "#B45309", fontSize: 10.5, fontFamily: "Inter_700Bold" }, center: { padding: 34, alignItems: "center" }, centerText: { marginTop: 8, color: "#64748B", fontSize: 11.5, fontFamily: "Inter_500Medium" },
  empty: { padding: 30, alignItems: "center", borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, emptyTitle: { marginTop: 10, color: "#0F172A", fontSize: 16, fontFamily: "Inter_700Bold" }, emptyText: { marginTop: 5, color: "#64748B", fontSize: 11.5, textAlign: "center", fontFamily: "Inter_400Regular" },
  card: { padding: 14, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, cardTop: { flexDirection: "row", alignItems: "center", gap: 10 }, categoryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, cardCopy: { flex: 1, minWidth: 0 }, cardTitle: { color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" }, cardMeta: { marginTop: 2, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" }, statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }, statusText: { fontSize: 8.8, fontFamily: "Inter_700Bold" }, cardBody: { marginTop: 10, color: "#475569", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" }, cardImage: { marginTop: 10, width: "100%", height: 180, borderRadius: 14, backgroundColor: "#F1F5F9" },
  videoRow: { marginTop: 10, minHeight: 64, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 10 }, videoCopy: { flex: 1 }, videoTitle: { color: "#9A3412", fontSize: 11.5, fontFamily: "Inter_700Bold" }, videoMeta: { marginTop: 2, color: "#C2410C", fontSize: 9.5, fontFamily: "Inter_400Regular" }, metrics: { marginTop: 12, flexDirection: "row", gap: 6 }, metric: { flex: 1, minHeight: 52, borderRadius: 12, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" }, metricValue: { color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold" }, providerValue: { color: "#B45309", fontSize: 10.5 }, metricLabel: { marginTop: 2, color: "#94A3B8", fontSize: 8.2, fontFamily: "Inter_500Medium" },
  cardFooter: { marginTop: 10, gap: 8 }, cardDate: { color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" }, actionRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end" }, actionButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1 }, pauseButton: { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }, resumeButton: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }, deleteButton: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }, pauseText: { color: "#7C3AED", fontSize: 10.5, fontFamily: "Inter_700Bold" }, resumeText: { color: "#166534", fontSize: 10.5, fontFamily: "Inter_700Bold" }, deleteText: { color: "#DC2626", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.58)" }, sheet: { height: "94%", maxHeight: "94%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", overflow: "hidden" }, handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", marginTop: 10 }, sheetHeader: { minHeight: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }, sheetHeaderCopy: { flex: 1, minWidth: 0 }, sheetTitle: { color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" }, sheetSub: { marginTop: 2, color: "#64748B", fontSize: 10.5, fontFamily: "Inter_400Regular" }, closeButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" }, formScroll: { flex: 1 }, formContent: { padding: 18, paddingBottom: 38 }, label: { marginTop: 12, marginBottom: 6, color: "#64748B", fontSize: 9.8, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 14, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_400Regular" }, textArea: { minHeight: 110, paddingTop: 13, paddingBottom: 13 }, choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, choice: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }, choiceActive: { borderColor: "#FED7AA", backgroundColor: "#FFF7ED" }, choiceText: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_600SemiBold" }, choiceTextActive: { color: ORANGE }, picker: { flexDirection: "row", alignItems: "center" }, pickerText: { flex: 1, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_500Medium" }, scopeBanner: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 12, padding: 10, backgroundColor: "#DCFCE7" }, scopeText: { flex: 1, color: "#166534", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_500Medium" }, help: { marginTop: 5, color: "#94A3B8", fontSize: 9.8, lineHeight: 14, fontFamily: "Inter_400Regular" }, preview: { marginTop: 16, borderRadius: 16, padding: 13, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, previewLabel: { color: "#C2410C", fontSize: 9, letterSpacing: 1, fontFamily: "Inter_700Bold" }, previewTitle: { marginTop: 8, color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" }, previewBody: { marginTop: 7, color: "#475569", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" }, previewMeta: { marginTop: 8, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_500Medium" }, formError: { marginTop: 12, color: "#DC2626", fontSize: 11.5, lineHeight: 17, textAlign: "center", fontFamily: "Inter_600SemiBold" }, sendButton: { marginTop: 16, minHeight: 50, borderRadius: 14, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, sendText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" }, disabled: { opacity: 0.65 }, wardSheet: { maxHeight: "72%" }, wardList: { padding: 16 }, wardRow: { minHeight: 52, flexDirection: "row", alignItems: "center", borderRadius: 13, paddingHorizontal: 13, marginBottom: 6, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" }, wardActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }, wardText: { flex: 1, color: "#334155", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
