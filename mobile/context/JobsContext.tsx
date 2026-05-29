import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useJobsAuth } from "@/context/JobsAuthContext";

export type JobCategory =
  | "manufacturing"
  | "it"
  | "retail"
  | "healthcare"
  | "construction"
  | "transport"
  | "education"
  | "security"
  | "other";

export type JobType = "full-time" | "part-time" | "contract" | "apprentice";

export interface JobMessage {
  from: string;
  to?: string;
  text: string;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  seekerId: string;
  status: "applied" | "shortlisted" | "rejected" | "hired";
  seekerName?: string;
  seekerPhone?: string;
  seekerEmail?: string;
  seekerSkills?: string;
  seekerQualification?: string;
  seekerProfilePhoto?: string;
}

export interface Job {
  id: string;
  employerId: string;
  employerName: string;
  employerPhone?: string;
  employerWhatsApp?: string;
  company: string;
  title: string;
  category: JobCategory;
  type: JobType;
  shift?: string;
  jobMode?: string;
  workStartTime?: string;
  workEndTime?: string;
  workingDays?: string;
  weeklyOff?: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number | null;
  description: string;
  requirements: string;
  experienceRequired?: string;
  educationRequired?: string;
  skillsRequired?: string;
  benefits?: string;
  joiningPreference?: string;
  lastDateToApply?: string;
  urgentHiring?: boolean;
  openings: number;
  applicants: string[];
  applicantsCount?: number;
  messages: JobMessage[];
  hired: string[];
  shortlisted: string[];
  rejected: string[];
  applications?: JobApplication[];
  createdAt: string;
  updatedAt?: string;
  active: boolean;
}

interface JobsContextType {
  jobs: Job[];
  loading: boolean;
  refreshJobs: () => Promise<void>;
  addJob: (data: Omit<Job, "id" | "createdAt" | "applicants" | "messages" | "hired" | "shortlisted" | "rejected" | "active">) => Promise<void>;
  addJobMessage: (jobId: string, message: JobMessage) => Promise<void>;
  applyJob: (jobId: string, seekerId: string) => Promise<void>;
  hasApplied: (jobId: string, seekerId: string) => boolean;
  getJobsByEmployer: (employerId: string) => Job[];
  toggleJobActive: (jobId: string) => Promise<void>;
  shortlistApplicant: (jobId: string, seekerId: string) => Promise<void>;
  rejectApplicant: (jobId: string, seekerId: string) => Promise<void>;
  hireApplicant: (jobId: string, seekerId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
}

const JobsContext = createContext<JobsContextType | null>(null);

function words(value?: string) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean).map(String)));
}

function asNumber(value: any): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asCategory(value: any): JobCategory {
  const v = String(value || "other") as JobCategory;
  return categoryConfig[v] ? v : "other";
}

function asType(value: any): JobType {
  const v = String(value || "full-time") as JobType;
  return typeConfig[v] ? v : "full-time";
}

function normalizeApplication(raw: any): JobApplication {
  const jobId = String(raw.job_id || raw.jobId || "");
  const seekerId = String(raw.seeker_id || raw.seekerId || "");

  return {
    id: String(raw.id || `${jobId}_${seekerId}`),
    jobId,
    seekerId,
    status: (raw.status || "applied") as JobApplication["status"],
    seekerName: raw.seeker_name || raw.seekerName || raw.name,
    seekerPhone: raw.seeker_phone || raw.seekerPhone || raw.phone,
    seekerEmail: raw.seeker_email || raw.seekerEmail || raw.email,
    seekerSkills: raw.seeker_skills || raw.seekerSkills || raw.skills,
    seekerQualification: raw.seeker_qualification || raw.seekerQualification || raw.qualification,
    seekerProfilePhoto: raw.seeker_profile_photo || raw.seekerProfilePhoto || raw.profilePhoto,
  };
}

function normalizeJob(raw: any, apps: JobApplication[] = [], previous?: Job): Job {
  const id = String(raw.id);
  const jobApps = apps.filter((app) => app.jobId === id);
  const applicants = unique([
    ...(Array.isArray(raw.applicants) ? raw.applicants.map(String) : []),
    ...jobApps.map((app) => app.seekerId),
  ]);
  const applicantsCount = Number(raw.applicantsCount ?? raw.applicants_count ?? applicants.length);

  return {
    id,
    employerId: String(raw.employerId || raw.employer_id),
    employerName: raw.employerName || raw.employer_name || "Employer",
    employerPhone: raw.employerPhone || raw.employer_phone,
    employerWhatsApp: raw.employerWhatsApp || raw.employer_whatsapp,
    company: raw.company || "Company",
    title: raw.title || "Untitled Job",
    category: asCategory(raw.category),
    type: asType(raw.type),
    shift: raw.shift || undefined,
    jobMode: raw.jobMode || raw.job_mode || undefined,
    workStartTime: raw.workStartTime || raw.work_start_time || undefined,
    workEndTime: raw.workEndTime || raw.work_end_time || undefined,
    workingDays: raw.workingDays || raw.working_days || undefined,
    weeklyOff: raw.weeklyOff || raw.weekly_off || undefined,
    salary: raw.salary || raw.salaryText || raw.salary_text || "Salary not specified",
    salaryMin: asNumber(raw.salaryMin ?? raw.salary_min),
    salaryMax: asNumber(raw.salaryMax ?? raw.salary_max),
    location: raw.location || "Ambernath",
    address: raw.address || undefined,
    latitude: asNumber(raw.latitude),
    longitude: asNumber(raw.longitude),
    distanceKm: raw.distanceKm ?? raw.distance_km ?? null,
    description: raw.description || "",
    requirements: raw.requirements || "",
    experienceRequired: raw.experienceRequired || raw.experience_required || undefined,
    educationRequired: raw.educationRequired || raw.education_required || undefined,
    skillsRequired: raw.skillsRequired || raw.skills_required || undefined,
    benefits: raw.benefits || undefined,
    joiningPreference: raw.joiningPreference || raw.joining_preference || undefined,
    lastDateToApply: raw.lastDateToApply || raw.last_date_to_apply || undefined,
    urgentHiring: !!(raw.urgentHiring || raw.urgent_hiring),
    openings: Number(raw.openings || 1),
    applicants,
    applicantsCount: Number.isFinite(applicantsCount) ? applicantsCount : applicants.length,
    messages: previous?.messages || [],
    hired: unique(jobApps.filter((app) => app.status === "hired").map((app) => app.seekerId)),
    shortlisted: unique(jobApps.filter((app) => app.status === "shortlisted").map((app) => app.seekerId)),
    rejected: unique(jobApps.filter((app) => app.status === "rejected").map((app) => app.seekerId)),
    applications: jobApps,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at,
    active: raw.active === undefined ? true : !!raw.active,
  };
}

function mergeJob(prev: Job[], nextJob: Job) {
  const exists = prev.some((job) => job.id === nextJob.id);
  return exists
    ? prev.map((job) => (job.id === nextJob.id ? { ...job, ...nextJob, messages: nextJob.messages || job.messages } : job))
    : [nextJob, ...prev];
}

function withApplicationStatus(job: Job, seekerId: string, status: JobApplication["status"]): Job {
  const hired = job.hired.filter((id) => id !== seekerId);
  const shortlisted = job.shortlisted.filter((id) => id !== seekerId);
  const rejected = job.rejected.filter((id) => id !== seekerId);

  if (status === "hired") hired.push(seekerId);
  if (status === "shortlisted") shortlisted.push(seekerId);
  if (status === "rejected") rejected.push(seekerId);

  return {
    ...job,
    applicants: unique([...job.applicants, seekerId]),
    hired: unique(hired),
    shortlisted: unique(shortlisted),
    rejected: unique(rejected),
    applications: (job.applications || []).map((app) =>
      app.seekerId === seekerId ? { ...app, status } : app,
    ),
  };
}

export function JobsProvider({ children }: { children: ReactNode }) {
  const { jobsUser } = useJobsAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshJobs = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (jobsUser?.role === "employer") {
        params.set("active", "all");
        params.set("employerId", jobsUser.id);
      } else {
        params.set("active", "true");
      }

      if (jobsUser?.id) {
        params.set("viewerId", jobsUser.id);
      }

      const jobsRes = await apiGet<{ success: boolean; jobs: any[] }>(
        `/api/job-portal/jobs?${params.toString()}`,
      );

      let apps: JobApplication[] = [];

      try {
        const appParams = new URLSearchParams();

        if (jobsUser?.role === "seeker") {
          appParams.set("seekerId", jobsUser.id);
        }

        if (jobsUser?.role === "employer") {
          appParams.set("employerId", jobsUser.id);
        }

        if (appParams.toString()) {
          const appRes = await apiGet<{ success: boolean; applications: any[] }>(
            `/api/job-portal/applications?${appParams.toString()}`,
          );
          apps = (appRes.applications || []).map(normalizeApplication);
        }
      } catch {
        apps = [];
      }

      setApplications(apps);

      setJobs((prev) => {
        const prevById = new Map(prev.map((job) => [job.id, job]));
        return (jobsRes.jobs || []).map((raw) => normalizeJob(raw, apps, prevById.get(String(raw.id))));
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshJobs().catch(() => setLoading(false));
  }, [jobsUser?.id, jobsUser?.role]);

  const addJob = async (
    data: Omit<Job, "id" | "createdAt" | "applicants" | "messages" | "hired" | "shortlisted" | "rejected" | "active">,
  ) => {
    if (!jobsUser || jobsUser.role !== "employer") {
      throw new Error("Only employers can post jobs.");
    }

    if (words(data.description) < 5 || words(data.description) > 100) {
      throw new Error("Description must be between 5 and 100 words.");
    }

    const tempId = `temp_${Date.now()}`;
    const tempJob: Job = {
      ...data,
      id: tempId,
      employerId: jobsUser.id,
      employerName: jobsUser.name,
      employerPhone: jobsUser.phone,
      employerWhatsApp: jobsUser.whatsapp || jobsUser.phone,
      company: data.company || jobsUser.company || "Company",
      applicants: [],
      applicantsCount: 0,
      messages: [],
      hired: [],
      shortlisted: [],
      rejected: [],
      applications: [],
      active: true,
      createdAt: new Date().toISOString(),
    };

    setJobs((prev) => [tempJob, ...prev]);

    try {
      const res = await apiPost<{ success: boolean; job: any }>("/api/job-portal/jobs", {
        employerId: jobsUser.id,
        title: data.title,
        category: data.category,
        type: data.type,
        shift: data.shift,
        jobMode: data.jobMode,
        workStartTime: data.workStartTime,
        workEndTime: data.workEndTime,
        workingDays: data.workingDays,
        weeklyOff: data.weeklyOff,
        salary: data.salary,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        location: data.location,
        address: data.address || jobsUser.address || data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        requirements: data.requirements,
        experienceRequired: data.experienceRequired,
        educationRequired: data.educationRequired,
        skillsRequired: data.skillsRequired,
        benefits: data.benefits,
        joiningPreference: data.joiningPreference,
        lastDateToApply: data.lastDateToApply,
        openings: data.openings,
        allowMessaging: true,
        urgentHiring: !!data.urgentHiring,
      });

      const created = normalizeJob(res.job, []);
      setJobs((prev) => mergeJob(prev.filter((job) => job.id !== tempId), created));
      await refreshJobs();
    } catch (err) {
      setJobs((prev) => prev.filter((job) => job.id !== tempId));
      throw err;
    }
  };

  const addJobMessage = async (jobId: string, message: JobMessage) => {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) return;

    const senderId = message.from;
    const receiverId =
      message.to ||
      (senderId === job.employerId
        ? job.applicants.find((id) => id !== senderId)
        : job.employerId);

    if (!receiverId) return;

    const nextMessage = { ...message, to: receiverId };

    setJobs((prev) =>
      prev.map((item) =>
        item.id === jobId
          ? { ...item, messages: [...(item.messages || []), nextMessage] }
          : item,
      ),
    );

    try {
      await apiPost("/api/job-portal/messages", {
        jobId,
        senderId,
        receiverId,
        message: message.text,
      });
    } catch (err) {
      setJobs((prev) =>
        prev.map((item) =>
          item.id === jobId
            ? { ...item, messages: (item.messages || []).filter((m) => m !== nextMessage) }
            : item,
        ),
      );
      throw err;
    }
  };

  const applyJob = async (jobId: string, seekerId: string) => {
    if (!seekerId) return;

    const previous = jobs;

    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId && !job.applicants.includes(seekerId)
          ? {
              ...job,
              applicants: [...job.applicants, seekerId],
              applicantsCount: Math.max(job.applicantsCount || 0, job.applicants.length + 1),
              applications: [
                ...(job.applications || []),
                { id: `${jobId}_${seekerId}`, jobId, seekerId, status: "applied" },
              ],
            }
          : job,
      ),
    );

    try {
      await apiPost(`/api/job-portal/jobs/${jobId}/apply`, { seekerId });
      await refreshJobs();
    } catch (err) {
      setJobs(previous);
      throw err;
    }
  };

  const hasApplied = (jobId: string, seekerId: string) => {
    const job = jobs.find((item) => item.id === jobId);
    return !!job && job.applicants.includes(seekerId);
  };

  const getJobsByEmployer = (employerId: string) => {
    return jobs.filter((job) => job.employerId === employerId);
  };

  const toggleJobActive = async (jobId: string) => {
    const current = jobs.find((job) => job.id === jobId);
    if (!current) return;

    const nextActive = !current.active;
    const previous = jobs;

    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, active: nextActive } : job)),
    );

    try {
      await apiPatch(`/api/job-portal/jobs/${jobId}`, { active: nextActive });
    } catch (err) {
      setJobs(previous);
      throw err;
    }
  };

  const updateApplicationStatus = async (
    jobId: string,
    seekerId: string,
    status: JobApplication["status"],
  ) => {
    const app =
      applications.find((item) => item.jobId === jobId && item.seekerId === seekerId) ||
      jobs.flatMap((job) => job.applications || []).find((item) => item.jobId === jobId && item.seekerId === seekerId);

    if (!app) {
      throw new Error("Application not found. Refresh and try again.");
    }

    const previousJobs = jobs;
    const previousApps = applications;

    setApplications((prev) => prev.map((item) => (item.id === app.id ? { ...item, status } : item)));
    setJobs((prev) => prev.map((job) => (job.id === jobId ? withApplicationStatus(job, seekerId, status) : job)));

    try {
      await apiPatch(`/api/job-portal/applications/${app.id}/status`, { status });
      await refreshJobs();
    } catch (err) {
      setJobs(previousJobs);
      setApplications(previousApps);
      throw err;
    }
  };

  const shortlistApplicant = async (jobId: string, seekerId: string) => {
    await updateApplicationStatus(jobId, seekerId, "shortlisted");
  };

  const rejectApplicant = async (jobId: string, seekerId: string) => {
    await updateApplicationStatus(jobId, seekerId, "rejected");
  };

  const hireApplicant = async (jobId: string, seekerId: string) => {
    await updateApplicationStatus(jobId, seekerId, "hired");
  };

  const deleteJob = async (jobId: string) => {
    const previous = jobs;
    setJobs((prev) => prev.filter((job) => job.id !== jobId));

    try {
      await apiDelete(`/api/job-portal/jobs/${jobId}`);
    } catch (err) {
      setJobs(previous);
      throw err;
    }
  };

  const value = useMemo(
    () => ({
      jobs,
      loading,
      refreshJobs,
      addJob,
      addJobMessage,
      applyJob,
      hasApplied,
      getJobsByEmployer,
      toggleJobActive,
      shortlistApplicant,
      rejectApplicant,
      hireApplicant,
      deleteJob,
    }),
    [jobs, loading, applications],
  );

  return (
    <JobsContext.Provider value={value}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be inside JobsProvider");
  return ctx;
}

export const categoryConfig: Record<JobCategory, { label: string; icon: string; color: string; bg: string }> = {
  manufacturing: { label: "Manufacturing", icon: "settings",        color: "#92400E", bg: "#FEF3C7" },
  it:            { label: "IT / Computer", icon: "monitor",         color: "#1D4ED8", bg: "#DBEAFE" },
  retail:        { label: "Retail / Sales", icon: "shopping-bag",   color: "#7C3AED", bg: "#EDE9FE" },
  healthcare:    { label: "Healthcare",    icon: "activity",        color: "#DC2626", bg: "#FEE2E2" },
  construction:  { label: "Construction",  icon: "tool",            color: "#B45309", bg: "#FFEDD5" },
  transport:     { label: "Transport",     icon: "truck",           color: "#0369A1", bg: "#BAE6FD" },
  education:     { label: "Education",     icon: "book-open",       color: "#059669", bg: "#D1FAE5" },
  security:      { label: "Security",      icon: "shield",          color: "#475569", bg: "#F1F5F9" },
  other:         { label: "Other",         icon: "more-horizontal", color: "#64748B", bg: "#F1F5F9" },
};

export const typeConfig: Record<JobType, { label: string; color: string; bg: string }> = {
  "full-time":  { label: "Full Time",  color: "#059669", bg: "#D1FAE5" },
  "part-time":  { label: "Part Time",  color: "#D97706", bg: "#FEF3C7" },
  contract:     { label: "Contract",   color: "#7C3AED", bg: "#EDE9FE" },
  apprentice:   { label: "Apprentice", color: "#EA580C", bg: "#FFEDD5" },
};