import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJobs, Job } from "@/context/JobsContext";

type StatusType = "shortlisted" | "hired" | "rejected" | "pending" | "active";

function pendingIds(job: Job) {
  return job.applicants.filter((id) => !job.hired.includes(id) && !job.shortlisted.includes(id) && !job.rejected.includes(id));
}

function applicantName(job: Job, id: string) {
  const app = (job.applications || []).find((item) => item.seekerId === id);
  return app?.seekerName || `Applicant ${id.replace(/[^0-9]/g, "") || id.slice(-4)}`;
}

function applicantSub(job: Job, id: string) {
  const app = (job.applications || []).find((item) => item.seekerId === id);
  const parts = [app?.seekerPhone ? `+91 ${String(app.seekerPhone).replace(/\D/g, "").slice(-10)}` : "", app?.seekerQualification || "", app?.seekerSkills || ""].filter(Boolean);
  return parts.join(" · ") || `ID: ${id}`;
}

function getTheme(status: StatusType) {
  if (status === "hired") {
    return { title: "Hired Jobs", colors: ["#064E3B", "#047857", "#059669", "#10B981"], accent: "#047857", soft: "#D1FAE5", border: "#A7F3D0", icon: "briefcase" as const, subtitle: "Selected candidates and filled hiring pipeline" };
  }
  if (status === "shortlisted") {
    return { title: "Shortlisted Jobs", colors: ["#064E3B", "#047857", "#059669", "#10B981"], accent: "#059669", soft: "#ECFDF5", border: "#A7F3D0", icon: "user-check" as const, subtitle: "Candidates moved to shortlist" };
  }
  if (status === "rejected") {
    return { title: "Rejected Jobs", colors: ["#991B1B", "#DC2626", "#F87171"], accent: "#DC2626", soft: "#FEE2E2", border: "#FECACA", icon: "user-x" as const, subtitle: "Rejected applicant records" };
  }
  if (status === "pending") {
    return { title: "Pending Jobs", colors: ["#92400E", "#EA580C", "#FB923C"], accent: "#EA580C", soft: "#FFF7ED", border: "#FED7AA", icon: "clock" as const, subtitle: "Applications awaiting decision" };
  }
  return { title: "Active Jobs", colors: ["#064E3B", "#047857", "#059669", "#10B981"], accent: "#047857", soft: "#ECFDF5", border: "#A7F3D0", icon: "zap" as const, subtitle: "Currently active job listings" };
}

export default function JobStatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ status?: string }>();
  const { jobs } = useJobs();

  const status = (params.status ?? "active") as StatusType;
  const theme = getTheme(status);

  const items = useMemo(() => {
    if (status === "hired") return jobs.filter((j) => j.hired.length > 0);
    if (status === "shortlisted") return jobs.filter((j) => j.shortlisted.length > 0);
    if (status === "rejected") return jobs.filter((j) => j.rejected.length > 0);
    if (status === "pending") return jobs.filter((j) => pendingIds(j).length > 0);
    return jobs.filter((j) => j.active);
  }, [jobs, status]);

  return (
    <View style={s.root}>
      <LinearGradient colors={theme.colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 14 }]}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.84}>
            <Feather name="chevron-left" size={22} color="white" />
          </TouchableOpacity>
          <View style={s.headerBadge}>
            <Feather name={theme.icon} size={11} color="rgba(255,255,255,0.86)" />
            <Text style={s.headerBadgeText}>Job Status</Text>
          </View>
        </View>

        <View style={s.heroRow}>
          <View style={s.heroIcon}><Feather name={theme.icon} size={27} color={theme.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{theme.title}</Text>
            <Text style={s.headerSub}>{theme.subtitle}</Text>
          </View>
        </View>

        <View style={s.summaryCard}>
          <View><Text style={s.summaryNumber}>{items.length}</Text><Text style={s.summaryLabel}>Total records</Text></View>
          <View style={s.summaryDivider} />
          <View style={{ flex: 1 }}><Text style={s.summaryText}>Review listings and applicant pipeline details in one place.</Text></View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 86 }]} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: theme.soft }]}><Feather name={theme.icon} size={34} color={theme.accent} /></View>
            <Text style={s.emptyTitle}>No {theme.title.toLowerCase()} found</Text>
            <Text style={s.emptyText}>Matching job records will appear here when available.</Text>
          </View>
        ) : (
          items.map((job) => {
            const pending = pendingIds(job);
            const displayUsers = status === "hired" ? job.hired : status === "shortlisted" ? job.shortlisted : status === "rejected" ? job.rejected : status === "pending" ? pending : [];

            return (
              <TouchableOpacity key={job.id} style={s.card} activeOpacity={0.86} onPress={() => router.push(`/jobs/active/${job.id}` as any)}>
                <View style={s.cardTop}>
                  <View style={[s.cardIcon, { backgroundColor: theme.soft }]}><Feather name={theme.icon} size={18} color={theme.accent} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.jobTitle} numberOfLines={2}>{job.title}</Text>
                    <Text style={s.jobMeta} numberOfLines={1}>{job.company} · {job.location}</Text>
                  </View>
                  <Feather name="chevron-right" size={17} color="#CBD5E1" />
                </View>

                <View style={s.chipGrid}>
                  <Metric value={job.openings} label="Openings" color="#047857" bg="#ECFDF5" border="#A7F3D0" />
                  <Metric value={job.applicants.length} label="Applied" color="#0369A1" bg="#E0F2FE" border="#BAE6FD" />
                  <Metric value={job.shortlisted.length} label="Shortlisted" color="#059669" bg="#D1FAE5" border="#A7F3D0" />
                  <Metric value={job.hired.length} label="Hired" color="#047857" bg="#ECFDF5" border="#A7F3D0" />
                  <Metric value={job.rejected.length} label="Rejected" color="#DC2626" bg="#FEE2E2" border="#FECACA" />
                  <Metric value={pending.length} label="Pending" color="#EA580C" bg="#FFF7ED" border="#FED7AA" />
                </View>

                {!!job.description && <Text style={s.description} numberOfLines={3}>{job.description}</Text>}
                {!!job.requirements && <Text style={s.requirements} numberOfLines={3}>{job.requirements}</Text>}

                {status !== "active" && (
                  <View style={s.usersWrap}>
                    <Text style={s.usersTitle}>{status === "hired" ? "Hired Users" : status === "shortlisted" ? "Shortlisted Users" : status === "rejected" ? "Rejected Users" : "Pending Users"}</Text>
                    {displayUsers.length === 0 ? <Text style={s.usersEmpty}>No users found</Text> : displayUsers.map((id) => (
                      <View key={id} style={s.userRow}>
                        <View style={[s.userAvatar, { backgroundColor: theme.soft }]}><Feather name={theme.icon} size={15} color={theme.accent} /></View>
                        <View style={{ flex: 1 }}><Text style={s.userName}>{applicantName(job, id)}</Text><Text style={s.userId} numberOfLines={1}>{applicantSub(job, id)}</Text></View>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function Metric({ value, label, color, bg, border }: { value: number; label: string; color: string; bg: string; border: string }) {
  return <View style={[s.chip, { backgroundColor: bg, borderColor: border }]}><Text style={[s.chipNum, { color }]}>{value}</Text><Text style={s.chipLabel}>{label}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6FAF8" },
  header: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden", shadowColor: "#064E3B", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerTop: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  headerBadgeText: { fontSize: 11, color: "white", fontFamily: "Inter_700Bold" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 22 },
  heroIcon: { width: 72, height: 72, borderRadius: 25, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  headerTitle: { fontSize: 27, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.45 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.78)", marginTop: 5, fontFamily: "Inter_400Regular", lineHeight: 18 },
  summaryCard: { marginTop: 18, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  summaryNumber: { fontSize: 30, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" },
  summaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" },
  summaryDivider: { width: 1, height: 42, backgroundColor: "rgba(255,255,255,0.18)" },
  summaryText: { fontSize: 12, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular", lineHeight: 17 },
  content: { padding: 16, gap: 13 },
  card: { backgroundColor: "white", borderRadius: 24, padding: 17, gap: 12, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  jobTitle: { fontSize: 17, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold", letterSpacing: -0.15 },
  jobMeta: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 4 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minWidth: 86, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  chipNum: { fontSize: 17, fontWeight: "900", fontFamily: "Inter_700Bold" },
  chipLabel: { fontSize: 10, color: "#64748B", fontFamily: "Inter_500Medium", marginTop: 2 },
  description: { fontSize: 13, color: "#334155", lineHeight: 19, fontFamily: "Inter_400Regular" },
  requirements: { fontSize: 12, color: "#64748B", lineHeight: 18, fontFamily: "Inter_400Regular" },
  usersWrap: { marginTop: 4, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#F1F5F9", gap: 10 },
  usersTitle: { fontSize: 14, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" },
  usersEmpty: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 8 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 13, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  userId: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 1 },
  empty: { alignItems: "center", justifyContent: "center", backgroundColor: "white", borderRadius: 24, paddingVertical: 46, paddingHorizontal: 22, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)" },
  emptyIcon: { width: 72, height: 72, borderRadius: 25, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" },
  emptyText: { marginTop: 5, fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
