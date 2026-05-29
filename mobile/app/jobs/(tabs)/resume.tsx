import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { calcProfileCompletion, useJobsAuth } from "@/context/JobsAuthContext";

const SECTIONS = [
  { key: "personal", label: "Personal Info", icon: "user" as const, fields: ["name", "email", "dob", "location", "languages"] },
  { key: "status", label: "Work Status", icon: "briefcase" as const, fields: ["currentStatus", "experience"] },
  { key: "education", label: "Education", icon: "book-open" as const, fields: ["qualification"] },
  { key: "skills", label: "Skills", icon: "zap" as const, fields: ["skills"] },
  { key: "about", label: "About / Summary", icon: "file-text" as const, fields: ["about"] },
];

function getSectionCompletion(user: any, fields: string[]) {
  const filled = fields.filter((f) => user[f] && String(user[f]).trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

export default function ResumeTab() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser } = useJobsAuth();
  const router = useRouter();

  if (!jobsUser) return null;

  const isEmployer = jobsUser.role === "employer";
  const completion = isEmployer ? 100 : calcProfileCompletion(jobsUser);
  const isReady = completion >= 100;

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#064E3B", "#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 12 }]}
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={s.headerPill}>
              <Text style={s.headerPillText}>{isEmployer ? "EMPLOYER PROFILE" : "RESUME BUILDER"}</Text>
            </View>
            <Text style={s.headerTitle}>{isEmployer ? "Company Profile" : "My Resume"}</Text>
            <Text style={s.headerSub}>
              {isEmployer
                ? "Maintain a trusted employer profile for applicants"
                : isReady
                  ? "Your resume is ready to preview"
                  : `${completion}% complete — keep going`}
            </Text>
          </View>
          <View style={s.headerIcon}>
            <Feather name={isEmployer ? "briefcase" : "file-text"} size={20} color="#047857" />
          </View>
        </View>

        {!isEmployer && (
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${completion}%` as any }]} />
            </View>
            <Text style={s.progressLabel}>{completion}%</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {isEmployer ? (
          <View style={s.employerCard}>
            <View style={s.employerIcon}>
              <Feather name="shield" size={24} color="#047857" />
            </View>
            <Text style={s.employerTitle}>Build applicant trust</Text>
            <Text style={s.employerText}>
              Keep your company name, address, WhatsApp number, industry and description complete so job seekers can confidently apply.
            </Text>
            <TouchableOpacity style={s.outlineBtn} onPress={() => router.push("/jobs/(tabs)/profile" as any)} activeOpacity={0.85}>
              <Feather name="edit-3" size={16} color="#047857" />
              <Text style={s.outlineBtnText}>Edit Company Profile</Text>
            </TouchableOpacity>
          </View>
        ) : isReady ? (
          <TouchableOpacity style={s.actionCard} onPress={() => router.push("/jobs/resume" as any)} activeOpacity={0.85}>
            <LinearGradient colors={["#047857", "#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.actionCardGrad}>
              <View style={s.actionCardIcon}>
                <Feather name="download" size={22} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionCardTitle}>Resume Ready</Text>
                <Text style={s.actionCardSub}>Preview and use your Connect T resume</Text>
              </View>
              <Feather name="chevron-right" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={s.incompleteCard}>
            <View style={s.incompleteIcon}>
              <Feather name="alert-circle" size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.incompleteTitle}>Complete your profile to generate a resume</Text>
              <Text style={s.incompleteSub}>Fill all sections below to unlock your resume</Text>
            </View>
          </View>
        )}

        {!isEmployer && (
          <>
            <Text style={s.sectionLabel}>Profile Sections</Text>
            {SECTIONS.map((sec) => {
              const pct = getSectionCompletion(jobsUser, sec.fields);
              const done = pct === 100;
              return (
                <TouchableOpacity key={sec.key} style={s.sectionRow} onPress={() => router.push("/jobs/(tabs)/profile" as any)} activeOpacity={0.82}>
                  <View style={[s.sectionIconWrap, { backgroundColor: done ? "#D1FAE5" : "#F1F5F9" }]}> 
                    <Feather name={sec.icon} size={16} color={done ? "#047857" : "#64748B"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.sectionName, done && { color: "#047857" }]}>{sec.label}</Text>
                    <View style={s.sectionBar}>
                      <View style={s.sectionBarTrack}>
                        <View style={[s.sectionBarFill, { width: `${pct}%` as any, backgroundColor: done ? "#047857" : "#EA580C" }]} />
                      </View>
                      <Text style={[s.sectionPct, { color: done ? "#047857" : "#64748B" }]}>{pct}%</Text>
                    </View>
                  </View>
                  {done ? <Feather name="check-circle" size={18} color="#047857" /> : <View style={s.editChip}><Text style={s.editChipText}>Fill</Text></View>}
                </TouchableOpacity>
              );
            })}

            <View style={s.tipsCard}>
              <View style={s.tipsHeader}>
                <Feather name="info" size={14} color="#047857" />
                <Text style={s.tipsTitle}>Resume tips</Text>
              </View>
              {[
                "Add a clear objective / summary",
                "List your key skills clearly",
                "Include your education and qualifications",
                "Mention work experience and languages",
              ].map((tip) => (
                <View key={tip} style={s.tipRow}>
                  <View style={s.tipDot} />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.builderBtn} onPress={() => router.push("/jobs/resume" as any)} activeOpacity={0.85}>
              <LinearGradient colors={["#047857", "#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.builderBtnGrad}>
                <Feather name="file-text" size={18} color="white" />
                <Text style={s.builderBtnText}>{isReady ? "View Resume" : "Open Resume Builder"}</Text>
                <Feather name="chevron-right" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6FAF8" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    shadowColor: "#064E3B",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 12 },
  headerPill: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 },
  headerPillText: { color: "white", fontSize: 9, letterSpacing: 0.9, fontFamily: "Inter_800ExtraBold" },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "white", fontFamily: "Inter_800ExtraBold", letterSpacing: -0.6 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 18 },
  headerIcon: { width: 46, height: 46, borderRadius: 18, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { flex: 1, height: 9, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#D1FAE5" },
  progressLabel: { fontSize: 13, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "right" },
  content: { padding: 16 },
  actionCard: { borderRadius: 22, overflow: "hidden", marginBottom: 16 },
  actionCardGrad: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  actionCardIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  actionCardTitle: { fontSize: 15, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  actionCardSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2 },
  incompleteCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF7ED", borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#FED7AA" },
  incompleteIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#FFEDD5", alignItems: "center", justifyContent: "center" },
  incompleteTitle: { fontSize: 13, fontWeight: "800", color: "#92400E", fontFamily: "Inter_700Bold" },
  incompleteSub: { fontSize: 11, color: "#B45309", fontFamily: "Inter_400Regular", marginTop: 2 },
  employerCard: { alignItems: "center", backgroundColor: "white", borderRadius: 26, padding: 24, gap: 10, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  employerIcon: { width: 76, height: 76, borderRadius: 26, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#A7F3D0" },
  employerTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" },
  employerText: { fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20, fontFamily: "Inter_400Regular" },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, borderWidth: 1, borderColor: "#10B981", paddingHorizontal: 16, paddingVertical: 10, marginTop: 6 },
  outlineBtnText: { color: "#047857", fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionLabel: { fontSize: 12, fontWeight: "900", color: "#64748B", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 18, padding: 14, marginBottom: 9, shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "rgba(226,232,240,0.9)" },
  sectionIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sectionName: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 6 },
  sectionBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionBarTrack: { flex: 1, height: 5, backgroundColor: "#F1F5F9", borderRadius: 999, overflow: "hidden" },
  sectionBarFill: { height: "100%", borderRadius: 999 },
  sectionPct: { fontSize: 11, fontFamily: "Inter_400Regular", minWidth: 28, textAlign: "right" },
  editChip: { backgroundColor: "#FFF7ED", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: "#FED7AA" },
  editChipText: { fontSize: 11, fontWeight: "800", color: "#EA580C", fontFamily: "Inter_700Bold" },
  tipsCard: { backgroundColor: "#ECFDF5", borderRadius: 18, padding: 14, marginBottom: 16, marginTop: 8, borderWidth: 1, borderColor: "#A7F3D0" },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  tipsTitle: { fontSize: 13, fontWeight: "900", color: "#047857", fontFamily: "Inter_700Bold" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981", marginTop: 5 },
  tipText: { flex: 1, fontSize: 12, color: "#065F46", fontFamily: "Inter_400Regular", lineHeight: 18 },
  builderBtn: { borderRadius: 18, overflow: "hidden", marginTop: 4 },
  builderBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14 },
  builderBtnText: { fontSize: 15, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
});