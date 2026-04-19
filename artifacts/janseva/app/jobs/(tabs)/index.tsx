import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Alert, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { useJobs, categoryConfig, typeConfig, Job } from "@/context/JobsContext";


function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

function isNearby(jobLocation: string, userLocation?: string): boolean {
  if (!userLocation) return false;
  const jl = jobLocation.toLowerCase();
  const ul = userLocation.toLowerCase();
  const parts = ul.split(/[\s,]+/);
  return parts.some((p) => p.length > 3 && jl.includes(p));
}

function JobCard({
  job, onApply, applied, near,
}: { job: Job; applied: boolean; onApply: () => void; near?: boolean }) {
  const cat = categoryConfig[job.category];
  const type = typeConfig[job.type];
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => setExpanded(!expanded)}>
      {near && (
        <View style={styles.nearBadge}>
          <Feather name="map-pin" size={10} color="#059669" />
          <Text style={styles.nearBadgeText}>Near You</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
          <Feather name={cat.icon as any} size={18} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.cardCompany} numberOfLines={1}>{job.company}</Text>
        </View>
        <Text style={styles.cardTime}>{timeAgo(job.createdAt)}</Text>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaChip}><Feather name="map-pin" size={11} color="#64748B" /><Text style={styles.metaText}>{job.location}</Text></View>
        <View style={[styles.metaChip, { backgroundColor: type.bg }]}><Text style={[styles.metaText, { color: type.color, fontFamily: "Inter_600SemiBold" }]}>{type.label}</Text></View>
        <View style={styles.metaChip}><Feather name="users" size={11} color="#64748B" /><Text style={styles.metaText}>{job.openings} opening{job.openings > 1 ? "s" : ""}</Text></View>
      </View>

      <View style={styles.salaryRow}>
        <Feather name="dollar-sign" size={14} color="#059669" />
        <Text style={styles.salary}>{job.salary}</Text>
      </View>

      {expanded && (
        <View style={styles.expandedSection}>
          <Text style={styles.expandLabel}>About the Job</Text>
          <Text style={styles.expandText}>{job.description}</Text>
          <Text style={styles.expandLabel}>Requirements</Text>
          <Text style={styles.expandText}>{job.requirements}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.applicantsText}>{job.applicants.length} applied</Text>
        <TouchableOpacity
          style={[styles.applyBtn, applied && styles.applyBtnDone]}
          onPress={onApply}
          activeOpacity={0.85}
          disabled={applied}
        >
          {applied ? (
            <><Feather name="check" size={14} color="#059669" /><Text style={[styles.applyBtnText, { color: "#059669" }]}>Applied</Text></>
          ) : (
            <LinearGradient colors={["#C2410C", "#EA580C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyGrad}>
              <Text style={styles.applyBtnTextWhite}>Apply Now</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function JobsHomeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser } = useJobsAuth();
  const { jobs, applyJob, hasApplied } = useJobs();
  const router = useRouter();
  const activeJobs = jobs.filter((j) => j.active);
  const nearbyJobs = activeJobs.filter((j) => isNearby(j.location, jobsUser?.location));

  const handleApply = (job: Job) => {
    if (!jobsUser) return;
    if (jobsUser.role === "employer") { Alert.alert("Employers cannot apply for jobs."); return; }
    if (hasApplied(job.id, jobsUser.id)) return;
    Alert.alert("Apply for this job?", `${job.title} at ${job.company}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Apply", onPress: () => { applyJob(job.id, jobsUser.id); Alert.alert("Applied!", "Your interest has been registered. The employer will contact you."); } },
    ]);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Connect T Jobs</Text>
            <Text style={styles.headerSub}>
              {jobsUser?.role === "employer"
                ? `Welcome, ${jobsUser.company || jobsUser.name}`
                : `Hello, ${jobsUser?.name?.split(" ")[0] || "there"} 👋`}
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Feather name="briefcase" size={16} color="white" />
            <Text style={styles.headerBadgeText}>{activeJobs.length}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/jobs/search" as any)}
          activeOpacity={0.8}
        >
          <Feather name="search" size={16} color="#94A3B8" />
          <Text style={styles.searchPlaceholder}>Search by job, company, location…</Text>
          <View style={styles.filterIconBtn}>
            <Feather name="sliders" size={14} color="#EA580C" />
          </View>
        </TouchableOpacity>

      </LinearGradient>

      <FlatList
        data={[]}
        keyExtractor={() => ""}
        renderItem={null}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 8) + 80 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {nearbyJobs.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="map-pin" size={15} color="#059669" />
                  <Text style={styles.sectionTitle}>Jobs Near You</Text>
                  <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{nearbyJobs.length}</Text></View>
                </View>
                {nearbyJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    near
                    applied={jobsUser ? hasApplied(job.id, jobsUser.id) : false}
                    onApply={() => handleApply(job)}
                  />
                ))}
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="briefcase" size={15} color="#EA580C" />
                <Text style={styles.sectionTitle}>All Available Jobs</Text>
                <View style={[styles.sectionBadge, { backgroundColor: "#FFEDD5" }]}>
                  <Text style={[styles.sectionBadgeText, { color: "#EA580C" }]}>{activeJobs.length}</Text>
                </View>
              </View>

              {activeJobs.length === 0 ? (
                <View style={styles.empty}>
                  <Feather name="briefcase" size={44} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No jobs in this category yet</Text>
                </View>
              ) : (
                activeJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    applied={jobsUser ? hasApplied(job.id, jobsUser.id) : false}
                    onApply={() => handleApply(job)}
                  />
                ))
              )}
            </View>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF7ED" },
  header: { paddingHorizontal: 16, paddingBottom: 6, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginTop: 2 },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  headerBadgeText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 12 },
  searchPlaceholder: { flex: 1, fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  filterIconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },

  catRow: { gap: 8, paddingBottom: 10, paddingHorizontal: 2 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)" },
  catChipActive: { backgroundColor: "white" },
  catChipText: { fontSize: 12, color: "rgba(255,255,255,0.85)", fontFamily: "Inter_500Medium" },
  catChipTextActive: { color: "#EA580C", fontFamily: "Inter_700Bold" },

  list: { padding: 14 },
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  sectionBadge: { backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionBadgeText: { fontSize: 12, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },

  card: { backgroundColor: "white", borderRadius: 18, padding: 14, shadowColor: "#EA580C", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, marginBottom: 10 },
  nearBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start", marginBottom: 8 },
  nearBadgeText: { fontSize: 10, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  catIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  cardCompany: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  cardTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  cardMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },
  salaryRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  salary: { fontSize: 15, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  expandedSection: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, marginBottom: 12, gap: 6 },
  expandLabel: { fontSize: 11, fontWeight: "700", color: "#475569", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  expandText: { fontSize: 13, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  applicantsText: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  applyBtn: { borderRadius: 10, overflow: "hidden" },
  applyBtnDone: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#D1FAE5", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  applyGrad: { paddingHorizontal: 18, paddingVertical: 9 },
  applyBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  applyBtnTextWhite: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 48, gap: 12 },
  emptyText: { fontSize: 15, color: "#94A3B8", fontFamily: "Inter_400Regular" },
});
