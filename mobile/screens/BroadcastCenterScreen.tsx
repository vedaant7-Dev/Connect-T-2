import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import {
  AppBroadcast,
  BroadcastAudience,
  BroadcastLanguage,
  useBroadcasts,
} from "@/context/BroadcastContext";
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
  { key: "all", label: "All users" },
  { key: "citizen", label: "Citizens" },
  { key: "nagarsevak", label: "Nagarsevaks" },
  { key: "seeker", label: "Job Seekers" },
  { key: "employer", label: "Employers" },
];

const LANGUAGES: Array<{ key: BroadcastLanguage; label: string }> = [
  { key: "en", label: "English" },
  { key: "mr", label: "मराठी" },
  { key: "hi", label: "हिंदी" },
];

function formatDate(value?: string) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function statusStyle(status: AppBroadcast["status"]) {
  if (status === "scheduled") return { color: "#B45309", bg: "#FEF3C7", label: "Scheduled" };
  if (status === "draft") return { color: "#475569", bg: "#F1F5F9", label: "Draft" };
  if (status === "archived") return { color: "#64748B", bg: "#E2E8F0", label: "Archived" };
  return { color: "#166534", bg: "#DCFCE7", label: "Sent in app" };
}

function makeIdempotencyKey() {
  return `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

function BroadcastCard({ item, onArchive }: { item: AppBroadcast; onArchive: () => void }) {
  const category = CATEGORIES.find((entry) => entry.key === item.category) || CATEGORIES[0];
  const status = statusStyle(item.status);
  return (
    <View style={styles.broadcastCard}>
      <View style={styles.cardTop}>
        <View style={[styles.categoryIcon, { backgroundColor: category.bg }]}><Feather name={category.icon} size={18} color={category.color} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>{item.ward || "All wards"} · {item.audienceRole} · {item.language.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
      </View>
      <Text style={styles.cardBody} numberOfLines={4}>{item.body}</Text>
      <View style={styles.deliveryGrid}>
        <View style={styles.deliveryStat}><Text style={styles.deliveryValue}>{item.deliveredCount}</Text><Text style={styles.deliveryLabel}>In-app delivered</Text></View>
        <View style={styles.deliveryStat}><Text style={styles.deliveryValue}>{item.readCount}</Text><Text style={styles.deliveryLabel}>Read</Text></View>
        <View style={styles.deliveryStat}><Text style={[styles.deliveryValue, { color: "#B45309", fontSize: 11 }]}>{item.externalPushStatus === "not_configured" ? "Not configured" : item.externalPushStatus}</Text><Text style={styles.deliveryLabel}>External push</Text></View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{item.status === "scheduled" ? formatDate(item.scheduledAt) : formatDate(item.sentAt || item.createdAt)}</Text>
        <TouchableOpacity style={styles.archiveAction} onPress={onArchive} accessibilityLabel={`Archive ${item.title}`}><Feather name="archive" size={14} color="#64748B" /><Text style={styles.archiveText}>Archive</Text></TouchableOpacity>
      </View>
      {item.externalPushMessage ? <View style={styles.providerNotice}><Feather name="info" size={13} color="#B45309" /><Text style={styles.providerNoticeText}>{item.externalPushMessage}</Text></View> : null}
    </View>
  );
}

export default function BroadcastCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { broadcasts, loading, error, refreshBroadcasts, createBroadcast, archiveBroadcast } = useBroadcasts();
  const isSuperAdmin = user?.role === "super_admin" || !!user?.isSuperAdmin;

  const [composeVisible, setComposeVisible] = useState(false);
  const [wardPicker, setWardPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<AppBroadcast["category"]>("announcement");
  const [audienceRole, setAudienceRole] = useState<BroadcastAudience>("all");
  const [language, setLanguage] = useState<BroadcastLanguage>("en");
  const [ward, setWard] = useState("All Wards");
  const [scheduledAt, setScheduledAt] = useState("");
  const [formError, setFormError] = useState("");

  useFocusEffect(useCallback(() => {
    void refreshBroadcasts().catch(() => undefined);
  }, [refreshBroadcasts]));

  const active = useMemo(() => broadcasts.filter((item) => item.status !== "archived"), [broadcasts]);
  const stats = useMemo(() => ({
    sent: active.filter((item) => item.status === "sent").length,
    scheduled: active.filter((item) => item.status === "scheduled").length,
    delivered: active.reduce((total, item) => total + item.deliveredCount, 0),
    read: active.reduce((total, item) => total + item.readCount, 0),
  }), [active]);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setCategory("announcement");
    setAudienceRole("all");
    setLanguage("en");
    setWard("All Wards");
    setScheduledAt("");
    setFormError("");
  };

  const send = async () => {
    if (sending) return;
    setFormError("");
    if (title.trim().length < 3) return setFormError("Enter a clear broadcast title.");
    if (body.trim().length < 5) return setFormError("Enter a detailed message.");
    if (scheduledAt && Number.isNaN(new Date(scheduledAt).getTime())) return setFormError("Enter a valid schedule, for example 2026-08-15 10:30.");
    setSending(true);
    try {
      await createBroadcast({
        title: title.trim(),
        body: body.trim(),
        category,
        audienceRole: isSuperAdmin ? audienceRole : "citizen",
        language,
        ward: isSuperAdmin && ward === "All Wards" ? undefined : isSuperAdmin ? ward : user?.ward,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        idempotencyKey: makeIdempotencyKey(),
      });
      setComposeVisible(false);
      resetForm();
      await refreshBroadcasts();
    } catch (requestError) {
      setFormError(getUserErrorMessage(requestError, "Broadcast could not be created. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const confirmArchive = (item: AppBroadcast) => Alert.alert(
    "Archive broadcast?",
    `Archive “${item.title}”? It will stop appearing in active citizen updates, but delivery history will be preserved.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: () => void archiveBroadcast(item.id).catch((requestError) => Alert.alert("Could not archive", getUserErrorMessage(requestError))) },
    ],
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace("/super-admin" as any)}><Feather name="chevron-left" size={20} color="white" /><Text style={styles.backText}>Back</Text></TouchableOpacity>
          <TouchableOpacity style={styles.composeButton} onPress={() => setComposeVisible(true)}><Feather name="plus" size={15} color="#166534" /><Text style={styles.composeText}>Create</Text></TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Broadcast Center</Text>
        <Text style={styles.headerSub}>Auditable in-app delivery. External push is reported separately and never marked successful unless configured.</Text>
        <View style={styles.statsRow}>
          <Stat value={stats.sent} label="Sent" />
          <Stat value={stats.scheduled} label="Scheduled" />
          <Stat value={stats.delivered} label="Delivered" />
          <Stat value={stats.read} label="Read" />
        </View>
      </LinearGradient>

      {error ? <TouchableOpacity style={styles.errorBanner} onPress={() => void refreshBroadcasts().catch(() => undefined)}><Feather name="wifi-off" size={15} color="#B45309" /><Text style={styles.errorText}>{error}</Text><Text style={styles.retryText}>Retry</Text></TouchableOpacity> : null}

      <AppScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 30 }]} refreshControl={undefined}>
        <View style={styles.infoBanner}><Feather name="smartphone" size={17} color="#2563EB" /><View style={{ flex: 1 }}><Text style={styles.infoTitle}>In-app notifications are active</Text><Text style={styles.infoText}>Push notifications require device-token registration and an external provider. Until configured, the app displays “Not configured” instead of fake delivery.</Text></View></View>
        {loading && !active.length ? <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /><Text style={styles.centerText}>Loading broadcasts...</Text></View> : null}
        {!loading && !active.length ? <View style={styles.empty}><View style={styles.emptyIcon}><Feather name="radio" size={30} color={GREEN} /></View><Text style={styles.emptyTitle}>No broadcasts yet</Text><Text style={styles.emptyText}>Create an immediate or scheduled in-app broadcast for a selected audience.</Text><TouchableOpacity style={styles.emptyButton} onPress={() => setComposeVisible(true)}><Text style={styles.emptyButtonText}>Create broadcast</Text></TouchableOpacity></View> : null}
        {active.map((item) => <BroadcastCard key={item.id} item={item} onArchive={() => confirmArchive(item)} />)}
      </AppScrollView>

      <Modal visible={composeVisible} transparent animationType="slide" onRequestClose={() => !sending && setComposeVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}><View style={{ flex: 1 }}><Text style={styles.sheetTitle}>Create Broadcast</Text><Text style={styles.sheetSub}>Preview and verify audience before sending</Text></View><TouchableOpacity style={styles.closeButton} onPress={() => setComposeVisible(false)} disabled={sending}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
            <AppScrollView contentContainerStyle={styles.formContent} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>CATEGORY</Text>
              <View style={styles.choiceWrap}>{CATEGORIES.map((item) => <TouchableOpacity key={item.key} style={[styles.choice, category === item.key && { backgroundColor: item.bg, borderColor: item.color }]} onPress={() => setCategory(item.key)}><Feather name={item.icon} size={14} color={category === item.key ? item.color : "#64748B"} /><Text style={[styles.choiceText, category === item.key && { color: item.color }]}>{item.label}</Text></TouchableOpacity>)}</View>

              <Text style={styles.label}>TITLE *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Clear public title" placeholderTextColor="#94A3B8" returnKeyType="next" />
              <Text style={styles.label}>MESSAGE *</Text>
              <TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={setBody} placeholder="Write the complete public message" placeholderTextColor="#94A3B8" multiline textAlignVertical="top" />

              <Text style={styles.label}>CONTENT LANGUAGE</Text>
              <View style={styles.choiceWrap}>{LANGUAGES.map((item) => <TouchableOpacity key={item.key} style={[styles.choice, language === item.key && styles.choiceActive]} onPress={() => setLanguage(item.key)}><Text style={[styles.choiceText, language === item.key && styles.choiceTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>

              {isSuperAdmin ? <><Text style={styles.label}>AUDIENCE</Text><View style={styles.choiceWrap}>{AUDIENCES.map((item) => <TouchableOpacity key={item.key} style={[styles.choice, audienceRole === item.key && styles.choiceActive]} onPress={() => setAudienceRole(item.key)}><Text style={[styles.choiceText, audienceRole === item.key && styles.choiceTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
              <Text style={styles.label}>WARD</Text><TouchableOpacity style={[styles.input, styles.picker]} onPress={() => setWardPicker(true)}><Text style={styles.pickerText}>{ward}</Text><Feather name="chevron-down" size={16} color="#64748B" /></TouchableOpacity></> : <View style={styles.scopeBanner}><Feather name="shield" size={14} color="#166534" /><Text style={styles.scopeText}>Nagarsevak broadcasts are restricted to citizens in {user?.ward || "the assigned ward"}.</Text></View>}

              <Text style={styles.label}>SCHEDULE (OPTIONAL)</Text>
              <TextInput style={styles.input} value={scheduledAt} onChangeText={setScheduledAt} placeholder="YYYY-MM-DD HH:mm" placeholderTextColor="#94A3B8" autoCapitalize="none" />
              <Text style={styles.help}>Leave blank to send in-app immediately. Scheduled broadcasts activate when the server next processes broadcast delivery.</Text>

              <View style={styles.preview}><Text style={styles.previewLabel}>PREVIEW</Text><View style={styles.previewTop}><Feather name={CATEGORIES.find((item) => item.key === category)?.icon || "radio"} size={17} color={ORANGE} /><Text style={styles.previewTitle}>{title.trim() || "Broadcast title"}</Text></View><Text style={styles.previewBody}>{body.trim() || "Your message preview will appear here."}</Text><Text style={styles.previewMeta}>{ward} · {audienceRole} · {language.toUpperCase()}</Text></View>

              {formError ? <Text style={styles.formError} accessibilityLiveRegion="assertive">{formError}</Text> : null}
              <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={send} disabled={sending}>{sending ? <ActivityIndicator color="white" /> : <Feather name={scheduledAt ? "clock" : "send"} size={17} color="white" />}<Text style={styles.sendText}>{sending ? "Saving..." : scheduledAt ? "Schedule broadcast" : "Send in-app broadcast"}</Text></TouchableOpacity>
            </AppScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={wardPicker} transparent animationType="slide" onRequestClose={() => setWardPicker(false)}>
        <View style={styles.modalOverlay}><View style={[styles.sheet, { maxHeight: "72%" }]}><View style={styles.handle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Select Ward</Text><TouchableOpacity style={styles.closeButton} onPress={() => setWardPicker(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><AppScrollView contentContainerStyle={{ padding: 16 }}>{["All Wards", ...NAGARSEVAK_WARDS].map((item) => <TouchableOpacity key={item} style={[styles.wardRow, ward === item && styles.wardActive]} onPress={() => { setWard(item); setWardPicker(false); }}><Text style={[styles.wardText, ward === item && styles.choiceTextActive]}>{item}</Text>{ward === item ? <Feather name="check" size={16} color={ORANGE} /> : null}</TouchableOpacity>)}</AppScrollView></View></View>
      </Modal>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  composeButton: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 13, backgroundColor: "white", paddingHorizontal: 13 },
  composeText: { color: "#166534", fontSize: 12, fontFamily: "Inter_700Bold" },
  headerTitle: { color: "white", fontSize: 23, fontFamily: "Inter_700Bold" },
  headerSub: { marginTop: 4, color: "rgba(255,255,255,0.75)", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" },
  statsRow: { marginTop: 14, flexDirection: "row", gap: 7 },
  stat: { flex: 1, alignItems: "center", borderRadius: 13, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.14)" },
  statValue: { color: "white", fontSize: 17, fontFamily: "Inter_700Bold" },
  statLabel: { marginTop: 1, color: "rgba(255,255,255,0.68)", fontSize: 8.8, fontFamily: "Inter_500Medium" },
  errorBanner: { margin: 14, marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 13, padding: 11, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  errorText: { flex: 1, color: "#92400E", fontSize: 10.5, fontFamily: "Inter_500Medium" },
  retryText: { color: "#B45309", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  content: { padding: 14, gap: 11 },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 13, borderRadius: 16, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" },
  infoTitle: { color: "#1E3A8A", fontSize: 12, fontFamily: "Inter_700Bold" },
  infoText: { marginTop: 3, color: "#1D4ED8", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" },
  center: { padding: 34, alignItems: "center" },
  centerText: { marginTop: 8, color: "#64748B", fontSize: 11.5, fontFamily: "Inter_500Medium" },
  empty: { padding: 28, borderRadius: 20, alignItems: "center", backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  emptyIcon: { width: 62, height: 62, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#DCFCE7" },
  emptyTitle: { marginTop: 11, color: "#0F172A", fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { marginTop: 5, color: "#64748B", fontSize: 11.5, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular" },
  emptyButton: { marginTop: 14, minHeight: 44, borderRadius: 13, backgroundColor: GREEN, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  emptyButtonText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  broadcastCard: { padding: 14, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" },
  cardMeta: { marginTop: 2, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 8.8, fontFamily: "Inter_700Bold" },
  cardBody: { marginTop: 10, color: "#475569", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" },
  deliveryGrid: { marginTop: 12, flexDirection: "row", gap: 6 },
  deliveryStat: { flex: 1, minHeight: 52, borderRadius: 12, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", padding: 5 },
  deliveryValue: { color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold" },
  deliveryLabel: { marginTop: 2, color: "#94A3B8", fontSize: 8.2, textAlign: "center", fontFamily: "Inter_500Medium" },
  cardFooter: { marginTop: 11, flexDirection: "row", alignItems: "center" },
  cardDate: { flex: 1, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" },
  archiveAction: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9 },
  archiveText: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_600SemiBold" },
  providerNotice: { marginTop: 9, flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 8, borderRadius: 10, backgroundColor: "#FFFBEB" },
  providerNoticeText: { flex: 1, color: "#92400E", fontSize: 9.5, lineHeight: 14, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.58)" },
  sheet: { maxHeight: "94%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", overflow: "hidden" },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", marginTop: 10 },
  sheetHeader: { minHeight: 62, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  sheetTitle: { color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetSub: { marginTop: 2, color: "#64748B", fontSize: 10.5, fontFamily: "Inter_400Regular" },
  closeButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  formContent: { padding: 18, paddingBottom: 38 },
  label: { marginTop: 12, marginBottom: 6, color: "#64748B", fontSize: 9.8, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 14, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 110, paddingTop: 13, paddingBottom: 13 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  choiceActive: { borderColor: "#FED7AA", backgroundColor: "#FFF7ED" },
  choiceText: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_600SemiBold" },
  choiceTextActive: { color: ORANGE },
  picker: { flexDirection: "row", alignItems: "center" },
  pickerText: { flex: 1, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_500Medium" },
  help: { marginTop: 5, color: "#94A3B8", fontSize: 9.8, lineHeight: 14, fontFamily: "Inter_400Regular" },
  scopeBanner: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 12, padding: 10, backgroundColor: "#DCFCE7" },
  scopeText: { flex: 1, color: "#166534", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_500Medium" },
  preview: { marginTop: 16, borderRadius: 16, padding: 13, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  previewLabel: { color: "#C2410C", fontSize: 9, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  previewTop: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  previewTitle: { flex: 1, color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" },
  previewBody: { marginTop: 7, color: "#475569", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" },
  previewMeta: { marginTop: 8, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_500Medium" },
  formError: { marginTop: 12, color: "#DC2626", fontSize: 11.5, lineHeight: 17, textAlign: "center", fontFamily: "Inter_600SemiBold" },
  sendButton: { marginTop: 16, minHeight: 50, borderRadius: 14, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  sendText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  disabled: { opacity: 0.65 },
  wardRow: { minHeight: 52, flexDirection: "row", alignItems: "center", borderRadius: 13, paddingHorizontal: 13, marginBottom: 6, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  wardActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  wardText: { flex: 1, color: "#334155", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
