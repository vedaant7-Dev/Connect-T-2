import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiPatch, apiPost, clearJobsAuthToken, storeJobsAuthToken } from "@/lib/api";
import { toUploadableMediaUri } from "@/lib/mediaUpload";
import { useAuth } from "@/context/AuthContext";

export type JobsUserRole = "seeker" | "employer";
export type CurrentStatus = "employed" | "unemployed" | "student" | "fresher";

export interface CompanyProfile {
  id: string;
  name: string;
  type?: string;
  size?: string;
  industry?: string;
  website?: string;
  description?: string;
  address?: string;
  pincode?: string;
  whatsapp?: string;
  yearEstablished?: string;
  contactPerson?: string;
  gstNo?: string;
}

export interface JobsUser {
  id: string;
  name: string;
  phone: string;
  role: JobsUserRole;
  avatarColor: string;
  createdAt: string;

  dob?: string;
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
  profilePhoto?: string | null;

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
  companies?: CompanyProfile[];
}

export interface ProfileField {
  key: keyof JobsUser;
  label: string;
  weight: number;
}

export const SEEKER_PROFILE_FIELDS: ProfileField[] = [
  { key: "name", label: "Full Name", weight: 1 },
  { key: "dob", label: "Date of Birth", weight: 1 },
  { key: "phone", label: "Mobile Number", weight: 1 },
  { key: "qualification", label: "Qualification", weight: 1 },
  { key: "email", label: "Email Address", weight: 1 },
  { key: "skills", label: "Skills", weight: 1 },
  { key: "profilePhoto", label: "Profile Photo", weight: 1 },
  { key: "about", label: "About / Objective", weight: 1 },
  { key: "currentStatus", label: "Current Status", weight: 1 },
  { key: "experience", label: "Work Experience", weight: 1 },
  { key: "location", label: "Location", weight: 1 },
  { key: "languages", label: "Languages Known", weight: 1 },
];

export function getSeekerFields(user: JobsUser): ProfileField[] {
  const base = SEEKER_PROFILE_FIELDS.slice();
  if (user.currentStatus === "employed") {
    base.push(
      { key: "currentCompany", label: "Current Company", weight: 1 },
      { key: "currentRole", label: "Current Role", weight: 1 },
    );
  } else if (user.currentStatus === "student") {
    base.push(
      { key: "collegeName", label: "College Name", weight: 1 },
      { key: "fieldOfStudy", label: "Field of Study", weight: 1 },
    );
  }
  return user.currentStatus === "fresher" ? base.filter((field) => field.key !== "experience") : base;
}

export function calcProfileCompletion(user: JobsUser): number {
  if (user.role !== "seeker") return 100;
  const fields = getSeekerFields(user);
  const filled = fields.filter((field) => {
    const value = user[field.key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
  return Math.round((filled.length / fields.length) * 100);
}

interface JobsAuthContextType {
  jobsUser: JobsUser | null;
  loading: boolean;
  activateJobs: (role: JobsUserRole, data?: Partial<JobsUser>) => Promise<void>;
  logoutJobs: () => Promise<void>;
  updateJobsUser: (data: Partial<JobsUser>) => Promise<void>;
  addCompany: (company: Omit<CompanyProfile, "id">) => Promise<string | undefined>;
  updateCompany: (companyId: string, company: Partial<CompanyProfile>) => Promise<void>;
}

const JobsContext = createContext<JobsAuthContextType | null>(null);
const SESSION_KEY = "connectt_jobs_session_v2";
const COLORS = ["#C2410C", "#EA580C", "#F97316", "#FB923C", "#B45309", "#92400E", "#0F172A"];

export function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function cleanPhone(value?: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeDob(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  return raw;
}

function normalizeUser(raw: any): JobsUser {
  const companyName = raw.company || raw.companyName || "";
  const companyType = raw.companyType || raw.company_type;
  const companySize = raw.companySize || raw.company_size;
  const yearEstablished = raw.yearEstablished || raw.year_established;
  const contactPerson = raw.contactPerson || raw.contact_person;
  const gstNo = raw.gstNo || raw.gst_no;
  const companyDescription = raw.companyDescription || raw.company_description;
  const profilePhoto = raw.profilePhoto === null || raw.profile_photo === null
    ? null
    : raw.profilePhoto || raw.profile_photo || undefined;

  const company: CompanyProfile | null = companyName
    ? {
        id: "primary",
        name: companyName,
        type: companyType,
        size: companySize,
        industry: raw.industry,
        website: raw.website,
        description: companyDescription,
        address: raw.address,
        pincode: raw.pincode,
        whatsapp: raw.whatsapp,
        yearEstablished,
        contactPerson,
        gstNo,
      }
    : null;

  return {
    id: String(raw.id || raw.userId || raw.phone || Date.now()),
    name: raw.name || raw.fullName || raw.contactPerson || "Job User",
    phone: cleanPhone(raw.phone || raw.mobile || raw.contactPhone),
    role: (raw.role === "employer" ? "employer" : "seeker") as JobsUserRole,
    avatarColor: raw.avatarColor || raw.avatar_color || randomColor(),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    dob: normalizeDob(raw.dob),
    age: raw.age ? String(raw.age) : undefined,
    qualification: raw.qualification,
    skills: raw.skills,
    email: raw.email,
    about: raw.about,
    currentStatus: raw.currentStatus || raw.current_status,
    currentCompany: raw.currentCompany || raw.current_company,
    currentRole: raw.currentRole || raw.current_role,
    experience: raw.experience,
    previousCompany: raw.previousCompany || raw.previous_company,
    previousRole: raw.previousRole || raw.previous_role,
    collegeName: raw.collegeName || raw.college_name,
    fieldOfStudy: raw.fieldOfStudy || raw.field_of_study,
    location: raw.location,
    languages: raw.languages,
    profilePhoto,
    company: companyName || undefined,
    gstNo,
    companyType,
    companySize,
    industry: raw.industry,
    website: raw.website,
    companyDescription,
    address: raw.address,
    pincode: raw.pincode,
    whatsapp: raw.whatsapp,
    yearEstablished,
    contactPerson,
    companies: company ? [company] : [],
  };
}

export function JobsAuthProvider({ children }: { children: ReactNode }) {
  const { user: civicUser, loading: civicLoading } = useAuth();
  const [jobsUser, setJobsUser] = useState<JobsUser | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = async (user: JobsUser | null) => {
    if (user) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(SESSION_KEY);
    setJobsUser(user);
  };

  const openUnifiedSession = async (role?: JobsUserRole, data: Partial<JobsUser> = {}) => {
    const payload = { ...data, role } as Record<string, unknown>;
    delete payload.phone;
    delete payload.id;
    delete payload.createdAt;
    delete payload.companies;
    const response = await apiPost<any>("/api/job-portal/session", payload);
    await storeJobsAuthToken(response.token);
    const nextUser = normalizeUser(response.user || response.data || response);
    await persist(nextUser);
    return nextUser;
  };

  useEffect(() => {
    if (civicLoading) return;
    if (!civicUser || civicUser.role !== "citizen") {
      void clearJobsAuthToken();
      void persist(null).finally(() => setLoading(false));
      return;
    }

    let active = true;
    AsyncStorage.getItem(SESSION_KEY)
      .then(async (saved) => {
        let role: JobsUserRole | undefined;
        if (saved) {
          try {
            role = normalizeUser(JSON.parse(saved)).role;
          } catch {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        }
        try {
          const next = await openUnifiedSession(role);
          if (active) setJobsUser(next);
        } catch {
          if (!active) return;
          await clearJobsAuthToken();
          await persist(null);
        }
      })
      .catch(async () => {
        if (!active) return;
        await clearJobsAuthToken();
        await persist(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [civicUser?.id, civicLoading]);

  const activateJobs = async (role: JobsUserRole, data: Partial<JobsUser> = {}) => {
    await openUnifiedSession(role, data);
  };

  const logoutJobs = async () => {
    await clearJobsAuthToken();
    await persist(null);
  };

  const updateJobsUser = async (data: Partial<JobsUser>) => {
    if (!jobsUser) return;
    const payload: Record<string, unknown> = { ...data };
    delete payload.id;
    delete payload.phone;
    delete payload.role;
    delete payload.createdAt;
    delete payload.companies;
    delete payload.age;

    if (Object.prototype.hasOwnProperty.call(data, "name") && String(data.name || "").trim().split(/\s+/).filter(Boolean).length < 2) {
      throw new Error("Enter your full name, including surname.");
    }
    if (Object.prototype.hasOwnProperty.call(data, "profilePhoto")) {
      payload.profilePhoto = await toUploadableMediaUri(data.profilePhoto);
    }

    const response = await apiPatch<any>(`/api/job-portal/users/${jobsUser.id}`, payload);
    if (!response?.user) throw new Error("The updated profile could not be loaded. Please try again.");
    await persist(normalizeUser(response.user));
  };

  const addCompany = async (company: Omit<CompanyProfile, "id">) => {
    if (!jobsUser) return undefined;
    const id = `company_${Date.now()}`;
    await updateJobsUser({
      company: company.name,
      companyType: company.type,
      companySize: company.size,
      industry: company.industry,
      website: company.website,
      companyDescription: company.description,
      address: company.address,
      pincode: company.pincode,
      whatsapp: company.whatsapp,
      yearEstablished: company.yearEstablished,
      contactPerson: company.contactPerson,
      gstNo: company.gstNo,
    });
    return id;
  };

  const updateCompany = async (_companyId: string, company: Partial<CompanyProfile>) => {
    if (!jobsUser) return;
    await updateJobsUser({
      company: company.name,
      companyType: company.type,
      companySize: company.size,
      industry: company.industry,
      website: company.website,
      companyDescription: company.description,
      address: company.address,
      pincode: company.pincode,
      whatsapp: company.whatsapp,
      yearEstablished: company.yearEstablished,
      contactPerson: company.contactPerson,
      gstNo: company.gstNo,
    });
  };

  return (
    <JobsContext.Provider value={{ jobsUser, loading, activateJobs, logoutJobs, updateJobsUser, addCompany, updateCompany }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobsAuth() {
  const context = useContext(JobsContext);
  if (!context) throw new Error("useJobsAuth must be used inside JobsAuthProvider");
  return context;
}
