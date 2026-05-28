import React, { useState, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJobs, Job } from "@/context/JobsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

const JOB_CATEGORIES: Record<string, string> = {
  manufacturing: "Manufacturing", it: "IT / Tech", retail: "Retail", healthcare: "Healthcare",
  construction: "Construction", transport: "Transport", education: "Education", security: "Security", other: "Other",
};

const CAT_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  manufacturing: { color: "#92400E", bg: "#FEF3C7", icon: "settings" },
  it: { color: "#1D4ED8", bg: "#DBEAFE", icon: "monitor" },
  retail: { color: "#7C3AED", bg: "#EDE9FE", icon: "shopping-bag" },
  healthcare: { color: "#DC2626", bg: "#FEE2E2", icon: "activity" },
  construction: { color: "#B45309", bg: "#FFEDD5", icon: "tool" },
  transport: { color: "#0369A1", bg: "#BAE6FD", icon: "truck" },
  education: { color: "#059669", bg: "#D1FAE5", icon: "book-open" },
  security: { color: "#475569", bg: "#F1F5F9", icon: "shield" },
  other: { color: "#64748B", bg: "#F1F5F9", icon: "more-horizontal" },
};

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 10, marginTop: 6 }}>
      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{title}</Text>
      {sub && <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{sub}</Text>}
    </View>
  );
}

const StatCard = memo(function StatCard({
  icon, label, value, color, bg, onPress,
}: {
  icon: string; label: string; value: string | number; color: string; bg: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.72 : 1}
      style={{ flex: 1, backgroundColor: "white", borderRadius: 14, padding: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: "center" }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center" }}>{label}</Text>
      {onPress && (
        <View style={{ position: "absolute", top: 5, right: 5, width: 14, height: 14, borderRadius: 7, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
          <Feather name="chevron-right" size={8} color={color} />
        </View>
      )}
    </TouchableOpacity>
  );
});

const JobRow = memo(function JobRow({ job, onPress }: { job: Job; onPress: () => void }) {
  const cfg = CAT_COLORS[job.category] || CAT_COLORS.other;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{ backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <Feather name={cfg.icon as any} size={17} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }} numberOfLines={1}>{job.title}</Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{job.company} · {job.location}</Text>
        </View>
        <View style={{ backgroundColor: job.active ? "#D1FAE5" : "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
          <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: job.active ? "#059669" : "#94A3B8" }}>
            {job.active ? "Active" : "Paused"}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[{ label: "Applied", value: job.applicants?.length || 0, color: "#3B82F6", bg: "#DBEAFE" },
          { label: "Shortlisted", value: job.shortlisted?.length || 0, color: "#D97706", bg: "#FEF3C7" },
          { label: "Hired", value: job.hired?.length || 0, color: "#059669", bg: "#D1FAE5" },
          { label: "Openings", value: job.openings, color: "#7C3AED", bg: "#EDE9FE" }].map((s) => (
          <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 8, padding: 5, alignItems: "center" }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 8, fontFamily: "Inter_400Regular", color: s.color + "AA" }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
});

function JobDetail({ job, onBack }: { job: Job; onBack: () => void }) {
  const cfg = CAT_COLORS[job.category] || CAT_COLORS.other;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <Feather name="arrow-left" size={18} color="#16A34A" />
        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#16A34A", marginLeft: 6 }}>Back to list</Text>
      </TouchableOpacity>

      <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <Feather name={cfg.icon as any} size={22} color={cfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{job.title}</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{job.company} · {job.location}</Text>
          </View>
          <View style={{ backgroundColor: job.active ? "#D1FAE5" : "#F1F5F9", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: job.active ? "#059669" : "#94A3B8" }}>
              {job.active ? "Active" : "Paused"}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#334155", lineHeight: 20 }}>{job.description}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {[{ label: "Applied", value: job.applicants?.length || 0, color: "#3B82F6", bg: "#DBEAFE", icon: "send" },
          { label: "Shortlisted", value: job.shortlisted?.length || 0, color: "#D97706", bg: "#FEF3C7", icon: "star" },
          { label: "Hired", value: job.hired?.length || 0, color: "#059669", bg: "#D1FAE5", icon: "award" },
          { label: "Openings", value: job.openings, color: "#7C3AED", bg: "#EDE9FE", icon: "briefcase" }].map((s) => (
          <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 12, padding: 12, alignItems: "center" }}>
            <Feather name={s.icon as any} size={16} color={s.color} />
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: s.color, marginTop: 4 }}>{s.value}</Text>
            <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color + "BB", textAlign: "center" }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>Job Details</Text>
        {[
          { label: "Employer", value: job.employerName, icon: "user" },
          { label: "Category", value: JOB_CATEGORIES[job.category] || job.category, icon: "tag" },
          { label: "Type", value: job.type, icon: "clock" },
          { label: "Salary", value: job.salary, icon: "dollar-sign" },
          { label: "Location", value: job.location, icon: "map-pin" },
          { label: "Openings", value: String(job.openings), icon: "users" },
          { label: "Phone", value: job.employerPhone || "—", icon: "phone" },
          { label: "WhatsApp", value: job.employerWhatsApp || "—", icon: "message-circle" },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
              <Feather name={item.icon as any} size={13} color="#3B82F6" />
            </View>
            <Text style={{ width: 72, fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>{item.label}</Text>
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#0F172A" }}>{item.value}</Text>
          </View>
        ))}
      </View>

      {job.requirements ? (
        <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 8 }}>Requirements</Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#334155", lineHeight: 20 }}>{job.requirements}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

type CardType = "totalJobs" | "activeJobs" | "expiredJobs" | "employers" | "seekers" | "applications" | "hired" | "placement";

export default function JobsAdminScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobs, deleteJob, toggleJobActive } = useJobs();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "employers" | "analytics">("overview");
  const [modal, setModal] = useState<{ type: CardType; title: string; sub: string } | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [totalCitizens, setTotalCitizens] = useState<number>(0);

  React.useEffect(() => {
    AsyncStorage.getItem("janseva_users").then((raw) => {
      if (raw) { try { const u = JSON.parse(raw); setTotalCitizens(u.filter((u: any) => u.role === "citizen").length); } catch {} }
    });
  }, []);

  const stats = useMemo(() => {
    const activeJobs = jobs.filter((j) => j.active);
    const expiredJobs = jobs.filter((j) => !j.active);
    const totalApplications = jobs.reduce((s, j) => s + (j.applicants?.length || 0), 0);
    const totalHired = jobs.reduce((s, j) => s + (j.hired?.length || 0), 0);
    const totalEmployers = [...new Set(jobs.map((j) => j.employerId))].length;
    const totalSeekers = [...new Set(jobs.flatMap((j) => j.applicants || []))].length;
    const placementRate = totalApplications > 0 ? Math.round((totalHired / totalApplications) * 100) : 0;
    return { activeJobs, expiredJobs, totalApplications, totalHired, totalEmployers, totalSeekers, placementRate };
  }, [jobs]);

  const categoryBreakdown = useMemo(() => (
    Object.entries(jobs.reduce((acc: Record<string, number>, j) => { acc[j.category] = (acc[j.category] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])
  ), [jobs]);

  const employerBreakdown = useMemo(() => (
    Object.entries(
      jobs.reduce((acc: Record<string, any>, j) => {
        if (!acc[j.employerId]) acc[j.employerId] = { name: j.employerName, company: j.company, jobs: 0, applications: 0, hired: 0 };
        acc[j.employerId].jobs++;
        acc[j.employerId].applications += j.applicants?.length || 0;
        acc[j.employerId].hired += j.hired?.length || 0;
        return acc;
      }, {})
    ).map(([id, data]) => ({ id, ...(data as any) })).sort((a, b) => b.jobs - a.jobs)
  ), [jobs]);

  const topHiredCategories = useMemo(() => (
    Object.entries(jobs.reduce((acc: Record<string, number>, j) => { acc[j.category] = (acc[j.category] || 0) + (j.hired?.length || 0); return acc; }, {}))
      .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5)
  ), [jobs]);

  const getModalJobs = useCallback((type: CardType): Job[] => {
    switch (type) {
      case "totalJobs": return [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "activeJobs": return jobs.filter((j) => j.active);
      case "expiredJobs": return jobs.filter((j) => !j.active);
      case "applications": return [...jobs].filter((j) => j.applicants?.length > 0).sort((a, b) => (b.applicants?.length || 0) - (a.applicants?.length || 0));
      case "hired": return [...jobs].filter((j) => j.hired?.length > 0).sort((a, b) => (b.hired?.length || 0) - (a.hired?.length || 0));
      default: return [];
    }
  }, [jobs]);

  const openModal = useCallback((type: CardType, title: string, sub: string) => {
    setSelectedJob(null);
    setModal({ type, title, sub });
  }, []);

  const closeModal = useCallback(() => { setModal(null); setSelectedJob(null); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <LinearGradient
        colors={["#052E16", "#166534", "#16A34A"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 6 }}>
              <Feather name="briefcase" size={10} color="#6EE7B7" />
              <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: "#6EE7B7", marginLeft: 4, letterSpacing: 1.5 }}>JOB PORTAL CONTROL</Text>
            </View>
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "white" }}>Job Portal Admin</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
              {jobs.length} total posts · {stats.totalEmployers} employers
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/super-admin/settings")}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
            activeOpacity={0.8}
          >
            <Feather name="settings" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 }}>
          {[{ label: "Total Jobs", value: jobs.length, color: "#93C5FD" },
            { label: "Active", value: stats.activeJobs.length, color: "#6EE7B7" },
            { label: "Applications", value: stats.totalApplications, color: "#FDE68A" },
            { label: "Hired", value: stats.totalHired, color: "#C4B5FD" }].map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 2, textAlign: "center" }}>{s.label}</Text>
              {i < 3 && <View style={{ position: "absolute", right: 0, top: "10%", height: "80%", width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />}
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ flexDirection: "row", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }}>
        {(["overview", "analytics", "employers"] as const).map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: activeTab === tab ? "#16A34A" : "#F1F5F9", alignItems: "center" }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: activeTab === tab ? "white" : "#64748B", textTransform: "capitalize" }}>
              {tab === "overview" ? "Overview" : tab === "analytics" ? "Analytics" : "Employers"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {activeTab === "overview" && (
          <>
            <SectionHeader title="Job Portal Overview" sub="Tap any card to view full data" />
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatCard icon="briefcase" label="Total Job Posts" value={jobs.length} color="#3B82F6" bg="#DBEAFE" onPress={() => openModal("totalJobs", "All Job Posts", `${jobs.length} total`)} />
                <StatCard icon="check-circle" label="Active Jobs" value={stats.activeJobs.length} color="#059669" bg="#D1FAE5" onPress={() => openModal("activeJobs", "Active Jobs", `${stats.activeJobs.length} currently active`)} />
                <StatCard icon="x-circle" label="Expired/Paused" value={stats.expiredJobs.length} color="#DC2626" bg="#FEE2E2" onPress={() => openModal("expiredJobs", "Expired / Paused", `${stats.expiredJobs.length} inactive`)} />
                <StatCard icon="users" label="Total Employers" value={stats.totalEmployers} color="#D97706" bg="#FEF3C7" onPress={() => openModal("employers", "Employers", `${stats.totalEmployers} employers`)} />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatCard icon="user" label="Job Seekers" value={stats.totalSeekers} color="#7C3AED" bg="#EDE9FE" onPress={() => openModal("seekers", "Job Seekers", `${stats.totalSeekers} unique applicants`)} />
                <StatCard icon="send" label="Applications" value={stats.totalApplications} color="#0EA5E9" bg="#E0F2FE" onPress={() => openModal("applications", "Applications", `${stats.totalApplications} total applications`)} />
                <StatCard icon="award" label="People Hired" value={stats.totalHired} color="#059669" bg="#D1FAE5" onPress={() => openModal("hired", "People Hired", `${stats.totalHired} successfully hired`)} />
                <StatCard icon="percent" label="Placement Rate" value={`${stats.placementRate}%`} color="#D97706" bg="#FEF3C7" onPress={() => openModal("placement", "Placement Rate", "Job placement analytics")} />
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <SectionHeader title="Citizen Management" sub="Total registered users on the platform" />
              <View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: "#DBEAFE", borderRadius: 12, padding: 14, alignItems: "center" }}>
                    <Feather name="users" size={22} color="#3B82F6" />
                    <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#1D4ED8", marginTop: 8 }}>{totalCitizens}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#3B82F6" }}>Registered Citizens</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "#D1FAE5", borderRadius: 12, padding: 14, alignItems: "center" }}>
                    <Feather name="user-check" size={22} color="#059669" />
                    <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#065F46", marginTop: 8 }}>{stats.totalSeekers}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#059669" }}>Active Job Seekers</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === "analytics" && (
          <>
            <SectionHeader title="Job Success Analytics" sub="Hiring outcomes and placement data" />
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: "#DCFCE7", borderRadius: 12, padding: 14, alignItems: "center" }}>
                  <Feather name="award" size={22} color="#16A34A" />
                  <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#166534", marginTop: 6 }}>{stats.totalHired}</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#16A34A", textAlign: "center" }}>People Got Jobs</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "#DBEAFE", borderRadius: 12, padding: 14, alignItems: "center" }}>
                  <Feather name="percent" size={22} color="#3B82F6" />
                  <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#1D4ED8", marginTop: 6 }}>{stats.placementRate}%</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#3B82F6", textAlign: "center" }}>Placement Rate</Text>
                </View>
              </View>
              <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3 }}>
                <View style={{ height: 6, width: `${stats.placementRate}%`, backgroundColor: "#16A34A", borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 6, textAlign: "right" }}>
                {stats.totalHired} hired from {stats.totalApplications} applications
              </Text>
            </View>

            <SectionHeader title="Category Breakdown" sub="Job posts by category" />
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {categoryBreakdown.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 13 }}>No jobs posted yet</Text>
              ) : (
                categoryBreakdown.map(([cat, count]) => {
                  const pct = jobs.length > 0 ? (count / jobs.length) * 100 : 0;
                  return (
                    <View key={cat} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155" }}>{JOB_CATEGORIES[cat] || cat}</Text>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#16A34A" }}>{count}</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3 }}>
                        <View style={{ height: 6, width: `${pct}%`, backgroundColor: "#16A34A", borderRadius: 3 }} />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {activeTab === "employers" && (
          <>
            <SectionHeader title="Employer Management" sub="Verify, manage and monitor employers" />
            {employerBreakdown.length === 0 ? (
              <View style={{ backgroundColor: "white", borderRadius: 16, padding: 24, alignItems: "center" }}>
                <Feather name="users" size={32} color="#CBD5E1" />
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#94A3B8", marginTop: 12 }}>No employers yet</Text>
              </View>
            ) : (
              employerBreakdown.map((employer) => (
                <View key={employer.id} style={{ backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#3B82F6" }}>{employer.company?.charAt(0)?.toUpperCase() || "E"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{employer.company}</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{employer.name}</Text>
                    </View>
                    <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#059669" }}>Verified</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[{ label: "Jobs", value: employer.jobs, color: "#3B82F6", bg: "#DBEAFE" },
                      { label: "Applications", value: employer.applications, color: "#D97706", bg: "#FEF3C7" },
                      { label: "Hired", value: employer.hired, color: "#059669", bg: "#D1FAE5" }].map((s) => (
                      <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 8, padding: 8, alignItems: "center" }}>
                        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
                        <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color + "AA" }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={!!modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        {modal && (
          <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
            <View style={{ backgroundColor: "white", paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={closeModal} style={{ marginRight: 12, padding: 4 }}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{modal.title}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{modal.sub}</Text>
              </View>
            </View>

            {selectedJob ? (
              <JobDetail job={selectedJob} onBack={() => setSelectedJob(null)} />
            ) : modal.type === "employers" ? (
              <FlatList
                data={employerBreakdown}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={{ backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#3B82F6" }}>{item.company?.charAt(0)?.toUpperCase() || "E"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{item.company}</Text>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{item.name}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {[{ label: "Jobs", value: item.jobs, color: "#3B82F6", bg: "#DBEAFE" },
                        { label: "Applications", value: item.applications, color: "#D97706", bg: "#FEF3C7" },
                        { label: "Hired", value: item.hired, color: "#059669", bg: "#D1FAE5" }].map((s) => (
                        <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 8, padding: 8, alignItems: "center" }}>
                          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
                          <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color + "AA" }}>{s.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              />
            ) : modal.type === "seekers" ? (
              <FlatList
                data={[...new Set(jobs.flatMap((j) => j.applicants || []))]}
                keyExtractor={(item) => item}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <View style={{ backgroundColor: "#EDE9FE", borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
                    <Feather name="users" size={24} color="#7C3AED" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#7C3AED" }}>{stats.totalSeekers}</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#6D28D9" }}>Unique job seekers who applied</Text>
                    </View>
                  </View>
                }
                renderItem={({ item: seekerId, index }) => {
                  const appliedJobs = jobs.filter((j) => j.applicants?.includes(seekerId));
                  const hiredJobs = jobs.filter((j) => j.hired?.includes(seekerId));
                  return (
                    <View style={{ backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#7C3AED" }}>#{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>Seeker ID: {seekerId.slice(0, 12)}...</Text>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>
                            Applied to {appliedJobs.length} job{appliedJobs.length !== 1 ? "s" : ""}
                            {hiredJobs.length > 0 ? ` · Hired in ${hiredJobs.length}` : ""}
                          </Text>
                        </View>
                        {hiredJobs.length > 0 && (
                          <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#059669" }}>Hired</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
            ) : modal.type === "placement" ? (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: "#16A34A", borderRadius: 16, padding: 20, marginBottom: 16, alignItems: "center" }}>
                  <Text style={{ fontSize: 48, fontFamily: "Inter_700Bold", color: "white" }}>{stats.placementRate}%</Text>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)" }}>Overall Placement Rate</Text>
                  <View style={{ flexDirection: "row", gap: 24, marginTop: 12 }}>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "white" }}>{stats.totalHired}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" }}>Hired</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "white" }}>{stats.totalApplications}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" }}>Applied</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "white" }}>{stats.totalSeekers}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" }}>Seekers</Text>
                    </View>
                  </View>
                </View>

                <SectionHeader title="Top Hiring Categories" sub="Sorted by placements" />
                <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                  {topHiredCategories.length === 0 ? (
                    <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 12, fontFamily: "Inter_400Regular" }}>No hiring data yet</Text>
                  ) : (
                    topHiredCategories.map(([cat, count], idx) => (
                      <View key={cat} style={{ paddingVertical: 10, borderBottomWidth: idx < topHiredCategories.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                            <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>#{idx + 1}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155" }}>{JOB_CATEGORIES[cat] || cat}</Text>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#059669" }}>{count} hired</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            ) : (
              <FlatList
                data={getModalJobs(modal.type)}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", paddingVertical: 48 }}>
                    <Feather name="briefcase" size={40} color="#CBD5E1" />
                    <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#94A3B8", marginTop: 12 }}>No jobs found</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <JobRow job={item} onPress={() => setSelectedJob(item)} />
                )}
              />
            )}
          </View>
        )}
      </Modal>
    </View>
  );
}
