import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AlertType = "alert" | "news";
export type AlertPriority = "normal" | "important" | "urgent";

export interface AlertMedia {
  uri: string;
  type: "image" | "video";
  fileName?: string;
  mimeType?: string;
  duration?: number;
}

export interface AppAlert {
  id: string;
  title: string;
  body: string;
  type: AlertType;
  category?: string;
  priority?: AlertPriority;
  location?: string;
  validUntil?: string;
  expiresAt?: string;
  targetAudience?: string;
  media?: AlertMedia | null;
  createdAt: string;
  postedBy: string;
  postedById?: string;
  ward?: string;
}

export type AlertDraft = Pick<AppAlert, "title" | "body" | "type"> & Partial<Pick<AppAlert, "category" | "priority" | "location" | "validUntil" | "expiresAt" | "targetAudience" | "media">>;

interface AlertContextType {
  alerts: AppAlert[];
  addAlert: (data: AlertDraft, postedBy: string, postedById?: string, ward?: string) => void;
  removeAlert: (id: string) => void;
  loading: boolean;
}

const AlertContext = createContext<AlertContextType | null>(null);

const STORAGE_KEY = "connectt_alerts_v1";
const ALERT_ACTIVE_MS = 12 * 60 * 60 * 1000;

function getExpiryTime(alert: AppAlert) {
  const explicitExpiry = alert.expiresAt ? new Date(alert.expiresAt).getTime() : NaN;
  if (!Number.isNaN(explicitExpiry)) return explicitExpiry;
  return new Date(alert.createdAt).getTime() + ALERT_ACTIVE_MS;
}

function getActiveAlerts(items: AppAlert[]) {
  const now = Date.now();
  return items.filter((item) => getExpiryTime(item) > now);
}

function formatValidUntil(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed: AppAlert[] = JSON.parse(stored);
        const active = getActiveAlerts(parsed);
        setAlerts(active);
        if (active.length !== parsed.length) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(active)).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setAlerts((current) => {
        const active = getActiveAlerts(current);
        if (active.length !== current.length) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(active)).catch(() => {});
        }
        return active;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const save = (updated: AppAlert[]) => {
    setAlerts(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const addAlert = (data: AlertDraft, postedBy: string, postedById?: string, ward?: string) => {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + ALERT_ACTIVE_MS).toISOString();
    const newAlert: AppAlert = {
      ...data,
      priority: data.priority || "normal",
      media: data.media || null,
      id: "ALT" + Date.now().toString().slice(-6),
      createdAt: createdAt.toISOString(),
      expiresAt,
      validUntil: formatValidUntil(expiresAt),
      postedBy,
      postedById,
      ward,
    };
    save([newAlert, ...getActiveAlerts(alerts)]);
  };

  const removeAlert = (id: string) => {
    save(alerts.filter((a) => a.id !== id));
  };

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert, loading }}>
      {children}
    </AlertContext.Provider>
  );
}

export function wardKey(ward?: string | null): string {
  if (!ward) return "";
  const m = ward.match(/\d+/);
  return m ? m[0] : ward.trim().toLowerCase();
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used inside AlertProvider");
  return ctx;
}
