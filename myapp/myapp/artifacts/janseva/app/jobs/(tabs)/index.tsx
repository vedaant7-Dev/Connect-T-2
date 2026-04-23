import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Alert, ScrollView, Modal, Switch,
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
  const parts = userLocation.toLowerCase().split(/[\s,]+/);
  return parts.some((p) => p.length > 3 && jl.includes(p));
}

// ─── Seeker job card ─────────────────────────────────────────────────────────
function JobCard({ job, onApply, applied, near }: { job: Job; applied: boolean; onApply: () => void; near?: boolean }) {
  const cat = categoryConfig[job.category];
  const type = typeConfig[job.type];
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={s.card}>
      {near && (
        <View style={s.nearBadge}>
          <Feather name="map-pin" size={10} color="#059669" />
          <Text style={s.nearBadgeText}>Near You</Text>
        </View>
      )}
      <TouchableOpacity activeOpacity={0.75} onPress={() => setExpanded(!expanded)} style={s.cardTappable}>
        <View style={s.cardHeader}>
          <View style={[s.catIcon, { backgroundColor: cat.bg }]}>
            <Feather name={cat.icon as any} size={18} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{job.title}</Text>
            <Text style={s.cardCompany} numberOfLines={1}>{job.company}</Text>
          </View>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#94A3B8" />
        </View>
        <View style={s.cardMeta}>
          <View style={s.metaChip}>
            <Feather name="map-pin" size={11} color="#64748B" />
            <Text style={s.metaText}>{job.location}</Text>
          </View>
          <View style={[s.metaChip, { backgroundColor: type.bg }]}>
            <Text style={[s.metaText, { color: type.color, fontFamily: "Inter_600SemiBold" }]}>{type.label}</Text>
          </View>
          <View style={s.metaChip}>
            <Feather name="users" size={11} color="#64748B" />
            <Text style={s.metaText}>{job.openings} opening{job.openings > 1 ? "s" : ""}</Text>
          </View>
        </View>
        <View style={s.salaryRow}>
          <Text style={s.salary}>{job.salary}</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={s.expandedSection}>
          <Text style={s.expandLabel}>About the Job</Text>
          <Text style={s.expandText}>{job.description}</Text>
          <Text style={s.expandLabel}>Requirements</Text>
          <Text style={s.expandText}>{job.requirements}</Text>
        </View>
      )}
      <View style={s.cardFooter}>
        <Text style={s.applicantsText}>{job.applicants.length} applied</Text>
        {applied ? (
          <View style={s.applyBtnDone}>
            <Feather name="check" size={14} color="#059669" />
            <Text style={[s.applyBtnText, { color: "#059669" }]}>Applied</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={onApply} activeOpacity={0.85} style={s.applyBtn}>
            <LinearGradient colors={["#C2410C", "#EA580C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.applyGrad}>
              <Text style={s.applyBtnTextWhite}>Apply Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Notifications modal ──────────────────────────────────────────────────────
function NotificationsModal({ visible, onClose, jobs }: { visible: boolean; onClose: () => void; jobs: Job[] }) {
  const insets = useSafeAreaInsets();
  const recentJobs = [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.notifOverlay}>
        <View style={[s.notifPanel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.notifHandle} />
          <View style={s.notifHeader}>
            <Text style={s.notifTitle}>Notifications</Text>
            <TouchableOpacity onPress={onClose} style={s.notifClose}>
              <Feather name="x" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          {recentJobs.length === 0 ? (
            <View style={s.notifEmpty}>
              <Feather name="bell-off" size={36} color="#CBD5E1" />
              <Text style={s.notifEmptyText}>No notifications yet</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {recentJobs.map((job) => {
                const cat = categoryConfig[job.category];
                return (
                  <View key={job.id} style={s.notifItem}>
                    <View style={[s.notifDot, { backgroundColor: cat.bg }]}>
                      <Feather name={cat.icon as any} size={14} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.notifItemTitle}>New job: {job.title}</Text>
                      <Text style={s.notifItemSub}>{job.company} · {job.location}</Text>
                    </View>
                    <Text style={s.notifTime}>{timeAgo(job.createdAt)}</Text>
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

// ─── Applicants modal (employer) ──────────────────────────────────────────────
function ApplicantsModal({
  visible, job, onClose, onShortlist, onReject,
}: {
  visible: boolean;
  job: Job | null;
  onClose: () => void;
  onShortlist: (jobId: string, id: string) => void;
  onReject: (jobId: string, id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  if (!job) return null;
  const pending = job.applicants.filter((id) => !job.shortlisted.includes(id) && !job.rejected.includes(id));
  const shortlisted = job.shortlisted;
  const rejected = job.rejected;

  const ApplicantRow = ({ id, status }: { id: string; status: "pending" | "shortlisted" | "rejected" }) => (
    <View style={s.appRow}>
      <View style={[s.appAvatar, {
        backgroundColor: status === "shortlisted" ? "#D1FAE5" : status === "rejected" ? "#FEE2E2" : "#FFF7ED",
      }]}>
        <Feather
          name={status === "shortlisted" ? "user-check" : status === "rejected" ? "user-x" : "user"}
          size={16}
          color={status === "shortlisted" ? "#059669" : status === "rejected" ? "#DC2626" : "#EA580C"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.appName}>Applicant {id.replace(/[^0-9]/g, "") || id.slice(-4)}</Text>
        <Text style={s.appId}>ID: {id}</Text>
      </View>
      {status === "pending" && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity onPress={() => onShortlist(job.id, id)} style={s.appActionBtn}>
            <LinearGradient colors={["#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.appActionGrad}>
              <Feather name="check" size={12} color="white" />
              <Text style={s.appActionText}>Shortlist</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onReject(job.id, id)} style={[s.appActionBtn, { borderWidth: 1, borderColor: "#FECACA", borderRadius: 8 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Feather name="x" size={12} color="#DC2626" />
              <Text style={[s.appActionText, { color: "#DC2626" }]}>Reject</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
      {status === "shortlisted" && (
        <View style={[s.statusPill, { backgroundColor: "#D1FAE5" }]}>
          <Text style={[s.statusPillText, { color: "#059669" }]}>Shortlisted</Text>
        </View>
      )}
      {status === "rejected" && (
        <View style={[s.statusPill, { backgroundColor: "#FEE2E2" }]}>
          <Text style={[s.statusPillText, { color: "#DC2626" }]}>Rejected</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.notifOverlay}>
        <View style={[s.appPanel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.notifHandle} />
          <View style={s.notifHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.notifTitle}>{job.title}</Text>
              <Text style={[s.notifItemSub, { marginTop: 2 }]}>{job.applicants.length} total applicants</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.notifClose}>
              <Feather name="x" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Pipeline summary pills */}
          <View style={s.pipelineRow}>
            <View style={[s.pipePill, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
              <Text style={[s.pipeNum, { color: "#C2410C" }]}>{job.applicants.length}</Text>
              <Text style={s.pipeLabel}>Applied</Text>
            </View>
            <Feather name="arrow-right" size={14} color="#CBD5E1" />
            <View style={[s.pipePill, { backgroundColor: "#D1FAE5", borderColor: "#A7F3D0" }]}>
              <Text style={[s.pipeNum, { color: "#059669" }]}>{shortlisted.length}</Text>
              <Text style={s.pipeLabel}>Shortlisted</Text>
            </View>
            <Feather name="arrow-right" size={14} color="#CBD5E1" />
            <View style={[s.pipePill, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <Text style={[s.pipeNum, { color: "#DC2626" }]}>{rejected.length}</Text>
              <Text style={s.pipeLabel}>Rejected</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {pending.length > 0 && (
              <>
                <Text style={s.appSectionLabel}>Pending Review ({pending.length})</Text>
                {pending.map((id) => <ApplicantRow key={id} id={id} status="pending" />)}
              </>
            )}
            {shortlisted.length > 0 && (
              <>
                <Text style={[s.appSectionLabel, { color: "#059669" }]}>Shortlisted ({shortlisted.length})</Text>
                {shortlisted.map((id) => <ApplicantRow key={id} id={id} status="shortlisted" />)}
              </>
            )}
            {rejected.length > 0 && (
              <>
                <Text style={[s.appSectionLabel, { color: "#DC2626" }]}>Rejected ({rejected.length})</Text>
                {rejected.map((id) => <ApplicantRow key={id} id={id} status="rejected" />)}
              </>
            )}
            {job.applicants.length === 0 && (
              <View style={s.notifEmpty}>
                <Feather name="users" size={36} color="#CBD5E1" />
                <Text style={s.notifEmptyText}>No applicants yet</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Employer Dashboard ───────────────────────────────────────────────────────
function EmployerDashboard({
  jobs, employerId, onPostJob, onToggle, onShortlist, onReject, onDelete,
}: {
  jobs: Job[];
  employerId: string;
  onPostJob: () => void;
  onToggle: (id: string) => void;
  onShortlist: (jobId: string, seekerId: string) => void;
  onReject: (jobId: string, seekerId: string) => void;
  onDelete: (jobId: string) => void;
}) {
  const myJobs = jobs.filter((j) => j.employerId === employerId);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const totalApplicants = myJobs.reduce((n, j) => n + j.applicants.length, 0);
  const totalShortlisted = myJobs.reduce((n, j) => n + j.shortlisted.length, 0);
  const totalRejected = myJobs.reduce((n, j) => n + j.rejected.length, 0);
  const activeCount = myJobs.filter((j) => j.active).length;
  const totalOpenings = myJobs.reduce((n, j) => n + j.openings, 0);
  const conversionRate = totalApplicants > 0
    ? Math.round((totalShortlisted / totalApplicants) * 100) : 0;

  // Recent applications across all jobs (last 5)
  const recentActivity = myJobs
    .flatMap((j) => j.applicants.map((id) => ({ jobId: j.id, jobTitle: j.title, applicantId: id, createdAt: j.createdAt })))
    .slice(-5).reverse();

  const liveJob = myJobs.find((j) => j.id === selectedJob?.id) ?? selectedJob;

  return (
    <View>
      {/* KPI grid */}
      <View style={s.kpiGrid}>
        <LinearGradient colors={["#C2410C", "#EA580C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.kpiCard, s.kpiBig]}>
          <Feather name="briefcase" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={s.kpiBigNum}>{myJobs.length}</Text>
          <Text style={s.kpiBigLabel}>Jobs Posted</Text>
          <Text style={s.kpiBigSub}>{activeCount} active · {totalOpenings} openings</Text>
        </LinearGradient>

        <LinearGradient colors={["#1D4ED8", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.kpiCard, s.kpiBig]}>
          <Feather name="users" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={s.kpiBigNum}>{totalApplicants}</Text>
          <Text style={s.kpiBigLabel}>Total Applicants</Text>
          <Text style={s.kpiBigSub}>{conversionRate}% shortlist rate</Text>
        </LinearGradient>
      </View>

      <View style={s.kpiRow}>
        <View style={[s.kpiSmall, { backgroundColor: "#D1FAE5", borderColor: "#A7F3D0" }]}>
          <Feather name="user-check" size={16} color="#059669" />
          <Text style={[s.kpiSmallNum, { color: "#059669" }]}>{totalShortlisted}</Text>
          <Text style={s.kpiSmallLabel}>Shortlisted</Text>
        </View>
        <View style={[s.kpiSmall, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
          <Feather name="user-x" size={16} color="#DC2626" />
          <Text style={[s.kpiSmallNum, { color: "#DC2626" }]}>{totalRejected}</Text>
          <Text style={s.kpiSmallLabel}>Rejected</Text>
        </View>
        <View style={[s.kpiSmall, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
          <Feather name="clock" size={16} color="#1D4ED8" />
          <Text style={[s.kpiSmallNum, { color: "#1D4ED8" }]}>{totalApplicants - totalShortlisted - totalRejected}</Text>
          <Text style={s.kpiSmallLabel}>Pending</Text>
        </View>
        <View style={[s.kpiSmall, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
          <Feather name="zap" size={16} color="#C2410C" />
          <Text style={[s.kpiSmallNum, { color: "#C2410C" }]}>{activeCount}</Text>
          <Text style={s.kpiSmallLabel}>Active Jobs</Text>
        </View>
      </View>

      {/* Pipeline bar */}
      {totalApplicants > 0 && (
        <View style={s.funnelCard}>
          <Text style={s.funnelTitle}>Application Pipeline</Text>
          <View style={s.funnelBar}>
            <View style={[s.funnelSeg, { flex: totalApplicants, backgroundColor: "#FFEDD5" }]} />
          </View>
          <View style={s.funnelBar}>
            <View style={[s.funnelSeg, { flex: totalShortlisted || 0.01, backgroundColor: "#D1FAE5", borderRadius: 6 }]} />
            <View style={{ flex: Math.max(totalApplicants - totalShortlisted, 0) }} />
          </View>
          <View style={s.funnelLegend}>
            <View style={s.funnelLegRow}><View style={[s.dot, { backgroundColor: "#FFEDD5", borderWidth: 1, borderColor: "#FED7AA" }]} /><Text style={s.funnelLegText}>Applied: {totalApplicants}</Text></View>
            <View style={s.funnelLegRow}><View style={[s.dot, { backgroundColor: "#D1FAE5", borderWidth: 1, borderColor: "#A7F3D0" }]} /><Text style={s.funnelLegText}>Shortlisted: {totalShortlisted}</Text></View>
          </View>
        </View>
      )}

      {/* Post job CTA */}
      <TouchableOpacity onPress={onPostJob} activeOpacity={0.85} style={s.postCtaWrap}>
        <LinearGradient colors={["#C2410C", "#EA580C", "#F97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.postCta}>
          <Feather name="plus-circle" size={20} color="white" />
          <Text style={s.postCtaText}>Post a New Job</Text>
          <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Job performance list */}
      <View style={s.sectionHeader}>
        <Feather name="list" size={15} color="#EA580C" />
        <Text style={s.sectionTitle}>Job Performance</Text>
        <View style={[s.sectionBadge, { backgroundColor: "#FFEDD5" }]}>
          <Text style={[s.sectionBadgeText, { color: "#EA580C" }]}>{myJobs.length}</Text>
        </View>
      </View>

      {myJobs.length === 0 ? (
        <View style={s.empty}>
          <Feather name="inbox" size={44} color="#CBD5E1" />
          <Text style={s.emptyText}>No jobs posted yet</Text>
          <Text style={s.emptySubText}>Tap "Post a New Job" above to get started</Text>
        </View>
      ) : (
        myJobs.map((job) => {
          const cat = categoryConfig[job.category];
          const pending = job.applicants.filter((id) => !job.shortlisted.includes(id) && !job.rejected.includes(id)).length;
          return (
            <View key={job.id} style={s.jobPerfCard}>
              <View style={s.jobPerfTop}>
                <View style={[s.catIcon, { backgroundColor: cat.bg }]}>
                  <Feather name={cat.icon as any} size={16} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={s.cardCompany}>{job.location} · {job.salary}</Text>
                </View>
                <Switch
                  value={job.active}
                  onValueChange={() => onToggle(job.id)}
                  trackColor={{ false: "#E2E8F0", true: "#BFDBFE" }}
                  thumbColor={job.active ? "#2563EB" : "#94A3B8"}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>

              {/* Mini stats */}
              <View style={s.jobPerfStats}>
                <View style={s.perfStat}>
                  <Text style={s.perfStatNum}>{job.applicants.length}</Text>
                  <Text style={s.perfStatLabel}>Applied</Text>
                </View>
                <View style={s.perfDivider} />
                <View style={s.perfStat}>
                  <Text style={[s.perfStatNum, { color: "#059669" }]}>{job.shortlisted.length}</Text>
                  <Text style={s.perfStatLabel}>Shortlisted</Text>
                </View>
                <View style={s.perfDivider} />
                <View style={s.perfStat}>
                  <Text style={[s.perfStatNum, { color: "#DC2626" }]}>{job.rejected.length}</Text>
                  <Text style={s.perfStatLabel}>Rejected</Text>
                </View>
                <View style={s.perfDivider} />
                <View style={s.perfStat}>
                  <Text style={[s.perfStatNum, { color: "#D97706" }]}>{pending}</Text>
                  <Text style={s.perfStatLabel}>Pending</Text>
                </View>
              </View>

              {/* View applicants + delete row */}
              <View style={{ flexDirection: "row", alignItems: "stretch" }}>
                <TouchableOpacity
                  onPress={() => setSelectedJob(job)}
                  activeOpacity={0.85}
                  style={[s.viewAppsBtn, { flex: 1, opacity: job.applicants.length === 0 ? 0.5 : 1 }]}
                >
                  <Feather name="users" size={14} color="#EA580C" />
                  <Text style={s.viewAppsBtnText}>
                    {job.applicants.length === 0 ? "No applicants yet" : `View ${job.applicants.length} applicant${job.applicants.length !== 1 ? "s" : ""}`}
                  </Text>
                  {job.applicants.length > 0 && <Feather name="chevron-right" size={14} color="#EA580C" />}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDeleteTarget(job)}
                  activeOpacity={0.8}
                  style={s.deleteJobBtn}
                >
                  <Feather name="trash-2" size={15} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <>
          <View style={[s.sectionHeader, { marginTop: 8 }]}>
            <Feather name="activity" size={15} color="#1D4ED8" />
            <Text style={s.sectionTitle}>Recent Activity</Text>
          </View>
          {recentActivity.map((act, idx) => (
            <View key={idx} style={s.activityRow}>
              <View style={s.activityDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.activityText}>
                  <Text style={{ fontFamily: "Inter_600SemiBold" }}>Applicant {act.applicantId.replace(/[^0-9]/g, "") || act.applicantId.slice(-4)}</Text>
                  {" "}applied for <Text style={{ fontFamily: "Inter_600SemiBold" }}>{act.jobTitle}</Text>
                </Text>
              </View>
              <Text style={s.notifTime}>{timeAgo(act.createdAt)}</Text>
            </View>
          ))}
        </>
      )}

      <ApplicantsModal
        visible={!!selectedJob}
        job={liveJob}
        onClose={() => setSelectedJob(null)}
        onShortlist={(jobId, id) => { onShortlist(jobId, id); }}
        onReject={(jobId, id) => { onReject(jobId, id); }}
      />

      {/* Delete confirm modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={s.deleteOverlay}>
          <View style={s.deleteCard}>
            <View style={s.deleteIconWrap}>
              <Feather name="trash-2" size={28} color="#DC2626" />
            </View>
            <Text style={s.deleteTitle}>Delete Job Posting?</Text>
            <Text style={s.deleteSub}>
              "{deleteTarget?.title}" will be permanently removed. All applicant records for this job will also be deleted.
            </Text>
            <View style={s.deleteBtns}>
              <TouchableOpacity style={s.deleteCancelBtn} onPress={() => setDeleteTarget(null)} activeOpacity={0.8}>
                <Text style={s.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.deleteConfirmBtn}
                activeOpacity={0.8}
                onPress={() => {
                  if (deleteTarget) { onDelete(deleteTarget.id); setDeleteTarget(null); }
                }}
              >
                <Feather name="trash-2" size={14} color="white" />
                <Text style={s.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function JobsHomeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser } = useJobsAuth();
  const { jobs, applyJob, hasApplied, toggleJobActive, shortlistApplicant, rejectApplicant, deleteJob } = useJobs();
  const router = useRouter();
  const [showNotifs, setShowNotifs] = useState(false);
  const isEmployer = jobsUser?.role === "employer";

  const activeJobs = jobs.filter((j) => j.active);
  const nearbyJobs = activeJobs.filter((j) => isNearby(j.location, jobsUser?.location));

  const handleApply = (job: Job) => {
    if (!jobsUser) return;
    if (isEmployer) { Alert.alert("Not allowed", "Employers cannot apply for jobs."); return; }
    if (hasApplied(job.id, jobsUser.id)) return;
    applyJob(job.id, jobsUser.id);
    Alert.alert("Applied! ✅", `You have applied for ${job.title} at ${job.company}. The employer will contact you.`);
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 12 }]}
      >
        <View style={[s.headerRow, isEmployer && { marginBottom: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{isEmployer ? "Employer Dashboard" : "Connect T Jobs"}</Text>
            <Text style={s.headerSub}>
              {isEmployer
                ? (jobsUser?.company || jobsUser?.name)
                : `Hello, ${jobsUser?.name?.split(" ")[0] || "there"} 👋`}
            </Text>
          </View>
          {!isEmployer && (
            <TouchableOpacity style={s.headerBadge} onPress={() => setShowNotifs(true)} activeOpacity={0.8}>
              <Feather name="bell" size={18} color="white" />
              {activeJobs.length > 0 && (
                <View style={s.notifBubble}>
                  <Text style={s.notifBubbleText}>{activeJobs.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {!isEmployer && (
          <TouchableOpacity style={s.searchBar} onPress={() => router.push("/jobs/search" as any)} activeOpacity={0.8}>
            <Feather name="search" size={16} color="#94A3B8" />
            <Text style={s.searchPlaceholder}>Search by job, company, location…</Text>
            <View style={s.filterIconBtn}>
              <Feather name="sliders" size={14} color="#EA580C" />
            </View>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <FlatList
        data={[]}
        keyExtractor={() => ""}
        renderItem={null}
        contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 8) + 80 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isEmployer ? (
            <EmployerDashboard
              jobs={jobs}
              employerId={jobsUser!.id}
              onPostJob={() => router.push("/jobs/(tabs)/post" as any)}
              onToggle={toggleJobActive}
              onShortlist={shortlistApplicant}
              onReject={rejectApplicant}
              onDelete={deleteJob}
            />
          ) : (
            <>
              {nearbyJobs.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <Feather name="map-pin" size={15} color="#059669" />
                    <Text style={s.sectionTitle}>Jobs Near You</Text>
                    <View style={s.sectionBadge}>
                      <Text style={s.sectionBadgeText}>{nearbyJobs.length}</Text>
                    </View>
                  </View>
                  {nearbyJobs.map((job) => (
                    <JobCard key={job.id} job={job} near applied={jobsUser ? hasApplied(job.id, jobsUser.id) : false} onApply={() => handleApply(job)} />
                  ))}
                </View>
              )}
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Feather name="briefcase" size={15} color="#EA580C" />
                  <Text style={s.sectionTitle}>All Available Jobs</Text>
                  <View style={[s.sectionBadge, { backgroundColor: "#FFEDD5" }]}>
                    <Text style={[s.sectionBadgeText, { color: "#EA580C" }]}>{activeJobs.length}</Text>
                  </View>
                </View>
                {activeJobs.length === 0 ? (
                  <View style={s.empty}>
                    <Feather name="briefcase" size={44} color="#CBD5E1" />
                    <Text style={s.emptyText}>No jobs available yet</Text>
                  </View>
                ) : (
                  activeJobs.map((job) => (
                    <JobCard key={job.id} job={job} applied={jobsUser ? hasApplied(job.id, jobsUser.id) : false} onApply={() => handleApply(job)} />
                  ))
                )}
              </View>
            </>
          )
        }
      />

      <NotificationsModal visible={showNotifs} onClose={() => setShowNotifs(false)} jobs={activeJobs} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginTop: 2 },
  headerBadge: { position: "relative", width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  notifBubble: { position: "absolute", top: 5, right: 5, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FCD34D", alignItems: "center", justifyContent: "center" },
  notifBubbleText: { fontSize: 8, fontWeight: "800", color: "#92400E", fontFamily: "Inter_700Bold" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  searchPlaceholder: { flex: 1, fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  filterIconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },

  list: { padding: 14 },
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  sectionBadge: { backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionBadgeText: { fontSize: 12, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 48, gap: 12 },
  emptyText: { fontSize: 15, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  emptySubText: { fontSize: 12, color: "#CBD5E1", fontFamily: "Inter_400Regular", textAlign: "center" },

  // KPI
  kpiGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCard: { borderRadius: 18, padding: 16, gap: 4, flex: 1 },
  kpiBig: { },
  kpiBigNum: { fontSize: 32, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  kpiBigLabel: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.9)", fontFamily: "Inter_700Bold" },
  kpiBigSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular" },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpiSmall: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  kpiSmallNum: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  kpiSmallLabel: { fontSize: 10, color: "#64748B", fontFamily: "Inter_400Regular" },

  // Funnel
  funnelCard: { backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 14, gap: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  funnelTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  funnelBar: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: "#F1F5F9" },
  funnelSeg: { borderRadius: 5 },
  funnelLegend: { flexDirection: "row", gap: 16 },
  funnelLegRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  funnelLegText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },
  dot: { width: 12, height: 12, borderRadius: 6 },

  // Post CTA
  postCtaWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  postCta: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  postCtaText: { flex: 1, fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  // Job performance card
  jobPerfCard: { backgroundColor: "white", borderRadius: 18, marginBottom: 10, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  jobPerfTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingBottom: 10 },
  jobPerfStats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingHorizontal: 14, paddingVertical: 10 },
  perfStat: { flex: 1, alignItems: "center", gap: 2 },
  perfStatNum: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  perfStatLabel: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  perfDivider: { width: 1, backgroundColor: "#F1F5F9" },
  fillRow: { paddingHorizontal: 14, paddingBottom: 10, gap: 5 },
  fillLabel: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },
  fillBar: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "#F1F5F9" },
  fillFill: { backgroundColor: "#EA580C", borderRadius: 3 },
  viewAppsBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  viewAppsBtnText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#EA580C", fontFamily: "Inter_600SemiBold" },
  deleteJobBtn: { width: 44, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", borderLeftWidth: 1, borderLeftColor: "#F1F5F9", backgroundColor: "#FEF2F2" },
  deleteOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 28 },
  deleteCard: { backgroundColor: "white", borderRadius: 24, padding: 24, alignItems: "center", gap: 10 },
  deleteIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  deleteTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", textAlign: "center" },
  deleteSub: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  deleteBtns: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" as any },
  deleteCancelBtn: { flex: 1, backgroundColor: "#F1F5F9", padding: 13, borderRadius: 14, alignItems: "center" },
  deleteCancelText: { fontSize: 14, fontWeight: "600", color: "#64748B", fontFamily: "Inter_600SemiBold" },
  deleteConfirmBtn: { flex: 1, backgroundColor: "#DC2626", padding: 13, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  deleteConfirmText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },

  // Recent activity
  activityRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EA580C", marginTop: 5 },
  activityText: { fontSize: 12, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 17 },

  // Seeker card
  card: { backgroundColor: "white", borderRadius: 18, shadowColor: "#EA580C", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, marginBottom: 10, overflow: "hidden" },
  cardTappable: { padding: 14 },
  nearBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", margin: 10, marginBottom: 0, borderRadius: 8 },
  nearBadgeText: { fontSize: 10, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  catIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  cardCompany: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  cardMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },
  salaryRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  salary: { fontSize: 15, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  expandedSection: { backgroundColor: "#F8FAFC", padding: 14, gap: 6 },
  expandLabel: { fontSize: 11, fontWeight: "700", color: "#475569", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  expandText: { fontSize: 13, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  applicantsText: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  applyBtn: { borderRadius: 10, overflow: "hidden" },
  applyBtnDone: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#D1FAE5", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  applyGrad: { paddingHorizontal: 18, paddingVertical: 9 },
  applyBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  applyBtnTextWhite: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  // Notifications modal
  notifOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  notifPanel: { backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, maxHeight: "80%" },
  appPanel: { backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, maxHeight: "90%" },
  notifHandle: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  notifHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  notifTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  notifClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  notifEmpty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  notifEmptyText: { fontSize: 14, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  notifItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  notifDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifItemTitle: { fontSize: 13, fontWeight: "600", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  notifItemSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  notifTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },

  // Applicants modal
  pipelineRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  pipePill: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center", gap: 2 },
  pipeNum: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  pipeLabel: { fontSize: 10, color: "#64748B", fontFamily: "Inter_400Regular" },
  appSectionLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  appAvatar: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 13, fontWeight: "600", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  appId: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  appActionBtn: { borderRadius: 8, overflow: "hidden" },
  appActionGrad: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7 },
  appActionText: { fontSize: 11, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
