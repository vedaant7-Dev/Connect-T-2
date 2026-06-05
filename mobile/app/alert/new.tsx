import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { AlertMedia, AlertPriority, AlertType, useAlerts } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";

const MAX_VIDEO_MS = 120000;
const ALERT_ACTIVE_MS = 12 * 60 * 60 * 1000;
const GREEN = "#16A34A";
const ORANGE = "#16A34A";
const categories = ["Civic", "Water", "Electricity", "Road", "Health", "Event"];
const audiences = ["Ward residents", "All citizens"];

type NoticeTone = "info" | "success" | "danger";

function AppNotice({ visible, title, message, tone = "info", onClose }: { visible: boolean; title: string; message: string; tone?: NoticeTone; onClose: () => void }) {
  const color = tone === "success" ? GREEN : tone === "danger" ? "#DC2626" : ORANGE;
  const bg = tone === "success" ? "#DCFCE7" : tone === "danger" ? "#FEE2E2" : "#FFF7ED";
  const icon = tone === "success" ? "check-circle" : tone === "danger" ? "alert-circle" : "info";
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.noticeOverlay}><View style={styles.noticeModal}><View style={[styles.noticeIcon, { backgroundColor: bg }]}><Feather name={icon as any} size={27} color={color} /></View><Text style={styles.noticeTitle}>{title}</Text><Text style={styles.noticeMsg}>{message}</Text><TouchableOpacity style={[styles.noticeOk, { backgroundColor: color }]} onPress={onClose} activeOpacity={0.85}><Text style={styles.noticeOkText}>OK</Text></TouchableOpacity></View></View></Modal>;
}

function DropdownSelect({ label, value, options, open, onToggle, onSelect }: { label: string; value: string; options: string[]; open: boolean; onToggle: () => void; onSelect: (value: string) => void }) {
  return <View style={styles.dropdownBlock}><Text style={styles.label}>{label}</Text><TouchableOpacity style={[styles.dropdownBtn, open && styles.dropdownBtnOpen]} onPress={onToggle} activeOpacity={0.85}><Text style={styles.dropdownValue}>{value}</Text><Feather name={open ? "chevron-up" : "chevron-down"} size={18} color="#64748B" /></TouchableOpacity>{open && <View style={styles.dropdownMenu}>{options.map((item) => { const active = value === item; return <TouchableOpacity key={item} style={[styles.dropdownOption, active && styles.dropdownOptionActive]} onPress={() => onSelect(item)} activeOpacity={0.85}><Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{item}</Text>{active && <Feather name="check" size={15} color={ORANGE} />}</TouchableOpacity>; })}</View>}</View>;
}

function formatValidUntil(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function NewAlertScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 54 : insets.top;
  const { addAlert } = useAlerts();
  const { user } = useAuth();
  const [type, setType] = useState<AlertType>("alert");
  const [priority, setPriority] = useState<AlertPriority>("important");
  const [category, setCategory] = useState("Civic");
  const [targetAudience, setTargetAudience] = useState("Ward residents");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState(user?.ward || "");
  const [contact, setContact] = useState("");
  const [media, setMedia] = useState<AlertMedia | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [validTo, setValidTo] = useState(new Date(Date.now() + ALERT_ACTIVE_MS).toISOString().split("T")[0]);
  const [notice, setNotice] = useState({ visible: false, title: "", message: "", tone: "info" as NoticeTone });

  const expiresAt = new Date(`${validTo}T23:59:59`).toISOString();
  const validUntilLabel = formatValidUntil(expiresAt);
  const canSubmit = title.trim().length > 0 && body.trim().length > 0;
  const showNotice = (noticeTitle: string, message: string, tone: NoticeTone = "info") => setNotice({ visible: true, title: noticeTitle, message, tone });
  const goBack = () => { if (router.canGoBack?.()) router.back(); else router.replace("/(tabs)/feed" as any); };

  const pickMedia = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return showNotice("Permission required", "Allow photo library access to attach a photo or video.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: false, quality: 0.85, videoMaxDuration: 120 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const selectedType = asset.type === "video" ? "video" : "image";
    if (selectedType === "video" && typeof asset.duration === "number" && asset.duration > MAX_VIDEO_MS) return showNotice("Video too long", "Please select a video of 2 minutes or less.", "danger");
    setMedia({ uri: asset.uri, type: selectedType, fileName: asset.fileName || undefined, mimeType: asset.mimeType || undefined, duration: asset.duration || undefined });
  };

  const submit = async () => {
    if (!canSubmit) return showNotice("Details required", "Please enter title and detailed message.");

    try {
      await addAlert({ title: title.trim(), body: contact.trim() ? `${body.trim()}\n\nContact: ${contact.trim()}` : body.trim(), type, priority, category, targetAudience, location: location.trim(), validUntil: validUntilLabel, expiresAt, media }, user?.name || "Nagarsevak", user?.id, targetAudience === "Ward residents" ? user?.ward : undefined);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showNotice("Broadcast posted", "Your alert/news update has been saved to MySQL and published successfully.", "success");
    } catch (error: any) {
      showNotice("Post failed", error?.message || "Could not save this alert/news to MySQL.", "danger");
    }
  };

  const closeNotice = () => {
    const wasSuccess = notice.title === "Broadcast posted";
    setNotice((prev) => ({ ...prev, visible: false }));
    if (wasSuccess) goBack();
  };

  return <View style={styles.root}><LinearGradient colors={["#166534", GREEN, "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 10 }]}><View style={styles.headerRow}><TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.85}><Feather name="chevron-left" size={20} color="white" /><Text style={styles.backText}>Back</Text></TouchableOpacity><View style={styles.headerPill}><Feather name="radio" size={12} color="#DCFCE7" /><Text style={styles.headerPillText}>Broadcast</Text></View></View><Text style={styles.headerTitle}>Post Alert / News</Text><Text style={styles.headerSub}>Create a detailed public update with photo or video attachment.</Text></LinearGradient><KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}><ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 120 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View style={styles.card}><Text style={styles.sectionTitle}>Type</Text><View style={styles.segmentRow}>{(["alert", "news"] as AlertType[]).map((item) => { const active = type === item; const color = item === "alert" ? "#DC2626" : ORANGE; return <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.segmentBtn, active && { borderColor: color, backgroundColor: color + "12" }]} activeOpacity={0.85}><Feather name={item === "alert" ? "alert-triangle" : "radio"} size={16} color={active ? color : "#94A3B8"} /><Text style={[styles.segmentText, active && { color }]}>{item === "alert" ? "Alert" : "News"}</Text></TouchableOpacity>; })}</View><Text style={styles.label}>Priority</Text><View style={styles.chipRow}>{(["normal", "important", "urgent"] as AlertPriority[]).map((item) => <TouchableOpacity key={item} onPress={() => setPriority(item)} style={[styles.chip, priority === item && styles.chipActive]} activeOpacity={0.85}><Text style={[styles.chipText, priority === item && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}</View></View><View style={styles.card}><Text style={styles.sectionTitle}>Details</Text><Text style={styles.label}>Title</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Water supply cut tomorrow" placeholderTextColor="#CBD5E1" maxLength={100} /><Text style={styles.label}>Detailed message</Text><TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={setBody} placeholder="Explain what happened, affected area, timing, and citizen instructions..." placeholderTextColor="#CBD5E1" multiline textAlignVertical="top" maxLength={900} /><View style={styles.twoCol}><View style={styles.half}><Text style={styles.label}>Area / Ward</Text><TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Ward or area" placeholderTextColor="#CBD5E1" maxLength={80} /></View><View style={styles.half}><Text style={styles.label}>Valid From</Text><TextInput style={styles.input} value={validFrom} onChangeText={setValidFrom} placeholder="YYYY-MM-DD" placeholderTextColor="#CBD5E1" /></View><View style={styles.half}><Text style={styles.label}>Valid To</Text><TextInput style={styles.input} value={validTo} onChangeText={setValidTo} placeholder="YYYY-MM-DD" placeholderTextColor="#CBD5E1" /></View></View><View style={styles.readOnlyBox}><Feather name="clock" size={14} color={ORANGE} /><View style={{ flex: 1 }}><Text style={styles.readOnlyValue}>{validUntilLabel}</Text><Text style={styles.readOnlyHint}>Post valid until this time</Text></View></View><Text style={styles.label}>Helpline / contact optional</Text><TextInput style={styles.input} value={contact} onChangeText={setContact} placeholder="Phone number or office contact" placeholderTextColor="#CBD5E1" keyboardType="phone-pad" maxLength={60} /></View><View style={styles.card}><Text style={styles.sectionTitle}>Category & audience</Text><DropdownSelect label="Category" value={category} options={categories} open={categoryOpen} onToggle={() => { setCategoryOpen((prev) => !prev); setAudienceOpen(false); }} onSelect={(item) => { setCategory(item); setCategoryOpen(false); }} /><DropdownSelect label="Audience" value={targetAudience} options={audiences} open={audienceOpen} onToggle={() => { setAudienceOpen((prev) => !prev); setCategoryOpen(false); }} onSelect={(item) => { setTargetAudience(item); setAudienceOpen(false); }} /></View><View style={styles.card}><Text style={styles.sectionTitle}>Photo / Video</Text><Text style={styles.helperText}>Attach one photo or one video. Videos must be 2 minutes or less.</Text>{media ? <View style={styles.mediaPreview}>{media.type === "image" ? <Image source={{ uri: media.uri }} style={styles.mediaImage} /> : <View style={styles.videoPreview}><Feather name="play-circle" size={42} color={ORANGE} /><Text style={styles.videoPreviewText}>Video selected · max 2 minutes</Text></View>}<TouchableOpacity style={styles.removeMediaBtn} onPress={() => setMedia(null)} activeOpacity={0.85}><Feather name="x" size={14} color="#DC2626" /><Text style={styles.removeMediaText}>Remove</Text></TouchableOpacity></View> : <TouchableOpacity style={styles.uploadBox} onPress={pickMedia} activeOpacity={0.85}><View style={styles.uploadIcon}><Feather name="upload-cloud" size={24} color={ORANGE} /></View><Text style={styles.uploadTitle}>Add photo or video</Text><Text style={styles.uploadSub}>Photo JPG/PNG or video up to 2 minutes</Text></TouchableOpacity>}</View><View style={styles.actionRow}><TouchableOpacity style={styles.cancelBtn} onPress={goBack} activeOpacity={0.85}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.submitBtn, !canSubmit && { opacity: 0.45 }]} onPress={submit} disabled={!canSubmit} activeOpacity={0.9}><LinearGradient colors={["#166534", GREEN]} style={styles.submitGrad}><Feather name="send" size={16} color="white" /><Text style={styles.submitText}>Broadcast</Text></LinearGradient></TouchableOpacity></View></ScrollView></KeyboardAvoidingView><AppNotice visible={notice.visible} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingRight: 10 },
  backText: { fontSize: 14, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" },
  headerPillText: { color: "white", fontSize: 11, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 22, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" },
  headerSub: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", lineHeight: 17 },
  keyboardArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 13 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: "rgba(226,232,240,0.95)", shadowColor: "#166534", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionTitle: { fontSize: 15, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" },
  label: { fontSize: 11.5, color: "#334155", fontFamily: "Inter_700Bold", marginTop: 3 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 13, paddingVertical: 10, color: "#0F172A", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  textArea: { minHeight: 110 },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  half: { flexBasis: "47%", flexGrow: 1 },
  segmentRow: { flexDirection: "row", gap: 9 },
  segmentBtn: { flex: 1, minHeight: 46, borderRadius: 15, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  segmentText: { fontSize: 12, color: "#64748B", fontFamily: "Inter_700Bold" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  chipText: { fontSize: 11.5, color: "#64748B", fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  chipTextActive: { color: ORANGE },
  readOnlyBox: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FFF7ED", borderRadius: 14, padding: 11, borderWidth: 1, borderColor: "#FED7AA" },
  readOnlyValue: { fontSize: 12, color: ORANGE, fontFamily: "Inter_700Bold" },
  readOnlyHint: { fontSize: 10.5, color: "#92400E", fontFamily: "Inter_400Regular", marginTop: 1 },
  dropdownBlock: { gap: 7 },
  dropdownBtn: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownBtnOpen: { borderColor: "#FED7AA", backgroundColor: "#FFF7ED" },
  dropdownValue: { fontSize: 13, color: "#0F172A", fontFamily: "Inter_700Bold" },
  dropdownMenu: { borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  dropdownOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 11, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  dropdownOptionActive: { backgroundColor: "#FFF7ED" },
  dropdownOptionText: { fontSize: 12.5, color: "#475569", fontFamily: "Inter_600SemiBold" },
  dropdownOptionTextActive: { color: ORANGE, fontFamily: "Inter_700Bold" },
  helperText: { fontSize: 11.5, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 17 },
  uploadBox: { borderRadius: 18, borderWidth: 1.5, borderColor: "#FED7AA", borderStyle: "dashed", backgroundColor: "#FFF7ED", alignItems: "center", padding: 22, gap: 7 },
  uploadIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  uploadTitle: { fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold" },
  uploadSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center" },
  mediaPreview: { gap: 9 },
  mediaImage: { width: "100%", height: 190, borderRadius: 16, backgroundColor: "#F1F5F9" },
  videoPreview: { height: 150, borderRadius: 16, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", gap: 8 },
  videoPreviewText: { color: ORANGE, fontSize: 12, fontFamily: "Inter_700Bold" },
  removeMediaBtn: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  removeMediaText: { color: "#DC2626", fontSize: 11, fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, minHeight: 50, borderRadius: 16, backgroundColor: "white", borderWidth: 1.5, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_700Bold" },
  submitBtn: { flex: 2, borderRadius: 16, overflow: "hidden" },
  submitGrad: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitText: { fontSize: 13, color: "white", fontFamily: "Inter_700Bold" },
  noticeOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", padding: 22 },
  noticeModal: { width: "100%", maxWidth: 340, backgroundColor: "white", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  noticeIcon: { width: 58, height: 58, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  noticeTitle: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" },
  noticeMsg: { marginTop: 6, fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  noticeOk: { marginTop: 18, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, alignItems: "center" },
  noticeOkText: { fontSize: 13, color: "white", fontFamily: "Inter_700Bold" },
});
