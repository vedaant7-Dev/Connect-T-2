import React, { useState } from "react";
import { Image, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useJobsAuth } from "@/context/JobsAuthContext";

type TemplateId = "classic" | "modern" | "minimal";
const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

const TEMPLATES: { id: TemplateId; name: string; desc: string; accent: string }[] = [
  { id: "classic", name: "Classic", desc: "Orange civic header, clean sections", accent: ORANGE },
  { id: "modern", name: "Modern", desc: "Dark header with orange accents", accent: DARK },
  { id: "minimal", name: "Minimal", desc: "Simple profile-first format", accent: "#92400E" },
];

function initials(name?: string) { return String(name || "CT").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(); }
function splitList(value?: string) { return String(value || "").split(",").map((i) => i.trim()).filter(Boolean); }
function goBack(router: any) { if (router.canGoBack?.()) router.back(); else router.replace("/jobs/(tabs)/resume" as any); }
function esc(value?: string) { return String(value || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c)); }

function createResumeHtml(user: any, selected: TemplateId) {
  const skills = splitList(user.skills).map((s) => `<span class="chip">${esc(s)}</span>`).join("") || "—";
  const contact = `+91 ${esc(user.phone)}${user.email ? ` · ${esc(user.email)}` : ""}${user.location ? ` · ${esc(user.location)}` : ""}`;
  const title = esc(user.currentRole || user.qualification || "Job Seeker");
  const theme = selected === "modern" ? "#0f172a" : selected === "minimal" ? "#92400e" : ORANGE;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${esc(user.name)} Resume</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;margin:0;background:#f1f5f9;color:#0f172a}.page{max-width:820px;margin:0 auto;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.12)}.head{background:${theme};color:white;padding:28px}.name{font-size:30px;font-weight:800;margin:0}.role{font-size:16px;margin-top:5px;opacity:.9}.contact{font-size:12px;margin-top:12px;line-height:1.5}.body{padding:26px}.sec{margin-bottom:20px}.sec h2{font-size:14px;letter-spacing:1px;color:${theme};border-bottom:2px solid ${theme};padding-bottom:7px;margin:0 0 10px}.text{font-size:14px;line-height:1.55;color:#334155}.muted{font-size:13px;color:#64748b;margin-top:4px}.chip{display:inline-block;border:1px solid #fed7aa;background:#fff7ed;color:#ea580c;border-radius:999px;padding:6px 10px;margin:4px;font-size:12px;font-weight:700}.exp{border-left:3px solid #fed7aa;padding-left:12px;margin-top:8px}.print{position:fixed;right:18px;bottom:18px;background:${theme};color:white;border:0;border-radius:999px;padding:12px 18px;font-weight:800}@media print{body{background:white}.page{box-shadow:none}.print{display:none}}</style></head><body><div class="page"><div class="head"><h1 class="name">${esc(user.name)}</h1><div class="role">${title}</div><div class="contact">${contact}</div></div><div class="body">${user.about ? `<div class="sec"><h2>OBJECTIVE</h2><div class="text">${esc(user.about)}</div></div>` : ""}<div class="sec"><h2>EDUCATION</h2><div class="text">${esc(user.qualification || "—")}</div>${user.collegeName ? `<div class="muted">${esc(user.collegeName)}${user.fieldOfStudy ? ` · ${esc(user.fieldOfStudy)}` : ""}</div>` : ""}</div><div class="sec"><h2>WORK EXPERIENCE</h2><div class="text">${user.experience ? `Total Experience: ${esc(user.experience)}<br/>` : ""}${user.currentCompany ? `<div class="exp"><b>${esc(user.currentRole || "Employee")}</b><br/>${esc(user.currentCompany)} · Current</div>` : ""}${user.previousCompany ? `<div class="exp"><b>${esc(user.previousRole || "Employee")}</b><br/>${esc(user.previousCompany)} · Previous</div>` : ""}${!user.experience && !user.currentCompany && !user.previousCompany ? "—" : ""}</div></div><div class="sec"><h2>SKILLS</h2><div>${skills}</div></div>${user.languages ? `<div class="sec"><h2>LANGUAGES</h2><div class="text">${esc(user.languages)}</div></div>` : ""}</div></div><button class="print" onclick="window.print()">Save / Print PDF</button></body></html>`;
}

function HeaderAvatar({ user, dark = false }: { user: any; dark?: boolean }) {
  return <View style={[r.avatar, dark && r.avatarDark]}>{user.profilePhoto ? <Image source={{ uri: user.profilePhoto }} style={r.avatarImg} /> : <Text style={r.avatarText}>{initials(user.name)}</Text>}</View>;
}
function ResumeSection({ title, color = ORANGE, children }: { title: string; color?: string; children: React.ReactNode }) {
  return <View style={r.section}><View style={[r.sectionTitleRow, { borderBottomColor: color }]}><Text style={[r.sectionTitle, { color }]}>{title}</Text></View><View style={r.sectionBody}>{children}</View></View>;
}
function Skills({ skills, tone = "orange" }: { skills?: string; tone?: "orange" | "slate" }) {
  const list = splitList(skills);
  if (!list.length) return <Text style={r.bodyText}>—</Text>;
  return <View style={r.skillsWrap}>{list.map((skill, index) => <View key={`${skill}-${index}`} style={[r.skillChip, tone === "slate" && r.skillChipSlate]}><Text style={[r.skillText, tone === "slate" && r.skillTextSlate]}>{skill}</Text></View>)}</View>;
}
function Experience({ user }: { user: any }) {
  if (!user.experience && !user.currentCompany && !user.previousCompany) return <Text style={r.bodyText}>—</Text>;
  return <View style={{ gap: 8 }}>{!!user.experience && <Text style={r.bodyText}>Total Experience: {user.experience}</Text>}{!!user.currentCompany && <View style={r.expEntry}><Text style={r.expRole}>{user.currentRole || "Employee"}</Text><Text style={r.expCompany}>{user.currentCompany} · Current</Text></View>}{!!user.previousCompany && <View style={r.expEntry}><Text style={r.expRole}>{user.previousRole || "Employee"}</Text><Text style={r.expCompany}>{user.previousCompany} · Previous</Text></View>}</View>;
}
function ClassicResume({ user }: { user: any }) { return <View style={r.page}><LinearGradient colors={[DARK, ORANGE, "#F97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={r.classicHeader}><HeaderAvatar user={user} /><View style={{ flex: 1 }}><Text style={r.classicName}>{user.name}</Text><Text style={r.classicRole}>{user.currentRole || user.qualification || "Job Seeker"}</Text><Text style={r.classicContact}>+91 {user.phone}{user.email ? ` · ${user.email}` : ""}{user.location ? ` · ${user.location}` : ""}</Text></View></LinearGradient><ResumeBody user={user} /></View>; }
function ModernResume({ user }: { user: any }) { return <View style={r.page}><View style={r.modHeader}><HeaderAvatar user={user} dark /><View style={{ flex: 1 }}><Text style={r.modName}>{user.name}</Text><Text style={r.modRole}>{user.currentRole || user.qualification || "Job Seeker"}</Text><Text style={r.modContact}>+91 {user.phone}{user.email ? ` · ${user.email}` : ""}{user.location ? ` · ${user.location}` : ""}</Text></View></View><View style={r.modAccentBar} /><ResumeBody user={user} /></View>; }
function MinimalResume({ user }: { user: any }) { return <View style={r.page}><View style={r.minimalHeader}><Text style={r.minimalName}>{user.name}</Text><View style={r.minimalAccentLine} /><Text style={r.minimalRole}>{user.currentRole || user.qualification || "Job Seeker"}</Text><Text style={r.minimalContact}>+91 {user.phone}{user.email ? ` · ${user.email}` : ""}{user.location ? ` · ${user.location}` : ""}</Text></View><ResumeBody user={user} minimal /></View>; }
function ResumeBody({ user, minimal = false }: { user: any; minimal?: boolean }) {
  const color = minimal ? "#92400E" : ORANGE;
  return <View style={r.body}>{!!user.about && <ResumeSection title={minimal ? "Career Objective" : "OBJECTIVE"} color={color}><Text style={r.bodyText}>{user.about}</Text></ResumeSection>}<ResumeSection title={minimal ? "Education" : "EDUCATION"} color={color}><Text style={r.bodyText}>{user.qualification || "—"}</Text>{user.collegeName ? <Text style={r.mutedText}>{user.collegeName}{user.fieldOfStudy ? ` · ${user.fieldOfStudy}` : ""}</Text> : null}</ResumeSection><ResumeSection title={minimal ? "Work Experience" : "WORK EXPERIENCE"} color={color}><Experience user={user} /></ResumeSection><ResumeSection title={minimal ? "Skills" : "SKILLS"} color={color}><Skills skills={user.skills} tone={minimal ? "slate" : "orange"} /></ResumeSection>{!!user.languages && <ResumeSection title={minimal ? "Languages" : "LANGUAGES"} color={color}><Text style={r.bodyText}>{user.languages}</Text></ResumeSection>}</View>;
}

function AppNotice({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.noticeOverlay}><View style={styles.noticeCard}><View style={styles.noticeIcon}><Feather name="file-text" size={25} color={ORANGE} /></View><Text style={styles.noticeTitle}>{title}</Text><Text style={styles.noticeMsg}>{message}</Text><TouchableOpacity style={styles.noticeOk} onPress={onClose}><Text style={styles.noticeOkText}>OK</Text></TouchableOpacity></View></View></Modal>;
}

export default function ResumeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const router = useRouter();
  const { jobsUser } = useJobsAuth();
  const [selected, setSelected] = useState<TemplateId>("classic");
  const [notice, setNotice] = useState({ visible: false, title: "", message: "" });
  if (!jobsUser) return null;

  const openPrintableResume = async () => {
    const html = createResumeHtml(jobsUser, selected);
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    try {
      await Linking.openURL(url);
      setNotice({ visible: true, title: "Resume opened", message: "Use browser print/share option and choose Save as PDF." });
    } catch {
      setNotice({ visible: true, title: "Resume ready", message: "The resume preview is ready. Take screenshot/share now; native PDF export can be added with expo-print after final APK QA." });
    }
  };

  if (jobsUser.role === "employer") {
    return <View style={styles.root}><LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} style={[styles.header, { paddingTop: topPad + 10 }]}><View style={styles.headerRow}><TouchableOpacity onPress={() => goBack(router)} style={styles.backBtn}><Feather name="x" size={20} color="white" /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Company Profile</Text><Text style={styles.headerSub}>Resume builder is for job seekers</Text></View></View></LinearGradient><View style={styles.employerBox}><Feather name="briefcase" size={38} color={ORANGE} /><Text style={styles.employerTitle}>Employer profile ready</Text><Text style={styles.employerText}>Use Profile tab to maintain company details visible to applicants.</Text><TouchableOpacity style={styles.updateBtn} onPress={() => goBack(router)}><Feather name="edit-2" size={16} color={ORANGE} /><Text style={styles.updateBtnText}>Go Back</Text></TouchableOpacity></View></View>;
  }

  return <View style={styles.root}><LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 10 }]}><View style={styles.headerRow}><TouchableOpacity onPress={() => goBack(router)} style={styles.backBtn} activeOpacity={0.84}><Feather name="x" size={20} color="white" /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Your Resume</Text><Text style={styles.headerSub}>Generated from your Job Portal profile</Text></View><TouchableOpacity onPress={openPrintableResume} style={styles.shareBtn} activeOpacity={0.85}><Feather name="download" size={16} color="white" /><Text style={styles.shareBtnText}>PDF</Text></TouchableOpacity></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>{TEMPLATES.map((template) => <TouchableOpacity key={template.id} style={[styles.templateChip, selected === template.id && styles.templateChipActive]} onPress={() => setSelected(template.id)} activeOpacity={0.8}><View style={[styles.templateDot, { backgroundColor: template.accent }]} /><View><Text style={[styles.templateName, selected === template.id && { color: ORANGE }]}>{template.name}</Text><Text style={styles.templateDesc}>{template.desc}</Text></View></TouchableOpacity>)}</ScrollView></LinearGradient><ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.preview, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]} showsVerticalScrollIndicator={false}><View style={styles.paperShadow}>{selected === "classic" && <ClassicResume user={jobsUser} />}{selected === "modern" && <ModernResume user={jobsUser} />}{selected === "minimal" && <MinimalResume user={jobsUser} />}</View><View style={styles.hint}><Feather name="info" size={14} color={ORANGE} /><Text style={styles.hintText}>PDF opens a printable resume. Choose browser/system Print → Save as PDF.</Text></View><TouchableOpacity style={styles.updateBtn} onPress={() => router.replace("/jobs/(tabs)/profile" as any)} activeOpacity={0.85}><Feather name="edit-2" size={16} color={ORANGE} /><Text style={styles.updateBtnText}>Update Profile to Refresh Resume</Text></TouchableOpacity></ScrollView><AppNotice visible={notice.visible} title={notice.title} message={notice.message} onClose={() => setNotice((prev) => ({ ...prev, visible: false }))} /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular", marginTop: 3 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  shareBtnText: { fontSize: 10, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  templateRow: { gap: 10, paddingBottom: 4 },
  templateChip: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 2, borderColor: "transparent", minWidth: 168 },
  templateChipActive: { borderColor: "white", backgroundColor: "white" },
  templateDot: { width: 13, height: 13, borderRadius: 7 },
  templateName: { fontSize: 13, fontWeight: "900", color: "#334155", fontFamily: "Inter_700Bold" },
  templateDesc: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", maxWidth: 135, lineHeight: 14 },
  preview: { padding: 16 },
  paperShadow: { shadowColor: DARK, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 8, borderRadius: 16, backgroundColor: "white" },
  hint: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, padding: 14, backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#FED7AA" },
  hintText: { flex: 1, fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 18 },
  updateBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", backgroundColor: "white", borderRadius: 18, padding: 15, marginTop: 12, borderWidth: 1.5, borderColor: "#FED7AA", shadowColor: DARK, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  updateBtnText: { fontSize: 13, fontWeight: "900", color: ORANGE, fontFamily: "Inter_700Bold" },
  employerBox: { margin: 16, backgroundColor: "white", borderRadius: 24, padding: 26, alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#FED7AA" },
  employerTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" },
  employerText: { fontSize: 13, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 19 },
  noticeOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", padding: 22 },
  noticeCard: { width: "100%", maxWidth: 340, backgroundColor: "white", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  noticeIcon: { width: 54, height: 54, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", marginBottom: 12 },
  noticeTitle: { fontSize: 17, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" },
  noticeMsg: { marginTop: 6, fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  noticeOk: { marginTop: 18, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, alignItems: "center", backgroundColor: ORANGE },
  noticeOkText: { fontSize: 13, color: "white", fontFamily: "Inter_700Bold" },
});
const r = StyleSheet.create({
  page: { backgroundColor: "white", borderRadius: 16, overflow: "hidden" },
  classicHeader: { padding: 20, flexDirection: "row", gap: 16, alignItems: "center" },
  avatar: { width: 74, height: 74, borderRadius: 37, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.55)" },
  avatarDark: { backgroundColor: ORANGE, borderColor: "#FB923C" }, avatarImg: { width: 74, height: 74, borderRadius: 37 }, avatarText: { fontSize: 26, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  classicName: { fontSize: 21, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 }, classicRole: { fontSize: 13, color: "rgba(255,255,255,0.86)", fontFamily: "Inter_400Regular", marginTop: 3 }, classicContact: { fontSize: 10, color: "rgba(255,255,255,0.82)", fontFamily: "Inter_400Regular", marginTop: 9, lineHeight: 15 },
  body: { padding: 17 }, modHeader: { backgroundColor: "#0F172A", padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }, modName: { fontSize: 22, color: "white", fontWeight: "900", fontFamily: "Inter_700Bold" }, modRole: { fontSize: 13, color: "#FDBA74", fontFamily: "Inter_600SemiBold", marginTop: 3 }, modContact: { fontSize: 10, color: "#CBD5E1", fontFamily: "Inter_400Regular", marginTop: 8, lineHeight: 15 }, modAccentBar: { height: 5, backgroundColor: ORANGE },
  minimalHeader: { padding: 22, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }, minimalName: { fontSize: 24, color: "#0F172A", fontWeight: "900", fontFamily: "Inter_700Bold" }, minimalAccentLine: { width: 64, height: 3, borderRadius: 999, backgroundColor: ORANGE, marginVertical: 9 }, minimalRole: { fontSize: 13, color: ORANGE, fontFamily: "Inter_700Bold" }, minimalContact: { marginTop: 8, fontSize: 10, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 15 },
  section: { marginBottom: 15 }, sectionTitleRow: { borderBottomWidth: 2, paddingBottom: 5, marginBottom: 8 }, sectionTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter_700Bold" }, sectionBody: { gap: 6 }, bodyText: { fontSize: 12, color: "#334155", lineHeight: 18, fontFamily: "Inter_400Regular" }, mutedText: { fontSize: 11, color: "#64748B", lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 3 },
  expEntry: { paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: "#FED7AA" }, expRole: { fontSize: 12, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" }, expCompany: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, skillChip: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }, skillChipSlate: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }, skillText: { fontSize: 10, color: ORANGE, fontFamily: "Inter_700Bold" }, skillTextSlate: { color: "#334155" },
});
