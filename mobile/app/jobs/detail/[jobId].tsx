import React, { useMemo } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

function cleanPhone(value?: string) { return String(value || "").replace(/\D/g, "").slice(-10); }
function displayDate(value?: string) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function goBack(router: any) { if (router.canGoBack?.()) router.back(); else router.replace("/jobs/(tabs)" as any); }

function DetailRow({ icon, label, value }: { icon: any; label: string; value?: string | number | null }) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return <View style={s.infoRow}><View style={s.infoIcon}><Feather name={icon} size={14} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoValue}>{value}</Text></View></View>;
}

export default function JobDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { jobs, applyJob, hasApplied } = useJobs();
  const { jobsUser } = useJobsAuth();
  const job = useMemo(() => jobs.find((j) => j.id === params.jobId) ?? null, [jobs, params.jobId]);
  const topPad = (Platform.OS === "web" ? 54 : insets.top) + 14;

  if (!job) {
    return <View style={s.root}><LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad }]}><TopShade height={110} /><DecorativeCircles /><View style={s.headerTop}><TouchableOpacity onPress={() => goBack(router)} style={s.backBtn} activeOpacity={0.84}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity><View style={s.headerBadge}><Feather name="briefcase" size={11} color="rgba(255,255,255,0.86)" /><Text style={s.headerBadgeText}>Job Detail</Text></View></View><View style={s.notFoundHero}><View style={s.heroIcon}><Feather name="search" size={28} color={ORANGE} /></View><Text style={s.headerTitle}>Job Details</Text><Text style={s.headerSub}>This job listing was not found.</Text></View></LinearGradient><View style={s.emptyCard}><Feather name="alert-circle" size={38} color={ORANGE} /><Text style={s.emptyTitle}>Job not available</Text><Text style={s.emptyText}>The job may have been removed or is no longer active.</Text><TouchableOpacity style={s.emptyBtn} onPress={() => goBack(router)} activeOpacity={0.84}><Text style={s.emptyBtnText}>Go Back</Text></TouchableOpacity></View></View>;
  }

  const contactPhone = job.employerWhatsApp || job.employerPhone;
  const canChat = !!jobsUser && jobsUser.id !== job.employerId;
  const canApply = !!jobsUser && jobsUser.role === "seeker" && jobsUser.id !== job.employerId;
  const applied = canApply && hasApplied(job.id, jobsUser.id);
  const workingTime = [job.workStartTime, job.workEndTime].filter(Boolean).join(" - ");
  const phone = cleanPhone(contactPhone);

  const openWhatsApp = async () => { if (!phone) return; const message = encodeURIComponent(`Hi, I’m interested in ${job.title}.`); await Linking.openURL(`https://wa.me/91${phone}?text=${message}`); };
  const openChat = () => { if (!canChat) return; router.push({ pathname: "/jobs/chat/[employerId]", params: { employerId: job.employerId, jobId: job.id, peerName: job.employerName || job.company } } as any); };
  const handleApply = async () => {
    if (!jobsUser || jobsUser.role !== "seeker") { Alert.alert("Login required", "Please login as a job seeker to apply."); return; }
    if (applied) return;
    try { await applyJob(job.id, jobsUser.id); Alert.alert("Applied", "Your application has been sent to the employer."); } catch (err: any) { Alert.alert("Apply failed", err?.message || "Please try again."); }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad }]}>
        <TopShade height={120} /><DecorativeCircles />
        <View style={s.headerTop}><TouchableOpacity onPress={() => goBack(router)} style={s.backBtn} activeOpacity={0.84}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity><View style={s.headerBadge}><Feather name="briefcase" size={11} color="rgba(255,255,255,0.86)" /><Text style={s.headerBadgeText}>Job Detail</Text></View></View>
        <View style={s.heroRow}><View style={s.heroIcon}><Feather name="briefcase" size={27} color={ORANGE} /></View><View style={{ flex: 1, minWidth: 0 }}><View style={s.headerPill}><Text style={s.headerPillText}>{job.urgentHiring ? "URGENT HIRING" : "VERIFIED LOCAL JOB"}</Text></View><Text style={s.headerTitle} numberOfLines={2}>{job.title}</Text><Text style={s.headerSub} numberOfLines={2}>{job.company} · {job.location}</Text></View></View>
        <View style={s.summaryCard}><View><Text style={s.summaryNumber}>{job.openings}</Text><Text style={s.summaryLabel}>Openings</Text></View><View style={s.summaryDivider} /><View style={{ flex: 1 }}><Text style={s.summarySalary}>{job.salary}</Text><Text style={s.summaryText}>Salary / compensation</Text></View></View>
      </LinearGradient>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 86 }]} showsVerticalScrollIndicator={false}>
        <View style={s.card}><View style={s.metaRow}><View style={s.metaPill}><Feather name="clock" size={12} color={ORANGE} /><Text style={s.metaPillText}>{job.type}</Text></View>{!!job.shift && <View style={s.metaPill}><Feather name="sun" size={12} color={ORANGE} /><Text style={s.metaPillText}>{job.shift}</Text></View>}{!!job.jobMode && <View style={s.metaPill}><Feather name="map" size={12} color={ORANGE} /><Text style={s.metaPillText}>{job.jobMode}</Text></View>}<View style={s.metaPill}><Feather name="users" size={12} color={ORANGE} /><Text style={s.metaPillText}>{job.openings} openings</Text></View>{!!job.distanceKm && <View style={s.metaPill}><Feather name="navigation" size={12} color={ORANGE} /><Text style={s.metaPillText}>{job.distanceKm} km away</Text></View>}</View><Text style={s.sectionTitle}>Company Details</Text><DetailRow icon="user" label="Employer" value={job.employerName} /><DetailRow icon="briefcase" label="Company" value={job.company} /><DetailRow icon="map-pin" label="Location" value={job.location} /><DetailRow icon="navigation" label="Address" value={job.address} /></View>
        <View style={s.card}><Text style={s.sectionTitle}>Work Details</Text><DetailRow icon="clock" label="Work Time" value={workingTime} /><DetailRow icon="calendar" label="Working Days" value={job.workingDays} /><DetailRow icon="coffee" label="Weekly Off" value={job.weeklyOff} /><DetailRow icon="sun" label="Shift" value={job.shift} /><DetailRow icon="map" label="Job Mode" value={job.jobMode} /><DetailRow icon="zap" label="Joining Preference" value={job.joiningPreference} /><DetailRow icon="calendar" label="Last Date To Apply" value={displayDate(job.lastDateToApply)} /></View>
        <View style={s.card}><Text style={s.sectionTitle}>About the Job</Text><Text style={s.body}>{job.description || "No description provided."}</Text></View>
        <View style={s.card}><Text style={s.sectionTitle}>Requirements</Text><Text style={s.body}>{job.requirements || "No requirements provided."}</Text><DetailRow icon="award" label="Education" value={job.educationRequired} /><DetailRow icon="briefcase" label="Experience" value={job.experienceRequired} /><DetailRow icon="tool" label="Skills" value={job.skillsRequired} /><DetailRow icon="gift" label="Benefits" value={job.benefits} /></View>
        <View style={s.card}><Text style={s.sectionTitle}>Contact Employer</Text><Text style={s.body}>Apply, use Connect T chat for in-app communication, or WhatsApp the employer directly.</Text><View style={s.actionRow}>{canApply && <TouchableOpacity style={[s.actionBtn, applied && s.appliedBtn]} onPress={handleApply} activeOpacity={0.85} disabled={applied}><Feather name={applied ? "check" : "send"} size={16} color={applied ? ORANGE : "white"} /><Text style={[s.actionText, applied && { color: ORANGE }]}>{applied ? "Applied" : "Apply"}</Text></TouchableOpacity>}<TouchableOpacity style={[s.actionBtn, !canChat && s.disabledBtn]} onPress={openChat} activeOpacity={0.85} disabled={!canChat}><Feather name="message-circle" size={16} color="white" /><Text style={s.actionText}>Chat</Text></TouchableOpacity>{phone ? <TouchableOpacity style={s.whatsappBtn} onPress={openWhatsApp} activeOpacity={0.85}><Feather name="phone" size={16} color="white" /><Text style={s.actionText}>WhatsApp</Text></TouchableOpacity> : null}</View>{!canChat && <Text style={s.noteText}>Chat is available for job seekers contacting an employer.</Text>}</View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerTop: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 }, headerBadgeText: { fontSize: 10.5, color: "white", fontFamily: "Inter_700Bold" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 18 }, notFoundHero: { alignItems: "center", paddingTop: 20 }, heroIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: DARK, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  headerPill: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", paddingHorizontal: 9, paddingVertical: 5, marginBottom: 6 }, headerPillText: { color: "white", fontSize: 8.8, letterSpacing: 0.8, fontFamily: "Inter_700Bold" }, headerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 }, headerSub: { fontSize: 11.5, color: "rgba(255,255,255,0.78)", marginTop: 4, fontFamily: "Inter_400Regular", lineHeight: 16 },
  summaryCard: { marginTop: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 17, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }, summaryNumber: { fontSize: 24, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" }, summaryLabel: { fontSize: 9.5, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" }, summaryDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.18)" }, summarySalary: { fontSize: 15, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" }, summaryText: { fontSize: 10.5, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 1 },
  content: { padding: 16, gap: 12 }, card: { backgroundColor: "white", borderRadius: 18, padding: 14, gap: 11, shadowColor: DARK, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: "rgba(254,215,170,0.9)" }, metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, metaPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFF7ED", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: "#FED7AA" }, metaPillText: { fontSize: 10.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" }, body: { fontSize: 12, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 18 }, infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" }, infoIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", alignItems: "center", justifyContent: "center" }, infoLabel: { fontSize: 10.5, color: "#94A3B8", fontFamily: "Inter_400Regular" }, infoValue: { fontSize: 12.5, color: "#0F172A", fontFamily: "Inter_700Bold", marginTop: 1, lineHeight: 17 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 4 }, actionBtn: { flexGrow: 1, minWidth: 96, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: ORANGE, borderRadius: 15, paddingVertical: 12, paddingHorizontal: 12 }, whatsappBtn: { flexGrow: 1, minWidth: 104, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#16A34A", borderRadius: 15, paddingVertical: 12, paddingHorizontal: 12 }, appliedBtn: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, actionText: { color: "white", fontSize: 12.5, fontWeight: "900", fontFamily: "Inter_700Bold" }, disabledBtn: { opacity: 0.45 }, noteText: { fontSize: 10.5, color: "#94A3B8", fontFamily: "Inter_400Regular", lineHeight: 15 },
  emptyCard: { margin: 16, backgroundColor: "white", borderRadius: 20, padding: 24, alignItems: "center", gap: 10, shadowColor: DARK, shadowOpacity: 0.06, shadowRadius: 11, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: "#FED7AA" }, emptyTitle: { fontSize: 17, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" }, emptyText: { fontSize: 11.5, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17 }, emptyBtn: { marginTop: 4, backgroundColor: ORANGE, borderRadius: 999, paddingHorizontal: 17, paddingVertical: 9 }, emptyBtnText: { color: "white", fontSize: 12.5, fontFamily: "Inter_700Bold", fontWeight: "900" },
});
