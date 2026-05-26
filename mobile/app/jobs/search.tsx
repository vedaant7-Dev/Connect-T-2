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

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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

        <View style={{ height: 132 }} />
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
  root: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    shadowColor: "#9A3412",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.35,
  },
  clearBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
  },
  clearBtnText: {
    fontSize: 12,
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 10,
    shadowColor: "#9A3412",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "Inter_400Regular",
    paddingVertical: 2,
  },
  resultCount: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultCountText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.86)",
    fontFamily: "Inter_700Bold",
  },

  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  ctaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
  },

  cleanFilterCard: {
    backgroundColor: "white",
    margin: 16,
    marginBottom: 0,
    borderRadius: 26,
    padding: 17,
    borderWidth: 1,
    borderColor: "rgba(254,215,170,0.72)",
    shadowColor: "#9A3412",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  resetRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    minHeight: 50,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  manualInput: {
    marginTop: 9,
    backgroundColor: "#F8FAFC",
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    fontSize: 13,
    color: "#0F172A",
    fontFamily: "Inter_400Regular",
    minHeight: 50,
  },
  salaryInputRow: {
    flexDirection: "row",
    gap: 11,
  },
  salaryInputBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 17,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    minHeight: 58,
  },
  salaryInputLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#94A3B8",
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  salaryInput: {
    fontSize: 16,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
    paddingVertical: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.48)",
    justifyContent: "center",
    padding: 24,
  },
  dropdownMenu: {
    backgroundColor: "white",
    borderRadius: 26,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dropdownMenuTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderRadius: 14,
  },
  dropdownItemActive: {
    backgroundColor: "#FFF7ED",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#334155",
    fontFamily: "Inter_500Medium",
  },
  dropdownItemTextActive: {
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },

  smallClearBtn: {
    backgroundColor: "#FFF7ED",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  smallClearText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
  },
  filterBlock: {
    marginTop: 7,
    marginBottom: 13,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#334155",
    fontFamily: "Inter_700Bold",
    marginBottom: 9,
    letterSpacing: 0.1,
  },
  filterHint: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    marginBottom: 9,
  },
  filterRow: {
    gap: 9,
    paddingBottom: 4,
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  chipText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_600SemiBold",
  },
  chipTextActive: {
    color: "white",
    fontFamily: "Inter_700Bold",
  },

  moreFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FFF7ED",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginTop: 3,
  },
  moreFilterLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moreFilterText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#334155",
    fontFamily: "Inter_700Bold",
  },
  moreFilterBadge: {
    backgroundColor: "white",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  moreFilterBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
  },
  morePanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  showAreaBtn: {
    alignSelf: "flex-start",
    marginTop: 11,
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  showAreaText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
  },

  shiftChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  shiftChipActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  shiftChipText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_500Medium",
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
    marginTop: 16,
  },
  resultsList: {
    padding: 16,
    gap: 10,
  },
  resultsHeader: {
    fontSize: 14,
    fontWeight: "900",
    color: "#334155",
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
  },
  clearFiltersBtn: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FED7AA",
  },
  clearFiltersBtnText: {
    fontSize: 13,
    color: "#EA580C",
    fontFamily: "Inter_600SemiBold",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#9A3412",
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(254,215,170,0.5)",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginBottom: 10,
  },
  catDot: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cardTime: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
  },
  chipRow: {
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
  },
  salaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 10,
  },
  salary: {
    fontSize: 15,
    fontWeight: "900",
    color: "#059669",
    fontFamily: "Inter_700Bold",
  },
  expandBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 5,
  },
  expandLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#475569",
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  expandText: {
    fontSize: 12,
    color: "#334155",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appliedCount: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
  },
  applyBtn: {
    borderRadius: 13,
    overflow: "hidden",
  },
  applyBtnDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 13,
  },
  applyGrad: {
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  applyText: {
    fontSize: 12,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
  applyTextWhite: {
    fontSize: 12,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
  },
});
