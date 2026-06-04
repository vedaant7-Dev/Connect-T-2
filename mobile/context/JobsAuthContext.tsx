import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiGet, apiPatch, apiPost } from "@/lib/api";


const CONNECT_T_JOBS_ACCOUNTS_KEY = "@connect_t_jobs_accounts_v1";

function normalizeJobsPhone(value: any) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

async function readStoredJobsAccounts(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(CONNECT_T_JOBS_ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveStoredJobsAccount(account: any) {
  const accounts = await readStoredJobsAccounts();
  const phone = normalizeJobsPhone(account?.phone || account?.mobile);
  const role = String(account?.role || "");
  const next = [
    account,
    ...accounts.filter((item) => normalizeJobsPhone(item?.phone || item?.mobile) !== phone || String(item?.role || "") !== role),
  ];
  await AsyncStorage.setItem(CONNECT_T_JOBS_ACCOUNTS_KEY, JSON.stringify(next));
}

async function findStoredJobsAccount(phoneInput: any, roleInput?: any) {
  const phone = normalizeJobsPhone(phoneInput);
  const role = String(roleInput || "");
  const accounts = await readStoredJobsAccounts();
  return accounts.find((item) => {
    const samePhone = normalizeJobsPhone(item?.phone || item?.mobile) === phone;
    const sameRole = !role || String(item?.role || "") === role;
    return samePhone && sameRole;
  }) || null;
}


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
  const companyType = raw.companyType || raw.company_type;
  const companySize = raw.companySize || raw.company_size;
  const yearEstablished = raw.yearEstablished || raw.year_established;
  const contactPerson = raw.contactPerson || raw.contact_person;
  const gstNo = raw.gstNo || raw.gst_no;
  const companyDescription = raw.companyDescription || raw.company_description;

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
    profilePhoto: raw.profilePhoto || raw.profile_photo,

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
  const [jobsUser, setJobsUser] = useState<JobsUser | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = async (user: JobsUser | null) => {
    if (user) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(SESSION_KEY);
    setJobsUser(user);
  await saveStoredJobsAccount(user);
};

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((saved) => {
        if (saved) setJobsUser(normalizeUser(JSON.parse(saved)));
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const registerJobs = async (data: Omit<JobsUser, "id" | "createdAt">) => {
    const payload = {
      ...data,
      phone: cleanPhone(data.phone),
    };

    let user: JobsUser;
    try {
      const res = await apiPost<any>("/api/job-portal/register", payload);
      user = normalizeUser(res.user || res.data || res);
    } catch {
      user = normalizeUser({
        ...payload,
        id: `${payload.role}_${payload.phone}_${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
    }

    await persist(user);
  };

  const loginJobs = async (phone: string, role: JobsUserRole) => {
    const clean = cleanPhone(phone);
    try {
      const res = await apiPost<any>("/api/job-portal/login", { phone: clean, role });
      const raw = res.user || res.data || res;
      if (!raw || !raw.id) return false;
      await persist(normalizeUser(raw));
      return true;
    } catch {
      const saved = await AsyncStorage.getItem(SESSION_KEY);
      if (!saved) return false;
      const user = normalizeUser(JSON.parse(saved));
      if (cleanPhone(user.phone) === clean && user.role === role) {
        await persist(user);
        return true;
      }
      return false;
    }
  };

  const loginWithGoogleJobs = async (googleUser: GoogleJobsUserInfo, role: JobsUserRole) => {
    const user = normalizeUser({
      id: `google_${googleUser.sub}`,
      name: googleUser.name,
      email: googleUser.email,
      phone: "",
      role,
      profilePhoto: googleUser.picture,
      createdAt: new Date().toISOString(),
    });
    await persist(user);
  };

  const logoutJobs = async () => {
    await persist(null);
  };

  const updateJobsUser = async (data: Partial<JobsUser>) => {
    if (!jobsUser) return;
    const next = normalizeUser({ ...jobsUser, ...data });
    try {
      await apiPatch(`/api/job-portal/users/${jobsUser.id}`, next);
    } catch {
      // Local fallback keeps profile edits usable in offline/development builds.
    }
    await persist(next);
  };

  const addCompany = async (company: Omit<CompanyProfile, "id">) => {
    if (!jobsUser) return undefined;
    const id = `company_${Date.now()}`;
    const nextCompanies = [...(jobsUser.companies || []), { ...company, id }];
    await updateJobsUser({ companies: nextCompanies, company: company.name });
    return id;
  };

  const updateCompany = async (companyId: string, company: Partial<CompanyProfile>) => {
    if (!jobsUser) return;
    const nextCompanies = (jobsUser.companies || []).map((item) =>
      item.id === companyId ? { ...item, ...company } : item,
    );
    await updateJobsUser({ companies: nextCompanies });
  };

  return (
    <JobsContext.Provider
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
    </JobsContext.Provider>
  );
}

export function useJobsAuth() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobsAuth must be used inside JobsAuthProvider");
  return ctx;
}
