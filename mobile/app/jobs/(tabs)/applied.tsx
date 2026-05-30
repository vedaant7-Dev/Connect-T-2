import React from "react";
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { useJobs, typeConfig, Job } from "@/context/JobsContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

function getApplicationState(job: Job, userId?: string) {
  if (!userId) return { label: "Applied", color: ORANGE, bg: "#FFF7ED", icon: "check-circle" as const, step: 1 };
  if (job.hired.includes(userId)) return { label: "Hired", color: ORANGE, bg: "#FFF7ED", icon: "briefcase" as const, step: 3 };
  if (job.shortlisted.includes(userId)) return { label: "Shortlisted", color: ORANGE, bg: "#FFF7ED", icon: "user-check" as const, step: 3 };
  if (job.rejected.includes(userId)) return { label: "Rejected", color: "#DC2626", bg: "#FEE2E2", icon: "user-x" as const, step: 3 };
  return { label: "Under Review", color: "#D97706", bg: "#FFFBEB", icon: "clock" as const, step: 2 };
}

function AppliedCard({ job, userId }: { job: Job; userId?: string }) {
  const router = useRouter();
  const type = typeConfig[job.type] || { label: job.type || "Job", bg: "#FFF7ED", color: ORANGE };
  const state = getApplicationState(job, userId);
  const steps = ["Applied", "Review", state.label === "Under Review" ? "Contact" : state.label];
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.86} onPress={() => router.push(`/jobs/detail/${job.id}` as any)}>
      <View style={s.cardTop}>
        <View style={s.catIcon}><Feather name="briefcase" size={18} color={ORANGE} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.jobTitle} numberOfLines={2}>{job.title}</Text>
          <Text style={s.company} numberOfLines={1}>{job.company}</Text>
        </View>
        <View style={[s.stateBadge, { backgroundColor: state.bg }]}><Feather name={state.icon} size={12} color={state.color} /><Text style={[s.stateBadgeText, { color: state.color }]}>{state.label}</Text></View>
      </View>
      <View style={s.metaRow}>
        <View style={s.metaChip}><Feather name="map-pin" size={11} color="#64748B" /><Text style={s.metaText}>{job.location}</Text></View>
        <View style={[s.metaChip, { backgroundColor: "#FFF7ED" }]}><Text style={[s.metaText, { color: ORANGE, fontFamily: "Inter_700Bold" }]}>{type.label}</Text></View>
        {!!job.shift && <View style={s.metaChip}><Feather name="sun" size={11} color="#64748B" /><Text style={s.metaText}>{job.shift}</Text></View>}
        <View style={s.metaChip}><Feather name="clock" size={11} color="#64748B" /><Text style={s.metaText}>{timeAgo(job.createdAt)}</Text></View>
      </View>
      <View style={s.salaryRow}><View><Text style={s.salary}>{job.salary}</Text><Text style={s.salarySub}>Expected salary</Text></View><View style={s.openingPill}><Feather name="users" size={12} color={ORANGE} /><Text style={s.openings}>{job.openings} opening{job.openings > 1 ? "s" : ""}</Text></View></View>
      <View style={s.statusBox}>{steps.map((label, index) => { const active = index + 1 <= state.step; const rejected = state.label === "Rejected" && index === 2; return <React.Fragment key={label}><View style={s.statusStep}><View style={[s.statusDot, { backgroundColor: active ? (rejected ? "#DC2626" : state.color) : "#E2E8F0" }]} /><Text style={[s.statusStepText, { color: active ? (rejected ? "#DC2626" : state.color) : "#CBD5E1" }]}>{label}</Text></View>{index < steps.length - 1 && <View style={[s.statusLine, { backgroundColor: index + 1 < state.step ? state.color : "#E2E8F0" }]} />}</React.Fragment>; })}</View>
    </TouchableOpacity>
  );
}

export default function AppliedJobsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser } = useJobsAuth();
  const { jobs } = useJobs();
  const appliedJobs = jobs.filter((job) => jobsUser && job.applicants.includes(jobsUser.id));
  const hiredCount = appliedJobs.filter((job) => jobsUser && job.hired.includes(jobsUser.id)).length;
  const shortlistedCount = appliedJobs.filter((job) => jobsUser && job.shortlisted.includes(jobsUser.id)).length;
  const pendingCount = appliedJobs.filter((job) => jobsUser && !job.hired.includes(jobsUser.id) && !job.shortlisted.includes(jobsUser.id) && !job.rejected.includes(jobsUser.id)).length;
  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad + 12 }]}>
        <TopShade height={110} /><DecorativeCircles />
        <View style={s.headerTop}><View style={s.headerIcon}><Feather name="briefcase" size={22} color={ORANGE} /></View><View style={{ flex: 1 }}><View style={s.headerPill}><Text style={s.headerPillText}>JOB SEEKER TRACKING</Text></View><Text style={s.headerTitle}>Applied Jobs</Text><Text style={s.headerSub}>Track applications and employer responses</Text></View></View>
        <View style={s.summaryRow}><Summary value={appliedJobs.length} label="Applied" /><View style={s.summaryDivider} /><Summary value={pendingCount} label="In Review" /><View style={s.summaryDivider} /><Summary value={shortlistedCount + hiredCount} label="Positive" /></View>
      </LinearGradient>
      {appliedJobs.length === 0 ? <View style={s.emptyWrap}><View style={s.empty}><View style={s.emptyIcon}><Feather name="briefcase" size={36} color={ORANGE} /></View><Text style={s.emptyTitle}>No applications yet</Text><Text style={s.emptySub}>Jobs you apply for will appear here so you can track their status.</Text></View></View> : <FlatList data={appliedJobs} keyExtractor={(job) => job.id} contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 8) + 92 }]} showsVerticalScrollIndicator={false} renderItem={({ item }) => <AppliedCard job={item} userId={jobsUser?.id} />} />}
    </View>
  );
}

function Summary({ value, label }: { value: number; label: string }) { return <View style={s.summaryItem}><Text style={s.summaryNum}>{value}</Text><Text style={s.summaryLabel}>{label}</Text></View>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  headerIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: DARK, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  headerPill: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", paddingHorizontal: 9, paddingVertical: 5, marginBottom: 5 },
  headerPillText: { color: "white", fontSize: 8.8, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 },
  headerSub: { fontSize: 11.5, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 16 },
  summaryRow: { marginTop: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 17, padding: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  summaryItem: { flex: 1, alignItems: "center" }, summaryNum: { fontSize: 20, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" }, summaryLabel: { fontSize: 9.5, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 2 }, summaryDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.18)" },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 13, shadowColor: DARK, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 11, marginBottom: 11 }, catIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, jobTitle: { fontSize: 13.5, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" }, company: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  stateBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }, stateBadgeText: { fontSize: 9.5, fontWeight: "900", fontFamily: "Inter_700Bold" }, metaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 11 }, metaChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F8FAFC", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }, metaText: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_500Medium" },
  salaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }, salary: { fontSize: 14, color: ORANGE, fontFamily: "Inter_700Bold", fontWeight: "900" }, salarySub: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 }, openingPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, openings: { fontSize: 10.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  statusBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 15, padding: 10 }, statusStep: { alignItems: "center", minWidth: 54 }, statusDot: { width: 9, height: 9, borderRadius: 5, marginBottom: 5 }, statusStepText: { fontSize: 9.5, fontFamily: "Inter_700Bold" }, statusLine: { flex: 1, height: 2, borderRadius: 999, marginHorizontal: 2, marginBottom: 14 },
  emptyWrap: { flex: 1, justifyContent: "center", padding: 20 }, empty: { backgroundColor: "white", borderRadius: 22, padding: 26, alignItems: "center", borderWidth: 1, borderColor: "#FED7AA" }, emptyIcon: { width: 70, height: 70, borderRadius: 24, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 12 }, emptyTitle: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" }, emptySub: { marginTop: 5, fontSize: 11.5, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17 },
});
