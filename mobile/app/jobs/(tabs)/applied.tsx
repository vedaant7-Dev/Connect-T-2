import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

function getApplicationState(job: Job, userId?: string) {
  if (!userId) {
    return {
      label: "Applied",
      color: "#059669",
      bg: "#D1FAE5",
      icon: "check-circle" as const,
      step: 1,
    };
  }

  if (job.shortlisted.includes(userId)) {
    return {
      label: "Shortlisted",
      color: "#059669",
      bg: "#D1FAE5",
      icon: "user-check" as const,
      step: 3,
    };
  }

  if (job.rejected.includes(userId)) {
    return {
      label: "Rejected",
      color: "#DC2626",
      bg: "#FEE2E2",
      icon: "user-x" as const,
      step: 2,
    };
  }

  return {
    label: "Under Review",
    color: "#EA580C",
    bg: "#FFF7ED",
    icon: "clock" as const,
    step: 2,
  };
}

function AppliedCard({ job, userId }: { job: Job; userId?: string }) {
  const router = useRouter();
  const cat = categoryConfig[job.category] || categoryConfig.other;
  const type = typeConfig[job.type];
  const state = getApplicationState(job, userId);

  const steps = [
    { key: "applied", label: "Applied" },
    { key: "review", label: "Review" },
    {
      key: "final",
      label:
        state.label === "Shortlisted"
          ? "Shortlisted"
          : state.label === "Rejected"
            ? "Rejected"
            : "Contact",
    },
  ];

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.86}
      onPress={() => router.push(`/jobs/detail/${job.id}` as any)}
    >
      <View style={s.cardTop}>
        <View style={[s.catIcon, { backgroundColor: cat.bg }]}>
          <Feather name={cat.icon as any} size={20} color={cat.color} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={s.company} numberOfLines={1}>
            {job.company}
          </Text>
        </View>

        <View style={[s.stateBadge, { backgroundColor: state.bg }]}>
          <Feather name={state.icon} size={12} color={state.color} />
          <Text style={[s.stateBadgeText, { color: state.color }]}>
            {state.label}
          </Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <View style={s.metaChip}>
          <Feather name="map-pin" size={11} color="#64748B" />
          <Text style={s.metaText}>{job.location}</Text>
        </View>

        <View style={[s.metaChip, { backgroundColor: type.bg }]}>
          <Text style={[s.metaText, { color: type.color, fontFamily: "Inter_700Bold" }]}>
            {type.label}
          </Text>
        </View>

        <View style={s.metaChip}>
          <Feather name="clock" size={11} color="#64748B" />
          <Text style={s.metaText}>{timeAgo(job.createdAt)}</Text>
        </View>
      </View>

      <View style={s.salaryRow}>
        <View>
          <Text style={s.salary}>{job.salary}</Text>
          <Text style={s.salarySub}>Expected salary</Text>
        </View>

        <View style={s.openingPill}>
          <Feather name="users" size={12} color="#EA580C" />
          <Text style={s.openings}>
            {job.openings} opening{job.openings > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <View style={s.statusBox}>
        {steps.map((step, index) => {
          const active = index + 1 <= state.step;
          const isRejected = state.label === "Rejected" && index === 2;

          return (
            <React.Fragment key={step.key}>
              <View style={s.statusStep}>
                <View
                  style={[
                    s.statusDot,
                    {
                      backgroundColor: active
                        ? isRejected
                          ? "#DC2626"
                          : state.color
                        : "#E2E8F0",
                    },
                  ]}
                />
                <Text
                  style={[
                    s.statusStepText,
                    {
                      color: active
                        ? isRejected
                          ? "#DC2626"
                          : state.color
                        : "#CBD5E1",
                    },
                  ]}
                >
                  {step.label}
                </Text>
              </View>

              {index < steps.length - 1 && (
                <View
                  style={[
                    s.statusLine,
                    {
                      backgroundColor: index + 1 < state.step ? state.color : "#E2E8F0",
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

export default function AppliedJobsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser } = useJobsAuth();
  const { jobs } = useJobs();

  const appliedJobs = jobs.filter(
    (job) => jobsUser && job.applicants.includes(jobsUser.id),
  );

  const shortlistedCount = appliedJobs.filter(
    (job) => jobsUser && job.shortlisted.includes(jobsUser.id),
  ).length;

  const pendingCount = appliedJobs.filter(
    (job) =>
      jobsUser &&
      !job.shortlisted.includes(jobsUser.id) &&
      !job.rejected.includes(jobsUser.id),
  ).length;

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 14 }]}
      >
        <View style={s.headerTop}>
          <View style={s.headerIcon}>
            <Feather name="briefcase" size={24} color="#EA580C" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Applied Jobs</Text>
            <Text style={s.headerSub}>
              Track applications and employer responses
            </Text>
          </View>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryNum}>{appliedJobs.length}</Text>
            <Text style={s.summaryLabel}>Applied</Text>
          </View>

          <View style={s.summaryDivider} />

          <View style={s.summaryItem}>
            <Text style={s.summaryNum}>{pendingCount}</Text>
            <Text style={s.summaryLabel}>In Review</Text>
          </View>

          <View style={s.summaryDivider} />

          <View style={s.summaryItem}>
            <Text style={s.summaryNum}>{shortlistedCount}</Text>
            <Text style={s.summaryLabel}>Shortlisted</Text>
          </View>
        </View>
      </LinearGradient>

      {appliedJobs.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Feather name="briefcase" size={38} color="#EA580C" />
            </View>
            <Text style={s.emptyTitle}>No applications yet</Text>
            <Text style={s.emptySub}>
              Jobs you apply for will appear here so you can track their status.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={appliedJobs}
          keyExtractor={(job) => job.id}
          contentContainerStyle={[
            s.list,
            {
              paddingBottom: Math.max(insets.bottom, 8) + 92,
            },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AppliedCard job={item} userId={jobsUser?.id} />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    shadowColor: "#9A3412",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.45,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_400Regular",
    marginTop: 5,
    lineHeight: 18,
  },
  summaryRow: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNum: {
    fontSize: 24,
    color: "white",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  summaryLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#9A3412",
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(254,215,170,0.5)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  catIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.12,
  },
  company: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stateBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },

  metaRow: {
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap",
    marginBottom: 12,
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
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  salary: {
    fontSize: 16,
    fontWeight: "900",
    color: "#059669",
    fontFamily: "Inter_700Bold",
  },
  salarySub: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  openingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF7ED",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  openings: {
    fontSize: 11,
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
  },

  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 12,
  },
  statusStep: {
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  statusStepText: {
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  statusLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 13,
    borderRadius: 999,
  },

  emptyWrap: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 26,
    paddingVertical: 52,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: "#9A3412",
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(254,215,170,0.5)",
  },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FED7AA",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  emptySub: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
