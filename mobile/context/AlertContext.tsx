import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiUrl } from "@/constants/api";

export type AlertType = "alert" | "news" | "emergency";
export type AlertPriority = "normal" | "important" | "urgent" | "high";

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
  validFrom?: string;
  validUntil?: string;
  expiresAt?: string;
  targetAudience?: string;
  media?: AlertMedia | null;
  createdAt: string;
  postedBy: string;
  postedById?: string;
  ward?: string;
}

export type AlertDraft = Pick<AppAlert, "title" | "body" | "type"> &
  Partial<
    Pick<
      AppAlert,
      | "category"
      | "priority"
      | "location"
      | "validUntil"
      | "expiresAt"
      | "targetAudience"
      | "media"
    >
  >;

interface AlertContextType {
  alerts: AppAlert[];
  addAlert: (
    data: AlertDraft,
    postedBy?: string,
    postedById?: string,
    ward?: string,
  ) => void;
  removeAlert: (id: string) => void;
  refreshAlerts: () => Promise<void>;
  loading: boolean;
}

const AlertContext = createContext<AlertContextType | null>(null);

const STORAGE_KEY = "connectt_alerts_v1";
const ALERT_ACTIVE_MS = 12 * 60 * 60 * 1000;

function normalizeAlertType(value: any): AlertType {
  if (value === "news" || value === "emergency" || value === "alert") return value;
  return "alert";
}

function normalizePriority(value: any): AlertPriority {
  if (
    value === "important" ||
    value === "urgent" ||
    value === "high" ||
    value === "normal"
  ) {
    return value;
  }

  return "normal";
}

function getExpiryTime(alert: AppAlert) {
  const explicitExpiry = alert.expiresAt ? new Date(alert.expiresAt).getTime() : NaN;
  if (!Number.isNaN(explicitExpiry)) return explicitExpiry;

  const validUntilTime = alert.validUntil ? new Date(alert.validUntil).getTime() : NaN;
  if (!Number.isNaN(validUntilTime)) return validUntilTime;

  return new Date(alert.createdAt).getTime() + ALERT_ACTIVE_MS;
}

function getActiveAlerts(items: AppAlert[]) {
  const now = Date.now();
  return items.filter((item) => getExpiryTime(item) > now);
}

function sortAlerts(items: AppAlert[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function formatValidUntil(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeBackendAlert(item: any): AppAlert {
  const createdAt =
    item.createdAt ||
    item.created_at ||
    item.created ||
    new Date().toISOString();

  const expiresAt = item.expiresAt || item.expires_at || "";

  const mediaUri = item.media?.uri || item.media_uri || item.image_uri || item.video_uri || "";
  const mediaType = item.media?.type || item.media_type || (item.video_uri ? "video" : item.image_uri ? "image" : "");

  return {
    id: String(item.id || "ALT" + Date.now()),
    title: item.title || "",
    body: item.body || item.message || "",
    type: normalizeAlertType(item.type),
    category: item.category || undefined,
    priority: normalizePriority(item.priority),
    location: item.location || undefined,
    validFrom: item.validFrom || item.valid_from || undefined,
    validUntil: item.validUntil || item.valid_until || undefined,
    expiresAt: expiresAt || undefined,
    targetAudience: item.targetAudience || item.target_audience || undefined,
    media: mediaUri
      ? {
          uri: mediaUri,
          type: mediaType === "video" ? "video" : "image",
          fileName: item.media?.fileName || item.media_file_name || undefined,
          mimeType: item.media?.mimeType || item.media_mime_type || undefined,
          duration:
            item.media?.duration !== undefined
              ? Number(item.media.duration)
              : item.media_duration !== undefined && item.media_duration !== null
                ? Number(item.media_duration)
                : undefined,
        }
      : null,
    createdAt,
    postedBy: item.postedBy || item.posted_by || "Connect-T",
    postedById: item.postedById || item.posted_by_id || undefined,
    ward: item.ward || undefined,
  };
}

async function readCachedAlerts() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed: AppAlert[] = JSON.parse(stored);
    return getActiveAlerts(parsed);
  } catch {
    return [];
  }
}

async function writeCachedAlerts(items: AppAlert[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(getActiveAlerts(items)));
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const saveLocal = async (items: AppAlert[]) => {
    const active = sortAlerts(getActiveAlerts(items));
    setAlerts(active);
    await writeCachedAlerts(active).catch(() => {});
  };

  const refreshAlerts = async () => {
    try {
      setLoading(true);

      const cached = await readCachedAlerts();
      if (cached.length > 0) {
        setAlerts(sortAlerts(cached));
      }

      const response = await fetch(apiUrl("/api/alerts"));
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || "Failed to load alerts");
      }

      const backendAlerts = Array.isArray(result.alerts)
        ? result.alerts.map(normalizeBackendAlert)
        : [];

      await saveLocal(backendAlerts);
    } catch (error) {
      console.error("Failed to sync alerts from backend", error);

      const cached = await readCachedAlerts();
      setAlerts(sortAlerts(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAlerts();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setAlerts((current) => {
        const active = sortAlerts(getActiveAlerts(current));
        if (active.length !== current.length) {
          writeCachedAlerts(active).catch(() => {});
        }
        return active;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const addAlert = (
    data: AlertDraft,
    postedBy: string = "Super Admin",
    postedById?: string,
    ward?: string,
  ) => {
    const createdAt = new Date();
    const expiresAt =
      data.expiresAt ||
      new Date(createdAt.getTime() + ALERT_ACTIVE_MS).toISOString();

    const localAlert: AppAlert = {
      ...data,
      priority: data.priority || "normal",
      media: data.media || null,
      id: "ALT" + Date.now().toString().slice(-8),
      createdAt: createdAt.toISOString(),
      expiresAt,
      validUntil: data.validUntil || formatValidUntil(expiresAt),
      postedBy,
      postedById,
      ward,
    };

    void saveLocal([localAlert, ...alerts]);

    const payload = {
      id: localAlert.id,
      title: localAlert.title,
      body: localAlert.body,
      type: localAlert.type,
      category: localAlert.category || null,
      priority: localAlert.priority || "normal",
      location: localAlert.location || null,
      valid_until: localAlert.validUntil || null,
      expires_at: localAlert.expiresAt || null,
      target_audience: localAlert.targetAudience || null,
      media_uri: localAlert.media?.uri || null,
      media_type: localAlert.media?.type || null,
      media_file_name: localAlert.media?.fileName || null,
      media_mime_type: localAlert.media?.mimeType || null,
      media_duration: localAlert.media?.duration || null,
      posted_by: postedBy,
      posted_by_id: postedById || null,
      ward: ward || null,
    };

    fetch(apiUrl("/api/alerts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.message || result.error || "Failed to post alert");
        }

        void refreshAlerts();
      })
      .catch((error) => {
        console.error("Failed to post alert to backend", error);
      });
  };

  const removeAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    void saveLocal(updated);

    fetch(apiUrl(`/api/alerts/${encodeURIComponent(id)}`), {
      method: "DELETE",
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          throw new Error(result.message || result.error || "Failed to remove alert");
        }
      })
      .catch((error) => {
        console.error("Failed to remove alert from backend", error);
      });
  };

  return (
    <AlertContext.Provider
      value={{ alerts, addAlert, removeAlert, refreshAlerts, loading }}
    >
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
