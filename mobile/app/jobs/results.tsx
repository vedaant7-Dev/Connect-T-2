import React, { useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useJobs, categoryConfig, typeConfig, JobCategory, JobType, Job } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

function parseSalaryMin(job: Job): number {
  if (typeof job.salaryMin === "number") return job.salaryMin;
  const matches = String(job.salary || "").match(/[\d,]+/g);
  if (!matches?.length) return 0;
  return Number(matches[0].replace(/,/g, "")) || 0;
}

function parseSalaryMax(job: Job): number {
  if (typeof job.salaryMax === "number") return job.salaryMax;
  const matches = String(job.salary || "").match(/[\d,]+/g);
  if (!matches?.length) return parseSalaryMin(job);
  return Number(matches[matches.length - 1].replace(/,/g, "")) || parseSalaryMin(job);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

function ResultCard({ job, onApply, applied, onOpen }: { job: Job; applied: boolean; onApply: () => void; onOpen: () => void }) {
  const cat = categoryConfig[job.category] || categoryConfig.other;
  const type = typeConfig[job.type];
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.9}>
      <View style={styles.cardRow}>
        <View style={[styles.catDot, { backgroundColor: cat.bg }]}> 
          <Feather name={cat.icon as any} size={16} color={cat.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{job.company} · {job.location}</Text>
        </View>
        <Text style={styles.cardTime}>{timeAgo(job.createdAt)}</Text>
      </View>

      <View style={styles.chipRow}>
        <View style={styles.metaChip}><Feather name="map-pin" size={10} color="#64748B" /><Text style={styles.metaText} numberOfLines={1}>{job.location}</Text></View>
        <View style={[styles.metaChip, { backgroundColor: type.bg }]}><Text style={[styles.metaText, { color: type.color, fontFamily: "Inter_700Bold" }]}>{type.label}</Text></View>
        {!!job.shift && <View style={styles.metaChip}><Feather name="sun" size={10} color="#64748B" /><Text style={styles.metaText}>{job.shift}</Text></View>}
        <View style={styles.metaChip}><Feather name="users" size={10} color="#64748B" /><Text style={styles.metaText}>{job.openings} open</Text></View>
      </View>

      <View style={styles.salaryRow}>
        <View>
          <Text style={styles.salary}>{job.salary}</Text>
          <Text style={styles.appliedCount}>{job.applicants.length} applicants</Text>
        </View>
        <TouchableOpacity
          style={[styles.applyBtn, applied && styles.applyBtnDone]}
          onPress={(event) => {
            event.stopPropagation();
            onApply();
          }}
          disabled={applied}
          activeOpacity={0.85}
        >
          {applied ? (
            <><Feather name="check" size={13} color="#059669" /><Text style={[styles.applyText, { color: "#059669" }]}>Applied</Text></>
          ) : (
            <LinearGradient colors={["#047857", "#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyGrad}>
              <Text style={styles.applyTextWhite}>Apply Now</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.expandToggle}
        onPress={(event) => {
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
        activeOpacity={0.75}
      >
        <Text style={styles.expandToggleText}>{expanded ? "Hide details" : "View details"}</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#047857" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandBox}>
          <Text style={styles.expandLabel}>Description</Text>
          <Text style={styles.expandText}>{job.description || "No description provided."}</Text>
          <Text style={styles.expandLabel}>Requirements</Text>
          <Text style={styles.expandText}>{job.requirements || "No requirements provided."}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const router = useRouter();
  const { jobs, applyJob, hasApplied } = useJobs();
  const { jobsUser } = useJobsAuth();
  const params = useLocalSearchParams<{ q?: string; type?: string; cat?: string; custom?: string; min?: string; max?: string; areas?: string }>();

  const query = String(params.q || "");
  const jobType = (params.type || "all") as JobType | "all";
  const category = (params.cat || "all") as JobCategory | "all";
  const customCategory = String(params.custom || "");
  const salaryMin = String(params.min || "");
  const salaryMax = String(params.max || "");
  const selectedAreas = String(params.areas || "").split(",").filter(Boolean);
  const minSalNum = Number(salaryMin.replace(/\D/g, "")) || 0;
  const maxSalNum = Number(salaryMax.replace(/\D/g, "")) || Infinity;
  const customCatLower = customCategory.trim().toLowerCase();

  const results = useMemo(() => {
    return jobs.filter((job) => {
      if (!job.active) return false;
      const q = query.trim().toLowerCase();
      const searchable = `${job.title} ${job.company} ${job.location} ${job.description} ${job.requirements} ${job.skillsRequired || ""}`.toLowerCase();
      if (q && !searchable.includes(q)) return false;
      if (customCatLower) {
        const customSearch = `${job.title} ${job.category} ${job.skillsRequired || ""}`.toLowerCase();
        if (!customSearch.includes(customCatLower)) return false;
      } else if (category !== "all" && job.category !== category) return false;
      if (jobType !== "all" && job.type !== jobType) return false;
      if (selectedAreas.length > 0 && !selectedAreas.some((area) => job.location.toLowerCase().includes(area.toLowerCase()))) return false;
      const low = parseSalaryMin(job);
      const high = parseSalaryMax(job);
      if (high < minSalNum || low > maxSalNum) return false;
      return true;
    });
  }, [jobs, query, minSalNum, maxSalNum, jobType, category, customCatLower, selectedAreas]);

  const handleApply = (job: Job) => {
    if (!jobsUser || jobsUser.role !== "seeker") {
      Alert.alert("Login required", "Please login as a job seeker to apply.");
      return;
    }
    if (hasApplied(job.id, jobsUser.id)) return;
    Alert.alert("Apply for this job?", `${job.title} at ${job.company}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Apply",
        onPress: async () => {
          try {
            await applyJob(job.id, jobsUser.id);
            Alert.alert("Applied", "Your application has been sent to the employer.");
          } catch (err: any) {
            Alert.alert("Apply failed", err?.message || "Please try again.");
          }
        },
      },
    ]);
  };

  const summaryChips: string[] = [];
  if (query) summaryChips.push(`"${query}"`);
  if (customCategory) summaryChips.push(customCategory);
  else if (category !== "all") summaryChips.push(category);
  if (jobType !== "all") summaryChips.push(jobType);
  if (salaryMin || salaryMax) summaryChips.push(`₹${salaryMin || "0"}–${salaryMax || "Any"}`);
  selectedAreas.forEach((area) => summaryChips.push(area));

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#064E3B", "#047857", "#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 10 }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.84}>
            <Feather name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Job Results</Text>
            <Text style={styles.headerSub}>{results.length} jobs match your filters</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.editBtn} activeOpacity={0.85}>
            <Feather name="sliders" size={14} color="white" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {summaryChips.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
            {summaryChips.map((chip, index) => <View key={`${chip}-${index}`} style={styles.summaryChip}><Text style={styles.summaryChipText}>{chip}</Text></View>)}
          </ScrollView>
        )}
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.resultsList, { paddingBottom: Math.max(insets.bottom, 8) + 88 }]} showsVerticalScrollIndicator={false}>
        {results.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Feather name="search" size={38} color="#047857" /></View>
            <Text style={styles.emptyTitle}>No jobs match your filters</Text>
            <Text style={styles.emptySub}>Try changing salary, area, category or job type filters.</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.clearFiltersBtn} activeOpacity={0.84}>
              <Text style={styles.clearFiltersBtnText}>Adjust Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          results.map((job) => (
            <ResultCard key={job.id} job={job} applied={!!jobsUser && hasApplied(job.id, jobsUser.id)} onApply={() => handleApply(job)} onOpen={() => router.push(`/jobs/detail/${job.id}` as any)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6FAF8" },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden", shadowColor: "#064E3B", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  editBtnText: { fontSize: 12, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" },
  summaryRow: { gap: 6, paddingTop: 4 },
  summaryChip: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  summaryChipText: { fontSize: 11, color: "white", fontFamily: "Inter_700Bold", fontWeight: "800" },
  resultsList: { padding: 16, gap: 12 },
  empty: { alignItems: "center", justifyContent: "center", backgroundColor: "white", borderRadius: 26, paddingVertical: 52, paddingHorizontal: 22, gap: 12, shadowColor: "#064E3B", shadowOpacity: 0.07, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4, borderWidth: 1, borderColor: "#D1FAE5" },
  emptyIcon: { width: 72, height: 72, borderRadius: 25, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#A7F3D0" },
  emptyTitle: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_800ExtraBold", fontWeight: "900", textAlign: "center" },
  emptySub: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  clearFiltersBtn: { backgroundColor: "#ECFDF5", paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999, borderWidth: 1.5, borderColor: "#A7F3D0" },
  clearFiltersBtnText: { fontSize: 13, color: "#047857", fontFamily: "Inter_700Bold" },
  card: { backgroundColor: "white", borderRadius: 24, padding: 16, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)", gap: 12 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  catDot: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, color: "#0F172A", fontWeight: "900", fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 3 },
  cardTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_600SemiBold" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#F1F5F9", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  metaText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_500Medium" },
  salaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  salary: { fontSize: 16, color: "#047857", fontFamily: "Inter_800ExtraBold", fontWeight: "900" },
  appliedCount: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_500Medium", marginTop: 2 },
  applyBtn: { minWidth: 104, borderRadius: 16, overflow: "hidden", backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0" },
  applyBtnDone: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 10 },
  applyGrad: { alignItems: "center", justifyContent: "center", paddingHorizontal: 13, paddingVertical: 11 },
  applyText: { fontSize: 12, fontFamily: "Inter_800ExtraBold" },
  applyTextWhite: { fontSize: 12, fontFamily: "Inter_800ExtraBold", color: "white" },
  expandToggle: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ECFDF5", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  expandToggleText: { fontSize: 11, color: "#047857", fontFamily: "Inter_800ExtraBold" },
  expandBox: { backgroundColor: "#F8FAFC", borderRadius: 18, padding: 13, gap: 7 },
  expandLabel: { fontSize: 11, color: "#047857", fontFamily: "Inter_800ExtraBold", textTransform: "uppercase", letterSpacing: 0.4 },
  expandText: { fontSize: 12, color: "#475569", fontFamily: "Inter_400Regular", lineHeight: 18 },
});
