import React, { useEffect, useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobs } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

type ChatMessage = { id?: string; from: string; to?: string; text: string; createdAt: string; readAt?: string | null; localImageUri?: string; mediaUrl?: string | null; messageType?: string };

function timeLabel(value?: string) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function cleanPhone(value?: string) { return String(value || "").replace(/\D/g, "").slice(-10); }
function goBack(router: any) { if (router.canGoBack?.()) router.back(); else router.replace("/jobs/(tabs)" as any); }
function normalizeMessage(raw: any): ChatMessage { return { id: String(raw.id || ""), from: String(raw.sender_id || raw.senderId || raw.from || ""), to: raw.receiver_id || raw.receiverId || raw.to, text: String(raw.message || raw.text || ""), createdAt: raw.created_at || raw.createdAt || new Date().toISOString(), readAt: raw.read_at || raw.readAt || null, mediaUrl: raw.media_url || raw.mediaUrl || null, messageType: raw.message_type || raw.messageType || "text" }; }

function AppNotice({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.noticeOverlay}><View style={s.noticeCard}><View style={s.noticeIcon}><Feather name="info" size={24} color={ORANGE} /></View><Text style={s.noticeTitle}>{title}</Text><Text style={s.noticeMsg}>{message}</Text><TouchableOpacity style={s.noticeOk} onPress={onClose}><Text style={s.noticeOkText}>OK</Text></TouchableOpacity></View></View></Modal>;
}

export default function JobChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ employerId?: string; jobId?: string; peerName?: string }>();
  const { jobs } = useJobs() as any;
  const { jobsUser } = useJobsAuth();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const [notice, setNotice] = useState({ visible: false, title: "", message: "" });
  const peerId = String(params.employerId || "");
  const currentUserId = jobsUser?.id || "visitor";

  const job = useMemo(() => {
    if (params.jobId) {
      const byId = jobs.find((item: any) => item.id === params.jobId);
      if (byId) return byId;
    }
    if (!jobsUser) return jobs.find((item: any) => item.employerId === peerId) || null;
    if (jobsUser.role === "employer") return jobs.find((item: any) => item.employerId === jobsUser.id && item.applicants?.includes(peerId)) || null;
    return jobs.find((item: any) => item.employerId === peerId) || null;
  }, [jobs, jobsUser, params.jobId, peerId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!job?.id || !peerId || !currentUserId || currentUserId === "visitor") return;
      try {
        const query = new URLSearchParams({ userId: currentUserId, peerId, jobId: job.id }).toString();
        const res = await apiGet<{ success: boolean; messages: any[] }>(`/api/job-portal/messages?${query}`);
        if (mounted) setMessages((res.messages || []).map(normalizeMessage));
      } catch {
        if (mounted) setMessages((job?.messages || []).map(normalizeMessage));
      }
    };
    load();
    return () => { mounted = false; };
  }, [job?.id, peerId, currentUserId]);

  const visibleMessages = useMemo(() => {
    const all = messages.length ? messages : (job?.messages || []).map(normalizeMessage);
    if (!peerId) return all;
    return all.filter((message: any) => {
      const from = String(message.from || "");
      const to = String(message.to || "");
      if (!to) return from === currentUserId || from === peerId;
      return (from === currentUserId && to === peerId) || (from === peerId && to === currentUserId);
    });
  }, [messages, job?.messages, peerId, currentUserId]);

  const peerName = String(params.peerName || "").trim() || (jobsUser?.role === "employer" ? `Applicant ${peerId.slice(-4)}` : job?.employerName || "Employer");
  const peerContact = jobsUser?.role === "employer" ? job?.applications?.find((app: any) => app.seekerId === peerId)?.seekerPhone : job?.employerWhatsApp || job?.employerPhone;
  const topPad = (Platform.OS === "web" ? 54 : insets.top) + 14;
  const show = (title: string, message: string) => setNotice({ visible: true, title, message });

  const postMessage = async (bodyText: string, localImageUri?: string) => {
    const message = bodyText.trim();
    if (!message && !localImageUri) return;
    if (!job || !peerId) { show("No chat found", "Open this chat again from the job or applicant screen."); return; }
    const temp: ChatMessage = { id: `local_${Date.now()}`, from: currentUserId, to: peerId, text: message || "Photo", createdAt: new Date().toISOString(), localImageUri, mediaUrl: localImageUri || null, messageType: localImageUri ? "image" : "text" };
    setMessages((prev) => [...prev, temp]);
    setText("");
    try {
      const res = await apiPost<{ success: boolean; message: any }>("/api/job-portal/messages", { jobId: job.id, senderId: currentUserId, receiverId: peerId, message: message || "Photo", messageType: localImageUri ? "image" : "text", mediaUrl: localImageUri || undefined });
      const saved = normalizeMessage(res.message);
      setMessages((prev) => prev.map((m) => m.id === temp.id ? { ...saved, localImageUri: localImageUri || saved.mediaUrl || undefined } : m));
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      show("Message failed", err?.message || "Please try again.");
    }
  };

  const sendMessage = async () => postMessage(text);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { show("Permission needed", "Please allow gallery access to attach an image."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.55 });
    if (!result.canceled && result.assets?.[0]?.uri) await postMessage("Photo", result.assets[0].uri);
  };

  const openWhatsApp = async () => {
    const phone = cleanPhone(peerContact);
    if (!phone) { show("Contact unavailable", "WhatsApp number is not available for this chat."); return; }
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(`Hi, this is regarding ${job?.title ?? "your Connect T job application"}.`)}`;
    await Linking.openURL(url);
  };

  const deleteSelected = async (mode: "delete" | "unsend") => {
    if (!selected?.id || selected.id.startsWith("local_")) { setSelected(null); return; }
    const id = selected.id;
    setSelected(null);
    try {
      await apiDelete(`/api/job-portal/messages/${id}?userId=${encodeURIComponent(currentUserId)}&mode=${mode}`);
      if (mode === "unsend") setMessages((prev) => prev.filter((m) => m.id !== id));
      else setMessages((prev) => prev.map((m) => m.id === id ? { ...m, text: "[deleted]", localImageUri: undefined, mediaUrl: null } : m));
    } catch (err: any) {
      show("Action failed", err?.message || "Please try again.");
    }
  };

  const selectedMine = selected?.from === currentUserId;
  const canUnsend = selectedMine && !selected?.readAt;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad }]}> 
        <TopShade height={110} /><DecorativeCircles />
        <View style={s.headerTop}><TouchableOpacity onPress={() => goBack(router)} style={s.backBtn} activeOpacity={0.84}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity><View style={s.headerBadge}><Feather name="message-circle" size={11} color="rgba(255,255,255,0.86)" /><Text style={s.headerBadgeText}>Job Chat</Text></View></View>
        <View style={s.heroRow}><View style={s.heroIcon}><Feather name="message-circle" size={24} color={ORANGE} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.headerTitle} numberOfLines={1}>{peerName}</Text><Text style={s.headerSub} numberOfLines={2}>{job ? `${job.company} · ${job.title}` : "Connect T Job Portal conversation"}</Text></View></View>
      </LinearGradient>

      <ScrollView style={s.messagesScroll} contentContainerStyle={s.messagesContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
        {visibleMessages.length === 0 ? <View style={s.emptyCard}><View style={s.emptyIcon}><Feather name="message-circle" size={34} color={ORANGE} /></View><Text style={s.emptyTitle}>Start the conversation</Text><Text style={s.emptyText}>Send a message in Connect T or use WhatsApp for direct contact.</Text></View> : visibleMessages.map((message: ChatMessage, index: number) => { const mine = message.from === currentUserId; const deleted = message.text === "[deleted]"; const imageUri = message.localImageUri || message.mediaUrl || undefined; return <TouchableOpacity key={`${message.id || message.createdAt || "message"}-${index}`} activeOpacity={0.82} onLongPress={() => setSelected(message)} style={[s.messageWrap, mine ? s.myWrap : s.otherWrap]}><View style={[s.messageBubble, mine ? s.myBubble : s.otherBubble]}>{!!imageUri && !deleted && <Image source={{ uri: imageUri }} style={s.msgImage} />}<Text style={[s.messageText, mine ? s.myMessageText : s.otherMessageText, deleted && s.deletedText]}>{deleted ? "Message deleted" : message.text}</Text><View style={s.messageMeta}><Text style={[s.messageTime, mine ? s.myTime : s.otherTime]}>{timeLabel(message.createdAt)}</Text>{mine && <Text style={[s.messageTime, s.myTime]}>{message.readAt ? "Seen" : "Sent"}</Text>}</View></View></TouchableOpacity>; })}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}> 
        <View style={s.inputRow}><TouchableOpacity style={s.attachBtn} onPress={pickImage} activeOpacity={0.85}><Feather name="image" size={18} color={ORANGE} /></TouchableOpacity><TextInput style={s.input} placeholder="Type message..." placeholderTextColor="#94A3B8" value={text} onChangeText={setText} multiline maxLength={500} /><TouchableOpacity style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]} activeOpacity={0.85} onPress={sendMessage} disabled={!text.trim()}><Feather name="send" size={17} color="white" /></TouchableOpacity></View>
        <TouchableOpacity style={[s.whatsappBtn, !cleanPhone(peerContact) && s.whatsappBtnDisabled]} activeOpacity={0.85} onPress={openWhatsApp} disabled={!cleanPhone(peerContact)}><Feather name="message-circle" size={16} color="white" /><Text style={s.whatsappText}>{cleanPhone(peerContact) ? "Open WhatsApp" : "WhatsApp unavailable"}</Text></TouchableOpacity>
      </View>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={s.actionOverlay}><View style={s.actionSheet}><View style={s.actionHandle} /><Text style={s.actionTitle}>Message Options</Text>{canUnsend && <TouchableOpacity style={s.actionItem} onPress={() => deleteSelected("unsend")}><Feather name="rotate-ccw" size={17} color={ORANGE} /><Text style={s.actionText}>Unsend message</Text></TouchableOpacity>}<TouchableOpacity style={s.actionItem} onPress={() => deleteSelected("delete")}><Feather name="trash-2" size={17} color="#DC2626" /><Text style={[s.actionText, { color: "#DC2626" }]}>Delete message</Text></TouchableOpacity><TouchableOpacity style={s.actionCancel} onPress={() => setSelected(null)}><Text style={s.actionCancelText}>Cancel</Text></TouchableOpacity></View></View>
      </Modal>
      <AppNotice visible={notice.visible} title={notice.title} message={notice.message} onClose={() => setNotice((prev) => ({ ...prev, visible: false }))} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerTop: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  headerBadgeText: { fontSize: 10.5, color: "white", fontFamily: "Inter_700Bold" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: DARK, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  headerTitle: { fontSize: 21, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 },
  headerSub: { fontSize: 11.5, color: "rgba(255,255,255,0.78)", marginTop: 4, fontFamily: "Inter_400Regular", lineHeight: 16 },
  messagesScroll: { flex: 1 },
  messagesContent: { flexGrow: 1, padding: 16, paddingBottom: 18 },
  emptyCard: { marginTop: 28, backgroundColor: "white", borderRadius: 20, paddingVertical: 38, paddingHorizontal: 22, alignItems: "center", gap: 10, shadowColor: DARK, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: "#FED7AA" },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FED7AA" },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center" },
  messageWrap: { marginBottom: 10 },
  myWrap: { alignItems: "flex-end" },
  otherWrap: { alignItems: "flex-start" },
  messageBubble: { maxWidth: "82%", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 17 },
  myBubble: { backgroundColor: ORANGE, borderTopRightRadius: 6 },
  otherBubble: { backgroundColor: "white", borderTopLeftRadius: 6, borderWidth: 1, borderColor: "#E2E8F0" },
  messageText: { fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 18 },
  myMessageText: { color: "white" },
  otherMessageText: { color: "#0F172A" },
  deletedText: { fontStyle: "italic", opacity: 0.75 },
  messageMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 5 },
  messageTime: { fontSize: 9, fontFamily: "Inter_400Regular" },
  myTime: { color: "rgba(255,255,255,0.7)" },
  otherTime: { color: "#94A3B8" },
  msgImage: { width: 180, height: 132, borderRadius: 14, marginBottom: 8, backgroundColor: "rgba(255,255,255,0.18)" },
  footer: { backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#FFEDD5", paddingTop: 12, paddingHorizontal: 16, shadowColor: DARK, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  attachBtn: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", borderWidth: 1.5, borderColor: "#FED7AA" },
  input: { flex: 1, maxHeight: 106, minHeight: 48, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 12, fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular", backgroundColor: "#F8FAFC" },
  sendBtn: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: ORANGE },
  sendBtnDisabled: { opacity: 0.45 },
  whatsappBtn: { marginTop: 10, borderRadius: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#16A34A", flexDirection: "row", gap: 8 },
  whatsappBtnDisabled: { opacity: 0.45 },
  whatsappText: { color: "white", fontSize: 12.5, fontWeight: "900", fontFamily: "Inter_700Bold" },
  actionOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  actionSheet: { backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, gap: 10 },
  actionHandle: { width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 8 },
  actionTitle: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", marginBottom: 4 },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F8FAFC", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  actionText: { fontSize: 13, color: ORANGE, fontFamily: "Inter_700Bold" },
  actionCancel: { alignItems: "center", paddingVertical: 13, borderRadius: 16, backgroundColor: "#F1F5F9" },
  actionCancelText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_700Bold" },
  noticeOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", padding: 22 },
  noticeCard: { width: "100%", maxWidth: 340, backgroundColor: "white", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  noticeIcon: { width: 54, height: 54, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", marginBottom: 12 },
  noticeTitle: { fontSize: 17, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" },
  noticeMsg: { marginTop: 6, fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  noticeOk: { marginTop: 18, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, alignItems: "center", backgroundColor: ORANGE },
  noticeOkText: { fontSize: 13, color: "white", fontFamily: "Inter_700Bold" },
});
