import React, { useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobs, categoryConfig, typeConfig, JobCategory, JobType, Job } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

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
  const cfg: any = categoryConfig[job.category] || categoryConfig.other;
  const type: any = typeConfig[job.type] || { label: job.type || "Job" };
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.9}>
      <View style={styles.cardRow}>
        <View style={styles.catDot}><Feather name={(cfg.icon || "briefcase") as any} size={16} color={ORANGE} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.cardTitle} numberOfLines={1}>{job.title}</Text><Text style={styles.cardSub} numberOfLines={1}>{job.company} · {job.location}</Text></View>
        <Text style={styles.cardTime}>{timeAgo(job.createdAt)}</Text>
      </View>
      <View style={styles.chipRow}>
        <View style={styles.metaChip}><Feather name="map-pin" size={10} color="#64748B" /><Text style={styles.metaText} numberOfLines={1}>{job.location}</Text></View>
        <View style={[styles.metaChip, styles.typeChip]}><Text style={[styles.metaText, { color: ORANGE, fontFamily: "Inter_700Bold" }]}>{type.label}</Text></View>
        {!!job.shift && <View style={styles.metaChip}><Feather name="sun" size={10} color="#64748B" /><Text style={styles.metaText}>{job.shift}</Text></View>}
        <View style={styles.metaChip}><Feather name="users" size={10} color="#64748B" /><Text style={styles.metaText}>{job.openings} open</Text></View>
      </View>
      <View style={styles.salaryRow}>
        <View><Text style={styles.salary}>{job.salary}</Text><Text style={styles.appliedCount}>{job.applicants.length} applicants</Text></View>
        <TouchableOpacity style={[styles.applyBtn, applied && styles.applyBtnDone]} onPress={(event) => { event.stopPropagation(); onApply(); }} disabled={applied} activeOpacity={0.85}>
          {applied ? <><Feather name="check" size={13} color={ORANGE} /><Text style={styles.applyText}>Applied</Text></> : <Text style={styles.applyTextWhite}>Apply Now</Text>}
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.expandToggle} onPress={(event) => { event.stopPropagation(); setExpanded((value) => !value); }} activeOpacity={0.75}><Text style={styles.expandToggleText}>{expanded ? "Hide details" : "View details"}</Text><Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={ORANGE} /></TouchableOpacity>
      {expanded && <View style={styles.expandBox}><Text style={styles.expandLabel}>Description</Text><Text style={styles.expandText}>{job.description || "No description provided."}</Text><Text style={styles.expandLabel}>Requirements</Text><Text style={styles.expandText}>{job.requirements || "No requirements provided."}</Text></View>}
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

  const results = useMemo(() => jobs.filter((job) => {
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
  }), [jobs, query, minSalNum, maxSalNum, jobType, category, customCatLower, selectedAreas]);

  const handleApply = (job: Job) => {
    if (!jobsUser || jobsUser.role !== "seeker") { Alert.alert("Login required", "Please login as a job seeker to apply."); return; }
    if (hasApplied(job.id, jobsUser.id)) return;
    Alert.alert("Apply for this job?", `${job.title} at ${job.company}`, [{ text: "Cancel", style: "cancel" }, { text: "Apply", onPress: async () => { try { await applyJob(job.id, jobsUser.id); Alert.alert("Applied", "Your application has been sent to the employer."); } catch (err: any) { Alert.alert("Apply failed", err?.message || "Please try again."); } } }]);
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
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 10 }]}> 
        <TopShade height={110} /><DecorativeCircles />
        <View style={styles.headerRow}><TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.84}><Feather name="arrow-left" size={20} color="white" /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Job Results</Text><Text style={styles.headerSub}>{results.length} jobs match your filters</Text></View><TouchableOpacity onPress={() => router.back()} style={styles.editBtn} activeOpacity={0.85}><Feather name="sliders" size={14} color="white" /><Text style={styles.editBtnText}>Edit</Text></TouchableOpacity></View>
        {summaryChips.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>{summaryChips.map((chip, index) => <View key={`${chip}-${index}`} style={styles.summaryChip}><Text style={styles.summaryChipText}>{chip}</Text></View>)}</ScrollView>}
      </LinearGradient>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.resultsList, { paddingBottom: Math.max(insets.bottom, 8) + 88 }]} showsVerticalScrollIndicator={false}>
        {results.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Feather name="search" size={38} color={ORANGE} /></View><Text style={styles.emptyTitle}>No jobs match your filters</Text><Text style={styles.emptySub}>Try changing salary, area, category or job type filters.</Text><TouchableOpacity onPress={() => router.back()} style={styles.clearFiltersBtn} activeOpacity={0.84}><Text style={styles.clearFiltersBtnText}>Adjust Filters</Text></TouchableOpacity></View> : results.map((job) => <ResultCard key={job.id} job={job} applied={!!jobsUser && hasApplied(job.id, jobsUser.id)} onApply={() => handleApply(job)} onOpen={() => router.push(`/jobs/detail/${job.id}` as any)} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 },
  headerSub: { fontSize: 11.5, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }, editBtnText: { fontSize: 11.5, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" },
  summaryRow: { gap: 6, paddingTop: 4 }, summaryChip: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, summaryChipText: { fontSize: 10.5, color: "white", fontFamily: "Inter_700Bold", fontWeight: "800" },
  resultsList: { padding: 16, gap: 12 }, empty: { alignItems: "center", justifyContent: "center", backgroundColor: "white", borderRadius: 20, paddingVertical: 46, paddingHorizontal: 22, gap: 11, shadowColor: DARK, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: "#FED7AA" }, emptyIcon: { width: 70, height: 70, borderRadius: 24, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FED7AA" }, emptyTitle: { fontSize: 15.5, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" }, emptySub: { fontSize: 11.5, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17 }, clearFiltersBtn: { backgroundColor: "#FFF7ED", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5, borderColor: "#FED7AA" }, clearFiltersBtnText: { fontSize: 12.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 13, shadowColor: DARK, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: "rgba(254,215,170,0.9)", gap: 11 }, cardRow: { flexDirection: "row", alignItems: "center", gap: 11 }, catDot: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, cardTitle: { fontSize: 13.5, color: "#0F172A", fontWeight: "900", fontFamily: "Inter_700Bold" }, cardSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 }, cardTime: { fontSize: 9.5, color: "#94A3B8", fontFamily: "Inter_600SemiBold" }, chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#F1F5F9", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 }, typeChip: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }, metaText: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_500Medium" }, salaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, salary: { fontSize: 14, color: ORANGE, fontFamily: "Inter_700Bold", fontWeight: "900" }, appliedCount: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_500Medium", marginTop: 1 }, applyBtn: { minWidth: 98, borderRadius: 15, backgroundColor: ORANGE, borderWidth: 1, borderColor: ORANGE, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 9 }, applyBtnDone: { flexDirection: "row", gap: 5, backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }, applyGrad: { alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 9 }, applyText: { fontSize: 11.5, fontFamily: "Inter_700Bold", color: ORANGE }, applyTextWhite: { fontSize: 11.5, fontFamily: "Inter_700Bold", color: "white" }, expandToggle: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFF7ED", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#FED7AA" }, expandToggleText: { fontSize: 10.5, color: ORANGE, fontFamily: "Inter_700Bold" }, expandBox: { backgroundColor: "#F8FAFC", borderRadius: 16, padding: 12, gap: 6 }, expandLabel: { fontSize: 10.5, color: ORANGE, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.4 }, expandText: { fontSize: 11.5, color: "#475569", fontFamily: "Inter_400Regular", lineHeight: 17 },
});
