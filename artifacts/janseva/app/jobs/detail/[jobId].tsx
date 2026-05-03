import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useJobs } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

export default function JobDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { jobs } = useJobs();
  const { jobsUser } = useJobsAuth();
  const job = useMemo(() => jobs.find((j) => j.id === params.jobId) ?? null, [jobs, params.jobId]);

  if (!job) {
    return (
      <View style={s.root}>
        <LinearGradient colors={["#C2410C", "#EA580C", "#F97316"]} style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={18} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Job Details</Text>
          <Text style={s.headerSub}>Job not found</Text>
        </LinearGradient>
      </View>
    );
  }

  const contactPhone = job.employerWhatsApp || job.employerPhone;
  const canChat = !!jobsUser && jobsUser.id !== job.employerId;

  const openWhatsApp = async () => {
    if (!contactPhone) return;
    const url = `https://wa.me/${contactPhone.replace(/\D/g, "")}`;
    await Linking.openURL(url);
  };

  const openChat = () => {
    if (!canChat) return;
    router.push(`/jobs/chat/${job.employerId}` as any);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{job.title}</Text>
        <Text style={s.headerSub}>{job.company} · {job.location}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.metaRow}>
            <View style={s.metaPill}><Text style={s.metaPillText}>{job.type}</Text></View>
            <View style={s.metaPill}><Text style={s.metaPillText}>{job.openings} openings</Text></View>
            <View style={s.metaPill}><Text style={s.metaPillText}>{job.salary}</Text></View>
          </View>
          <Text style={s.sectionTitle}>About the Job</Text>
          <Text style={s.body}>{job.description}</Text>
          <Text style={s.sectionTitle}>Requirements</Text>
          <Text style={s.body}>{job.requirements}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Employer</Text>
          <Text style={s.employerName}>{job.employerName}</Text>
          <Text style={s.body}>{job.company}</Text>

          <View style={s.actionRow}>
            <TouchableOpacity style={[s.actionBtn, !canChat && s.disabledBtn]} onPress={openChat} activeOpacity={0.85} disabled={!canChat}>
              <Feather name="message-circle" size={16} color="white" />
              <Text style={s.actionText}>Chat</Text>
            </TouchableOpacity>
            {contactPhone ? (
              <TouchableOpacity style={s.whatsappBtn} onPress={openWhatsApp} activeOpacity={0.85}>
                <Feather name="phone" size={16} color="white" />
                <Text style={s.actionText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4, fontFamily: "Inter_400Regular" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 16, gap: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: { backgroundColor: "#FFF7ED", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  metaPillText: { fontSize: 11, color: "#C2410C", fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginTop: 4 },
  body: { fontSize: 13, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 19 },
  employerName: { fontSize: 16, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1D4ED8", borderRadius: 14, paddingVertical: 12 },
  whatsappBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#059669", borderRadius: 14, paddingVertical: 12 },
  actionText: { color: "white", fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  disabledBtn: { opacity: 0.45 },
});