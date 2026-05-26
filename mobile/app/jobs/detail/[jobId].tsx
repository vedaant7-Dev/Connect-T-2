import React, { useMemo } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJobs } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

export default function JobDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { jobs } = useJobs();
  const { jobsUser } = useJobsAuth();

  const job = useMemo(
    () => jobs.find((j) => j.id === params.jobId) ?? null,
    [jobs, params.jobId],
  );

  const topPad = (Platform.OS === "web" ? 54 : insets.top) + 14;

  if (!job) {
    return (
      <View style={s.root}>
        <LinearGradient
          colors={["#9A3412", "#C2410C", "#EA580C", "#FB923C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: topPad }]}
        >
          <View style={s.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.backBtn}
              activeOpacity={0.84}
            >
              <Feather name="chevron-left" size={22} color="white" />
            </TouchableOpacity>

            <View style={s.headerBadge}>
              <Feather name="briefcase" size={11} color="rgba(255,255,255,0.86)" />
              <Text style={s.headerBadgeText}>Job Detail</Text>
            </View>
          </View>

          <View style={s.notFoundHero}>
            <View style={s.heroIcon}>
              <Feather name="search" size={28} color="#EA580C" />
            </View>
            <Text style={s.headerTitle}>Job Details</Text>
            <Text style={s.headerSub}>This job listing was not found.</Text>
          </View>
        </LinearGradient>

        <View style={s.emptyCard}>
          <Feather name="alert-circle" size={38} color="#EA580C" />
          <Text style={s.emptyTitle}>Job not available</Text>
          <Text style={s.emptyText}>
            The job may have been removed or is no longer active.
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => router.back()}
            activeOpacity={0.84}
          >
            <Text style={s.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const contactPhone = job.employerWhatsApp || job.employerPhone;
  const canChat = !!jobsUser && jobsUser.id !== job.employerId;

  const openWhatsApp = async () => {
    if (!contactPhone) return;
    const cleanPhone = contactPhone.replace(/\D/g, "");
    const message = encodeURIComponent(`Hi, I’m interested in ${job.title}.`);
    await Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`);
  };

  const openChat = () => {
    if (!canChat) return;
    router.push(`/jobs/chat/${job.employerId}` as any);
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad }]}
      >
        <View style={s.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            activeOpacity={0.84}
          >
            <Feather name="chevron-left" size={22} color="white" />
          </TouchableOpacity>

          <View style={s.headerBadge}>
            <Feather name="briefcase" size={11} color="rgba(255,255,255,0.86)" />
            <Text style={s.headerBadgeText}>Job Detail</Text>
          </View>
        </View>

        <View style={s.heroRow}>
          <View style={s.heroIcon}>
            <Feather name="briefcase" size={27} color="#EA580C" />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerTitle} numberOfLines={2}>
              {job.title}
            </Text>
            <Text style={s.headerSub} numberOfLines={2}>
              {job.company} · {job.location}
            </Text>
          </View>
        </View>

        <View style={s.summaryCard}>
          <View>
            <Text style={s.summaryNumber}>{job.openings}</Text>
            <Text style={s.summaryLabel}>Openings</Text>
          </View>

          <View style={s.summaryDivider} />

          <View style={{ flex: 1 }}>
            <Text style={s.summarySalary}>{job.salary}</Text>
            <Text style={s.summaryText}>Salary / compensation</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 86,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <View style={s.metaRow}>
            <View style={s.metaPill}>
              <Feather name="clock" size={12} color="#C2410C" />
              <Text style={s.metaPillText}>{job.type}</Text>
            </View>

            <View style={s.metaPill}>
              <Feather name="users" size={12} color="#C2410C" />
              <Text style={s.metaPillText}>{job.openings} openings</Text>
            </View>

            <View style={s.metaPill}>
              <Feather name="map-pin" size={12} color="#C2410C" />
              <Text style={s.metaPillText}>{job.location}</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Company Details</Text>

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Feather name="user" size={14} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Employer</Text>
              <Text style={s.infoValue}>{job.employerName}</Text>
            </View>
          </View>

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Feather name="briefcase" size={14} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Company</Text>
              <Text style={s.infoValue}>{job.company}</Text>
            </View>
          </View>

          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Feather name="navigation" size={14} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Location</Text>
              <Text style={s.infoValue}>{job.location}</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>About the Job</Text>
          <Text style={s.body}>{job.description || "No description provided."}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Requirements</Text>
          <Text style={s.body}>{job.requirements || "No requirements provided."}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Contact Employer</Text>
          <Text style={s.body}>
            Use chat to keep the conversation inside Connect T, or WhatsApp the employer directly.
          </Text>

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionBtn, !canChat && s.disabledBtn]}
              onPress={openChat}
              activeOpacity={0.85}
              disabled={!canChat}
            >
              <Feather name="message-circle" size={16} color="white" />
              <Text style={s.actionText}>Chat</Text>
            </TouchableOpacity>

            {contactPhone ? (
              <TouchableOpacity
                style={s.whatsappBtn}
                onPress={openWhatsApp}
                activeOpacity={0.85}
              >
                <Feather name="phone" size={16} color="white" />
                <Text style={s.actionText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {!canChat && (
            <Text style={s.noteText}>
              Chat is available for job seekers contacting an employer.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    shadowColor: "#9A3412",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerTop: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBadgeText: {
    fontSize: 11,
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 22,
  },
  notFoundHero: {
    alignItems: "center",
    paddingTop: 22,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 25,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.45,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  summaryCard: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  summaryNumber: {
    fontSize: 30,
    color: "white",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  summaryLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
  },
  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  summarySalary: {
    fontSize: 18,
    color: "white",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  summaryText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 13,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 17,
    gap: 12,
    shadowColor: "#9A3412",
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(254,215,170,0.5)",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF7ED",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  metaPillText: {
    fontSize: 11,
    color: "#C2410C",
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.12,
  },
  body: {
    fontSize: 13,
    color: "#334155",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    fontSize: 13,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1D4ED8",
    borderRadius: 18,
    paddingVertical: 14,
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    borderRadius: 18,
    paddingVertical: 14,
  },
  actionText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
  disabledBtn: {
    opacity: 0.45,
  },
  noteText: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  emptyCard: {
    margin: 16,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#9A3412",
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(254,215,170,0.5)",
  },
  emptyTitle: {
    fontSize: 18,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 4,
    backgroundColor: "#EA580C",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyBtnText: {
    color: "white",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
});
