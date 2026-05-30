import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useJobs, categoryConfig, typeConfig, JobCategory, JobType, Job } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

const AREAS = [
  "MIDC Ambernath",
  "Ambernath East",
  "Ambernath West",
  "Shivaji Chowk",
  "Station Area East",
  "Station Area West",
  "Old Ambernath",
  "New Ambernath",
  "Vithalwadi",
  "Shelar Colony",
  "Badlapur",
  "Ulhasnagar",
];

const JOB_TYPES: { id: JobType | "all"; label: string }[] = [
  { id: "all", label: "All Types" },
  { id: "full-time", label: "Full Time" },
  { id: "part-time", label: "Part Time" },
  { id: "contract", label: "Contract" },
  { id: "apprentice", label: "Apprentice" },
];

const CATEGORIES: { id: JobCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "manufacturing", label: "Factory" },
  { id: "it", label: "IT" },
  { id: "retail", label: "Retail" },
  { id: "healthcare", label: "Health" },
  { id: "transport", label: "Transport" },
  { id: "education", label: "Teaching" },
  { id: "security", label: "Security" },
  { id: "construction", label: "Construction" },
];

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
  const last = matches[matches.length - 1];
  return Number(last.replace(/,/g, "")) || parseSalaryMin(job);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress} activeOpacity={0.82}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ResultCard({
  job,
  applied,
  onApply,
  onOpen,
}: {
  job: Job;
  applied: boolean;
  onApply: () => void;
  onOpen: () => void;
}) {
  const cat = categoryConfig[job.category] || categoryConfig.other;
  const type = typeConfig[job.type];
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={s.card} onPress={onOpen} activeOpacity={0.9}>
      <View style={s.cardTop}>
        <View style={[s.catIcon, { backgroundColor: cat.bg }]}> 
          <Feather name={cat.icon as any} size={18} color={cat.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cardTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={s.cardSub} numberOfLines={1}>{job.company} · {job.location}</Text>
        </View>
        <Text style={s.cardTime}>{timeAgo(job.createdAt)}</Text>
      </View>

      <View style={s.metaWrap}>
        <View style={s.metaChip}><Feather name="map-pin" size={10} color="#64748B" /><Text style={s.metaText} numberOfLines={1}>{job.location}</Text></View>
        <View style={[s.metaChip, { backgroundColor: type.bg }]}><Text style={[s.metaText, { color: type.color, fontFamily: "Inter_700Bold" }]}>{type.label}</Text></View>
        {!!job.shift && <View style={s.metaChip}><Feather name="sun" size={10} color="#64748B" /><Text style={s.metaText}>{job.shift}</Text></View>}
        <View style={s.metaChip}><Feather name="users" size={10} color="#64748B" /><Text style={s.metaText}>{job.openings} open</Text></View>
      </View>

      <View style={s.salaryRow}>
        <View>
          <Text style={s.salary}>{job.salary}</Text>
          <Text style={s.appliedCount}>{job.applicants.length} applicants</Text>
        </View>

        <TouchableOpacity
          style={[s.applyBtn, applied && s.applyBtnDone]}
          onPress={(event) => {
            event.stopPropagation();
            onApply();
          }}
          disabled={applied}
          activeOpacity={0.86}
        >
          {applied ? (
            <>
              <Feather name="check" size={13} color="#059669" />
              <Text style={[s.applyText, { color: "#059669" }]}>Applied</Text>
            </>
          ) : (
            <LinearGradient colors={["#047857", "#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.applyGrad}>
              <Text style={s.applyTextWhite}>Apply Now</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.expandToggle} onPress={(event) => { event.stopPropagation(); setExpanded((v) => !v); }} activeOpacity={0.75}>
        <Text style={s.expandToggleText}>{expanded ? "Hide details" : "View details"}</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#047857" />
      </TouchableOpacity>

      {expanded && (
        <View style={s.expandBox}>
          <Text style={s.expandLabel}>Description</Text>
          <Text style={s.expandText}>{job.description || "No description provided."}</Text>
          <Text style={s.expandLabel}>Requirements</Text>
          <Text style={s.expandText}>{job.requirements || "No requirements provided."}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const router = useRouter();
  const { jobs, applyJob, hasApplied } = useJobs();
  const { jobsUser } = useJobsAuth();

  const [query, setQuery] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [jobType, setJobType] = useState<JobType | "all">("all");
  const [category, setCategory] = useState<JobCategory | "all">("all");
  const [customCategory, setCustomCategory] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showAllAreas, setShowAllAreas] = useState(false);

  const minSalary = Number(salaryMin.replace(/\D/g, "")) || 0;
  const maxSalary = Number(salaryMax.replace(/\D/g, "")) || Infinity;
  const customCategoryText = customCategory.trim().toLowerCase();

  const results = useMemo(() => {
    return jobs.filter((job) => {
      if (!job.active) return false;

      const q = query.trim().toLowerCase();
      const searchable = `${job.title} ${job.company} ${job.location} ${job.description} ${job.skillsRequired || ""}`.toLowerCase();
      if (q && !searchable.includes(q)) return false;

      if (customCategoryText) {
        const customSearch = `${job.title} ${job.category} ${job.skillsRequired || ""}`.toLowerCase();
        if (!customSearch.includes(customCategoryText)) return false;
      } else if (category !== "all" && job.category !== category) {
        return false;
      }

      if (jobType !== "all" && job.type !== jobType) return false;
      if (selectedAreas.length && !selectedAreas.some((area) => job.location.toLowerCase().includes(area.toLowerCase()))) return false;

      const low = parseSalaryMin(job);
      const high = parseSalaryMax(job);
      if (high < minSalary || low > maxSalary) return false;

      return true;
    });
  }, [jobs, query, minSalary, maxSalary, jobType, category, customCategoryText, selectedAreas]);

  const hasFilters = query || salaryMin || salaryMax || jobType !== "all" || category !== "all" || customCategory || selectedAreas.length > 0;
  const visibleAreas = showAllAreas ? AREAS : AREAS.slice(0, 6);

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) => prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area]);
  };

  const clearAll = () => {
    setQuery("");
    setSalaryMin("");
    setSalaryMax("");
    setJobType("all");
    setCategory("all");
    setCustomCategory("");
    setSelectedAreas([]);
  };

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

  return (
    <View style={s.root}>
      <LinearGradient colors={["#064E3B", "#047857", "#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.84}>
            <Feather name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Search Jobs</Text>
            <Text style={s.headerSub}>Find nearby verified local work</Text>
          </View>
          {hasFilters ? <TouchableOpacity onPress={clearAll} style={s.clearBtn}><Text style={s.clearBtnText}>Clear</Text></TouchableOpacity> : <View style={{ width: 58 }} />}
        </View>

        <View style={s.searchBar}>
          <Feather name="search" size={16} color="#94A3B8" />
          <TextInput style={s.searchInput} value={query} onChangeText={setQuery} placeholder="Job title, company, location…" placeholderTextColor="#94A3B8" returnKeyType="search" />
          {query.length > 0 && <TouchableOpacity onPress={() => setQuery("")}><Feather name="x" size={16} color="#94A3B8" /></TouchableOpacity>}
        </View>

        <View style={s.resultCount}><Text style={s.resultCountText}>{results.length} jobs found</Text></View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 28 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.filterCard}>
          <View style={s.filterBlock}>
            <Text style={s.filterTitle}>Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>{JOB_TYPES.map((item) => <FilterChip key={item.id} label={item.label} active={jobType === item.id} onPress={() => setJobType(item.id)} />)}</ScrollView>
          </View>

          <View style={s.filterBlock}>
            <Text style={s.filterTitle}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>{CATEGORIES.map((item) => <FilterChip key={item.id} label={item.label} active={category === item.id && !customCategory} onPress={() => { setCategory(item.id); setCustomCategory(""); }} />)}</ScrollView>
            <TextInput style={s.manualInput} placeholder="Or type custom skill/category…" placeholderTextColor="#94A3B8" value={customCategory} onChangeText={(value) => { setCustomCategory(value); if (value) setCategory("all"); }} />
          </View>

          <View style={s.filterBlock}>
            <Text style={s.filterTitle}>Salary Range</Text>
            <View style={s.salaryRowInput}>
              <TextInput style={s.salaryInput} placeholder="Min ₹" placeholderTextColor="#94A3B8" value={salaryMin} onChangeText={(value) => setSalaryMin(value.replace(/\D/g, "").slice(0, 7))} keyboardType="number-pad" />
              <TextInput style={s.salaryInput} placeholder="Max ₹" placeholderTextColor="#94A3B8" value={salaryMax} onChangeText={(value) => setSalaryMax(value.replace(/\D/g, "").slice(0, 7))} keyboardType="number-pad" />
            </View>
          </View>

          <View style={s.filterBlock}>
            <View style={s.areaHeader}>
              <Text style={s.filterTitle}>Area</Text>
              <TouchableOpacity onPress={() => setShowAllAreas((value) => !value)} activeOpacity={0.75}><Text style={s.showMoreText}>{showAllAreas ? "Show less" : "Show all"}</Text></TouchableOpacity>
            </View>
            <View style={s.areaGrid}>{visibleAreas.map((area) => <FilterChip key={area} label={area} active={selectedAreas.includes(area)} onPress={() => toggleArea(area)} />)}</View>
          </View>
        </View>

        <View style={s.resultsHeader}>
          <Text style={s.resultsTitle}>Matching Jobs</Text>
          <Text style={s.resultsSub}>{results.length} result{results.length === 1 ? "" : "s"}</Text>
        </View>

        {results.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIcon}><Feather name="search" size={34} color="#047857" /></View>
            <Text style={s.emptyTitle}>No jobs found</Text>
            <Text style={s.emptySub}>Try changing salary, area, category or job type filters.</Text>
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6FAF8" },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: "#064E3B", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  headerTitle: { fontSize: 24, color: "white", fontFamily: "Inter_800ExtraBold", fontWeight: "900", letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular", marginTop: 2 },
  clearBtn: { width: 58, alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingVertical: 8 },
  clearBtnText: { color: "white", fontSize: 11, fontFamily: "Inter_800ExtraBold" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, shadowColor: "#064E3B", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_600SemiBold", padding: 0 },
  resultCount: { alignSelf: "flex-start", marginTop: 11, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  resultCountText: { color: "white", fontSize: 11, fontFamily: "Inter_800ExtraBold" },
  content: { padding: 16, gap: 13 },
  filterCard: { backgroundColor: "white", borderRadius: 24, padding: 15, gap: 14, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  filterBlock: { gap: 9 },
  filterTitle: { fontSize: 13, color: "#0F172A", fontFamily: "Inter_800ExtraBold" },
  filterRow: { gap: 8, paddingRight: 4 },
  areaHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  showMoreText: { fontSize: 12, color: "#047857", fontFamily: "Inter_800ExtraBold" },
  areaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: "#047857", borderColor: "#047857" },
  chipText: { fontSize: 12, color: "#475569", fontFamily: "Inter_700Bold" },
  chipTextActive: { color: "white" },
  manualInput: { minHeight: 48, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, paddingHorizontal: 13, color: "#0F172A", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  salaryRowInput: { flexDirection: "row", gap: 10 },
  salaryInput: { flex: 1, minHeight: 48, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, paddingHorizontal: 13, color: "#0F172A", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 2 },
  resultsTitle: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_800ExtraBold", fontWeight: "900" },
  resultsSub: { fontSize: 12, color: "#64748B", fontFamily: "Inter_600SemiBold" },
  card: { backgroundColor: "white", borderRadius: 24, padding: 15, gap: 12, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  catIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_800ExtraBold", fontWeight: "900" },
  cardSub: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  cardTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_600SemiBold" },
  metaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
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
  emptyBox: { backgroundColor: "white", borderRadius: 24, paddingVertical: 46, paddingHorizontal: 22, alignItems: "center", borderWidth: 1, borderColor: "rgba(226,232,240,0.92)", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  emptyIcon: { width: 72, height: 72, borderRadius: 25, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 1, borderColor: "#A7F3D0" },
  emptyTitle: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_800ExtraBold", fontWeight: "900", textAlign: "center" },
  emptySub: { marginTop: 5, fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
