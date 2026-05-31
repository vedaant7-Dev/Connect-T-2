import React, { useMemo, useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobs, JobApplication } from "@/context/JobsContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";
type ApplicantStatus = "pending" | "shortlisted" | "hired" | "rejected";

function goBack(router: any) { if (router.canGoBack?.()) router.back(); else router.replace("/jobs/(tabs)" as any); }
function displayName(app: JobApplication) { return app.seekerName || `Applicant ${app.seekerId.slice(-4)}`; }
function statusTheme(status: ApplicantStatus) {
  if (status === "hired") return { label: "Hired", icon: "briefcase" as const, color: "#059669", bg: "#D1FAE5", border: "#A7F3D0" };
  if (status === "shortlisted") return { label: "Shortlisted", icon: "star" as const, color: ORANGE, bg: "#FFF7ED", border: "#FED7AA" };
  if (status === "rejected") return { label: "Rejected", icon: "x-circle" as const, color: "#DC2626", bg: "#FEE2E2", border: "#FECACA" };
  return { label: "Applied", icon: "clock" as const, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
}

function InfoLine({ icon, label, text }: { icon: keyof typeof Feather.glyphMap; label: string; text?: string }) {
  if (!text) return null;
  return <View style={s.infoLine}><Feather name={icon} size={13} color="#64748B" /><Text style={s.infoText}><Text style={s.infoLabel}>{label}: </Text>{text}</Text></View>;
}

function AppNotice({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.noticeOverlay}><View style={s.noticeCard}><View style={s.noticeIcon}><Feather name="info" size={26} color={ORANGE} /></View><Text style={s.noticeTitle}>{title}</Text><Text style={s.noticeMsg}>{message}</Text><TouchableOpacity style={s.noticeOk} onPress={onClose}><Text style={s.noticeOkText}>OK</Text></TouchableOpacity></View></View></Modal>;
}

function ApplicantCard({ app, status, jobId, onShortlist, onReject, onHire, onNotice }: { app: JobApplication; status: ApplicantStatus; jobId: string; onShortlist: () => Promise<void>; onReject: () => Promise<void>; onHire: () => Promise<void>; onNotice: (title: string, message: string) => void }) {
  const router = useRouter();
  const theme = statusTheme(status);
  const [busy, setBusy] = useState(false);
  const name = displayName(app);
  const run = async (fn: () => Promise<void>, label: string) => { if (busy) return; setBusy(true); try { await fn(); onNotice("Updated", `${name} marked as ${label}.`); } catch (err: any) { onNotice("Action failed", err?.message || "Please try again."); } finally { setBusy(false); } };
  const openChat = () => router.push({ pathname: "/jobs/chat/[employerId]", params: { employerId: app.seekerId, jobId, peerName: name } } as any);

  return (
    <View style={s.applicantCard}>
      <View style={s.applicantTop}>
        <View style={[s.avatar, { backgroundColor: theme.bg, borderColor: theme.border }]}><Feather name={theme.icon} size={16} color={theme.color} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={s.userName} numberOfLines={1}>{name}</Text><Text style={s.userSub} numberOfLines={1}>{app.seekerEmail || app.seekerPhone || "Applicant profile"}</Text></View>
        <View style={[s.statusPill, { backgroundColor: theme.bg, borderColor: theme.border }]}><Text style={[s.statusPillText, { color: theme.color }]}>{theme.label}</Text></View>
      </View>
      <View style={s.infoBox}>
        <InfoLine icon="phone" label="Phone" text={app.seekerPhone ? `+91 ${String(app.seekerPhone).replace(/\D/g, "").slice(-10)}` : undefined} />
        <InfoLine icon="mail" label="Email" text={app.seekerEmail} />
        <InfoLine icon="award" label="Qualification" text={app.seekerQualification} />
        <InfoLine icon="tool" label="Skills" text={app.seekerSkills} />
        <InfoLine icon="user" label="Applicant ID" text={app.seekerId} />
      </View>
      <View style={s.actionRow}>
        <TouchableOpacity style={[s.smallBtn, s.orangeBtn]} onPress={openChat} activeOpacity={0.85}><Feather name="message-square" size={13} color={ORANGE} /><Text style={[s.smallBtnText, { color: ORANGE }]}>Chat</Text></TouchableOpacity>
        <TouchableOpacity style={[s.smallBtn, s.orangeBtn]} onPress={() => onNotice("Resume", "Applicant profile details are shown here. Ask the applicant to upload/share resume from the apply screen if a separate PDF is needed.")} activeOpacity={0.85}><Feather name="file-text" size={13} color={ORANGE} /><Text style={[s.smallBtnText, { color: ORANGE }]}>Resume</Text></TouchableOpacity>
        {status !== "shortlisted" && status !== "hired" && <TouchableOpacity style={[s.smallBtn, s.orangeBtn, busy && s.disabledBtn]} disabled={busy} onPress={() => run(onShortlist, "shortlisted")} activeOpacity={0.85}><Feather name="star" size={13} color={ORANGE} /><Text style={[s.smallBtnText, { color: ORANGE }]}>Shortlist</Text></TouchableOpacity>}
        {status !== "hired" && <TouchableOpacity style={[s.smallBtn, s.orangeBtn, busy && s.disabledBtn]} disabled={busy} onPress={() => run(onHire, "hired")} activeOpacity={0.85}><Feather name="check-circle" size={13} color={ORANGE} /><Text style={[s.smallBtnText, { color: ORANGE }]}>Hire</Text></TouchableOpacity>}
        {status !== "rejected" && status !== "hired" && <TouchableOpacity style={[s.smallBtn, s.rejectBtn, busy && s.disabledBtn]} disabled={busy} onPress={() => run(onReject, "rejected")} activeOpacity={0.85}><Feather name="x-circle" size={13} color="#DC2626" /><Text style={[s.smallBtnText, { color: "#DC2626" }]}>Reject</Text></TouchableOpacity>}
      </View>
    </View>
  );
}

function HeaderStat({ value, label }: { value: number; label: string }) { return <View style={s.headerStatItem}><Text style={s.headerStatNum}>{value}</Text><Text style={s.headerStatLabel}>{label}</Text></View>; }
function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) { return <View style={s.card}><View style={s.cardHeader}><Text style={s.sectionTitle}>{title}</Text><View style={s.countPill}><Text style={s.countText}>{count}</Text></View></View>{children}</View>; }

export default function ActiveJobDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { jobs, shortlistApplicant, rejectApplicant, hireApplicant } = useJobs();
  const [notice, setNotice] = useState({ visible: false, title: "", message: "" });
  const job = useMemo(() => jobs.find((j) => j.id === params.jobId) ?? null, [jobs, params.jobId]);
  const topPad = (Platform.OS === "web" ? 48 : insets.top) + 10;
  const onNotice = (title: string, message: string) => setNotice({ visible: true, title, message });

  if (!job) return <View style={s.root}><LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} style={[s.header, { paddingTop: topPad }]}><TopShade height={90} /><DecorativeCircles /><View style={s.headerTop}><TouchableOpacity onPress={() => goBack(router)} style={s.backBtn}><Feather name="chevron-left" size={20} color="white" /></TouchableOpacity></View><View style={s.notFoundHero}><View style={s.heroIcon}><Feather name="alert-circle" size={22} color={ORANGE} /></View><Text style={s.headerTitle}>Job not found</Text></View></LinearGradient></View>;

  const applications = (job.applications || []) as JobApplication[];
  const appMap = new Map(applications.map((app) => [app.seekerId, app]));
  const applicantIds = Array.from(new Set([...job.applicants, ...applications.map((app) => app.seekerId)]));
  const allApplicants: JobApplication[] = applicantIds.map((id) => appMap.get(id) || { id: `${job.id}_${id}`, jobId: job.id, seekerId: id, status: "applied" });
  const pending = allApplicants.filter((app) => !job.hired.includes(app.seekerId) && !job.shortlisted.includes(app.seekerId) && !job.rejected.includes(app.seekerId));
  const shortlisted = allApplicants.filter((app) => !job.hired.includes(app.seekerId) && job.shortlisted.includes(app.seekerId));
  const hired = allApplicants.filter((app) => job.hired.includes(app.seekerId));
  const rejected = allApplicants.filter((app) => !job.hired.includes(app.seekerId) && job.rejected.includes(app.seekerId));
  const render = (items: JobApplication[], status: ApplicantStatus) => items.length === 0 ? <View style={s.emptyInline}><Feather name="users" size={30} color="#CBD5E1" /><Text style={s.emptyText}>No applicants in this section</Text></View> : items.map((app) => <ApplicantCard key={`${status}-${app.seekerId}`} app={app} status={status} jobId={job.id} onShortlist={() => shortlistApplicant(job.id, app.seekerId)} onReject={() => rejectApplicant(job.id, app.seekerId)} onHire={() => hireApplicant(job.id, app.seekerId)} onNotice={onNotice} />);

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad }]}> 
        <TopShade height={100} /><DecorativeCircles />
        <View style={s.headerTop}><TouchableOpacity onPress={() => goBack(router)} style={s.backBtn} activeOpacity={0.84}><Feather name="chevron-left" size={20} color="white" /></TouchableOpacity><View style={s.headerBadge}><Feather name="users" size={11} color="rgba(255,255,255,0.86)" /><Text style={s.headerBadgeText}>Applicants</Text></View></View>
        <View style={s.heroRow}><View style={s.heroIcon}><Feather name="briefcase" size={22} color={ORANGE} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.headerTitle} numberOfLines={2}>{job.title}</Text><Text style={s.headerSub} numberOfLines={2}>{job.company} · {job.location}</Text></View></View>
        <View style={s.headerStats}><HeaderStat value={job.openings} label="Openings" /><View style={s.headerStatDivider} /><HeaderStat value={allApplicants.length} label="Applicants" /><View style={s.headerStatDivider} /><HeaderStat value={hired.length} label="Hired" /></View>
      </LinearGradient>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 86 }]} showsVerticalScrollIndicator={false}>
        <Section title="Pending Review" count={pending.length}>{render(pending, "pending")}</Section>
        <Section title="Shortlisted" count={shortlisted.length}>{render(shortlisted, "shortlisted")}</Section>
        <Section title="Hired" count={hired.length}>{render(hired, "hired")}</Section>
        <Section title="Rejected" count={rejected.length}>{render(rejected, "rejected")}</Section>
      </ScrollView>
      <AppNotice visible={notice.visible} title={notice.title} message={notice.message} onClose={() => setNotice((prev) => ({ ...prev, visible: false }))} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  headerTop: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  headerBadgeText: { fontSize: 10, color: "white", fontFamily: "Inter_700Bold" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 8 },
  notFoundHero: { alignItems: "center", paddingTop: 18 },
  heroIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: DARK, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  headerTitle: { fontSize: 18.5, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.78)", marginTop: 3, fontFamily: "Inter_400Regular", lineHeight: 15 },
  headerStats: { marginTop: 10, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 15, padding: 9, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  headerStatItem: { flex: 1, alignItems: "center" },
  headerStatNum: { fontSize: 17.5, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  headerStatLabel: { fontSize: 9, color: "rgba(255,255,255,0.68)", fontFamily: "Inter_600SemiBold", marginTop: 1 },
  headerStatDivider: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.18)" },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: "rgba(226,232,240,0.95)", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" },
  countPill: { minWidth: 28, height: 24, borderRadius: 999, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  countText: { fontSize: 11, color: ORANGE, fontFamily: "Inter_700Bold" },
  applicantCard: { borderRadius: 17, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", padding: 12, gap: 10 },
  applicantTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, flexShrink: 0 },
  userName: { fontSize: 13.5, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" },
  userSub: { marginTop: 1, fontSize: 10.5, color: "#64748B", fontFamily: "Inter_400Regular" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusPillText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  infoBox: { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 10, gap: 7 },
  infoLine: { flexDirection: "row", gap: 7, alignItems: "flex-start" },
  infoLabel: { fontFamily: "Inter_700Bold", color: "#334155" },
  infoText: { flex: 1, fontSize: 11.5, color: "#475569", fontFamily: "Inter_400Regular", lineHeight: 16 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  orangeBtn: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  rejectBtn: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  disabledBtn: { opacity: 0.55 },
  smallBtnText: { fontSize: 10.5, fontFamily: "Inter_700Bold" },
  emptyInline: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { color: "#94A3B8", fontSize: 12, fontFamily: "Inter_400Regular" },
  noticeOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", padding: 22 },
  noticeCard: { width: "100%", maxWidth: 340, backgroundColor: "white", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  noticeIcon: { width: 58, height: 58, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 12, backgroundColor: "#FFF7ED" },
  noticeTitle: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" },
  noticeMsg: { marginTop: 6, fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  noticeOk: { marginTop: 18, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, alignItems: "center", backgroundColor: ORANGE },
  noticeOkText: { fontSize: 13, color: "white", fontFamily: "Inter_700Bold" },
});
