import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type JobCategory = "manufacturing" | "it" | "retail" | "healthcare" | "construction" | "transport" | "education" | "security" | "other";
export type JobType = "full-time" | "part-time" | "contract" | "apprentice";

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
  salary: string;
  location: string;
  description: string;
  requirements: string;
  openings: number;
  applicants: string[];
  messages: { from: string; text: string; createdAt: string }[];
  hired: string[];
  shortlisted: string[];
  rejected: string[];
  createdAt: string;
  active: boolean;
}

interface JobsContextType {
  jobs: Job[];
  loading: boolean;
  addJob: (data: Omit<Job, "id" | "createdAt" | "applicants" | "messages" | "hired" | "shortlisted" | "rejected" | "active">) => void;
  addJobMessage: (jobId: string, message: { from: string; text: string; createdAt: string }) => void;
  applyJob: (jobId: string, seekerId: string) => void;
  hasApplied: (jobId: string, seekerId: string) => boolean;
  getJobsByEmployer: (employerId: string) => Job[];
  toggleJobActive: (jobId: string) => void;
  shortlistApplicant: (jobId: string, seekerId: string) => void;
  rejectApplicant: (jobId: string, seekerId: string) => void;
  deleteJob: (jobId: string) => void;
}

const JobsContext = createContext<JobsContextType | null>(null);
const STORAGE_KEY = "janseva_jobs_listings_v4";

function generateId() {
  return "JOB" + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();
}

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed: Job[] = JSON.parse(raw);
          const migrated = parsed
            .map((j) => ({
              ...j,
              hired: j.hired || [],
              shortlisted: j.shortlisted || [],
              rejected: j.rejected || [],
            }))
            .filter((j) => typeof j.employerId === "string" && j.employerId.trim() !== "");
          setJobs(migrated);
          return;
        } catch {}
      }
      setJobs([]);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }).finally(() => setLoading(false));
  }, []);

  const save = async (updated: Job[]) => {
    setJobs(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addJob = (data: Omit<Job, "id" | "createdAt" | "applicants" | "messages" | "hired" | "shortlisted" | "rejected" | "active">) => {
    const job: Job = {
      ...data,
      id: generateId(),
      applicants: [],
      messages: [],
      hired: [],
      shortlisted: [],
      rejected: [],
      active: true,
      createdAt: new Date().toISOString(),
    };
    save([job, ...jobs]);
  };

  const addJobMessage = (jobId: string, message: { from: string; text: string; createdAt: string }) => {
    save(jobs.map((j) => (j.id === jobId ? { ...j, messages: [...(j.messages || []), message] } : j)));
  };

  const applyJob = (jobId: string, seekerId: string) => {
    save(jobs.map((j) => j.id === jobId && !j.applicants.includes(seekerId)
      ? { ...j, applicants: [...j.applicants, seekerId] }
      : j
    ));
  };

  const hasApplied = (jobId: string, seekerId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return !!job && job.applicants.includes(seekerId);
  };

  const getJobsByEmployer = (employerId: string) => jobs.filter((j) => j.employerId === employerId);

  const toggleJobActive = (jobId: string) => {
    save(jobs.map((j) => j.id === jobId ? { ...j, active: !j.active } : j));
  };

  const shortlistApplicant = (jobId: string, seekerId: string) => {
    save(jobs.map((j) => j.id === jobId
      ? {
          ...j,
          shortlisted: j.shortlisted.includes(seekerId) ? j.shortlisted : [...j.shortlisted, seekerId],
          rejected: j.rejected.filter((id) => id !== seekerId),
        }
      : j
    ));
  };

  const rejectApplicant = (jobId: string, seekerId: string) => {
    save(jobs.map((j) => j.id === jobId
      ? {
          ...j,
          rejected: j.rejected.includes(seekerId) ? j.rejected : [...j.rejected, seekerId],
          shortlisted: j.shortlisted.filter((id) => id !== seekerId),
        }
      : j
    ));
  };

  const deleteJob = (jobId: string) => {
    save(jobs.filter((j) => j.id !== jobId));
  };

  return (
    <JobsContext.Provider value={{ jobs, loading, addJob, addJobMessage, applyJob, hasApplied, getJobsByEmployer, toggleJobActive, shortlistApplicant, rejectApplicant, deleteJob }}>
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
  construction:  { label: "Construction", icon: "tool",             color: "#B45309", bg: "#FFEDD5" },
  transport:     { label: "Transport",    icon: "truck",            color: "#0369A1", bg: "#BAE6FD" },
  education:     { label: "Education",    icon: "book-open",        color: "#059669", bg: "#D1FAE5" },
  security:      { label: "Security",     icon: "shield",           color: "#475569", bg: "#F1F5F9" },
  other:         { label: "Other",        icon: "more-horizontal",  color: "#64748B", bg: "#F1F5F9" },
};

export const typeConfig: Record<JobType, { label: string; color: string; bg: string }> = {
  "full-time":   { label: "Full Time",   color: "#059669", bg: "#D1FAE5" },
  "part-time":   { label: "Part Time",   color: "#D97706", bg: "#FEF3C7" },
  "contract":    { label: "Contract",    color: "#7C3AED", bg: "#EDE9FE" },
  "apprentice":  { label: "Apprentice",  color: "#EA580C", bg: "#FFEDD5" },
};
