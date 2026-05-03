import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useJobs } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

export default function JobChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ employerId?: string }>();
  const { jobs, addJobMessage } = useJobs() as any;
  const { jobsUser } = useJobsAuth();
  const [text, setText] = useState("");
  const employerJobs = useMemo(() => jobs.filter((job: any) => job.employerId === params.employerId), [jobs, params.employerId]);
  const job = employerJobs[0];
  const messages = job?.messages ?? [];
  const employerContact = job?.employerWhatsApp || job?.employerPhone || "";

  const sendMessage = async () => {
    const message = text.trim();
    if (!message) return;
    if (!job) {
      Alert.alert("No chat found");
      return;
    }
    addJobMessage(job.id, { from: jobsUser?.id || "visitor", text: message, createdAt: new Date().toISOString() });
    setText("");
    Alert.alert("Sent", "Message sent to employer.");
  };

  const openWhatsApp = async () => {
    const phone = String(employerContact).replace(/[^\d+]/g, "");
    if (!phone) return;
    const url = `https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(`Hi, I’m interested in ${job?.title ?? "your job post"}.`)}`;
    const can = await Linking.canOpenURL(url);
    if (!can) return Alert.alert("WhatsApp not available");
    await Linking.openURL(url);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#C2410C", "#EA580C", "#F97316"]} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Chat Employer</Text>
        <Text style={s.headerSub}>Employer ID: {params.employerId}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content}>
        {messages.length === 0 ? <View style={s.empty}><Feather name="message-circle" size={42} color="#CBD5E1" /><Text style={s.emptyText}>Chat will open here.</Text></View> : messages.map((m: any, idx: number) => <View key={idx} style={[s.message, m.from === jobsUser?.id ? s.myMessage : s.otherMessage]}><Text style={s.messageText}>{m.text}</Text></View>)}
      </ScrollView>

      <View style={s.inputBar}>
        <TextInput style={s.input} placeholder="Type message..." placeholderTextColor="#94A3B8" value={text} onChangeText={setText} />
        <TouchableOpacity style={s.sendBtn} activeOpacity={0.85} onPress={sendMessage}>
          <Feather name="send" size={16} color="white" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={s.whatsappBtn} activeOpacity={0.85} onPress={openWhatsApp}>
        <Feather name="message-circle" size={16} color="white" />
        <Text style={s.whatsappText}>Open WhatsApp</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4, fontFamily: "Inter_400Regular" },
  content: { flexGrow: 1, justifyContent: "center", padding: 16 },
  empty: { alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  inputBar: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0", backgroundColor: "white" },
  input: { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A" },
  sendBtn: { width: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#EA580C" },
  message: { maxWidth: "80%", marginBottom: 10, padding: 12, borderRadius: 16 },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#FED7AA" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  messageText: { fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular" },
  whatsappBtn: { margin: 16, marginTop: 0, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#16A34A", flexDirection: "row", gap: 8 },
  whatsappText: { color: "white", fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
});