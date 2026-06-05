import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { apiDelete, apiGet, apiPost } from "@/lib/api";

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
  ) => Promise<AppAlert>;
  removeAlert: (id: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  loading: boolean;
}

const AlertContext = createContext<AlertContextType | null>(null);
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
    id: String(item.id || item.alertId || "ALT" + Date.now()),
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

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAlerts = async () => {
    try {
      setLoading(true);

      const result = await apiGet<any>("/api/alerts");
      const backendAlerts = Array.isArray(result.alerts)
        ? result.alerts.map(normalizeBackendAlert)
        : [];

      setAlerts(sortAlerts(backendAlerts));
    } catch (error) {
      console.error("Failed to load alerts from MySQL", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAlerts();
  }, []);

  const addAlert = async (
    data: AlertDraft,
    postedBy: string = "Super Admin",
    postedById?: string,
    ward?: string,
  ) => {
    const createdAt = new Date();
    const expiresAt =
      data.expiresAt ||
      new Date(createdAt.getTime() + ALERT_ACTIVE_MS).toISOString();

    const id = "ALT" + Date.now().toString().slice(-8);

    const payload = {
      id,
      title: data.title,
      body: data.body,
      type: data.type,
      category: data.category || null,
      priority: data.priority || "normal",
      location: data.location || null,
      valid_until: data.validUntil || formatValidUntil(expiresAt),
      expires_at: expiresAt,
      target_audience: data.targetAudience || null,
      media_uri: data.media?.uri || null,
      media_type: data.media?.type || null,
      media_file_name: data.media?.fileName || null,
      media_mime_type: data.media?.mimeType || null,
      media_duration: data.media?.duration || null,
      posted_by: postedBy,
      posted_by_id: postedById || null,
      ward: ward || null,
    };

    const result = await apiPost<any>("/api/alerts", payload);

    const created = normalizeBackendAlert({
      ...payload,
      id: result.alertId || id,
      created_at: createdAt.toISOString(),
    });

    await refreshAlerts();
    return created;
  };

  const removeAlert = async (id: string) => {
    await apiDelete(`/api/alerts/${encodeURIComponent(id)}`);
    await refreshAlerts();
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
