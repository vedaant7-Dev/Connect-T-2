import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { findNagarsevakById, findNagarsevakByMobile } from "@/data/nagarsevaks";

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
  register: (
    userData: Omit<User, "id" | "avatarColor" | "createdAt">,
  ) => Promise<User>;
  loginWithPhone: (mobile: string) => Promise<User | null>;
  loginWithNagarsevakId: (
    mobile: string,
    nagarsevakId: string,
  ) => Promise<User | null>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "janseva_user";
const USERS_KEY = "janseva_users";

const AVATAR_COLORS = [
  "#1E40AF",
  "#059669",
  "#7C3AED",
  "#D97706",
  "#DC2626",
  "#0EA5E9",
];

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

function normalizeMobile(mobile: string): string {
  return mobile.trim().replace(/\D/g, "");
}

function createOfficerUser(directoryEntry: any): User {
  const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);

  return {
    id: "U" + Date.now(),
    name: directoryEntry.name,
    mobile: normalizeMobile(directoryEntry.mobile),
    role: directoryEntry.role || "nagarsevak",
    ward: directoryEntry.ward,
    wardCode: directoryEntry.wardCode ?? null,
    nagarsevakId: directoryEntry.id,
    isSuperAdmin: directoryEntry.isSuperAdmin || false,
    avatarColor: AVATAR_COLORS[colorIndex],
    createdAt: new Date().toISOString(),
  };
}

function refreshOfficerUser(existingUser: User, directoryEntry: any): User {
  return {
    ...existingUser,
    name: directoryEntry.name,
    mobile: normalizeMobile(directoryEntry.mobile),
    role: directoryEntry.role || "nagarsevak",
    ward: directoryEntry.ward,
    wardCode: directoryEntry.wardCode ?? null,
    nagarsevakId: directoryEntry.id,
    isSuperAdmin: directoryEntry.isSuperAdmin || false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((stored) => {
        if (stored) {
          setUser(JSON.parse(stored));
        }
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
    const normalized = normalizeMobile(mobile);
    const users = await getAllUsers();

    return users.find((u) => normalizeMobile(u.mobile) === normalized) ?? null;
  };

  const register = async (
    userData: Omit<User, "id" | "avatarColor" | "createdAt">,
  ): Promise<User> => {
    const users = await getAllUsers();
    const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);

    const normalizedMobile = normalizeMobile(userData.mobile);

    const existingIndex = users.findIndex(
      (u) => normalizeMobile(u.mobile) === normalizedMobile,
    );

    const newUser: User = {
      ...userData,
      mobile: normalizedMobile,
      role: userData.role || "citizen",
      wardCode: userData.wardCode ?? null,
      isSuperAdmin: userData.isSuperAdmin || false,
      id: existingIndex >= 0 ? users[existingIndex].id : "U" + Date.now(),
      avatarColor:
        existingIndex >= 0
          ? users[existingIndex].avatarColor
          : AVATAR_COLORS[colorIndex],
      createdAt:
        existingIndex >= 0
          ? users[existingIndex].createdAt
          : new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      users[existingIndex] = newUser;
    } else {
      users.push(newUser);
    }

    await saveAllUsers(users);
    await login(newUser);

    return newUser;
  };

  const loginWithPhone = async (mobile: string): Promise<User | null> => {
    const normalizedMobile = normalizeMobile(mobile);
    const users = await getAllUsers();

    const directoryEntry = findNagarsevakByMobile(normalizedMobile);

    if (normalizedMobile === "8554994735") {
      const tejashreeUser: User = {
        id: "SUPER_ADMIN",
        name: "Karanjule Patil Tejashri Vishwajeet",
        mobile: "8554994735",
        role: "super_admin",
        ward: "All Wards",
        wardCode: null,
        nagarsevakId: "SUPER_ADMIN",
        isSuperAdmin: true,
        avatarColor: "#16A34A",
        createdAt: new Date().toISOString(),
      };

      await login(tejashreeUser);
      return tejashreeUser;
    }

    if (directoryEntry) {
      const existingOfficerIndex = users.findIndex(
        (u) =>
          normalizeMobile(u.mobile) === normalizedMobile ||
          u.nagarsevakId === directoryEntry.id,
      );

      const officerUser =
        existingOfficerIndex >= 0
          ? refreshOfficerUser(users[existingOfficerIndex], directoryEntry)
          : createOfficerUser(directoryEntry);

      if (existingOfficerIndex >= 0) {
        users[existingOfficerIndex] = officerUser;
      } else {
        users.push(officerUser);
      }

      await saveAllUsers(users);
      await login(officerUser);

      return officerUser;
    }

    const existingUser = users.find(
      (u) => normalizeMobile(u.mobile) === normalizedMobile,
    );

    if (existingUser) {
      await login(existingUser);
      return existingUser;
    }

    return null;
  };

  const loginWithNagarsevakId = async (
    mobile: string,
    nagarsevakId: string,
  ): Promise<User | null> => {
    const normalizedId = nagarsevakId.toUpperCase().trim();
    const directoryEntry = findNagarsevakById(normalizedId);

    if (!directoryEntry) return null;

    const enteredMobile = normalizeMobile(mobile);

    if (
      enteredMobile &&
      enteredMobile !== normalizeMobile(directoryEntry.mobile)
    ) {
      return null;
    }

    const users = await getAllUsers();

    const existingOfficerIndex = users.findIndex(
      (u) => u.nagarsevakId === normalizedId,
    );

    const officerUser =
      existingOfficerIndex >= 0
        ? refreshOfficerUser(users[existingOfficerIndex], directoryEntry)
        : createOfficerUser(directoryEntry);

    if (existingOfficerIndex >= 0) {
      users[existingOfficerIndex] = officerUser;
    } else {
      users.push(officerUser);
    }

    await saveAllUsers(users);
    await login(officerUser);

    return officerUser;
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updated: User = {
      ...user,
      ...updates,
      id: user.id,
      role: updates.role || user.role,
      nagarsevakId: updates.nagarsevakId ?? user.nagarsevakId,
      createdAt: user.createdAt,
      wardCode: updates.wardCode ?? user.wardCode ?? null,
      isSuperAdmin: updates.isSuperAdmin ?? user.isSuperAdmin ?? false,
    };

    setUser(updated);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));

    const users = await getAllUsers();
    const idx = users.findIndex((u) => u.id === user.id);

    if (idx >= 0) {
      users[idx] = updated;
    } else {
      users.push(updated);
    }

    await saveAllUsers(users);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        loading,
        login,
        logout,
        checkPhone,
        register,
        loginWithPhone,
        loginWithNagarsevakId,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be inside AuthProvider");
  }

  return ctx;
}
