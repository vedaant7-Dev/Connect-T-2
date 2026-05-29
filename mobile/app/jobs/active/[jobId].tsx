import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
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

import { useJobs, JobApplication } from "@/context/JobsContext";

type ApplicantStatus = "pending" | "shortlisted" | "hired" | "rejected";

function cleanPhone(value?: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function statusTheme(status: ApplicantStatus) {
  if (status === "hired") {
    return { label: "Hired", icon: "user-check" as const, color: "#059669", bg: "#D1FAE5" };
  }

  if (status === "shortlisted") {
    return { label: "Shortlisted", icon: "star" as const, color: "#1D4ED8", bg: "#DBEAFE" };
  }

  if (status === "rejected") {
    return { label: "Rejected", icon: "user-x" as const, color: "#DC2626", bg: "#FEE2E2" };
  }

  return { label: "Pending", icon: "clock" as const, color: "#EA580C", bg: "#FFF7ED" };
}

function ApplicantCard({
  app,
  status,
  jobId,
  onShortlist,
  onReject,
  onHire,
}: {
  app: JobApplication;
  status: ApplicantStatus;
  jobId: string;
  onShortlist: () => Promise<void>;
  onReject: () => Promise<void>;
  onHire: () => Promise<void>;
}) {
  const router = useRouter();
  const theme = statusTheme(status);
  const [busy, setBusy] = useState(false);
  const phone = cleanPhone(app.seekerPhone);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;

    setBusy(true);
    try {
      await fn();
    } catch (err: any) {
      Alert.alert("Action failed", err?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const openWhatsApp = async () => {
    if (!phone) {
      Alert.alert("Phone unavailable", "Applicant contact number is not available.");
      return;
    }

    const text = encodeURIComponent("Hi, this is regarding your Connect T job application.");
    const url = `https://wa.me/91${phone}?text=${text}`;
    await Linking.openURL(url);
  };

  const openChat = () => {
    router.push({
      pathname: "/jobs/chat/[employerId]",
      params: {
        employerId: app.seekerId,
        jobId,
        peerName: app.seekerName || "Applicant",
      },
    } as any);
  };

  return (
    <View style={s.applicantCard}>
      <View style={s.applicantTop}>
        <View style={[s.avatar, { backgroundColor: theme.bg }]}>
          <Feather name={theme.icon} size={16} color={theme.color} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.userName} numberOfLines={1}>
            {app.seekerName || `Applicant ${app.seekerId.slice(-4)}`}
          </Text>

          <Text style={s.userSub} numberOfLines={1}>
            {phone ? `+91 ${phone}` : "Contact not available"}
            {app.seekerEmail ? ` · ${app.seekerEmail}` : ""}
          </Text>
        </View>

        <View style={[s.statusPill, { backgroundColor: theme.bg }]}>
          <Text style={[s.statusPillText, { color: theme.color }]}>{theme.label}</Text>
        </View>
      </View>

      {!!app.seekerQualification && (
        <View style={s.infoLine}>
          <Feather name="award" size={12} color="#64748B" />
          <Text style={s.infoText}>{app.seekerQualification}</Text>
        </View>
      )}

      {!!app.seekerSkills && (
        <View style={s.infoLine}>
          <Feather name="tool" size={12} color="#64748B" />
          <Text style={s.infoText} numberOfLines={2}>{app.seekerSkills}</Text>
        </View>
      )}

      <View style={s.actionRow}>
        <TouchableOpacity style={[s.smallBtn, s.chatBtn]} onPress={openChat} activeOpacity={0.85}>
          <Feather name="message-square" size={13} color="#EA580C" />
          <Text style={[s.smallBtnText, { color: "#EA580C" }]}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.smallBtn, s.whatsappBtn]} onPress={openWhatsApp} activeOpacity={0.85}>
          <Feather name="message-circle" size={13} color="#047857" />
          <Text style={[s.smallBtnText, { color: "#047857" }]}>WhatsApp</Text>
        </TouchableOpacity>

        {status !== "hired" && (
          <TouchableOpacity style={[s.smallBtn, s.hireBtn]} disabled={busy} onPress={() => run(onHire)} activeOpacity={0.85}>
            <Feather name="check-circle" size={13} color="#059669" />
            <Text style={[s.smallBtnText, { color: "#059669" }]}>Hire</Text>
          </TouchableOpacity>
        )}

        {status !== "shortlisted" && status !== "hired" && (
          <TouchableOpacity style={[s.smallBtn, s.shortlistBtn]} disabled={busy} onPress={() => run(onShortlist)} activeOpacity={0.85}>
            <Feather name="star" size={13} color="#1D4ED8" />
            <Text style={[s.smallBtnText, { color: "#1D4ED8" }]}>Shortlist</Text>
          </TouchableOpacity>
        )}

        {status !== "rejected" && status !== "hired" && (
          <TouchableOpacity style={[s.smallBtn, s.rejectBtn]} disabled={busy} onPress={() => run(onReject)} activeOpacity={0.85}>
            <Feather name="x-circle" size={13} color="#DC2626" />
            <Text style={[s.smallBtnText, { color: "#DC2626" }]}>Reject</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function ActiveJobDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { jobs, shortlistApplicant, rejectApplicant, hireApplicant } = useJobs();

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
          style={[s.header, { paddingTop: topPad }]}
        >
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
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
      </View>
    );
  }

  const applications = (job.applications || []) as JobApplication[];
  const appMap = new Map(applications.map((app) => [app.seekerId, app]));

  const allApplicants: JobApplication[] = job.applicants.map((id) => {
    return appMap.get(id) || {
      id,
      jobId: job.id,
      seekerId: id,
      status: "applied",
    };
  });

  const grouped = {
    hired: allApplicants.filter((app) => job.hired.includes(app.seekerId)),
    shortlisted: allApplicants.filter((app) => job.shortlisted.includes(app.seekerId)),
    rejected: allApplicants.filter((app) => job.rejected.includes(app.seekerId)),
    pending: allApplicants.filter(
      (app) =>
        !job.hired.includes(app.seekerId) &&
        !job.shortlisted.includes(app.seekerId) &&
        !job.rejected.includes(app.seekerId),
    ),
  };

  const fillRate =
    job.openings > 0 ? Math.min(100, Math.round((grouped.hired.length / job.openings) * 100)) : 0;

  const renderGroup = (
    title: string,
    subtitle: string,
    status: ApplicantStatus,
    items: JobApplication[],
  ) => {
    const theme = statusTheme(status);

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.sectionIcon, { backgroundColor: theme.bg }]}>
            <Feather name={theme.icon} size={18} color={theme.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>{title}</Text>
            <Text style={s.sectionSub}>{subtitle}</Text>
          </View>

          <Text style={[s.countText, { color: theme.color }]}>{items.length}</Text>
        </View>

        {items.length === 0 ? (
          <View style={s.emptyInline}>
            <Feather name="users" size={30} color="#CBD5E1" />
            <Text style={s.emptyText}>No applicants in this section</Text>
          </View>
        ) : (
          items.map((app) => (
            <ApplicantCard
              key={`${status}-${app.seekerId}`}
              app={app}
              status={status}
              jobId={job.id}
              onShortlist={() => shortlistApplicant(job.id, app.seekerId)}
              onReject={() => rejectApplicant(job.id, app.seekerId)}
              onHire={() => hireApplicant(job.id, app.seekerId)}
            />
          ))
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad }]}
      >
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.84}>
            <Feather name="chevron-left" size={22} color="white" />
          </TouchableOpacity>

          <View style={s.headerBadge}>
            <Feather name="zap" size={11} color="rgba(255,255,255,0.86)" />
            <Text style={s.headerBadgeText}>Hiring Pipeline</Text>
          </View>
        </View>

        <View style={s.heroRow}>
          <View style={s.heroIcon}>
            <Feather name="briefcase" size={27} color="#EA580C" />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerTitle} numberOfLines={2}>{job.title}</Text>
            <Text style={s.headerSub} numberOfLines={2}>{job.company} · {job.location}</Text>
          </View>
        </View>

        <View style={s.headerStats}>
          <View style={s.headerStatItem}>
            <Text style={s.headerStatNum}>{job.openings}</Text>
            <Text style={s.headerStatLabel}>Openings</Text>
          </View>
          <View style={s.headerStatDivider} />
          <View style={s.headerStatItem}>
            <Text style={s.headerStatNum}>{allApplicants.length}</Text>
            <Text style={s.headerStatLabel}>Applicants</Text>
          </View>
          <View style={s.headerStatDivider} />
          <View style={s.headerStatItem}>
            <Text style={s.headerStatNum}>{grouped.hired.length}</Text>
            <Text style={s.headerStatLabel}>Hired</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 86 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.sectionIcon}>
              <Feather name="bar-chart-2" size={18} color="#EA580C" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Hiring Progress</Text>
              <Text style={s.sectionSub}>Applicant pipeline connected to MySQL</Text>
            </View>

            <Text style={s.fillPercent}>{fillRate}%</Text>
          </View>

          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${fillRate}%` }]} />
          </View>

          <View style={s.metricGrid}>
            <Metric value={allApplicants.length} label="Applied" color="#1D4ED8" bg="#EFF6FF" />
            <Metric value={grouped.pending.length} label="Pending" color="#EA580C" bg="#FFF7ED" />
            <Metric value={grouped.shortlisted.length} label="Shortlisted" color="#059669" bg="#D1FAE5" />
            <Metric value={grouped.rejected.length} label="Rejected" color="#DC2626" bg="#FEE2E2" />
          </View>
        </View>

        {renderGroup("Pending Review", `${grouped.pending.length} applications waiting`, "pending", grouped.pending)}
        {renderGroup("Shortlisted", `${grouped.shortlisted.length} candidates shortlisted`, "shortlisted", grouped.shortlisted)}
        {renderGroup("Hired Users", `${grouped.hired.length} selected candidates`, "hired", grouped.hired)}
        {renderGroup("Rejected", `${grouped.rejected.length} rejected applications`, "rejected", grouped.rejected)}
      </ScrollView>
    </View>
  );
}

function Metric({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <View style={[s.metricBox, { backgroundColor: bg }]}>
      <Text style={[s.metricNum, { color }]}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF7ED" },
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
  headerBadgeText: { fontSize: 11, color: "white", fontFamily: "Inter_700Bold" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 22 },
  notFoundHero: { alignItems: "center", paddingTop: 22 },
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
  headerStatItem: { flex: 1, alignItems: "center" },
  headerStatNum: { fontSize: 24, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" },
  headerStatLabel: { fontSize: 10, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 2 },
  headerStatDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.18)" },
  content: { padding: 16, gap: 13 },
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 2 },
  countText: { fontSize: 21, fontFamily: "Inter_800ExtraBold" },
  fillPercent: { fontSize: 20, color: "#059669", fontFamily: "Inter_700Bold", fontWeight: "900" },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: "#F1F5F9", overflow: "hidden" },
  progressFill: { height: 10, borderRadius: 999, backgroundColor: "#059669" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricBox: {
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    alignItems: "center",
  },
  metricNum: { fontSize: 21, fontWeight: "900", fontFamily: "Inter_700Bold" },
  metricLabel: { fontSize: 10, color: "#64748B", fontFamily: "Inter_500Medium", marginTop: 2 },
  applicantCard: { borderTopWidth: 1, borderTopColor: "#F8FAFC", paddingTop: 13, gap: 10 },
  applicantTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 14, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  userSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { fontSize: 10, fontFamily: "Inter_800ExtraBold" },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  infoText: { flex: 1, fontSize: 11, color: "#475569", fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  smallBtnText: { fontSize: 11, fontFamily: "Inter_800ExtraBold" },
  chatBtn: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  whatsappBtn: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  hireBtn: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  shortlistBtn: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  rejectBtn: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  emptyInline: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 22,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
  },
  emptyText: { fontSize: 12, color: "#64748B", fontFamily: "Inter_600SemiBold" },
});
