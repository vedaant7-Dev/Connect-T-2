import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

function AppliedCard({ job }: { job: Job }) {
  const cat = categoryConfig[job.category];
  const type = typeConfig[job.type];

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={[s.catIcon, { backgroundColor: cat.bg }]}>
          <Feather name={cat.icon as any} size={18} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={s.company} numberOfLines={1}>{job.company}</Text>
        </View>
        <View style={s.appliedBadge}>
          <Feather name="check-circle" size={12} color="#059669" />
          <Text style={s.appliedBadgeText}>Applied</Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <View style={s.metaChip}>
          <Feather name="map-pin" size={10} color="#64748B" />
          <Text style={s.metaText}>{job.location}</Text>
        </View>
        <View style={[s.metaChip, { backgroundColor: type.bg }]}>
          <Text style={[s.metaText, { color: type.color, fontFamily: "Inter_600SemiBold" }]}>{type.label}</Text>
        </View>
        <View style={s.metaChip}>
          <Feather name="clock" size={10} color="#64748B" />
          <Text style={s.metaText}>{timeAgo(job.createdAt)}</Text>
        </View>
      </View>

      <View style={s.salaryRow}>
        <Text style={s.salary}>{job.salary}</Text>
        <Text style={s.openings}>{job.openings} opening{job.openings > 1 ? "s" : ""}</Text>
      </View>

      <View style={s.statusBar}>
        <View style={s.statusStep}>
          <View style={[s.statusDot, { backgroundColor: "#059669" }]} />
          <Text style={s.statusStepText}>Applied</Text>
        </View>
        <View style={s.statusLine} />
        <View style={s.statusStep}>
          <View style={[s.statusDot, { backgroundColor: "#E2E8F0" }]} />
          <Text style={[s.statusStepText, { color: "#CBD5E1" }]}>Reviewed</Text>
        </View>
        <View style={s.statusLine} />
        <View style={s.statusStep}>
          <View style={[s.statusDot, { backgroundColor: "#E2E8F0" }]} />
          <Text style={[s.statusStepText, { color: "#CBD5E1" }]}>Contacted</Text>
        </View>
      </View>
    </View>
  );
}

export default function AppliedJobsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser } = useJobsAuth();
  const { jobs } = useJobs();

  const appliedJobs = jobs.filter(
    (j) => jobsUser && j.applicants.includes(jobsUser.id)
  );

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 12 }]}
      >
        <Text style={s.headerTitle}>Applied Jobs</Text>
        <Text style={s.headerSub}>
          {appliedJobs.length} job{appliedJobs.length !== 1 ? "s" : ""} applied
        </Text>
      </LinearGradient>

      {appliedJobs.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Feather name="briefcase" size={40} color="#FED7AA" />
          </View>
          <Text style={s.emptyTitle}>No applications yet</Text>
          <Text style={s.emptySub}>
            Jobs you apply for will appear here so you can track their status.
          </Text>
        </View>
      ) : (
        <FlatList
          data={appliedJobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 8) + 90 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <AppliedCard job={item} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF7ED" },
  header: {
    paddingHorizontal: 16, paddingBottom: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginTop: 4 },

  list: { padding: 14, gap: 10 },

  card: {
    backgroundColor: "white", borderRadius: 18, padding: 14,
    shadowColor: "#EA580C", shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  catIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  jobTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  company: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  appliedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  appliedBadgeText: { fontSize: 10, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },

  metaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  metaText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },

  salaryRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  salary: { flex: 1, fontSize: 14, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  openings: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },

  statusBar: { flexDirection: "row", alignItems: "center" },
  statusStep: { alignItems: "center", gap: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusStepText: { fontSize: 9, fontWeight: "600", color: "#059669", fontFamily: "Inter_600SemiBold" },
  statusLine: { flex: 1, height: 1.5, backgroundColor: "#E2E8F0", marginBottom: 12 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FED7AA",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155", fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, color: "#94A3B8", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
