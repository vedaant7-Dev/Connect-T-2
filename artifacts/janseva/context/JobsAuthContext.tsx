import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type JobsUserRole = "seeker" | "employer";
export type CurrentStatus = "employed" | "unemployed" | "student" | "fresher";

export interface JobsUser {
  id: string;
  name: string;
  phone: string;
  role: JobsUserRole;
  avatarColor: string;
  createdAt: string;
  // Seeker profile
  age?: string;
  qualification?: string;
  skills?: string;
  email?: string;
  about?: string;
  currentStatus?: CurrentStatus;
  currentCompany?: string;
  currentRole?: string;
  experience?: string;
  previousCompany?: string;
  previousRole?: string;
  collegeName?: string;
  fieldOfStudy?: string;
  location?: string;
  languages?: string;
  profilePhoto?: string;
  // Employer profile
  company?: string;
  gstNo?: string;
  companyType?: string;
  companySize?: string;
  industry?: string;
  website?: string;
  companyDescription?: string;
  address?: string;
  pincode?: string;
  whatsapp?: string;
  yearEstablished?: string;
  contactPerson?: string;
}

export interface ProfileField {
  key: keyof JobsUser;
  label: string;
  weight: number;
}

export const SEEKER_PROFILE_FIELDS: ProfileField[] = [
  { key: "name",           label: "Full Name",            weight: 1 },
  { key: "age",            label: "Age",                  weight: 1 },
  { key: "phone",          label: "Mobile Number",        weight: 1 },
  { key: "qualification",  label: "Qualification",        weight: 1 },
  { key: "email",          label: "Email Address",        weight: 1 },
  { key: "skills",         label: "Skills",               weight: 1 },
  { key: "profilePhoto",   label: "Profile Photo",        weight: 1 },
  { key: "about",          label: "About / Objective",    weight: 1 },
  { key: "currentStatus",  label: "Current Status",       weight: 1 },
  { key: "experience",     label: "Work Experience",      weight: 1 },
  { key: "location",       label: "Location",             weight: 1 },
  { key: "languages",      label: "Languages Known",      weight: 1 },
];

export function getSeekerFields(user: JobsUser): ProfileField[] {
  const base = SEEKER_PROFILE_FIELDS.slice();
  if (user.currentStatus === "employed") {
    base.push(
      { key: "currentCompany", label: "Current Company", weight: 1 },
      { key: "currentRole",    label: "Current Role",    weight: 1 },
    );
  } else if (user.currentStatus === "student") {
    base.push(
      { key: "collegeName",  label: "College Name",    weight: 1 },
      { key: "fieldOfStudy", label: "Field of Study",  weight: 1 },
    );
  }
  if (user.currentStatus === "fresher") {
    return base.filter((f) => f.key !== "experience");
  }
  return base;
}

export function calcProfileCompletion(user: JobsUser): number {
  if (user.role !== "seeker") return 100;
  const fields = getSeekerFields(user);
  const filled = fields.filter((f) => {
    const val = user[f.key];
    return val !== undefined && val !== null && String(val).trim() !== "";
  });
  return Math.round((filled.length / fields.length) * 100);
}

interface JobsAuthContextType {
  jobsUser: JobsUser | null;
  loading: boolean;
  registerJobs: (data: Omit<JobsUser, "id" | "createdAt">) => Promise<void>;
  loginJobs: (phone: string, role: JobsUserRole) => Promise<boolean>;
  logoutJobs: () => Promise<void>;
  updateJobsUser: (data: Partial<JobsUser>) => Promise<void>;
}

const JobsAuthContext = createContext<JobsAuthContextType | null>(null);
const STORAGE_KEY = "connectt_jobs_user";
const COLORS = ["#C2410C", "#EA580C", "#D97706", "#92400E", "#7C3AED", "#059669", "#0369A1"];

export function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function generateId() {
  return "JU" + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
}

export function JobsAuthProvider({ children }: { children: ReactNode }) {
  const [jobsUser, setJobsUser] = useState<JobsUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) { try { setJobsUser(JSON.parse(raw)); } catch {} }
      setLoading(false);
    });
  }, []);

  const save = async (user: JobsUser | null) => {
    setJobsUser(user);
    if (user) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const registerJobs = async (data: Omit<JobsUser, "id" | "createdAt">) => {
    await save({ ...data, id: generateId(), createdAt: new Date().toISOString() });
  };

  const loginJobs = async (phone: string, role: JobsUserRole): Promise<boolean> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const existing = JSON.parse(raw) as JobsUser;
        if (existing.phone === phone && existing.role === role) { setJobsUser(existing); return true; }
      } catch {}
    }
    return false;
  };

  const logoutJobs = async () => save(null);

  const updateJobsUser = async (data: Partial<JobsUser>) => {
    if (!jobsUser) return;
    await save({ ...jobsUser, ...data });
  };

  return (
    <JobsAuthContext.Provider value={{ jobsUser, loading, registerJobs, loginJobs, logoutJobs, updateJobsUser }}>
      {children}
    </JobsAuthContext.Provider>
  );
}

export function useJobsAuth() {
  const ctx = useContext(JobsAuthContext);
  if (!ctx) throw new Error("useJobsAuth must be inside JobsAuthProvider");
  return ctx;
}
