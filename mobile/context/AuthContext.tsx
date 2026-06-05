import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiGet, apiPost } from "@/lib/api";

export type UserRole = "citizen" | "nagarsevak" | "super_admin";

export interface User {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  ward?: string;
  wardCode?: string | null;
  wardNumber?: string;
  isSuperAdmin?: boolean;
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
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
  profilePhoto?: string;
  wardChanged?: boolean;
  officeAddress?: string;
}

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
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = "janseva_user";
const AVATAR_COLORS = ["#1E40AF", "#059669", "#7C3AED", "#D97706", "#DC2626", "#0EA5E9"];

function normalizeMobile(mobile: string): string {
  return String(mobile || "").trim().replace(/\D/g, "").slice(-10);
}

function normalizeRole(value: any): UserRole {
  if (value === "nagarsevak" || value === "super_admin") return value;
  return "citizen";
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
    isSuperAdmin,
    age: raw.age === undefined || raw.age === null ? undefined : Number(raw.age),
    dob: raw.dob || undefined,
    email: raw.email || undefined,
    address: raw.address || undefined,
    contactNumber: raw.contactNumber || raw.contact_number || undefined,
    contactName: raw.contactName || raw.contact_name || undefined,
    officeTimings: raw.officeTimings || raw.office_timings || undefined,
    residenceAddress: raw.residenceAddress || raw.residence_address || undefined,
    nagarsevakId: raw.nagarsevakId || raw.nagarsevak_id || raw.id || undefined,
    avatarColor: raw.avatarColor || raw.avatar_color || AVATAR_COLORS[0],
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    notifyEmail: raw.notifyEmail ?? raw.notify_email ?? false,
    notifyWhatsapp: raw.notifyWhatsapp ?? raw.notify_whatsapp ?? false,
    profilePhoto: raw.profilePhoto || raw.profile_photo || undefined,
    officeAddress: raw.officeAddress || raw.office_address || undefined,
  };
}

async function fetchBackendUsers(): Promise<User[]> {
  const res = await apiGet<any>("/api/users");
  const rawUsers = Array.isArray(res.users) ? res.users : Array.isArray(res.data) ? res.data : [];
  return rawUsers.map(normalizeUser);
}

async function upsertBackendUser(userData: User): Promise<void> {
  const user = normalizeUser(userData);

  if (!user.name || !user.mobile) {
    throw new Error("User name and mobile are required.");
  }

  await apiPost("/api/users", {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    ward: user.ward || null,
    ward_code: user.wardCode || null,
    ward_number: user.wardNumber || null,
    is_super_admin: user.isSuperAdmin ? 1 : 0,
    age: user.age || null,
    dob: user.dob || null,
    email: user.email || null,
    address: user.address || null,
    nagarsevak_id: user.nagarsevakId || user.id,
    avatar_color: user.avatarColor || null,
    profile_photo: user.profilePhoto || null,
    notify_email: user.notifyEmail ? 1 : 0,
    notify_whatsapp: user.notifyWhatsapp ? 1 : 0,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutTarget, setLogoutTarget] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((stored) => {
        if (stored) setUser(normalizeUser(JSON.parse(stored)));
      })
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
    }
  };

  const clearLogoutTarget = () => setLogoutTarget(null);

  const login = async (userData: User) => {
    const normalized = normalizeUser(userData);

    setLogoutTarget(null);
    await upsertBackendUser(normalized);

    setUser(normalized);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  };

  const logout = async (redirectTo?: string) => {
    setLogoutTarget(redirectTo || null);
    await persistSession(null);
  };

  const checkPhone = async (mobile: string): Promise<User | null> => {
    const normalized = normalizeMobile(mobile);
    const users = await fetchBackendUsers();
    return users.find((u) => normalizeMobile(u.mobile) === normalized) ?? null;
  };

  const register = async (
    userData: Omit<User, "id" | "avatarColor" | "createdAt">
  ): Promise<User> => {
    const users = await fetchBackendUsers();
    const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
    const normalizedMobile = normalizeMobile(userData.mobile);
    const role = userData.role || "citizen";
    const existing = users.find((u) => normalizeMobile(u.mobile) === normalizedMobile && u.role === role);

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

    await upsertBackendUser(newUser);
    setUser(newUser);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return newUser;
  };

  const loginWithPhone = async (mobile: string): Promise<User | null> => {
    const normalizedMobile = normalizeMobile(mobile);
    const users = await fetchBackendUsers();
    const existingUser = users.find((u) => normalizeMobile(u.mobile) === normalizedMobile);

    if (existingUser) {
      await persistSession(existingUser);
      return existingUser;
    }

    return null;
  };

  const loginWithNagarsevakId = async (mobile: string, nagarsevakId: string): Promise<User | null> => {
    const normalizedMobile = normalizeMobile(mobile);
    const users = await fetchBackendUsers();
    const existingUser = users.find(
      (u) =>
        normalizeMobile(u.mobile) === normalizedMobile &&
        (u.role === "nagarsevak" || u.role === "super_admin") &&
        (!nagarsevakId || u.nagarsevakId === nagarsevakId || u.id === nagarsevakId),
    );

    if (existingUser) {
      await persistSession(existingUser);
      return existingUser;
    }

    return null;
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updated: User = normalizeUser({
      ...user,
      ...updates,
      id: user.id,
      role: updates.role || user.role,
      nagarsevakId: updates.nagarsevakId ?? user.nagarsevakId,
      createdAt: user.createdAt,
      wardCode: updates.wardCode ?? user.wardCode ?? null,
      isSuperAdmin: updates.isSuperAdmin ?? user.isSuperAdmin ?? false,
    });

    await upsertBackendUser(updated);
    await persistSession(updated);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, loading, logoutTarget, clearLogoutTarget, login, logout, checkPhone, register, loginWithPhone, loginWithNagarsevakId, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
