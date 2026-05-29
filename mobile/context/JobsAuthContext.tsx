import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiGet, apiPatch, apiPost } from "@/lib/api";

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
  profilePhoto?: string;

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
  { key: "name",           label: "Full Name",            weight: 1 },
  { key: "dob",            label: "Date of Birth",        weight: 1 },
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
      { key: "collegeName",  label: "College Name",   weight: 1 },
      { key: "fieldOfStudy", label: "Field of Study", weight: 1 },
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

export interface GoogleJobsUserInfo {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

interface JobsAuthContextType {
  jobsUser: JobsUser | null;
  loading: boolean;
  registerJobs: (data: Omit<JobsUser, "id" | "createdAt">) => Promise<void>;
  loginJobs: (phone: string, role: JobsUserRole) => Promise<boolean>;
  loginWithGoogleJobs: (googleUser: GoogleJobsUserInfo, role: JobsUserRole) => Promise<void>;
  logoutJobs: () => Promise<void>;
  updateJobsUser: (data: Partial<JobsUser>) => Promise<void>;
  addCompany: (company: Omit<CompanyProfile, "id">) => Promise<string | undefined>;
  updateCompany: (companyId: string, company: Partial<CompanyProfile>) => Promise<void>;
}

const JobsAuthContext = createContext<JobsAuthContextType | null>(null);

const SESSION_KEY = "connectt_jobs_session_v2";
const COLORS = ["#C2410C", "#EA580C", "#D97706", "#92400E", "#7C3AED", "#059669", "#0369A1"];

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
  if (slash) {
    const dd = slash[1].padStart(2, "0");
    const mm = slash[2].padStart(2, "0");
    const yyyy = slash[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return raw;
}

function normalizeUser(raw: any): JobsUser {
  const companyName = raw.company || raw.companyName || "";
  const company: CompanyProfile | null = companyName
    ? {
        id: "primary",
        name: companyName,
        type: raw.companyType,
        size: raw.companySize,
        industry: raw.industry,
        website: raw.website,
        description: raw.companyDescription,
        address: raw.address,
        pincode: raw.pincode,
        whatsapp: raw.whatsapp,
        yearEstablished: raw.yearEstablished,
        contactPerson: raw.contactPerson,
        gstNo: raw.gstNo,
      }
    : null;

  return {
    id: String(raw.id),
    role: raw.role,
    name: raw.name || "",
    phone: cleanPhone(raw.phone),
    avatarColor: raw.avatarColor || raw.avatar_color || randomColor(),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),

    dob: raw.dob || undefined,
    age: raw.age || undefined,
    qualification: raw.qualification || undefined,
    skills: raw.skills || undefined,
    email: raw.email || undefined,
    about: raw.about || undefined,
    currentStatus: raw.currentStatus || raw.current_status || undefined,
    currentCompany: raw.currentCompany || raw.current_company || undefined,
    currentRole: raw.currentRole || raw.current_role || undefined,
    experience: raw.experience || undefined,
    previousCompany: raw.previousCompany || raw.previous_company || undefined,
    previousRole: raw.previousRole || raw.previous_role || undefined,
    collegeName: raw.collegeName || raw.college_name || undefined,
    fieldOfStudy: raw.fieldOfStudy || raw.field_of_study || undefined,
    location: raw.location || undefined,
    languages: raw.languages || undefined,
    profilePhoto: raw.profilePhoto || raw.profile_photo || undefined,

    company: raw.company || undefined,
    gstNo: raw.gstNo || raw.gst_no || undefined,
    companyType: raw.companyType || raw.company_type || undefined,
    companySize: raw.companySize || raw.company_size || undefined,
    industry: raw.industry || undefined,
    website: raw.website || undefined,
    companyDescription: raw.companyDescription || raw.company_description || undefined,
    address: raw.address || undefined,
    pincode: raw.pincode || undefined,
    whatsapp: cleanPhone(raw.whatsapp || raw.phone),
    yearEstablished: raw.yearEstablished || raw.year_established || undefined,
    contactPerson: raw.contactPerson || raw.contact_person || undefined,
    companies: raw.companies || (company ? [company] : []),
  };
}

async function saveSession(user: JobsUser | null) {
  if (!user) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ id: user.id, role: user.role, phone: user.phone }),
  );
}

export function JobsAuthProvider({ children }: { children: ReactNode }) {
  const [jobsUser, setJobsUser] = useState<JobsUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        const session = raw ? JSON.parse(raw) : null;

        if (session?.id) {
          const res = await apiGet<{ success: boolean; user: any }>(`/api/job-portal/users/${session.id}`);
          if (mounted && res?.user) {
            setJobsUser(normalizeUser(res.user));
          }
        }
      } catch {
        await AsyncStorage.removeItem(SESSION_KEY);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  const registerJobs = async (data: Omit<JobsUser, "id" | "createdAt">) => {
    const phone = cleanPhone(data.phone);

    const payload = {
      ...data,
      phone,
      dob: normalizeDob(data.dob),
      avatarColor: data.avatarColor || randomColor(),
      whatsapp: cleanPhone(data.whatsapp || data.phone),
      contactPerson: data.contactPerson || data.name,
      address: data.address || data.location || data.company,
      companyDescription: data.companyDescription || data.about,
    };

    const res = await apiPost<{ success: boolean; user: any }>("/api/job-portal/register", payload);
    const user = normalizeUser(res.user);

    setJobsUser(user);
    await saveSession(user);
  };

  const loginJobs = async (phoneInput: string, role: JobsUserRole): Promise<boolean> => {
    const phone = cleanPhone(phoneInput);

    const res = await apiPost<{ success: boolean; user: any }>("/api/job-portal/login", {
      phone,
      role,
    });

    if (!res?.user) return false;

    const user = normalizeUser(res.user);
    setJobsUser(user);
    await saveSession(user);

    return true;
  };

  const loginWithGoogleJobs = async (_googleUser: GoogleJobsUserInfo, _role: JobsUserRole): Promise<void> => {
    throw new Error("Please register/login with mobile number first. Google Job login will be enabled after Client ID setup.");
  };

  const logoutJobs = async () => {
    setJobsUser(null);
    await saveSession(null);
  };

  const updateJobsUser = async (data: Partial<JobsUser>) => {
    if (!jobsUser) return;

    const payload = {
      ...data,
      phone: undefined,
      role: undefined,
      id: undefined,
      createdAt: undefined,
      dob: data.dob ? normalizeDob(data.dob) : data.dob,
    };

    const res = await apiPatch<{ success: boolean; user: any }>(
      `/api/job-portal/users/${jobsUser.id}`,
      payload,
    );

    const next = normalizeUser(res.user || { ...jobsUser, ...data });
    setJobsUser(next);
    await saveSession(next);
  };

  const addCompany = async (company: Omit<CompanyProfile, "id">) => {
    if (!jobsUser) return undefined;

    const companyId = "primary";

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
      companies: [{ ...company, id: companyId }],
    });

    return companyId;
  };

  const updateCompany = async (_companyId: string, company: Partial<CompanyProfile>) => {
    if (!jobsUser) return;

    await updateJobsUser({
      company: company.name || jobsUser.company,
      companyType: company.type || jobsUser.companyType,
      companySize: company.size || jobsUser.companySize,
      industry: company.industry || jobsUser.industry,
      website: company.website || jobsUser.website,
      companyDescription: company.description || jobsUser.companyDescription,
      address: company.address || jobsUser.address,
      pincode: company.pincode || jobsUser.pincode,
      whatsapp: company.whatsapp || jobsUser.whatsapp,
      yearEstablished: company.yearEstablished || jobsUser.yearEstablished,
      contactPerson: company.contactPerson || jobsUser.contactPerson,
      gstNo: company.gstNo || jobsUser.gstNo,
      companies: [{
        id: "primary",
        name: company.name || jobsUser.company || "Company",
        type: company.type || jobsUser.companyType,
        size: company.size || jobsUser.companySize,
        industry: company.industry || jobsUser.industry,
        website: company.website || jobsUser.website,
        description: company.description || jobsUser.companyDescription,
        address: company.address || jobsUser.address,
        pincode: company.pincode || jobsUser.pincode,
        whatsapp: company.whatsapp || jobsUser.whatsapp,
        yearEstablished: company.yearEstablished || jobsUser.yearEstablished,
        contactPerson: company.contactPerson || jobsUser.contactPerson,
        gstNo: company.gstNo || jobsUser.gstNo,
      }],
    });
  };

  return (
    <JobsAuthContext.Provider
      value={{
        jobsUser,
        loading,
        registerJobs,
        loginJobs,
        loginWithGoogleJobs,
        logoutJobs,
        updateJobsUser,
        addCompany,
        updateCompany,
      }}
    >
      {children}
    </JobsAuthContext.Provider>
  );
}

export function useJobsAuth() {
  const ctx = useContext(JobsAuthContext);
  if (!ctx) throw new Error("useJobsAuth must be inside JobsAuthProvider");
  return ctx;
}
