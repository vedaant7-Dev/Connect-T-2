import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJobsAuth } from "@/context/JobsAuthContext";
import { useJobs, categoryConfig, typeConfig, Job } from "@/context/JobsContext";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function isNearby(jobLocation: string, userLocation?: string): boolean {
  if (!userLocation) return false;
  const location = jobLocation.toLowerCase();
  const parts = userLocation.toLowerCase().split(/[\s,]+/);
  return parts.some((part) => part.length > 3 && location.includes(part));
}

function getCategory(job: Job) {
  return categoryConfig[job.category] || {
    icon: "briefcase",
    color: "#059669",
    bg: "#D1FAE5",
  };
}

function getType(job: Job) {
  return typeConfig[job.type] || {
    label: job.type || "Job",
    color: "#0F766E",
    bg: "#CCFBF1",
  };
}

function StatChip({
  icon,
  label,
  value,
  tone = "green",
}: {
  icon: any;
  label: string;
  value: string | number;
  tone?: "green" | "blue" | "amber" | "red" | "slate";
}) {
  const tones = {
    green: { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
    blue: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
    amber: { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
    red: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
    slate: { bg: "#F8FAFC", color: "#475569", border: "#E2E8F0" },
  }[tone];

  return (
    <View style={[s.statChip, { backgroundColor: tones.bg, borderColor: tones.border }]}>
      <Feather name={icon} size={15} color={tones.color} />
      <Text style={[s.statValue, { color: tones.color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function JobCard({
  job,
  applied,
  near,
  onApply,
  onOpen,
}: {
  job: Job;
  applied: boolean;
  near?: boolean;
  onApply: () => void;
  onOpen: () => void;
}) {
  const cat = getCategory(job);
  const type = getType(job);

  return (
    <TouchableOpacity style={s.jobCard} activeOpacity={0.88} onPress={onOpen}>
      <View style={s.jobCardTop}>
        <View style={[s.jobIcon, { backgroundColor: cat.bg }]}>
          <Feather name={cat.icon as any} size={20} color={cat.color} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.jobTitle} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={s.jobCompany} numberOfLines={1}>
            {job.company}
          </Text>
        </View>

        {near ? (
          <View style={s.nearPill}>
            <Feather name="map-pin" size={10} color="#047857" />
            <Text style={s.nearPillText}>Near</Text>
          </View>
        ) : (
          <Feather name="chevron-right" size={18} color="#CBD5E1" />
        )}
      </View>

      <View style={s.jobMetaWrap}>
        <View style={s.jobMeta}>
          <Feather name="map-pin" size={12} color="#64748B" />
          <Text style={s.jobMetaText} numberOfLines={1}>
            {job.location}
          </Text>
        </View>

        <View style={[s.jobMeta, { backgroundColor: type.bg }]}>
          <Text style={[s.jobMetaText, { color: type.color, fontFamily: "Inter_700Bold" }]}>
            {type.label}
          </Text>
        </View>

        <View style={s.jobMeta}>
          <Feather name="users" size={12} color="#64748B" />
          <Text style={s.jobMetaText}>{job.openings}</Text>
        </View>
      </View>

      <View style={s.jobBottom}>
        <View>
          <Text style={s.salaryText}>{job.salary}</Text>
          <Text style={s.appliedText}>{job.applicants.length} applicants · {timeAgo(job.createdAt)}</Text>
        </View>

        {applied ? (
          <View style={s.appliedBtn}>
            <Feather name="check" size={14} color="#059669" />
            <Text style={s.appliedBtnText}>Applied</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={s.applyBtn}
            activeOpacity={0.9}
            onPress={(event) => {
              event.stopPropagation();
              onApply();
            }}
          >
            <LinearGradient
              colors={["#047857", "#059669", "#10B981"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.applyGradient}
            >
              <Text style={s.applyText}>Apply</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function NotificationsModal({
  visible,
  onClose,
  jobs,
}: {
  visible: boolean;
  onClose: () => void;
  jobs: Job[];
}) {
  const insets = useSafeAreaInsets();
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetTitle}>Job Updates</Text>
              <Text style={s.sheetSub}>Latest openings near you</Text>
            </View>
            <TouchableOpacity style={s.sheetClose} onPress={onClose} activeOpacity={0.8}>
              <Feather name="x" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {recentJobs.length === 0 ? (
            <View style={s.emptyBox}>
              <Feather name="bell-off" size={38} color="#CBD5E1" />
              <Text style={s.emptyTitle}>No updates yet</Text>
              <Text style={s.emptySub}>New job notifications will appear here.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {recentJobs.map((job) => {
                const cat = getCategory(job);
                return (
                  <View key={job.id} style={s.notificationItem}>
                    <View style={[s.notificationIcon, { backgroundColor: cat.bg }]}>
                      <Feather name={cat.icon as any} size={15} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.notificationTitle} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text style={s.notificationSub} numberOfLines={1}>
                        {job.company} · {job.location}
                      </Text>
                    </View>
                    <Text style={s.notificationTime}>{timeAgo(job.createdAt)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function EmployerDashboard({
  jobs,
  employerId,
  onPostJob,
  onToggle,
  onDelete,
}: {
  jobs: Job[];
  employerId: string;
  onPostJob: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const myJobs = jobs.filter((job) => job.employerId === employerId);
  const activeJobs = myJobs.filter((job) => job.active);
  const totalApplicants = myJobs.reduce((sum, job) => sum + job.applicants.length, 0);
  const totalShortlisted = myJobs.reduce((sum, job) => sum + job.shortlisted.length, 0);
  const totalRejected = myJobs.reduce((sum, job) => sum + job.rejected.length, 0);
  const totalOpenings = myJobs.reduce((sum, job) => sum + job.openings, 0);
  const pending = Math.max(totalApplicants - totalShortlisted - totalRejected, 0);
  const conversionRate =
    totalApplicants > 0 ? Math.round((totalShortlisted / totalApplicants) * 100) : 0;

  const recentActivity = myJobs
    .flatMap((job) =>
      job.applicants.map((id) => ({
        applicantId: id,
        jobTitle: job.title,
        createdAt: job.createdAt,
      })),
    )
    .slice(-5)
    .reverse();

  return (
    <View style={s.employerWrap}>
      <View style={s.employerHeaderCard}>
        <View style={s.employerHeaderTop}>
          <View>
            <Text style={s.sectionEyebrow}>EMPLOYER COMMAND CENTER</Text>
            <Text style={s.employerTitle}>Hiring Overview</Text>
            <Text style={s.employerSub}>
              Track openings, applicants, shortlist rate and active jobs.
            </Text>
          </View>

          <View style={s.employerBadge}>
            <Feather name="briefcase" size={20} color="#047857" />
          </View>
        </View>

        <View style={s.employerHeroStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatNum}>{myJobs.length}</Text>
            <Text style={s.heroStatLabel}>Jobs</Text>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatNum}>{totalApplicants}</Text>
            <Text style={s.heroStatLabel}>Applicants</Text>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatNum}>{conversionRate}%</Text>
            <Text style={s.heroStatLabel}>Shortlist</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={s.postJobButton} onPress={onPostJob} activeOpacity={0.9}>
        <LinearGradient
          colors={["#047857", "#059669", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.postJobGradient}
        >
          <View style={s.postJobIcon}>
            <Feather name="plus" size={18} color="#047857" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.postJobTitle}>Post a New Job</Text>
            <Text style={s.postJobSub}>Create a vacancy and start receiving applicants</Text>
          </View>
          <Feather name="arrow-right" size={18} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.statGrid}>
        <StatChip icon="zap" label="Active" value={activeJobs.length} tone="green" />
        <StatChip icon="users" label="Pending" value={pending} tone="blue" />
        <StatChip icon="user-check" label="Shortlisted" value={totalShortlisted} tone="green" />
        <StatChip icon="briefcase" label="Openings" value={totalOpenings} tone="amber" />
      </View>

      <View style={s.sectionRow}>
        <View>
          <Text style={s.sectionTitle}>Job Performance</Text>
          <Text style={s.sectionSubtitle}>Manage posted jobs and applicants</Text>
        </View>
        <View style={s.countPill}>
          <Text style={s.countPillText}>{myJobs.length}</Text>
        </View>
      </View>

      {myJobs.length === 0 ? (
        <View style={s.emptyBox}>
          <Feather name="inbox" size={42} color="#CBD5E1" />
          <Text style={s.emptyTitle}>No jobs posted yet</Text>
          <Text style={s.emptySub}>Post your first job to start receiving applicants.</Text>
        </View>
      ) : (
        myJobs.map((job) => {
          const cat = getCategory(job);
          const jobPending = Math.max(
            job.applicants.length - job.shortlisted.length - job.rejected.length,
            0,
          );

          return (
            <View key={job.id} style={s.employerJobCard}>
              <View style={s.employerJobTop}>
                <View style={[s.jobIcon, { backgroundColor: cat.bg }]}>
                  <Feather name={cat.icon as any} size={18} color={cat.color} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.jobTitle} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <Text style={s.jobCompany} numberOfLines={1}>
                    {job.location} · {job.salary}
                  </Text>
                </View>

                <Switch
                  value={job.active}
                  onValueChange={() => onToggle(job.id)}
                  trackColor={{ false: "#E2E8F0", true: "#A7F3D0" }}
                  thumbColor={job.active ? "#059669" : "#94A3B8"}
                  style={{ transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] }}
                />
              </View>

              <View style={s.performanceRow}>
                <View style={s.performanceItem}>
                  <Text style={s.performanceNum}>{job.applicants.length}</Text>
                  <Text style={s.performanceLabel}>Applied</Text>
                </View>
                <View style={s.performanceLine} />
                <View style={s.performanceItem}>
                  <Text style={[s.performanceNum, { color: "#059669" }]}>
                    {job.shortlisted.length}
                  </Text>
                  <Text style={s.performanceLabel}>Shortlisted</Text>
                </View>
                <View style={s.performanceLine} />
                <View style={s.performanceItem}>
                  <Text style={[s.performanceNum, { color: "#D97706" }]}>
                    {jobPending}
                  </Text>
                  <Text style={s.performanceLabel}>Pending</Text>
                </View>
              </View>

              <View style={s.employerActions}>
                <TouchableOpacity
                  style={s.openJobBtn}
                  activeOpacity={0.86}
                  onPress={() => router.push(`/jobs/active/${job.id}` as any)}
                >
                  <Feather name="bar-chart-2" size={14} color="#047857" />
                  <Text style={s.openJobText}>Open Job Dashboard</Text>
                  <Feather name="chevron-right" size={14} color="#047857" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.deleteBtn}
                  activeOpacity={0.8}
                  onPress={() => setDeleteTarget(job)}
                >
                  <Feather name="trash-2" size={15} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {recentActivity.length > 0 && (
        <View style={s.activityCard}>
          <View style={s.sectionRowCompact}>
            <Text style={s.sectionTitle}>Recent Activity</Text>
            <Feather name="activity" size={16} color="#2563EB" />
          </View>

          {recentActivity.map((activity, index) => (
            <View key={`${activity.applicantId}-${index}`} style={s.activityRow}>
              <View style={s.activityDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.activityText}>
                  Applicant {activity.applicantId.replace(/[^0-9]/g, "") || activity.applicantId.slice(-4)} applied for {activity.jobTitle}
                </Text>
              </View>
              <Text style={s.notificationTime}>{timeAgo(activity.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={s.deleteOverlay}>
          <View style={s.deleteCard}>
            <View style={s.deleteIcon}>
              <Feather name="trash-2" size={26} color="#DC2626" />
            </View>

            <Text style={s.deleteTitle}>Delete job posting?</Text>
            <Text style={s.deleteSub}>
              “{deleteTarget?.title}” will be removed from the job portal.
            </Text>

            <View style={s.deleteActions}>
              <TouchableOpacity
                style={s.cancelDelete}
                onPress={() => setDeleteTarget(null)}
                activeOpacity={0.8}
              >
                <Text style={s.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.confirmDelete}
                activeOpacity={0.8}
                onPress={() => {
                  if (deleteTarget) {
                    onDelete(deleteTarget.id);
                    setDeleteTarget(null);
                  }
                }}
              >
                <Text style={s.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function JobsHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 66 : insets.top;

  const { jobsUser } = useJobsAuth();
  const { jobs, applyJob, hasApplied, toggleJobActive, deleteJob } = useJobs();
  const [showNotifications, setShowNotifications] = useState(false);

  const isEmployer = jobsUser?.role === "employer";
  const activeJobs = useMemo(() => jobs.filter((job) => job.active), [jobs]);

  const visibleJobs = useMemo(() => {
    if (!jobsUser || jobsUser.role !== "seeker") return activeJobs;
    return activeJobs.filter((job) => !job.applicants.includes(jobsUser.id));
  }, [activeJobs, jobsUser]);

  const nearbyJobs = useMemo(
    () => activeJobs.filter((job) => isNearby(job.location, jobsUser?.location)),
    [activeJobs, jobsUser?.location],
  );

  const appliedCount = useMemo(() => {
    if (!jobsUser) return 0;
    return jobs.filter((job) => job.applicants.includes(jobsUser.id)).length;
  }, [jobs, jobsUser]);

  const handleApply = (job: Job) => {
    if (!jobsUser) return;

    if (isEmployer) {
      Alert.alert("Not allowed", "Employers cannot apply for jobs.");
      return;
    }

    if (hasApplied(job.id, jobsUser.id)) return;

    applyJob(job.id, jobsUser.id);
    Alert.alert(
      "Application sent",
      `You have applied for ${job.title} at ${job.company}.`,
    );
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#064E3B", "#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 12 }]}
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={s.headerPill}>
              <Feather name="briefcase" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={s.headerPillText}>
                {isEmployer ? "EMPLOYER PORTAL" : "LOCAL JOBS"}
              </Text>
            </View>

            <Text style={s.headerTitle}>
              {isEmployer ? "Employer Dashboard" : "Connect T Jobs"}
            </Text>

            <Text style={s.headerSub} numberOfLines={2}>
              {isEmployer
                ? `${jobsUser?.company || jobsUser?.name || "Company"} · Hiring workspace`
                : `Hello, ${jobsUser?.name?.split(" ")[0] || "there"} · Find trusted local work`}
            </Text>
          </View>

          {!isEmployer && (
            <TouchableOpacity
              style={s.headerIcon}
              onPress={() => setShowNotifications(true)}
              activeOpacity={0.82}
            >
              <Feather name="bell" size={18} color="white" />
              {activeJobs.length > 0 && <View style={s.headerDot} />}
            </TouchableOpacity>
          )}
        </View>

        {!isEmployer && (
          <TouchableOpacity
            style={s.searchCard}
            activeOpacity={0.9}
            onPress={() => router.push("/jobs/search" as any)}
          >
            <View style={s.searchIcon}>
              <Feather name="search" size={18} color="#047857" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.searchTitle}>Search jobs, companies, locations</Text>
              <Text style={s.searchSub}>Tap to explore all available work</Text>
            </View>
            <Feather name="sliders" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          { paddingBottom: Math.max(insets.bottom, 8) + 92 },
        ]}
      >
        {isEmployer ? (
          <EmployerDashboard
            jobs={jobs}
            employerId={jobsUser?.id || ""}
            onPostJob={() => router.push("/jobs/(tabs)/post" as any)}
            onToggle={toggleJobActive}
            onDelete={deleteJob}
          />
        ) : (
          <>
            <View style={s.quickStats}>
              <StatChip icon="briefcase" label="Open Jobs" value={activeJobs.length} tone="green" />
              <StatChip icon="map-pin" label="Nearby" value={nearbyJobs.length} tone="blue" />
              <StatChip icon="check-circle" label="Applied" value={appliedCount} tone="amber" />
            </View>

            <View style={s.actionGrid}>
              <TouchableOpacity
                style={s.actionCard}
                activeOpacity={0.9}
                onPress={() => router.push("/jobs/search" as any)}
              >
                <View style={[s.actionIcon, { backgroundColor: "#ECFDF5" }]}>
                  <Feather name="search" size={20} color="#059669" />
                </View>
                <Text style={s.actionTitle}>Find Jobs</Text>
                <Text style={s.actionSub}>Search openings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.actionCard}
                activeOpacity={0.9}
                onPress={() => router.push("/jobs/(tabs)/applied" as any)}
              >
                <View style={[s.actionIcon, { backgroundColor: "#EFF6FF" }]}>
                  <Feather name="clipboard" size={20} color="#2563EB" />
                </View>
                <Text style={s.actionTitle}>Applications</Text>
                <Text style={s.actionSub}>Track status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.actionCard}
                activeOpacity={0.9}
                onPress={() => router.push("/jobs/resume" as any)}
              >
                <View style={[s.actionIcon, { backgroundColor: "#FFFBEB" }]}>
                  <Feather name="file-text" size={20} color="#D97706" />
                </View>
                <Text style={s.actionTitle}>Resume</Text>
                <Text style={s.actionSub}>Build profile</Text>
              </TouchableOpacity>
            </View>

            {nearbyJobs.length > 0 && (
              <View style={s.sectionBlock}>
                <View style={s.sectionRow}>
                  <View>
                    <Text style={s.sectionTitle}>Near You</Text>
                    <Text style={s.sectionSubtitle}>Jobs matching your location</Text>
                  </View>
                  <View style={s.countPill}>
                    <Text style={s.countPillText}>{nearbyJobs.length}</Text>
                  </View>
                </View>

                {nearbyJobs.slice(0, 3).map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    near
                    applied={!!jobsUser && hasApplied(job.id, jobsUser.id)}
                    onOpen={() => router.push(`/jobs/detail/${job.id}` as any)}
                    onApply={() => handleApply(job)}
                  />
                ))}
              </View>
            )}

            <View style={s.sectionBlock}>
              <View style={s.sectionRow}>
                <View>
                  <Text style={s.sectionTitle}>Recommended Jobs</Text>
                  <Text style={s.sectionSubtitle}>Fresh openings from local employers</Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/jobs/search" as any)} activeOpacity={0.8}>
                  <Text style={s.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>

              {visibleJobs.length === 0 ? (
                <View style={s.emptyBox}>
                  <Feather name="briefcase" size={42} color="#CBD5E1" />
                  <Text style={s.emptyTitle}>No new jobs right now</Text>
                  <Text style={s.emptySub}>New verified local jobs will appear here.</Text>
                </View>
              ) : (
                visibleJobs.slice(0, 8).map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    applied={!!jobsUser && hasApplied(job.id, jobsUser.id)}
                    near={nearbyJobs.some((nearJob) => nearJob.id === job.id)}
                    onOpen={() => router.push(`/jobs/detail/${job.id}` as any)}
                    onApply={() => handleApply(job)}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        jobs={activeJobs}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F6FAF8",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: "hidden",
    shadowColor: "#064E3B",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  headerPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    marginBottom: 13,
  },
  headerPillText: {
    fontSize: 10,
    letterSpacing: 1,
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: "white",
    fontWeight: "900",
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.6,
  },
  headerSub: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_400Regular",
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.17)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    position: "relative",
  },
  headerDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FDE68A",
  },
  searchCard: {
    marginTop: 20,
    backgroundColor: "white",
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#064E3B",
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  searchIcon: {
    width: 43,
    height: 43,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  searchTitle: {
    fontSize: 14,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  searchSub: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  quickStats: {
    flexDirection: "row",
    gap: 9,
  },
  statChip: {
    flex: 1,
    minHeight: 86,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: "Inter_800ExtraBold",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 22,
    padding: 14,
    minHeight: 124,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 13,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  actionSub: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
  },
  sectionBlock: {
    gap: 12,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    fontSize: 10,
    color: "#059669",
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 19,
    color: "#0F172A",
    fontWeight: "900",
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.25,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  countPill: {
    minWidth: 34,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  countPillText: {
    fontSize: 12,
    color: "#059669",
    fontFamily: "Inter_800ExtraBold",
  },
  seeAllText: {
    fontSize: 12,
    color: "#059669",
    fontFamily: "Inter_800ExtraBold",
  },
  jobCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 15,
    gap: 13,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.92)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  jobCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  jobIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  jobTitle: {
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "Inter_800ExtraBold",
    fontWeight: "900",
  },
  jobCompany: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
  },
  nearPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  nearPillText: {
    fontSize: 10,
    color: "#047857",
    fontFamily: "Inter_800ExtraBold",
  },
  jobMetaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
  },
  jobMetaText: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_500Medium",
  },
  jobBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 1,
  },
  salaryText: {
    fontSize: 16,
    color: "#047857",
    fontFamily: "Inter_800ExtraBold",
    fontWeight: "900",
  },
  appliedText: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
  },
  applyBtn: {
    borderRadius: 999,
    overflow: "hidden",
  },
  applyGradient: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  applyText: {
    fontSize: 12,
    color: "white",
    fontFamily: "Inter_800ExtraBold",
  },
  appliedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  appliedBtnText: {
    fontSize: 12,
    color: "#059669",
    fontFamily: "Inter_800ExtraBold",
  },
  emptyBox: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.92)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "Inter_800ExtraBold",
    fontWeight: "900",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  employerWrap: {
    gap: 14,
  },
  employerHeaderCard: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(167,243,208,0.7)",
    shadowColor: "#064E3B",
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  employerHeaderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  employerBadge: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  employerTitle: {
    fontSize: 23,
    color: "#0F172A",
    fontFamily: "Inter_800ExtraBold",
    fontWeight: "900",
    letterSpacing: -0.35,
  },
  employerSub: {
    marginTop: 5,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    maxWidth: 240,
  },
  employerHeroStats: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6FAF8",
    borderRadius: 20,
    padding: 14,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatNum: {
    fontSize: 25,
    color: "#047857",
    fontFamily: "Inter_800ExtraBold",
    fontWeight: "900",
  },
  heroStatLabel: {
    marginTop: 2,
    fontSize: 10,
    color: "#64748B",
    fontFamily: "Inter_600SemiBold",
  },
  heroDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#E2E8F0",
  },
  postJobButton: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#064E3B",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  postJobGradient: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  postJobIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  postJobTitle: {
    fontSize: 15,
    color: "white",
    fontFamily: "Inter_800ExtraBold",
    fontWeight: "900",
  },
  postJobSub: {
    marginTop: 2,
    fontSize: 11,
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_400Regular",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  employerJobCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 15,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.95)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.055,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  employerJobTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  performanceRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  performanceItem: {
    flex: 1,
    alignItems: "center",
  },
  performanceNum: {
    fontSize: 19,
    color: "#0F172A",
    fontFamily: "Inter_800ExtraBold",
    fontWeight: "900",
  },
  performanceLabel: {
    marginTop: 2,
    fontSize: 10,
    color: "#64748B",
    fontFamily: "Inter_500Medium",
  },
  performanceLine: {
    width: 1,
    height: 34,
    backgroundColor: "#E2E8F0",
  },
  employerActions: {
    flexDirection: "row",
    gap: 9,
  },
  openJobBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  openJobText: {
    fontSize: 12,
    color: "#047857",
    fontFamily: "Inter_800ExtraBold",
  },
  deleteBtn: {
    width: 46,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  activityCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.92)",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },
  activityText: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "Inter_500Medium",
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "78%",
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 18,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 21,
    color: "#0F172A",
    fontFamily: "Inter_800ExtraBold",
    fontWeight: "900",
  },
  sheetSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
  },
  sheetClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationItem: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTitle: {
    fontSize: 13,
    color: "#0F172A",
    fontFamily: "Inter_800ExtraBold",
  },
  notificationSub: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
  },
  notificationTime: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "Inter_600SemiBold",
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  deleteCard: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
  },
  deleteIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  deleteTitle: {
    fontSize: 20,
    color: "#0F172A",
    fontFamily: "Inter_800ExtraBold",
    fontWeight: "900",
    textAlign: "center",
  },
  deleteSub: {
    marginTop: 7,
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  deleteActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelDelete: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelDeleteText: {
    fontSize: 13,
    color: "#475569",
    fontFamily: "Inter_800ExtraBold",
  },
  confirmDelete: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: {
    fontSize: 13,
    color: "white",
    fontFamily: "Inter_800ExtraBold",
  },
});
