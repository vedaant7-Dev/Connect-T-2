import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { apiDelete, apiGet, apiPatch, apiPost, getUserErrorMessage } from "@/lib/api";

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

type NewJob = Omit<Job, "id" | "createdAt" | "applicants" | "messages" | "hired" | "shortlisted" | "rejected" | "active">;

interface JobsContextType {
  jobs: Job[];
  applications: JobApplication[];
  loading: boolean;
  error: string;
  refreshJobs: () => Promise<void>;
  addJob: (data: NewJob) => Promise<void>;
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

function unique(values: Array<string | number | null | undefined>) {
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null && String(value)).map(String)));
}

function asNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function parseDbBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "active", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "inactive", "disabled"].includes(normalized)) return false;
  return fallback;
}

function asCategory(value: unknown): JobCategory {
  const category = String(value || "other") as JobCategory;
  return categoryConfig[category] ? category : "other";
}

function asType(value: unknown): JobType {
  const type = String(value || "full-time") as JobType;
  return typeConfig[type] ? type : "full-time";
}

function normalizeApplication(raw: any): JobApplication {
  const jobId = String(raw?.job_id || raw?.jobId || "");
  const seekerId = String(raw?.seeker_id || raw?.seekerId || "");
  const rawStatus = String(raw?.status || "applied");
  const status: JobApplication["status"] = ["shortlisted", "rejected", "hired"].includes(rawStatus)
    ? rawStatus as JobApplication["status"]
    : "applied";
  return {
    id: String(raw?.id || `${jobId}_${seekerId}`),
    jobId,
    seekerId,
    status,
    seekerName: raw?.seeker_name || raw?.seekerName || raw?.name,
    seekerPhone: raw?.seeker_phone || raw?.seekerPhone || raw?.phone,
    seekerEmail: raw?.seeker_email || raw?.seekerEmail || raw?.email,
    seekerSkills: raw?.seeker_skills || raw?.seekerSkills || raw?.skills,
    seekerQualification: raw?.seeker_qualification || raw?.seekerQualification || raw?.qualification,
    seekerProfilePhoto: raw?.seeker_profile_photo || raw?.seekerProfilePhoto || raw?.profilePhoto,
  };
}

function normalizeJob(raw: any, allApplications: JobApplication[], previous?: Job, viewerId?: string): Job {
  const id = String(raw?.id || "");
  let jobApplications = allApplications.filter((application) => application.jobId === id);
  const serverStatus = String(raw?.applicationStatus || raw?.application_status || "").trim();
  if (viewerId && serverStatus && !jobApplications.some((application) => application.seekerId === viewerId)) {
    jobApplications = [...jobApplications, normalizeApplication({
      id: `${id}_${viewerId}`,
      jobId: id,
      seekerId: viewerId,
      status: serverStatus,
    })];
  }

  const applicants = unique([
    ...(Array.isArray(raw?.applicants) ? raw.applicants : []),
    ...jobApplications.map((application) => application.seekerId),
  ]);
  const applicantsCount = Number(raw?.applicantsCount ?? raw?.applicants_count ?? applicants.length);

  return {
    id,
    employerId: String(raw?.employerId || raw?.employer_id || ""),
    employerName: raw?.employerName || raw?.employer_name || "Employer",
    employerPhone: raw?.employerPhone || raw?.employer_phone,
    employerWhatsApp: raw?.employerWhatsApp || raw?.employer_whatsapp,
    company: raw?.company || "Company",
    title: raw?.title || "Untitled Job",
    category: asCategory(raw?.category),
    type: asType(raw?.type),
    shift: raw?.shift || undefined,
    jobMode: raw?.jobMode || raw?.job_mode || undefined,
    workStartTime: raw?.workStartTime || raw?.work_start_time || undefined,
    workEndTime: raw?.workEndTime || raw?.work_end_time || undefined,
    workingDays: raw?.workingDays || raw?.working_days || undefined,
    weeklyOff: raw?.weeklyOff || raw?.weekly_off || undefined,
    salary: raw?.salary || raw?.salaryText || raw?.salary_text || "Salary not specified",
    salaryMin: asNumber(raw?.salaryMin ?? raw?.salary_min),
    salaryMax: asNumber(raw?.salaryMax ?? raw?.salary_max),
    location: raw?.location || "Location not specified",
    address: raw?.address || undefined,
    latitude: asNumber(raw?.latitude),
    longitude: asNumber(raw?.longitude),
    distanceKm: raw?.distanceKm ?? raw?.distance_km ?? null,
    description: raw?.description || "",
    requirements: raw?.requirements || "",
    experienceRequired: raw?.experienceRequired || raw?.experience_required || undefined,
    educationRequired: raw?.educationRequired || raw?.education_required || undefined,
    skillsRequired: raw?.skillsRequired || raw?.skills_required || undefined,
    benefits: raw?.benefits || undefined,
    joiningPreference: raw?.joiningPreference || raw?.joining_preference || undefined,
    lastDateToApply: raw?.lastDateToApply || raw?.last_date_to_apply || undefined,
    urgentHiring: parseDbBoolean(raw?.urgentHiring ?? raw?.urgent_hiring),
    openings: Math.max(1, Number(raw?.openings || 1)),
    applicants,
    applicantsCount: Number.isFinite(applicantsCount) ? applicantsCount : applicants.length,
    messages: previous?.messages || [],
    hired: unique(jobApplications.filter((application) => application.status === "hired").map((application) => application.seekerId)),
    shortlisted: unique(jobApplications.filter((application) => application.status === "shortlisted").map((application) => application.seekerId)),
    rejected: unique(jobApplications.filter((application) => application.status === "rejected").map((application) => application.seekerId)),
    applications: jobApplications,
    createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
    updatedAt: raw?.updatedAt || raw?.updated_at,
    active: parseDbBoolean(raw?.active, true),
  };
}

function mergeJob(previous: Job[], next: Job) {
  const found = previous.some((job) => job.id === next.id);
  return found
    ? previous.map((job) => job.id === next.id ? { ...job, ...next, messages: next.messages || job.messages } : job)
    : [next, ...previous];
}

function withApplicationStatus(job: Job, seekerId: string, status: JobApplication["status"]): Job {
  const applications = job.applications || [];
  const nextApplications = applications.some((application) => application.seekerId === seekerId)
    ? applications.map((application) => application.seekerId === seekerId ? { ...application, status } : application)
    : [...applications, { id: `${job.id}_${seekerId}`, jobId: job.id, seekerId, status }];
  return normalizeJob(job, nextApplications, job);
}

export function JobsProvider({ children }: { children: ReactNode }) {
  const { jobsUser } = useJobsAuth();
  const { user: civicUser } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isSuperAdmin = civicUser?.role === "super_admin" || civicUser?.isSuperAdmin;

  const refreshJobs = useCallback(async () => {
    if (!jobsUser && !isSuperAdmin) {
      setJobs([]);
      setApplications([]);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const jobParams = new URLSearchParams();
      jobParams.set("active", "all");
      if (jobsUser?.role === "employer") jobParams.set("employerId", jobsUser.id);
      if (jobsUser?.role === "seeker") jobParams.set("viewerId", jobsUser.id);

      const jobsResult = await apiGet<{ success: boolean; jobs: any[] }>(`/api/job-portal/jobs?${jobParams.toString()}`);
      let nextApplications: JobApplication[] = [];
      if (isSuperAdmin || jobsUser?.id) {
        try {
          const appParams = new URLSearchParams();
          if (!isSuperAdmin && jobsUser?.id) {
            appParams.set(jobsUser.role === "employer" ? "employerId" : "seekerId", jobsUser.id);
          }
          const query = appParams.toString();
          const applicationResult = await apiGet<{ success: boolean; applications: any[] }>(`/api/job-portal/applications${query ? `?${query}` : ""}`);
          nextApplications = (applicationResult.applications || []).map(normalizeApplication);
        } catch (applicationError) {
          setError(getUserErrorMessage(applicationError, "Jobs loaded, but application updates could not be refreshed."));
        }
      }

      setApplications(nextApplications);
      setJobs((previous) => {
        const previousById = new Map(previous.map((job) => [job.id, job]));
        return (jobsResult.jobs || [])
          .map((raw) => normalizeJob(raw, nextApplications, previousById.get(String(raw?.id)), jobsUser?.role === "seeker" ? jobsUser.id : undefined))
          .filter((job) => !!job.id);
      });
    } catch (refreshError) {
      const message = getUserErrorMessage(refreshError, "Job Portal data could not be loaded. Pull down to try again.");
      setError(message);
      throw refreshError;
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, jobsUser?.id, jobsUser?.role]);

  useEffect(() => {
    void refreshJobs().catch(() => undefined);
  }, [refreshJobs]);

  const addJob = async (data: NewJob) => {
    if (!jobsUser || jobsUser.role !== "employer") throw new Error("Only employers can post jobs.");
    if (words(data.description) < 5 || words(data.description) > 100) {
      throw new Error("Description must be between 5 and 100 words.");
    }

    const temporaryId = `temp_${Date.now()}`;
    const temporaryJob = normalizeJob({
      ...data,
      id: temporaryId,
      employer_id: jobsUser.id,
      employer_name: jobsUser.name,
      employer_phone: jobsUser.phone,
      employer_whatsapp: jobsUser.whatsapp || jobsUser.phone,
      company: data.company || jobsUser.company || "Company",
      active: 1,
      created_at: new Date().toISOString(),
    }, []);
    setJobs((previous) => [temporaryJob, ...previous]);

    try {
      const result = await apiPost<{ success: boolean; job: any }>("/api/job-portal/jobs", {
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
      const created = normalizeJob(result.job, []);
      setJobs((previous) => mergeJob(previous.filter((job) => job.id !== temporaryId), created));
      await refreshJobs();
    } catch (requestError) {
      setJobs((previous) => previous.filter((job) => job.id !== temporaryId));
      throw requestError;
    }
  };

  const addJobMessage = async (jobId: string, message: JobMessage) => {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) throw new Error("Job not found.");
    const receiverId = message.to || (message.from === job.employerId ? job.applicants[0] : job.employerId);
    if (!receiverId) throw new Error("Select an applicant before sending a message.");
    const nextMessage = { ...message, to: receiverId };
    setJobs((previous) => previous.map((item) => item.id === jobId ? { ...item, messages: [...item.messages, nextMessage] } : item));
    try {
      await apiPost("/api/job-portal/messages", { jobId, senderId: message.from, receiverId, message: message.text });
    } catch (requestError) {
      setJobs((previous) => previous.map((item) => item.id === jobId ? { ...item, messages: item.messages.filter((itemMessage) => itemMessage !== nextMessage) } : item));
      throw requestError;
    }
  };

  const applyJob = async (jobId: string, seekerId: string) => {
    if (!jobsUser || jobsUser.role !== "seeker" || jobsUser.id !== seekerId) {
      throw new Error("Only the logged-in Job Seeker can apply.");
    }
    const previous = jobs;
    setJobs((current) => current.map((job) => job.id === jobId ? withApplicationStatus(job, seekerId, "applied") : job));
    try {
      await apiPost(`/api/job-portal/jobs/${jobId}/apply`, { seekerId });
      await refreshJobs();
    } catch (requestError) {
      setJobs(previous);
      throw requestError;
    }
  };

  const hasApplied = (jobId: string, seekerId: string) => {
    const job = jobs.find((item) => item.id === jobId);
    return !!job?.applicants.includes(seekerId);
  };

  const getJobsByEmployer = (employerId: string) => jobs.filter((job) => job.employerId === employerId);

  const toggleJobActive = async (jobId: string) => {
    const current = jobs.find((job) => job.id === jobId);
    if (!current) throw new Error("Job not found.");
    const previous = jobs;
    const nextActive = !current.active;
    setJobs((items) => items.map((job) => job.id === jobId ? { ...job, active: nextActive } : job));
    try {
      await apiPatch(`/api/job-portal/jobs/${jobId}`, { active: nextActive });
      await refreshJobs();
    } catch (requestError) {
      setJobs(previous);
      throw requestError;
    }
  };

  const ensureApplication = async (jobId: string, seekerId: string) => {
    const existing = applications.find((application) => application.jobId === jobId && application.seekerId === seekerId)
      || jobs.flatMap((job) => job.applications || []).find((application) => application.jobId === jobId && application.seekerId === seekerId);
    if (existing?.id && !existing.id.startsWith(`${jobId}_`)) return existing;
    const result = await apiPost<{ success: boolean; application: any }>(`/api/job-portal/jobs/${jobId}/apply`, { seekerId });
    return normalizeApplication(result.application || { id: `${jobId}_${seekerId}`, jobId, seekerId });
  };

  const updateApplicationStatus = async (jobId: string, seekerId: string, status: JobApplication["status"]) => {
    const application = await ensureApplication(jobId, seekerId);
    const previousJobs = jobs;
    const previousApplications = applications;
    setApplications((items) => {
      const remaining = items.filter((item) => item.id !== application.id);
      return [...remaining, { ...application, status }];
    });
    setJobs((items) => items.map((job) => job.id === jobId ? withApplicationStatus(job, seekerId, status) : job));
    try {
      await apiPatch(`/api/job-portal/applications/${application.id}/status`, { status });
      await refreshJobs();
    } catch (requestError) {
      setJobs(previousJobs);
      setApplications(previousApplications);
      throw requestError;
    }
  };

  const shortlistApplicant = (jobId: string, seekerId: string) => updateApplicationStatus(jobId, seekerId, "shortlisted");
  const rejectApplicant = (jobId: string, seekerId: string) => updateApplicationStatus(jobId, seekerId, "rejected");
  const hireApplicant = (jobId: string, seekerId: string) => updateApplicationStatus(jobId, seekerId, "hired");

  const deleteJob = async (jobId: string) => {
    const previous = jobs;
    setJobs((items) => items.filter((job) => job.id !== jobId));
    try {
      await apiDelete(`/api/job-portal/jobs/${jobId}`);
      await refreshJobs();
    } catch (requestError) {
      setJobs(previous);
      throw requestError;
    }
  };

  const value = useMemo<JobsContextType>(() => ({
    jobs,
    applications,
    loading,
    error,
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
  }), [jobs, applications, loading, error, refreshJobs]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const context = useContext(JobsContext);
  if (!context) throw new Error("useJobs must be inside JobsProvider");
  return context;
}

export const categoryConfig: Record<JobCategory, { label: string; icon: string; color: string; bg: string }> = {
  manufacturing: { label: "Manufacturing", icon: "settings", color: "#92400E", bg: "#FEF3C7" },
  it: { label: "IT / Computer", icon: "monitor", color: "#1D4ED8", bg: "#DBEAFE" },
  retail: { label: "Retail / Sales", icon: "shopping-bag", color: "#7C3AED", bg: "#EDE9FE" },
  healthcare: { label: "Healthcare", icon: "activity", color: "#DC2626", bg: "#FEE2E2" },
  construction: { label: "Construction", icon: "tool", color: "#B45309", bg: "#FFEDD5" },
  transport: { label: "Transport", icon: "truck", color: "#0369A1", bg: "#BAE6FD" },
  education: { label: "Education", icon: "book-open", color: "#059669", bg: "#D1FAE5" },
  security: { label: "Security", icon: "shield", color: "#475569", bg: "#F1F5F9" },
  other: { label: "Other", icon: "more-horizontal", color: "#64748B", bg: "#F1F5F9" },
};

export const typeConfig: Record<JobType, { label: string; color: string; bg: string }> = {
  "full-time": { label: "Full Time", color: "#059669", bg: "#D1FAE5" },
  "part-time": { label: "Part Time", color: "#D97706", bg: "#FEF3C7" },
  contract: { label: "Contract", color: "#7C3AED", bg: "#EDE9FE" },
  apprentice: { label: "Apprentice", color: "#EA580C", bg: "#FFEDD5" },
};
