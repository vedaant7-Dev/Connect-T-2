import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useJobs, categoryConfig, typeConfig, JobCategory, JobType, Job } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

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

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const router = useRouter();
  const { jobs, applyJob, hasApplied } = useJobs();
  const { jobsUser } = useJobsAuth();
  const params = useLocalSearchParams<{
    q?: string; type?: string; cat?: string; custom?: string; min?: string; max?: string; areas?: string;
  }>();

  const query = (params.q || "").toString();
  const jobType = (params.type || "all") as JobType | "all";
  const category = (params.cat || "all") as JobCategory | "all";
  const customCategory = (params.custom || "").toString();
  const salaryMin = (params.min || "").toString();
  const salaryMax = (params.max || "").toString();
  const selectedAreas = (params.areas || "").toString().split(",").filter(Boolean);

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

  const summaryChips: string[] = [];
  if (query) summaryChips.push(`"${query}"`);
  if (customCategory) summaryChips.push(customCategory);
  else if (category !== "all") summaryChips.push(category);
  if (jobType !== "all") summaryChips.push(jobType);
  if (salaryMin || salaryMax) summaryChips.push(`₹${salaryMin || "0"}–${salaryMax || "Any"}`);
  selectedAreas.forEach((a) => summaryChips.push(a));

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
          <Text style={styles.headerTitle}>Job Results</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.editBtn}>
            <Feather name="sliders" size={14} color="white" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.resultCountText}>{results.length} jobs match your filters</Text>
        {summaryChips.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 10 }}>
            {summaryChips.map((c, i) => (
              <View key={i} style={styles.summaryChip}>
                <Text style={styles.summaryChipText}>{c}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.resultsList} showsVerticalScrollIndicator={false}>
        {results.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="search" size={44} color="#CBD5E1" />
            <Text style={styles.emptyText}>No jobs match your filters</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.clearFiltersBtn}>
              <Text style={styles.clearFiltersBtnText}>Adjust Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          results.map((job) => (
            <ResultCard
              key={job.id}
              job={job}
              applied={jobsUser ? hasApplied(job.id, jobsUser.id) : false}
              onApply={() => handleApply(job)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  editBtnText: { fontSize: 12, color: "white", fontFamily: "Inter_700Bold", fontWeight: "700" },
  resultCountText: { fontSize: 13, color: "rgba(255,255,255,0.9)", fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  summaryChip: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  summaryChipText: { fontSize: 11, color: "white", fontFamily: "Inter_600SemiBold", fontWeight: "600" },

  resultsList: { padding: 16, gap: 10 },
  empty: { alignItems: "center", paddingVertical: 64, gap: 12 },
  emptyText: { fontSize: 15, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  clearFiltersBtn: { backgroundColor: "#FFF7ED", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#FED7AA" },
  clearFiltersBtnText: { fontSize: 13, color: "#EA580C", fontFamily: "Inter_600SemiBold" },

  card: { backgroundColor: "white", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
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
