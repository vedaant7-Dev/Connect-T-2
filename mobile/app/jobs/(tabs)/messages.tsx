import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { useJobs } from "@/context/JobsContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}
function getInitials(name: string) { return name.split(" ").map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "CT"; }
const AVATAR_COLORS = [ORANGE, DARK, "#F97316", "#0369A1", "#7C3AED", "#B45309"];
function avatarColor(str: string) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % AVATAR_COLORS.length; return AVATAR_COLORS[h]; }

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser } = useJobsAuth();
  const { jobs } = useJobs();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const conversations = useMemo(() => {
    if (!jobsUser) return [];
    if (jobsUser.role === "employer") {
      return jobs.flatMap((job) => (job.applications || []).map((app) => ({ peerId: app.seekerId, peerName: app.seekerName || `Applicant ${app.seekerId.slice(-4)}`, company: app.seekerName || `Applicant ${app.seekerId.slice(-4)}`, jobTitle: job.title, jobId: job.id, lastActivity: job.updatedAt || job.createdAt, status: app.status })));
    }
    return jobs.filter((job) => job.applicants.includes(jobsUser.id)).map((job) => { const app = (job.applications || []).find((item) => item.seekerId === jobsUser.id); return { peerId: job.employerId, peerName: job.employerName || job.company, company: job.company, jobTitle: job.title, jobId: job.id, lastActivity: job.updatedAt || job.createdAt, status: app?.status || (job.shortlisted.includes(jobsUser.id) ? "shortlisted" : job.rejected.includes(jobsUser.id) ? "rejected" : "applied") }; });
  }, [jobs, jobsUser]);

  const filtered = search.trim() ? conversations.filter((c) => c.company.toLowerCase().includes(search.toLowerCase()) || c.jobTitle.toLowerCase().includes(search.toLowerCase()) || c.peerName.toLowerCase().includes(search.toLowerCase())) : conversations;

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad + 12 }]}> 
        <TopShade height={110} /><DecorativeCircles />
        <View style={s.headerRow}><View style={{ flex: 1 }}><View style={s.headerPill}><Feather name="message-circle" size={11} color="rgba(255,255,255,0.9)" /><Text style={s.headerPillText}>JOB PORTAL</Text></View><Text style={s.headerTitle}>Messages</Text><Text style={s.headerSub}>{conversations.length > 0 ? `${conversations.length} active conversation${conversations.length > 1 ? "s" : ""}` : jobsUser?.role === "employer" ? "Applicants will appear here" : "Apply to jobs to start chatting"}</Text></View><View style={s.headerBadgeWrap}><Feather name="message-circle" size={18} color="white" />{conversations.length > 0 && <View style={s.notifBubble}><Text style={s.notifBubbleText}>{conversations.length}</Text></View>}</View></View>
        <View style={s.searchBar}><Feather name="search" size={15} color="#94A3B8" /><TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search conversations…" placeholderTextColor="#94A3B8" />{search.length > 0 && <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}><Feather name="x" size={15} color="#94A3B8" /></TouchableOpacity>}</View>
      </LinearGradient>

      {filtered.length === 0 ? <View style={s.empty}><View style={s.emptyIconWrap}><Feather name="message-circle" size={40} color={ORANGE} /></View><Text style={s.emptyTitle}>{search ? "No results found" : "No conversations yet"}</Text><Text style={s.emptySub}>{search ? "Try a different search term" : jobsUser?.role === "employer" ? "Applicants who apply to your jobs will appear here." : "Apply to jobs to start messaging employers directly."}</Text>{!search && jobsUser?.role !== "employer" && <TouchableOpacity style={s.browseBtn} onPress={() => router.replace("/jobs/(tabs)" as any)} activeOpacity={0.85}><LinearGradient colors={[DARK, ORANGE, "#F97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.browseBtnGrad}><Feather name="briefcase" size={15} color="white" /><Text style={s.browseBtnText}>Browse Jobs</Text></LinearGradient></TouchableOpacity>}</View> : <FlatList data={filtered} keyExtractor={(item) => `${item.jobId}-${item.peerId}`} contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 8) + 90 }]} showsVerticalScrollIndicator={false} renderItem={({ item }) => { const color = avatarColor(item.company); const initials = getInitials(item.company); const isShortlisted = item.status === "shortlisted"; const isRejected = item.status === "rejected"; const isHired = item.status === "hired"; return <TouchableOpacity style={s.contactCard} activeOpacity={0.82} onPress={() => router.push({ pathname: "/jobs/chat/[employerId]", params: { employerId: item.peerId, jobId: item.jobId, peerName: item.peerName } } as any)}><View style={[s.avatar, { backgroundColor: color }]}><Text style={s.avatarText}>{initials}</Text></View><View style={{ flex: 1 }}><View style={s.contactTop}><Text style={s.contactName} numberOfLines={1}>{item.company}</Text><Text style={s.contactTime}>{timeAgo(item.lastActivity)}</Text></View><Text style={s.contactJob} numberOfLines={1}>{item.jobTitle}</Text><View style={s.statusRow}>{isHired ? <View style={[s.statusPill, { backgroundColor: "#FFF7ED" }]}><Feather name="briefcase" size={10} color={ORANGE} /><Text style={[s.statusPillText, { color: ORANGE }]}>Hired</Text></View> : isShortlisted ? <View style={[s.statusPill, { backgroundColor: "#FFF7ED" }]}><Feather name="check-circle" size={10} color={ORANGE} /><Text style={[s.statusPillText, { color: ORANGE }]}>Shortlisted</Text></View> : isRejected ? <View style={[s.statusPill, { backgroundColor: "#FEE2E2" }]}><Feather name="x-circle" size={10} color="#DC2626" /><Text style={[s.statusPillText, { color: "#DC2626" }]}>Not selected</Text></View> : <View style={[s.statusPill, { backgroundColor: "#FFEDD5" }]}><Feather name="clock" size={10} color={ORANGE} /><Text style={[s.statusPillText, { color: ORANGE }]}>Pending review</Text></View>}</View></View><Feather name="chevron-right" size={16} color="#CBD5E1" /></TouchableOpacity>; }} ListHeaderComponent={<Text style={s.listHeader}>{filtered.length} conversation{filtered.length > 1 ? "s" : ""}</Text>} />}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 13, gap: 12 },
  headerPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", marginBottom: 8 },
  headerPillText: { fontSize: 9, letterSpacing: 0.9, color: "white", fontFamily: "Inter_700Bold" }, headerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 }, headerSub: { fontSize: 11.5, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 16 },
  headerBadgeWrap: { position: "relative", width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" }, notifBubble: { position: "absolute", top: 5, right: 5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: "#FCD34D", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }, notifBubbleText: { fontSize: 8, fontWeight: "800", color: "#92400E", fontFamily: "Inter_700Bold" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 11, gap: 10, shadowColor: DARK, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 }, searchInput: { flex: 1, fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular", padding: 0 },
  list: { paddingHorizontal: 16, paddingTop: 8 }, listHeader: { fontSize: 11.5, color: "#64748B", fontFamily: "Inter_600SemiBold", paddingVertical: 10 }, contactCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "white", borderRadius: 18, padding: 13, marginBottom: 10, shadowColor: DARK, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: "rgba(254,215,170,0.9)" }, avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 15, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  contactTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2, gap: 9 }, contactName: { fontSize: 13.5, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold", flex: 1 }, contactTime: { fontSize: 10.5, color: "#94A3B8", fontFamily: "Inter_400Regular" }, contactJob: { fontSize: 11.5, color: "#64748B", fontFamily: "Inter_400Regular", marginBottom: 7 }, statusRow: { flexDirection: "row" }, statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }, statusPillText: { fontSize: 9.5, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 }, emptyIconWrap: { width: 78, height: 78, borderRadius: 26, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 4, borderWidth: 1.5, borderColor: "#FED7AA" }, emptyTitle: { fontSize: 17, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold", textAlign: "center" }, emptySub: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 }, browseBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 }, browseBtnGrad: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 22, paddingVertical: 12 }, browseBtnText: { fontSize: 13, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
});
