import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { findNagarsevakById } from "@/data/nagarsevaks";

export type UserRole = "citizen" | "nagarsevak";

export interface User {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  ward?: string;
  wardNumber?: string;
  age?: number;
  email?: string;
  address?: string;
  nagarsevakId?: string;
  avatarColor?: string;
  createdAt?: string;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
  profilePhoto?: string;
  wardChanged?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  checkPhone: (mobile: string) => Promise<User | null>;
  register: (userData: Omit<User, "id" | "avatarColor" | "createdAt">) => Promise<User>;
  loginWithPhone: (mobile: string) => Promise<User | null>;
  loginWithNagarsevakId: (mobile: string, nagarsevakId: string) => Promise<User | null>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = "janseva_user";
const USERS_KEY = "janseva_users";

const AVATAR_COLORS = ["#1E40AF", "#059669", "#7C3AED", "#D97706", "#DC2626", "#0EA5E9"];


async function getAllUsers(): Promise<User[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveAllUsers(users: User[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((stored) => {
        if (stored) setUser(JSON.parse(stored));
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  };

  const checkPhone = async (mobile: string): Promise<User | null> => {
    const users = await getAllUsers();
    return users.find((u) => u.mobile === mobile.trim()) ?? null;
  };

  const register = async (
    userData: Omit<User, "id" | "avatarColor" | "createdAt">
  ): Promise<User> => {
    const users = await getAllUsers();
    const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
    const newUser: User = {
      ...userData,
      id: "U" + Date.now(),
      avatarColor: AVATAR_COLORS[colorIndex],
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await saveAllUsers(users);
    await login(newUser);
    return newUser;
  };

  const loginWithPhone = async (mobile: string): Promise<User | null> => {
    const found = await checkPhone(mobile);
    if (found) {
      await login(found);
      return found;
    }
    return null;
  };

  const loginWithNagarsevakId = async (mobile: string, nagarsevakId: string): Promise<User | null> => {
    const normalizedId = nagarsevakId.toUpperCase().trim();
    const directoryEntry = findNagarsevakById(normalizedId);
    if (!directoryEntry) return null;

    const enteredMobile = mobile.trim().replace(/\D/g, "");
    if (enteredMobile && enteredMobile !== directoryEntry.mobile) return null;

    const users = await getAllUsers();
    const found = users.find((u) => u.role === "nagarsevak" && u.nagarsevakId === normalizedId);
    if (found) {
      const refreshed: User = {
        ...found,
        name: directoryEntry.name,
        mobile: directoryEntry.mobile,
        ward: directoryEntry.ward,
      };
      const idx = users.findIndex((u) => u.id === found.id);
      if (idx >= 0) {
        users[idx] = refreshed;
        await saveAllUsers(users);
      }
      await login(refreshed);
      return refreshed;
    }

    const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
    const newUser: User = {
      id: "U" + Date.now(),
      name: directoryEntry.name,
      mobile: directoryEntry.mobile,
      role: "nagarsevak",
      ward: directoryEntry.ward,
      nagarsevakId: normalizedId,
      avatarColor: AVATAR_COLORS[colorIndex],
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await saveAllUsers(users);
    await login(newUser);
    return newUser;
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates, id: user.id, role: user.role, nagarsevakId: user.nagarsevakId, createdAt: user.createdAt };
    setUser(updated);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    const users = await getAllUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = updated;
      await saveAllUsers(users);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, loading, login, logout, checkPhone, register, loginWithPhone, loginWithNagarsevakId, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
