import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  FlatList, Platform, Alert, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useJobs, categoryConfig, typeConfig, JobCategory, JobType, Job } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

const SALARY_RANGES = [
  { id: "all",   label: "Any Salary",      min: 0,     max: Infinity },
  { id: "u10",   label: "Below ₹10K",      min: 0,     max: 10000 },
  { id: "10-15", label: "₹10K – ₹15K",    min: 10000, max: 15000 },
  { id: "15-25", label: "₹15K – ₹25K",    min: 15000, max: 25000 },
  { id: "25-40", label: "₹25K – ₹40K",    min: 25000, max: 40000 },
  { id: "a40",   label: "Above ₹40K",      min: 40000, max: Infinity },
];

const AREAS = [
  "MIDC Ambernath", "Ambernath East", "Ambernath West", "Shivaji Chowk",
  "Station Area East", "Station Area West", "Old Ambernath", "New Ambernath",
  "Vithalwadi", "Shelar Colony", "Badlapur", "Ulhasnagar",
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

function parseSalaryMin(salaryStr: string): number {
  const m = salaryStr.match(/[\d,]+/g);
  if (!m) return 0;
  return parseInt(m[0].replace(/,/g, "")) * (salaryStr.includes("lakh") ? 100000 : 1);
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
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ResultCard({ job, onApply, applied }: { job: Job; applied: boolean; onApply: () => void }) {
  const cat = categoryConfig[job.category];
  const type = typeConfig[job.type];
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded(!expanded)} activeOpacity={0.9}>
      <View style={styles.cardRow}>
        <View style={[styles.catDot, { backgroundColor: cat.bg }]}>
          <Feather name={cat.icon as any} size={16} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{job.company}</Text>
        </View>
        <Text style={styles.cardTime}>{timeAgo(job.createdAt)}</Text>
      </View>

      <View style={styles.chipRow}>
        <View style={styles.metaChip}><Feather name="map-pin" size={10} color="#64748B" /><Text style={styles.metaText}>{job.location}</Text></View>
        <View style={[styles.metaChip, { backgroundColor: type.bg }]}><Text style={[styles.metaText, { color: type.color }]}>{type.label}</Text></View>
        <View style={styles.metaChip}><Feather name="users" size={10} color="#64748B" /><Text style={styles.metaText}>{job.openings} open</Text></View>
      </View>

      <View style={styles.salaryRow}>
        <Text style={styles.salary}>{job.salary}</Text>
      </View>

      {expanded && (
        <View style={styles.expandBox}>
          <Text style={styles.expandLabel}>Description</Text>
          <Text style={styles.expandText}>{job.description}</Text>
          <Text style={styles.expandLabel}>Requirements</Text>
          <Text style={styles.expandText}>{job.requirements}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.appliedCount}>{job.applicants.length} applied</Text>
        <TouchableOpacity
          style={[styles.applyBtn, applied && styles.applyBtnDone]}
          onPress={onApply}
          disabled={applied}
          activeOpacity={0.85}
        >
          {applied ? (
            <><Feather name="check" size={13} color="#059669" /><Text style={[styles.applyText, { color: "#059669" }]}>Applied</Text></>
          ) : (
            <LinearGradient colors={["#C2410C", "#EA580C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyGrad}>
              <Text style={styles.applyTextWhite}>Apply Now</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
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
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showAllAreas, setShowAllAreas] = useState(false);

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const minSalNum = parseInt(salaryMin.replace(/[^\d]/g, "")) || 0;
  const maxSalNum = parseInt(salaryMax.replace(/[^\d]/g, "")) || Infinity;
  const customCatLower = customCategory.trim().toLowerCase();

  const results = useMemo(() => {
    return jobs.filter((j) => {
      if (!j.active) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!j.title.toLowerCase().includes(q) && !j.company.toLowerCase().includes(q) && !j.location.toLowerCase().includes(q)) return false;
      }
      if (customCatLower) {
        if (!j.title.toLowerCase().includes(customCatLower) && !j.category.toLowerCase().includes(customCatLower)) return false;
      } else if (category !== "all" && j.category !== category) return false;
      if (jobType !== "all" && j.type !== jobType) return false;
      if (selectedAreas.length > 0 && !selectedAreas.some((a) => j.location.toLowerCase().includes(a.toLowerCase()))) return false;
      const salMin = parseSalaryMin(j.salary);
      if (salMin < minSalNum || salMin > maxSalNum) return false;
      return true;
    });
  }, [jobs, query, minSalNum, maxSalNum, jobType, category, customCatLower, selectedAreas]);

  const handleApply = (job: Job) => {
    if (!jobsUser || jobsUser.role !== "seeker") return;
    if (hasApplied(job.id, jobsUser.id)) return;
    Alert.alert("Apply for this job?", `${job.title} at ${job.company}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Apply", onPress: () => { applyJob(job.id, jobsUser.id); Alert.alert("Applied!", "Your interest has been registered."); } },
    ]);
  };

  const clearAll = () => {
    setSalaryMin(""); setSalaryMax(""); setJobType("all"); setCategory("all"); setCustomCategory(""); setSelectedAreas([]);
  };

  const hasFilters = salaryMin !== "" || salaryMax !== "" || jobType !== "all" || category !== "all" || customCategory !== "" || selectedAreas.length > 0;
  const selectedCategoryLabel = customCategory.trim() || CATEGORIES.find((c) => c.id === category)?.label || "All";
  const visibleAreas = showAllAreas ? AREAS : AREAS.slice(0, 6);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Jobs</Text>
          {hasFilters && (
            <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Job title, company, location…"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.resultCount}>
          <Text style={styles.resultCountText}>{results.length} jobs found</Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.cleanFilterCard}>
          {hasFilters && (
            <View style={styles.resetRow}>
              <TouchableOpacity onPress={clearAll} style={styles.smallClearBtn} activeOpacity={0.8}>
                <Text style={styles.smallClearText}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.filterBlock}>
            <Text style={styles.filterTitle}>Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {JOB_TYPES.slice(0, 4).map((t) => (
                <FilterChip key={t.id} label={t.label} active={jobType === t.id} onPress={() => setJobType(t.id)} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterBlock}>
            <Text style={styles.filterTitle}>Category</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setCategoryDropdownOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.dropdownText, (category === "all" && !customCategory) && { color: "#94A3B8" }]} numberOfLines={1}>
                {selectedCategoryLabel}
              </Text>
              <Feather name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
            <TextInput
              style={styles.manualInput}
              placeholder="Or type a custom category…"
              placeholderTextColor="#94A3B8"
              value={customCategory}
              onChangeText={(v) => { setCustomCategory(v); if (v) setCategory("all"); }}
            />
          </View>

          <View style={styles.filterBlock}>
            <Text style={styles.filterTitle}>Salary</Text>
            <View style={styles.salaryInputRow}>
              <View style={styles.salaryInputBox}>
                <Text style={styles.salaryInputLabel}>Min</Text>
                <TextInput
                  style={styles.salaryInput}
                  placeholder="₹ 0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={salaryMin}
                  onChangeText={setSalaryMin}
                />
              </View>
              <View style={styles.salaryInputBox}>
                <Text style={styles.salaryInputLabel}>Max</Text>
                <TextInput
                  style={styles.salaryInput}
                  placeholder="₹ Any"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={salaryMax}
                  onChangeText={setSalaryMax}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.moreFilterBtn}
            onPress={() => setShowMoreFilters((prev) => !prev)}
            activeOpacity={0.85}
          >
            <View style={styles.moreFilterLeft}>
              <Feather name="sliders" size={15} color="#EA580C" />
              <Text style={styles.moreFilterText}>More filters</Text>
            </View>
            <View style={styles.moreFilterBadge}>
              <Text style={styles.moreFilterBadgeText}>
                {selectedAreas.length > 0 ? selectedAreas.length : "Optional"}
              </Text>
            </View>
            <Feather name={showMoreFilters ? "chevron-up" : "chevron-down"} size={17} color="#94A3B8" />
          </TouchableOpacity>

          {showMoreFilters && (
            <View style={styles.morePanel}>
              <View style={styles.filterBlock}>
                <Text style={styles.filterTitle}>Area / Location</Text>
                <Text style={styles.filterHint}>Select nearby areas if needed</Text>
                <View style={styles.filterWrap}>
                  {visibleAreas.map((a) => (
                    <FilterChip key={a} label={a} active={selectedAreas.includes(a)} onPress={() => toggleArea(a)} />
                  ))}
                </View>
                <TouchableOpacity onPress={() => setShowAllAreas((prev) => !prev)} style={styles.showAreaBtn} activeOpacity={0.8}>
                  <Text style={styles.showAreaText}>{showAllAreas ? "Show fewer areas" : "Show all areas"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <Modal
          visible={categoryDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCategoryDropdownOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCategoryDropdownOpen(false)}
          >
            <View style={styles.dropdownMenu}>
              <Text style={styles.dropdownMenuTitle}>Select Category</Text>
              <ScrollView style={{ maxHeight: 320 }}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.dropdownItem, category === c.id && !customCategory && styles.dropdownItemActive]}
                    onPress={() => {
                      setCategory(c.id as any);
                      setCustomCategory("");
                      setCategoryDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, category === c.id && !customCategory && styles.dropdownItemTextActive]}>
                      {c.label}
                    </Text>
                    {category === c.id && !customCategory && (
                      <Feather name="check" size={16} color="#EA580C" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={{ borderRadius: 14, overflow: "hidden" }}
          onPress={() => router.push({
            pathname: "/jobs/results" as any,
            params: {
              q: query,
              type: jobType,
              cat: category,
              custom: customCategory,
              min: salaryMin,
              max: salaryMax,
              areas: selectedAreas.join(","),
            },
          })}
        >
          <LinearGradient colors={["#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGrad}>
            <Feather name="search" size={18} color="white" />
            <Text style={styles.ctaText}>Search Jobs · {results.length} match{results.length === 1 ? "" : "es"}</Text>
            <Feather name="arrow-right" size={18} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  clearBtn: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  clearBtnText: { fontSize: 12, color: "white", fontFamily: "Inter_600SemiBold" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular" },
  resultCount: { marginTop: 8 },
  resultCountText: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },

  ctaBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 10, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  ctaGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 14 },
  ctaText: { fontSize: 14, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  cleanFilterCard: { backgroundColor: "white", margin: 14, marginBottom: 0, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#EA580C", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  resetRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 6 },
  dropdownBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: "#E2E8F0" },
  dropdownText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  manualInput: { marginTop: 8, backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: "#E2E8F0", fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular" },
  salaryInputRow: { flexDirection: "row", gap: 10 },
  salaryInputBox: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: "#E2E8F0" },
  salaryInputLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  salaryInput: { fontSize: 15, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "700", paddingVertical: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: 24 },
  dropdownMenu: { backgroundColor: "white", borderRadius: 18, padding: 14, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  dropdownMenuTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 10, paddingHorizontal: 4 },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
  dropdownItemActive: { backgroundColor: "#FFF7ED" },
  dropdownItemText: { fontSize: 14, color: "#334155", fontFamily: "Inter_500Medium" },
  dropdownItemTextActive: { color: "#EA580C", fontFamily: "Inter_700Bold", fontWeight: "700" },
  smallClearBtn: { backgroundColor: "#FFF7ED", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#FED7AA" },
  smallClearText: { fontSize: 11, fontWeight: "800", color: "#EA580C", fontFamily: "Inter_700Bold" },
  filterBlock: { marginTop: 6, marginBottom: 10 },
  filterSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  filterTitle: { fontSize: 13, fontWeight: "700", color: "#334155", fontFamily: "Inter_700Bold", marginBottom: 8 },
  filterHint: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 8 },
  filterRow: { gap: 8, paddingBottom: 4 },
  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "white", borderWidth: 1.5, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  chipText: { fontSize: 12, color: "#64748B", fontFamily: "Inter_500Medium" },
  chipTextActive: { color: "white", fontFamily: "Inter_700Bold" },
  moreFilterBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F8FAFC", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: "#E2E8F0", marginTop: 2 },
  moreFilterLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  moreFilterText: { fontSize: 13, fontWeight: "800", color: "#334155", fontFamily: "Inter_700Bold" },
  moreFilterBadge: { backgroundColor: "#FFF7ED", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  moreFilterBadgeText: { fontSize: 10, fontWeight: "800", color: "#EA580C", fontFamily: "Inter_700Bold" },
  morePanel: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  showAreaBtn: { alignSelf: "flex-start", marginTop: 10, backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  showAreaText: { fontSize: 12, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_700Bold" },
  shiftChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "white", borderWidth: 1.5, borderColor: "#E2E8F0" },
  shiftChipActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  shiftChipText: { fontSize: 12, color: "#64748B", fontFamily: "Inter_500Medium" },

  divider: { height: 1, backgroundColor: "#E2E8F0", marginHorizontal: 16, marginTop: 16 },
  resultsList: { padding: 16, gap: 10 },
  resultsHeader: { fontSize: 14, fontWeight: "700", color: "#334155", fontFamily: "Inter_700Bold", marginBottom: 8 },
  empty: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  clearFiltersBtn: { backgroundColor: "#FFF7ED", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#FED7AA" },
  clearFiltersBtnText: { fontSize: 13, color: "#EA580C", fontFamily: "Inter_600SemiBold" },

  card: { backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  catDot: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 1 },
  cardTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  chipRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 10, color: "#64748B", fontFamily: "Inter_400Regular" },
  salaryRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 10 },
  salary: { fontSize: 14, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  expandBox: { backgroundColor: "#F8FAFC", borderRadius: 10, padding: 10, marginBottom: 10, gap: 4 },
  expandLabel: { fontSize: 10, fontWeight: "700", color: "#475569", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  expandText: { fontSize: 12, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 17 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  appliedCount: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  applyBtn: { borderRadius: 9, overflow: "hidden" },
  applyBtnDone: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#D1FAE5", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  applyGrad: { paddingHorizontal: 16, paddingVertical: 8 },
  applyText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  applyTextWhite: { fontSize: 12, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
