import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiGet, apiPost, storeAuthToken, clearAuthToken, clearJobsAuthToken, getStoredAuthToken, isApiError } from "@/lib/api";
import { toUploadableMediaUri } from "@/lib/mediaUpload";

export type UserRole = "citizen" | "nagarsevak" | "super_admin";

export interface User {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  ward?: string;
  wardCode?: string | null;
  wardNumber?: string;
  officialDesignation?: string;
  isSuperAdmin?: boolean;
  approvalStatus?: string;
  age?: number;
  dob?: string;
  email?: string;
  address?: string;
  contactNumber?: string;
  contactName?: string;
  officeTimings?: string;
  residenceAddress?: string;
  nagarsevakId?: string;
  avatarColor?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
  profilePhoto?: string;
  wardChanged?: boolean;
  officeAddress?: string;
}

export type UserUpdates = Omit<Partial<User>, "profilePhoto"> & {
  profilePhoto?: string | null;
};

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  logoutTarget: string | null;
  clearLogoutTarget: () => void;
  login: (user: User) => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
  checkPhone: (mobile: string) => Promise<User | null>;
  register: (userData: Omit<User, "id" | "avatarColor" | "createdAt">) => Promise<User>;
  loginWithPhone: (mobile: string) => Promise<User | null>;
  loginWithNagarsevakId: (mobile: string, nagarsevakId: string) => Promise<User | null>;
  unifiedLogin: (mobile: string) => Promise<User>;
  updateUser: (updates: UserUpdates) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = "janseva_user";
const JOBS_SESSION_KEY = "connectt_jobs_session_v2";
const AVATAR_COLORS = ["#1E40AF", "#059669", "#7C3AED", "#D97706", "#DC2626", "#0EA5E9"];

function normalizeMobile(mobile: string): string {
  return String(mobile || "").trim().replace(/\D/g, "").slice(-10);
}

function normalizeRole(value: any): UserRole {
  if (value === "nagarsevak" || value === "super_admin") return value;
  return "citizen";
}

function normalizedProfilePhoto(raw: any): string | undefined {
  return raw?.profilePhoto || raw?.profile_photo || undefined;
}

function normalizeUser(raw: any): User {
  const role = normalizeRole(raw.role);
  const mobile = normalizeMobile(raw.mobile || raw.phone || raw.contactNumber);
  const isSuperAdmin =
    raw.isSuperAdmin === true ||
    raw.is_super_admin === 1 ||
    raw.is_super_admin === true ||
    role === "super_admin";

  return {
    id: String(raw.id || raw.userId || raw.nagarsevak_id || raw.nagarsevakId || `${role}_${mobile || Date.now()}`),
    name: String(raw.name || raw.fullName || raw.contactName || (role === "super_admin" ? "Super Admin" : "User")),
    mobile,
    role,
    ward: raw.ward || undefined,
    wardCode: raw.wardCode ?? raw.ward_code ?? null,
    wardNumber: raw.wardNumber || raw.ward_number || undefined,
    officialDesignation: raw.officialDesignation || raw.official_designation || undefined,
    wardChanged: raw.wardChanged ?? raw.ward_changed ?? false,
    isSuperAdmin,
    approvalStatus: raw.approvalStatus || raw.approval_status || undefined,
    age: raw.age === undefined || raw.age === null ? undefined : Number(raw.age),
    dob: raw.dob || undefined,
    email: raw.email || undefined,
    address: raw.address || undefined,
    contactNumber: raw.contactNumber || raw.contact_number || undefined,
    contactName: raw.contactName || raw.contact_name || undefined,
    officeTimings: raw.officeTimings || raw.office_timings || undefined,
    residenceAddress: raw.residenceAddress || raw.residence_address || undefined,
    nagarsevakId: role === "nagarsevak" ? (raw.nagarsevakId || raw.nagarsevak_id || undefined) : undefined,
    avatarColor: raw.avatarColor || raw.avatar_color || AVATAR_COLORS[0],
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || undefined,
    lastLoginAt: raw.lastLoginAt || raw.last_login_at || undefined,
    notifyEmail: raw.notifyEmail ?? raw.notify_email ?? false,
    notifyWhatsapp: raw.notifyWhatsapp ?? raw.notify_whatsapp ?? false,
    profilePhoto: normalizedProfilePhoto(raw),
    officeAddress: raw.officeAddress || raw.office_address || undefined,
  };
}

async function fetchUserByMobile(mobile: string, role?: UserRole): Promise<User | null> {
  try {
    const res = await apiPost<any>("/api/auth/user-by-mobile", {
      mobile: normalizeMobile(mobile),
      role: role || undefined,
    });
    if (res.token) await storeAuthToken(res.token);
    return res.user ? normalizeUser(res.user) : null;
  } catch (error: any) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

async function upsertBackendUser(
  userData: User,
  profilePhotoOverride?: string | null,
  profilePhotoSpecified = false,
): Promise<User> {
  const user = normalizeUser(userData);
  if (!user.name || !user.mobile) throw new Error("User name and mobile are required.");

  const profilePhoto = profilePhotoSpecified
    ? await toUploadableMediaUri(profilePhotoOverride)
    : await toUploadableMediaUri(user.profilePhoto);
  const response = await apiPost<any>("/api/users", {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    ward: user.ward || null,
    ward_code: user.wardCode || null,
    ward_number: user.wardNumber || null,
    ward_changed: user.wardChanged ? 1 : 0,
    is_super_admin: user.isSuperAdmin ? 1 : 0,
    age: user.age || null,
    dob: user.dob || null,
    email: user.email || null,
    address: user.address || null,
    nagarsevak_id: user.role === "nagarsevak" ? user.nagarsevakId || user.id : null,
    avatar_color: user.avatarColor || null,
    profile_photo: profilePhoto,
    notify_email: user.notifyEmail ? 1 : 0,
    notify_whatsapp: user.notifyWhatsapp ? 1 : 0,
    approval_status: user.role === "nagarsevak" ? undefined : "approved",
    office_address: user.officeAddress || null,
    residence_address: user.residenceAddress || null,
    office_timings: user.officeTimings || null,
    contact_name: user.contactName || null,
    contact_number: user.contactNumber || null,
  });

  if (response?.token) await storeAuthToken(response.token);
  const responseHasPhoto = Object.prototype.hasOwnProperty.call(response || {}, "profilePhoto");

  return normalizeUser({
    ...user,
    profilePhoto: responseHasPhoto ? response.profilePhoto : profilePhoto || undefined,
    wardChanged: response?.wardChanged ?? user.wardChanged ?? false,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutTarget, setLogoutTarget] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(SESSION_KEY), getStoredAuthToken()])
      .then(async ([stored, token]) => {
        if (!stored || !token) {
          if (stored) await AsyncStorage.removeItem(SESSION_KEY);
          return;
        }
        try {
          const session = await apiGet<any>("/api/auth/session");
          if (!session?.user) throw new Error("SESSION_INVALID");
          const verifiedUser = normalizeUser(session.user);
          setUser(verifiedUser);
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(verifiedUser));
        } catch {
          await AsyncStorage.removeItem(SESSION_KEY);
          await clearAuthToken();
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const persistSession = async (nextUser: User | null) => {
    if (nextUser) {
      const normalized = normalizeUser(nextUser);
      setUser(normalized);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    } else {
      setUser(null);
      await AsyncStorage.removeItem(SESSION_KEY);
      await clearAuthToken();
    }
  };

  const clearLogoutTarget = () => setLogoutTarget(null);

  const login = async (userData: User) => {
    const normalized = normalizeUser(userData);
    setLogoutTarget(null);
    const saved = await upsertBackendUser(normalized);
    await persistSession(saved);
  };

  const logout = async (_redirectTo?: string) => {
    setLogoutTarget("/login");
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem(SESSION_KEY),
      AsyncStorage.removeItem(JOBS_SESSION_KEY),
      clearAuthToken(),
      clearJobsAuthToken(),
    ]);
  };

  const checkPhone = async (mobile: string): Promise<User | null> => fetchUserByMobile(mobile);

  const register = async (userData: Omit<User, "id" | "avatarColor" | "createdAt">): Promise<User> => {
    const normalizedMobile = normalizeMobile(userData.mobile);
    const role = userData.role || "citizen";
    const existing = await fetchUserByMobile(normalizedMobile, role);
    const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
    const newUser: User = normalizeUser({
      ...userData,
      mobile: normalizedMobile,
      role,
      wardCode: userData.wardCode ?? null,
      isSuperAdmin: userData.isSuperAdmin || false,
      id: existing?.id || "U" + Date.now(),
      avatarColor: existing?.avatarColor || AVATAR_COLORS[colorIndex],
      createdAt: existing?.createdAt || new Date().toISOString(),
    });
    const saved = await upsertBackendUser(newUser);
    await persistSession(saved);
    return saved;
  };

  const loginWithPhone = async (mobile: string): Promise<User | null> => {
    const existingUser = await fetchUserByMobile(mobile, "citizen");
    if (existingUser) {
      await persistSession(existingUser);
      return existingUser;
    }
    return null;
  };

  const loginWithNagarsevakId = async (mobile: string, nagarsevakId: string): Promise<User | null> => {
    const existingUser = await fetchUserByMobile(mobile, "nagarsevak");
    if (existingUser && (!nagarsevakId || existingUser.nagarsevakId === nagarsevakId || existingUser.id === nagarsevakId)) {
      await persistSession(existingUser);
      return existingUser;
    }
    return null;
  };

  const unifiedLogin = async (mobile: string): Promise<User> => {
    const response = await apiPost<any>("/api/auth/unified-login", { mobile: normalizeMobile(mobile) });
    if (!response?.user || !response?.token) throw new Error("Login could not be completed. Please try again.");
    await storeAuthToken(response.token);
    const nextUser = normalizeUser(response.user);
    await persistSession(nextUser);
    return nextUser;
  };

  const updateUser = async (updates: UserUpdates) => {
    if (!user) return;
    const profilePhotoSpecified = Object.prototype.hasOwnProperty.call(updates, "profilePhoto");
    const updated: User = normalizeUser({
      ...user,
      ...updates,
      profilePhoto: profilePhotoSpecified ? updates.profilePhoto || undefined : user.profilePhoto,
      id: user.id,
      mobile: user.mobile,
      role: updates.role || user.role,
      nagarsevakId: user.role === "nagarsevak" ? (updates.nagarsevakId ?? user.nagarsevakId) : undefined,
      createdAt: user.createdAt,
      wardCode: updates.wardCode ?? user.wardCode ?? null,
      isSuperAdmin: updates.isSuperAdmin ?? user.isSuperAdmin ?? false,
    });
    const saved = await upsertBackendUser(updated, updates.profilePhoto, profilePhotoSpecified);
    await persistSession(saved);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, loading, logoutTarget, clearLogoutTarget, login, logout, checkPhone, register, loginWithPhone, loginWithNagarsevakId, unifiedLogin, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
