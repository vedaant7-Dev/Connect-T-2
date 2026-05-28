import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useJobsAuth, calcProfileCompletion } from "@/context/JobsAuthContext";

const SECTIONS = [
  { key: "personal", label: "Personal Info", icon: "user" as const, fields: ["name", "email", "age", "location", "languages"] },
  { key: "status",   label: "Work Status",   icon: "briefcase" as const, fields: ["currentStatus", "currentCompany", "currentRole", "experience"] },
  { key: "education",label: "Education",      icon: "book-open" as const, fields: ["qualification", "collegeName", "fieldOfStudy"] },
  { key: "skills",   label: "Skills",         icon: "zap" as const, fields: ["skills"] },
  { key: "about",    label: "About / Summary",icon: "file-text" as const, fields: ["about"] },
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

  const completion = calcProfileCompletion(jobsUser);
  const isReady = completion >= 100;

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 12 }]}
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>My Resume</Text>
            <Text style={s.headerSub}>
              {isReady ? "Your resume is ready to download" : `${completion}% complete — keep going!`}
            </Text>
          </View>
          <View style={s.headerIcon}>
            <Feather name="file-text" size={20} color="white" />
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <LinearGradient
              colors={isReady ? ["#D1FAE5", "#86EFAC"] : ["rgba(255,255,255,0.6)", "rgba(255,255,255,0.9)"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.progressFill, { width: `${completion}%` as any }]}
            />
          </View>
          <Text style={s.progressLabel}>{completion}%</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Action card */}
        {isReady ? (
          <TouchableOpacity
            style={s.actionCard}
            onPress={() => router.push("/jobs/resume" as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#059669", "#10B981"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.actionCardGrad}
            >
              <View style={s.actionCardIcon}>
                <Feather name="download" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionCardTitle}>Resume Ready!</Text>
                <Text style={s.actionCardSub}>View, preview & download your resume</Text>
              </View>
              <Feather name="chevron-right" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={s.incompleteCard}>
            <View style={s.incompleteIcon}>
              <Feather name="alert-circle" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.incompleteTitle}>Complete your profile to generate a resume</Text>
              <Text style={s.incompleteSub}>Fill all sections below to unlock your resume</Text>
            </View>
          </View>
        )}

        {/* Section checklist */}
        <Text style={s.sectionLabel}>Profile Sections</Text>
        {SECTIONS.map((sec) => {
          const pct = getSectionCompletion(jobsUser, sec.fields);
          const done = pct === 100;
          return (
            <TouchableOpacity
              key={sec.key}
              style={s.sectionRow}
              onPress={() => router.push("/jobs/(tabs)/profile" as any)}
              activeOpacity={0.82}
            >
              <View style={[s.sectionIconWrap, { backgroundColor: done ? "#D1FAE5" : "#F1F5F9" }]}>
                <Feather name={sec.icon} size={16} color={done ? "#059669" : "#64748B"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.sectionName, done && { color: "#059669" }]}>{sec.label}</Text>
                <View style={s.sectionBar}>
                  <View style={s.sectionBarTrack}>
                    <View
                      style={[
                        s.sectionBarFill,
                        { width: `${pct}%` as any, backgroundColor: done ? "#059669" : "#EA580C" },
                      ]}
                    />
                  </View>
                  <Text style={[s.sectionPct, { color: done ? "#059669" : "#64748B" }]}>{pct}%</Text>
                </View>
              </View>
              {done ? (
                <Feather name="check-circle" size={18} color="#059669" />
              ) : (
                <View style={s.editChip}>
                  <Text style={s.editChipText}>Fill</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Tips card */}
        <View style={s.tipsCard}>
          <View style={s.tipsHeader}>
            <Feather name="info" size={14} color="#0369A1" />
            <Text style={s.tipsTitle}>Resume tips</Text>
          </View>
          {[
            "Add a clear objective / summary",
            "List your key skills with proficiency",
            "Include your education and qualifications",
            "Mention work experience with company names",
          ].map((tip) => (
            <View key={tip} style={s.tipRow}>
              <View style={s.tipDot} />
              <Text style={s.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Builder CTA */}
        <TouchableOpacity
          style={s.builderBtn}
          onPress={() => router.push("/jobs/resume" as any)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#C2410C", "#EA580C"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.builderBtnGrad}
          >
            <Feather name="file-text" size={18} color="white" />
            <Text style={s.builderBtnText}>
              {isReady ? "View & Download Resume" : "Open Resume Builder"}
            </Text>
            <Feather name="chevron-right" size={18} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { flex: 1, height: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "right" },

  content: { padding: 14, gap: 0 },

  actionCard: { borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  actionCardGrad: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  actionCardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  actionCardTitle: { fontSize: 15, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  actionCardSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2 },

  incompleteCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFBEB", borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#FDE68A" },
  incompleteIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  incompleteTitle: { fontSize: 13, fontWeight: "700", color: "#92400E", fontFamily: "Inter_700Bold" },
  incompleteSub: { fontSize: 11, color: "#B45309", fontFamily: "Inter_400Regular", marginTop: 2 },

  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  sectionIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  sectionName: { fontSize: 13, fontWeight: "600", color: "#0F172A", fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  sectionBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionBarTrack: { flex: 1, height: 5, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" },
  sectionBarFill: { height: "100%", borderRadius: 3 },
  sectionPct: { fontSize: 11, fontFamily: "Inter_400Regular", minWidth: 28, textAlign: "right" },
  editChip: { backgroundColor: "#FFEDD5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  editChipText: { fontSize: 11, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_700Bold" },

  tipsCard: { backgroundColor: "#EFF6FF", borderRadius: 14, padding: 14, marginBottom: 16, marginTop: 8, borderWidth: 1, borderColor: "#BFDBFE" },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  tipsTitle: { fontSize: 13, fontWeight: "700", color: "#1E40AF", fontFamily: "Inter_700Bold" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#3B82F6", marginTop: 5 },
  tipText: { flex: 1, fontSize: 12, color: "#1E3A8A", fontFamily: "Inter_400Regular", lineHeight: 18 },

  builderBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  builderBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14 },
  builderBtnText: { fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
