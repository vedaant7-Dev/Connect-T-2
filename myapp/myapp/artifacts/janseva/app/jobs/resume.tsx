import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useJobsAuth } from "@/context/JobsAuthContext";

type TemplateId = "classic" | "modern" | "minimal";

const TEMPLATES: { id: TemplateId; name: string; desc: string; accent: string }[] = [
  { id: "classic", name: "Classic",  desc: "Orange saffron header, clean sections",      accent: "#EA580C" },
  { id: "modern",  name: "Modern",   desc: "Dark header · blue accents · clean sections", accent: "#1D4ED8" },
  { id: "minimal", name: "Minimal",  desc: "Clean black & white with subtle accents",    accent: "#059669" },
];

function ClassicResume({ user }: { user: any }) {
  return (
    <View style={r.page}>
      <LinearGradient colors={["#C2410C", "#EA580C", "#F97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={r.classicHeader}>
        <View style={r.classicAvatar}>
          {user.profilePhoto
            ? <Image source={{ uri: user.profilePhoto }} style={r.classicAvatarImg} />
            : <Text style={r.classicAvatarText}>{user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={r.classicName}>{user.name}</Text>
          <Text style={r.classicRole}>{user.currentRole || user.qualification || "Job Seeker"}</Text>
          <View style={r.classicContact}>
            <Text style={r.classicContactText}>📞 +91 {user.phone}</Text>
            {user.email && <Text style={r.classicContactText}>✉ {user.email}</Text>}
            {user.location && <Text style={r.classicContactText}>📍 {user.location}</Text>}
          </View>
        </View>
      </LinearGradient>

      <View style={r.classicBody}>
        {user.about && (
          <ResumeSection title="OBJECTIVE" color="#EA580C">
            <Text style={r.bodyText}>{user.about}</Text>
          </ResumeSection>
        )}

        <ResumeSection title="EDUCATION" color="#EA580C">
          <Text style={r.bodyText}>{user.qualification || "—"}</Text>
        </ResumeSection>

        {(user.currentCompany || user.previousCompany || user.experience) && (
          <ResumeSection title="WORK EXPERIENCE" color="#EA580C">
            {user.currentCompany && (
              <View style={r.expEntry}>
                <Text style={r.expRole}>{user.currentRole || "Employee"}</Text>
                <Text style={r.expCompany}>{user.currentCompany} · Current</Text>
              </View>
            )}
            {user.previousCompany && (
              <View style={r.expEntry}>
                <Text style={r.expRole}>{user.previousRole || "Employee"}</Text>
                <Text style={r.expCompany}>{user.previousCompany} · Previous</Text>
              </View>
            )}
            {user.experience && <Text style={r.bodyText}>Total Experience: {user.experience}</Text>}
          </ResumeSection>
        )}

        {user.skills && (
          <ResumeSection title="SKILLS" color="#EA580C">
            <View style={r.skillsWrap}>
              {user.skills.split(",").map((s: string, i: number) => (
                <View key={i} style={[r.skillChip, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
                  <Text style={[r.skillText, { color: "#C2410C" }]}>{s.trim()}</Text>
                </View>
              ))}
            </View>
          </ResumeSection>
        )}

        {user.languages && (
          <ResumeSection title="LANGUAGES" color="#EA580C">
            <Text style={r.bodyText}>{user.languages}</Text>
          </ResumeSection>
        )}
      </View>
    </View>
  );
}

function ModernResume({ user }: { user: any }) {
  const initials = user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={r.page}>
      {/* Header band */}
      <View style={r.modHeader}>
        <View style={r.modAvatarCircle}>
          {user.profilePhoto
            ? <Image source={{ uri: user.profilePhoto }} style={r.modAvatarImg} />
            : <Text style={r.modAvatarText}>{initials}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={r.modName}>{user.name}</Text>
          <Text style={r.modRole}>{user.currentRole || user.qualification || "Job Seeker"}</Text>
          <View style={r.modContactRow}>
            <Text style={r.modContactItem}>📞 +91 {user.phone}</Text>
            {user.email ? <Text style={r.modContactItem}>✉ {user.email}</Text> : null}
            {user.location ? <Text style={r.modContactItem}>📍 {user.location}</Text> : null}
          </View>
        </View>
      </View>

      {/* Accent bar */}
      <View style={r.modAccentBar} />

      {/* Body */}
      <View style={r.modBody}>
        {user.about ? (
          <View style={r.modSection}>
            <View style={r.modSectionLabel}><Text style={r.modSectionText}>ABOUT ME</Text></View>
            <Text style={r.bodyText}>{user.about}</Text>
          </View>
        ) : null}

        <View style={r.modSection}>
          <View style={r.modSectionLabel}><Text style={r.modSectionText}>EDUCATION</Text></View>
          <Text style={r.expRole}>{user.qualification || "—"}</Text>
        </View>

        {(user.experience || user.currentCompany || user.previousCompany) ? (
          <View style={r.modSection}>
            <View style={r.modSectionLabel}><Text style={r.modSectionText}>EXPERIENCE</Text></View>
            {user.experience ? <Text style={[r.bodyText, { marginBottom: 6 }]}>Total: {user.experience}</Text> : null}
            {user.currentCompany ? (
              <View style={r.modExpCard}>
                <View style={r.modExpDot} />
                <View style={{ flex: 1 }}>
                  <Text style={r.expRole}>{user.currentRole || "Employee"}</Text>
                  <Text style={r.expCompany}>{user.currentCompany}  ·  Current</Text>
                </View>
              </View>
            ) : null}
            {user.previousCompany ? (
              <View style={r.modExpCard}>
                <View style={[r.modExpDot, { backgroundColor: "#94A3B8" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={r.expRole}>{user.previousRole || "Employee"}</Text>
                  <Text style={r.expCompany}>{user.previousCompany}  ·  Previous</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {user.skills ? (
          <View style={r.modSection}>
            <View style={r.modSectionLabel}><Text style={r.modSectionText}>SKILLS</Text></View>
            <View style={r.skillsWrap}>
              {user.skills.split(",").map((s: string, i: number) => (
                <View key={i} style={[r.skillChip, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                  <Text style={[r.skillText, { color: "#1D4ED8" }]}>{s.trim()}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {user.languages ? (
          <View style={r.modSection}>
            <View style={r.modSectionLabel}><Text style={r.modSectionText}>LANGUAGES</Text></View>
            <Text style={r.bodyText}>{user.languages}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function MinimalResume({ user }: { user: any }) {
  return (
    <View style={r.page}>
      <View style={r.minimalHeader}>
        <Text style={r.minimalName}>{user.name}</Text>
        <View style={r.minimalAccentLine} />
        <Text style={r.minimalRole}>{user.currentRole || user.qualification || "Job Seeker"}</Text>
        <View style={r.minimalContactRow}>
          <Text style={r.minimalContact}>+91 {user.phone}</Text>
          {user.email && <Text style={r.minimalContact}>{user.email}</Text>}
          {user.location && <Text style={r.minimalContact}>{user.location}</Text>}
        </View>
      </View>

      <View style={r.minimalBody}>
        {user.about && (
          <ResumeSection title="Career Objective" color="#059669">
            <Text style={r.bodyText}>{user.about}</Text>
          </ResumeSection>
        )}

        <ResumeSection title="Education" color="#059669">
          <Text style={r.bodyText}>{user.qualification || "—"}</Text>
        </ResumeSection>

        {(user.currentCompany || user.previousCompany || user.experience) && (
          <ResumeSection title="Work Experience" color="#059669">
            {user.experience && <Text style={[r.bodyText, { marginBottom: 6 }]}>Total Experience: {user.experience}</Text>}
            {user.currentCompany && (
              <View style={r.expEntry}>
                <Text style={r.expRole}>{user.currentRole || "Employee"}</Text>
                <Text style={r.expCompany}>{user.currentCompany} (Current)</Text>
              </View>
            )}
            {user.previousCompany && (
              <View style={r.expEntry}>
                <Text style={r.expRole}>{user.previousRole || "Employee"}</Text>
                <Text style={r.expCompany}>{user.previousCompany} (Previous)</Text>
              </View>
            )}
          </ResumeSection>
        )}

        {user.skills && (
          <ResumeSection title="Skills" color="#059669">
            <View style={r.skillsWrap}>
              {user.skills.split(",").map((s: string, i: number) => (
                <View key={i} style={[r.skillChip, { backgroundColor: "#D1FAE5", borderColor: "#86EFAC" }]}>
                  <Text style={[r.skillText, { color: "#065F46" }]}>{s.trim()}</Text>
                </View>
              ))}
            </View>
          </ResumeSection>
        )}

        {user.languages && (
          <ResumeSection title="Languages" color="#059669">
            <Text style={r.bodyText}>{user.languages}</Text>
          </ResumeSection>
        )}
      </View>
    </View>
  );
}

function ResumeSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <View style={r.section}>
      <View style={[r.sectionTitleRow, { borderBottomColor: color }]}>
        <Text style={[r.sectionTitle, { color }]}>{title}</Text>
      </View>
      <View style={r.sectionBody}>{children}</View>
    </View>
  );
}

export default function ResumeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const router = useRouter();
  const { jobsUser } = useJobsAuth();
  const [selected, setSelected] = useState<TemplateId>("classic");

  if (!jobsUser) return null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="x" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Your Resume</Text>
            <Text style={styles.headerSub}>Generated from your profile</Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert("Screenshot to Save", "Take a screenshot of the resume below to save or share it.")}
            style={styles.shareBtn}
          >
            <Feather name="share-2" size={16} color="white" />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
          {TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.templateChip, selected === t.id && styles.templateChipActive]}
              onPress={() => setSelected(t.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.templateDot, { backgroundColor: t.accent }]} />
              <View>
                <Text style={[styles.templateName, selected === t.id && { color: "#EA580C" }]}>{t.name}</Text>
                <Text style={styles.templateDesc}>{t.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.preview, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.paperShadow}>
          {selected === "classic" && <ClassicResume user={jobsUser} />}
          {selected === "modern" && <ModernResume user={jobsUser} />}
          {selected === "minimal" && <MinimalResume user={jobsUser} />}
        </View>

        <View style={styles.hint}>
          <Feather name="info" size={14} color="#94A3B8" />
          <Text style={styles.hintText}>Take a screenshot to save your resume. Swipe left/right above to switch templates.</Text>
        </View>

        <TouchableOpacity
          style={styles.updateBtn}
          onPress={() => { router.back(); }}
          activeOpacity={0.85}
        >
          <Feather name="edit-2" size={16} color="#EA580C" />
          <Text style={styles.updateBtnText}>Update Profile to Refresh Resume</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  shareBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  templateRow: { gap: 10, paddingBottom: 4 },
  templateChip: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: "transparent" },
  templateChipActive: { borderColor: "#EA580C", backgroundColor: "white" },
  templateDot: { width: 12, height: 12, borderRadius: 6 },
  templateName: { fontSize: 13, fontWeight: "700", color: "#334155", fontFamily: "Inter_700Bold" },
  templateDesc: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", maxWidth: 130 },
  preview: { padding: 16 },
  paperShadow: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8, borderRadius: 4 },
  hint: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, paddingHorizontal: 4 },
  hintText: { flex: 1, fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", lineHeight: 17 },
  updateBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", backgroundColor: "white", borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1.5, borderColor: "#FED7AA" },
  updateBtnText: { fontSize: 14, fontWeight: "600", color: "#EA580C", fontFamily: "Inter_600SemiBold" },
});

const r = StyleSheet.create({
  page: { backgroundColor: "white", borderRadius: 4, overflow: "hidden" },

  classicHeader: { padding: 20, flexDirection: "row", gap: 16, alignItems: "center" },
  classicAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  classicAvatarImg: { width: 72, height: 72, borderRadius: 36 },
  classicAvatarText: { fontSize: 26, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  classicName: { fontSize: 20, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  classicRole: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular", marginTop: 2 },
  classicContact: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  classicContactText: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular" },
  classicBody: { padding: 16 },

  modHeader: { backgroundColor: "#0F172A", padding: 20, flexDirection: "row", alignItems: "center", gap: 16 },
  modAvatarCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#1D4ED8", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#3B82F6" },
  modAvatarImg: { width: 68, height: 68, borderRadius: 34 },
  modAvatarText: { fontSize: 24, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  modName: { fontSize: 19, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  modRole: { fontSize: 12, color: "#93C5FD", fontFamily: "Inter_400Regular", marginTop: 3 },
  modContactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  modContactItem: { fontSize: 10, color: "#CBD5E1", fontFamily: "Inter_400Regular" },
  modAccentBar: { height: 4, backgroundColor: "#1D4ED8" },
  modBody: { padding: 16, gap: 2 },
  modSection: { marginBottom: 14, borderLeftWidth: 3, borderLeftColor: "#BFDBFE", paddingLeft: 12 },
  modSectionLabel: { backgroundColor: "#EFF6FF", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  modSectionText: { fontSize: 10, fontWeight: "700", color: "#1D4ED8", fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  modExpCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  modExpDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1D4ED8", marginTop: 4 },

  minimalHeader: { padding: 24, borderBottomWidth: 2, borderBottomColor: "#E2E8F0" },
  minimalName: { fontSize: 26, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" },
  minimalAccentLine: { width: 40, height: 3, backgroundColor: "#059669", borderRadius: 2, marginTop: 6, marginBottom: 8 },
  minimalRole: { fontSize: 14, color: "#475569", fontFamily: "Inter_400Regular" },
  minimalContactRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  minimalContact: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular" },
  minimalBody: { padding: 16 },

  section: { marginBottom: 14 },
  sectionTitleRow: { borderBottomWidth: 1.5, paddingBottom: 4, marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  sectionBody: {},
  bodyText: { fontSize: 12, color: "#475569", fontFamily: "Inter_400Regular", lineHeight: 18 },
  expEntry: { marginBottom: 8 },
  expRole: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  expCompany: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 1 },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  skillText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
