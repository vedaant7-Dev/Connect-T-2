import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobs } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

function timeLabel(value?: string) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function cleanPhone(value?: string) { return String(value || "").replace(/\D/g, "").slice(-10); }
function goBack(router: any) { if (router.canGoBack?.()) router.back(); else router.replace("/jobs/(tabs)" as any); }

export default function JobChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ employerId?: string; jobId?: string; peerName?: string }>();
  const { jobs, addJobMessage } = useJobs() as any;
  const { jobsUser } = useJobsAuth();
  const [text, setText] = useState("");
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

  const visibleMessages = useMemo(() => {
    const all = job?.messages || [];
    if (!peerId) return all;
    return all.filter((message: any) => {
      const from = String(message.from || "");
      const to = String(message.to || "");
      if (!to) return from === currentUserId || from === peerId;
      return (from === currentUserId && to === peerId) || (from === peerId && to === currentUserId);
    });
  }, [job?.messages, peerId, currentUserId]);

  const peerName = String(params.peerName || "").trim() || (jobsUser?.role === "employer" ? `Applicant ${peerId.slice(-4)}` : job?.employerName || "Employer");
  const peerContact = jobsUser?.role === "employer" ? job?.applications?.find((app: any) => app.seekerId === peerId)?.seekerPhone : job?.employerWhatsApp || job?.employerPhone;
  const topPad = (Platform.OS === "web" ? 54 : insets.top) + 14;

  const sendMessage = async () => {
    const message = text.trim();
    if (!message) return;
    if (!job || !peerId) { Alert.alert("No chat found", "Open this chat again from the job or applicant screen."); return; }
    try { await addJobMessage(job.id, { from: currentUserId, to: peerId, text: message, createdAt: new Date().toISOString() }); setText(""); } catch (err: any) { Alert.alert("Message failed", err?.message || "Please try again."); }
  };

  const openWhatsApp = async () => {
    const phone = cleanPhone(peerContact);
    if (!phone) { Alert.alert("Contact unavailable", "WhatsApp number is not available for this chat."); return; }
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(`Hi, this is regarding ${job?.title ?? "your Connect T job application"}.`)}`;
    await Linking.openURL(url);
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad }]}>
        <TopShade height={110} /><DecorativeCircles />
        <View style={s.headerTop}><TouchableOpacity onPress={() => goBack(router)} style={s.backBtn} activeOpacity={0.84}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity><View style={s.headerBadge}><Feather name="message-circle" size={11} color="rgba(255,255,255,0.86)" /><Text style={s.headerBadgeText}>Job Chat</Text></View></View>
        <View style={s.heroRow}><View style={s.heroIcon}><Feather name="message-circle" size={27} color={ORANGE} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.headerTitle} numberOfLines={1}>{peerName}</Text><Text style={s.headerSub} numberOfLines={2}>{job ? `${job.company} · ${job.title}` : "Connect T Job Portal conversation"}</Text></View></View>
      </LinearGradient>

      <ScrollView style={s.messagesScroll} contentContainerStyle={s.messagesContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {visibleMessages.length === 0 ? <View style={s.emptyCard}><View style={s.emptyIcon}><Feather name="message-circle" size={34} color={ORANGE} /></View><Text style={s.emptyTitle}>Start the conversation</Text><Text style={s.emptyText}>Send a message in Connect T or use WhatsApp for direct contact.</Text></View> : visibleMessages.map((message: any, index: number) => { const mine = message.from === currentUserId; return <View key={`${message.createdAt || "message"}-${index}`} style={[s.messageWrap, mine ? s.myWrap : s.otherWrap]}><View style={[s.messageBubble, mine ? s.myBubble : s.otherBubble]}><Text style={[s.messageText, mine ? s.myMessageText : s.otherMessageText]}>{message.text}</Text>{!!message.createdAt && <Text style={[s.messageTime, mine ? s.myTime : s.otherTime]}>{timeLabel(message.createdAt)}</Text>}</View></View>; })}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
        <View style={s.inputRow}><TextInput style={s.input} placeholder="Type message..." placeholderTextColor="#94A3B8" value={text} onChangeText={setText} multiline maxLength={500} /><TouchableOpacity style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]} activeOpacity={0.85} onPress={sendMessage} disabled={!text.trim()}><Feather name="send" size={17} color="white" /></TouchableOpacity></View>
        <TouchableOpacity style={[s.whatsappBtn, !cleanPhone(peerContact) && s.whatsappBtnDisabled]} activeOpacity={0.85} onPress={openWhatsApp} disabled={!cleanPhone(peerContact)}><Feather name="message-circle" size={16} color="white" /><Text style={s.whatsappText}>{cleanPhone(peerContact) ? "Open WhatsApp" : "WhatsApp unavailable"}</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerTop: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 }, headerBadgeText: { fontSize: 10.5, color: "white", fontFamily: "Inter_700Bold" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 18 }, heroIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: DARK, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 }, headerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 }, headerSub: { fontSize: 11.5, color: "rgba(255,255,255,0.78)", marginTop: 4, fontFamily: "Inter_400Regular", lineHeight: 16 },
  messagesScroll: { flex: 1 }, messagesContent: { flexGrow: 1, padding: 16, paddingBottom: 18 }, emptyCard: { marginTop: 28, backgroundColor: "white", borderRadius: 20, paddingVertical: 38, paddingHorizontal: 22, alignItems: "center", gap: 10, shadowColor: DARK, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: "#FED7AA" }, emptyIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FED7AA" }, emptyTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold", textAlign: "center" }, emptyText: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center" },
  messageWrap: { marginBottom: 10 }, myWrap: { alignItems: "flex-end" }, otherWrap: { alignItems: "flex-start" }, messageBubble: { maxWidth: "82%", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 17 }, myBubble: { backgroundColor: ORANGE, borderTopRightRadius: 6 }, otherBubble: { backgroundColor: "white", borderTopLeftRadius: 6, borderWidth: 1, borderColor: "#E2E8F0" }, messageText: { fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 18 }, myMessageText: { color: "white" }, otherMessageText: { color: "#0F172A" }, messageTime: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 5, alignSelf: "flex-end" }, myTime: { color: "rgba(255,255,255,0.7)" }, otherTime: { color: "#94A3B8" },
  footer: { backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#FFEDD5", paddingTop: 12, paddingHorizontal: 16, shadowColor: DARK, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10 }, inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 }, input: { flex: 1, maxHeight: 106, minHeight: 48, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 12, fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular", backgroundColor: "#F8FAFC" }, sendBtn: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: ORANGE }, sendBtnDisabled: { opacity: 0.45 }, whatsappBtn: { marginTop: 10, borderRadius: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#16A34A", flexDirection: "row", gap: 8 }, whatsappBtnDisabled: { opacity: 0.45 }, whatsappText: { color: "white", fontSize: 12.5, fontWeight: "900", fontFamily: "Inter_700Bold" },
});
