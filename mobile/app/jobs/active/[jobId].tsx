import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJobs } from "@/context/JobsContext";

function ApplicantRow({
  id,
  type,
}: {
  id: string;
  type: "hired" | "shortlisted" | "pending";
}) {
  const theme =
    type === "hired"
      ? {
          bg: "#D1FAE5",
          color: "#059669",
          icon: "user-check" as const,
          label: "Hired",
        }
      : type === "shortlisted"
        ? {
            bg: "#EFF6FF",
            color: "#1D4ED8",
            icon: "star" as const,
            label: "Shortlisted",
          }
        : {
            bg: "#FFF7ED",
            color: "#EA580C",
            icon: "clock" as const,
            label: "Pending",
          };

  return (
    <View style={s.userRow}>
      <View style={[s.avatar, { backgroundColor: theme.bg }]}>
        <Feather name={theme.icon} size={16} color={theme.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.userName}>
          Applicant {id.replace(/[^0-9]/g, "") || id.slice(-4)}
        </Text>
        <Text style={s.userSub}>ID: {id}</Text>
      </View>

      <View style={[s.statusPill, { backgroundColor: theme.bg }]}>
        <Text style={[s.statusPillText, { color: theme.color }]}>
          {theme.label}
        </Text>
      </View>
    </View>
  );
}

export default function ActiveJobDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { jobs } = useJobs();

  const job = useMemo(
    () => jobs.find((j) => j.id === params.jobId) ?? null,
    [jobs, params.jobId],
  );

  const topPad = (Platform.OS === "web" ? 54 : insets.top) + 14;

  if (!job) {
    return (
      <View style={s.root}>
        <LinearGradient
          colors={["#9A3412", "#C2410C", "#EA580C", "#FB923C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: topPad }]}
        >
          <View style={s.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.backBtn}
              activeOpacity={0.84}
            >
              <Feather name="chevron-left" size={22} color="white" />
            </TouchableOpacity>

            <View style={s.headerBadge}>
              <Feather name="briefcase" size={11} color="rgba(255,255,255,0.86)" />
              <Text style={s.headerBadgeText}>Active Job</Text>
            </View>
          </View>

          <View style={s.notFoundHero}>
            <View style={s.heroIcon}>
              <Feather name="alert-circle" size={28} color="#EA580C" />
            </View>
            <Text style={s.headerTitle}>Active Job</Text>
            <Text style={s.headerSub}>Job not found</Text>
          </View>
        </LinearGradient>

        <View style={s.emptyCard}>
          <Feather name="briefcase" size={38} color="#EA580C" />
          <Text style={s.emptyTitle}>Job not available</Text>
          <Text style={s.emptyText}>
            This job may have been removed or is no longer active.
          </Text>
        </View>
      </View>
    );
  }

  const hired = job.hired || [];
  const shortlisted = job.shortlisted || [];
  const rejected = job.rejected || [];
  const applicants = job.applicants || [];
  const pending = applicants.filter(
    (id) =>
      !hired.includes(id) &&
      !shortlisted.includes(id) &&
      !rejected.includes(id),
  );

  const fillRate =
    job.openings > 0 ? Math.min(100, Math.round((hired.length / job.openings) * 100)) : 0;

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad }]}
      >
        <View style={s.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            activeOpacity={0.84}
          >
            <Feather name="chevron-left" size={22} color="white" />
          </TouchableOpacity>

          <View style={s.headerBadge}>
            <Feather name="zap" size={11} color="rgba(255,255,255,0.86)" />
            <Text style={s.headerBadgeText}>Active Job</Text>
          </View>
        </View>

        <View style={s.heroRow}>
          <View style={s.heroIcon}>
            <Feather name="briefcase" size={27} color="#EA580C" />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerTitle} numberOfLines={2}>
              {job.title}
            </Text>
            <Text style={s.headerSub} numberOfLines={2}>
              {job.company} · {job.location}
            </Text>
          </View>
        </View>

        <View style={s.headerStats}>
          <View style={s.headerStatItem}>
            <Text style={s.headerStatNum}>{job.openings}</Text>
            <Text style={s.headerStatLabel}>Openings</Text>
          </View>

          <View style={s.headerStatDivider} />

          <View style={s.headerStatItem}>
            <Text style={s.headerStatNum}>{applicants.length}</Text>
            <Text style={s.headerStatLabel}>Applicants</Text>
          </View>

          <View style={s.headerStatDivider} />

          <View style={s.headerStatItem}>
            <Text style={s.headerStatNum}>{hired.length}</Text>
            <Text style={s.headerStatLabel}>Hired</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 86,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.sectionIcon}>
              <Feather name="bar-chart-2" size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Hiring Progress</Text>
              <Text style={s.sectionSub}>Current job pipeline overview</Text>
            </View>
            <Text style={s.fillPercent}>{fillRate}%</Text>
          </View>

          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${fillRate}%` }]} />
          </View>

          <View style={s.metricGrid}>
            <View style={[s.metricBox, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
              <Text style={[s.metricNum, { color: "#C2410C" }]}>{job.openings}</Text>
              <Text style={s.metricLabel}>Openings</Text>
            </View>

            <View style={[s.metricBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
              <Text style={[s.metricNum, { color: "#1D4ED8" }]}>{applicants.length}</Text>
              <Text style={s.metricLabel}>Applied</Text>
            </View>

            <View style={[s.metricBox, { backgroundColor: "#D1FAE5", borderColor: "#A7F3D0" }]}>
              <Text style={[s.metricNum, { color: "#059669" }]}>{hired.length}</Text>
              <Text style={s.metricLabel}>Hired</Text>
            </View>

            <View style={[s.metricBox, { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }]}>
              <Text style={[s.metricNum, { color: "#475569" }]}>{pending.length}</Text>
              <Text style={s.metricLabel}>Pending</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.sectionIcon, { backgroundColor: "#D1FAE5" }]}>
              <Feather name="user-check" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Hired Users</Text>
              <Text style={s.sectionSub}>{hired.length} selected candidates</Text>
            </View>
          </View>

          {hired.length === 0 ? (
            <View style={s.emptyInline}>
              <Feather name="users" size={34} color="#CBD5E1" />
              <Text style={s.emptyText}>No hired users yet</Text>
            </View>
          ) : (
            hired.map((id) => <ApplicantRow key={id} id={id} type="hired" />)
          )}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.sectionIcon, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="star" size={18} color="#1D4ED8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Shortlisted</Text>
              <Text style={s.sectionSub}>{shortlisted.length} candidates shortlisted</Text>
            </View>
          </View>

          {shortlisted.length === 0 ? (
            <View style={s.emptyInline}>
              <Feather name="star" size={32} color="#CBD5E1" />
              <Text style={s.emptyText}>No shortlisted candidates yet</Text>
            </View>
          ) : (
            shortlisted.map((id) => (
              <ApplicantRow key={id} id={id} type="shortlisted" />
            ))
          )}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.sectionIcon, { backgroundColor: "#FFF7ED" }]}>
              <Feather name="clock" size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Pending Review</Text>
              <Text style={s.sectionSub}>{pending.length} applications waiting</Text>
            </View>
          </View>

          {pending.length === 0 ? (
            <View style={s.emptyInline}>
              <Feather name="check-circle" size={32} color="#CBD5E1" />
              <Text style={s.emptyText}>No pending applicants</Text>
            </View>
          ) : (
            pending.map((id) => <ApplicantRow key={id} id={id} type="pending" />)
          )}
        </View>
      </ScrollView>
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
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBadgeText: {
    fontSize: 11,
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 22,
  },
  notFoundHero: {
    alignItems: "center",
    paddingTop: 22,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 25,
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
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  headerStats: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerStatItem: {
    flex: 1,
    alignItems: "center",
  },
  headerStatNum: {
    fontSize: 24,
    color: "white",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  headerStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  content: {
    padding: 16,
    gap: 13,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 17,
    gap: 14,
    shadowColor: "#9A3412",
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(254,215,170,0.5)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.12,
  },
  sectionSub: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  fillPercent: {
    fontSize: 20,
    color: "#059669",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#059669",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricBox: {
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: 17,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  metricNum: {
    fontSize: 21,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  userSub: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
  emptyInline: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
    gap: 9,
  },
  emptyCard: {
    margin: 16,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#9A3412",
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(254,215,170,0.5)",
  },
  emptyTitle: {
    fontSize: 18,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
