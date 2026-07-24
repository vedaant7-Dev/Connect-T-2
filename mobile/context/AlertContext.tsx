import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { apiDelete, apiGet, apiPatch, apiPost, getUserErrorMessage } from "@/lib/api";
import { toUploadableMediaUri } from "@/lib/mediaUpload";

export type AlertType = "alert" | "news" | "emergency";
export type AlertPriority = "normal" | "important" | "urgent" | "high";
export type AlertLanguage = "en" | "mr" | "hi";
export type AlertStatus = "draft" | "scheduled" | "published" | "archived";

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
  language: AlertLanguage;
  status: AlertStatus;
  publishAt?: string;
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
  isRead: boolean;
  deliveredCount: number;
  readCount: number;
}

export type AlertDraft = Pick<AppAlert, "title" | "body" | "type"> & Partial<Pick<AppAlert,
  "category" | "priority" | "language" | "status" | "publishAt" | "location" | "validUntil" | "expiresAt" | "targetAudience" | "media"
>>;

interface AlertContextType {
  alerts: AppAlert[];
  loading: boolean;
  error: string;
  lastUpdatedAt?: string;
  addAlert: (data: AlertDraft, postedBy?: string, postedById?: string, ward?: string) => Promise<AppAlert>;
  updateAlert: (id: string, data: Partial<AlertDraft>) => Promise<AppAlert>;
  removeAlert: (id: string) => Promise<void>;
  markAlertRead: (id: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
}

const AlertContext = createContext<AlertContextType | null>(null);
const ALERT_ACTIVE_MS = 12 * 60 * 60 * 1000;

function strictBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function normalizeType(value: unknown): AlertType {
  const type = String(value || "alert").toLowerCase();
  return type === "news" || type === "emergency" ? type : "alert";
}

function normalizePriority(value: unknown): AlertPriority {
  const priority = String(value || "normal").toLowerCase();
  return ["important", "urgent", "high"].includes(priority) ? priority as AlertPriority : "normal";
}

function normalizeLanguage(value: unknown): AlertLanguage {
  const language = String(value || "en").toLowerCase();
  return language === "mr" || language === "hi" ? language : "en";
}

function normalizeStatus(value: unknown): AlertStatus {
  const status = String(value || "published").toLowerCase();
  return ["draft", "scheduled", "archived"].includes(status) ? status as AlertStatus : "published";
}

export function wardKey(ward?: string | null) {
  const raw = String(ward || "").trim().toLowerCase();
  if (!raw || raw === "all wards" || raw === "all" || raw === "all citizens") return "";
  const match = raw.match(/(?:ward\s*)?([0-9]{1,2}[a-z]?)/i);
  return match ? match[1].toLowerCase() : raw.replace(/\s+/g, "");
}

export function isGlobalAlert(alert: Partial<AppAlert>) {
  const audience = String(alert.targetAudience || "").toLowerCase();
  return !wardKey(alert.ward) || audience.includes("all citizen") || audience.includes("all ward");
}

export function alertVisibleForWard(alert: Partial<AppAlert>, ward?: string | null) {
  return isGlobalAlert(alert) || (!!wardKey(ward) && wardKey(alert.ward) === wardKey(ward));
}

function normalizeBackendAlert(item: any): AppAlert {
  const mediaUri = item?.media?.uri || item?.media_uri || item?.image_uri || item?.video_uri || "";
  const rawMediaType = item?.media?.type || item?.media_type || (item?.video_uri ? "video" : item?.image_uri ? "image" : "");
  return {
    id: String(item?.id || item?.alertId || `alert_${Date.now()}`),
    title: String(item?.title || ""),
    body: String(item?.body || item?.message || ""),
    type: normalizeType(item?.type),
    category: item?.category || undefined,
    priority: normalizePriority(item?.priority),
    language: normalizeLanguage(item?.language),
    status: normalizeStatus(item?.status),
    publishAt: item?.publishAt || item?.publish_at || undefined,
    location: item?.location || undefined,
    validFrom: item?.validFrom || item?.valid_from || undefined,
    validUntil: item?.validUntil || item?.valid_until || undefined,
    expiresAt: item?.expiresAt || item?.expires_at || undefined,
    targetAudience: item?.targetAudience || item?.target_audience || undefined,
    media: mediaUri ? {
      uri: mediaUri,
      type: rawMediaType === "video" ? "video" : "image",
      fileName: item?.media?.fileName || item?.media_file_name || undefined,
      mimeType: item?.media?.mimeType || item?.media_mime_type || undefined,
      duration: item?.media?.duration !== undefined
        ? Number(item.media.duration)
        : item?.media_duration !== undefined && item?.media_duration !== null ? Number(item.media_duration) : undefined,
    } : null,
    createdAt: item?.createdAt || item?.created_at || item?.created || new Date().toISOString(),
    postedBy: item?.postedBy || item?.posted_by || "Connect-T",
    postedById: item?.postedById || item?.posted_by_id || undefined,
    ward: item?.ward || undefined,
    isRead: strictBoolean(item?.isRead ?? item?.is_read ?? item?.read_at),
    deliveredCount: Number(item?.deliveredCount ?? item?.delivered_count ?? 0),
    readCount: Number(item?.readCount ?? item?.read_count ?? 0),
  };
}

function activeAlerts(items: AppAlert[]) {
  const now = Date.now();
  return items
    .filter((item) => {
      if (item.status === "archived") return false;
      if (!item.expiresAt) return true;
      const expiry = new Date(item.expiresAt).getTime();
      return Number.isNaN(expiry) || expiry > now;
    })
    .sort((a, b) => new Date(b.publishAt || b.createdAt).getTime() - new Date(a.publishAt || a.createdAt).getTime());
}

function formatValidUntil(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function alertFingerprint(data: AlertDraft, postedById?: string, ward?: string) {
  return JSON.stringify({
    title: data.title.trim(),
    body: data.body.trim(),
    type: data.type,
    category: data.category || "",
    priority: data.priority || "normal",
    language: data.language || "en",
    status: data.status || "published",
    publishAt: data.publishAt || "",
    expiresAt: data.expiresAt || "",
    targetAudience: data.targetAudience || "",
    ward: ward || "",
    postedById: postedById || "",
    mediaUri: data.media?.uri || "",
    mediaType: data.media?.type || "",
  });
}

function makeAlertRequestId() {
  return `ALT${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>();
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const pendingAlertIds = useRef(new Map<string, string>());

  const refreshAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setError("");
      setLoading(false);
      return;
    }
    if (refreshInFlight.current) return refreshInFlight.current;
    const request = (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiGet<{ alerts?: any[] }>("/api/alerts?limit=100&page=1");
        setAlerts(activeAlerts((result.alerts || []).map(normalizeBackendAlert)));
        setLastUpdatedAt(new Date().toISOString());
      } catch (requestError) {
        setError(getUserErrorMessage(requestError, "Alerts and news could not be loaded. Pull down to try again."));
        throw requestError;
      } finally {
        setLoading(false);
      }
    })();
    refreshInFlight.current = request;
    try { await request; }
    finally { refreshInFlight.current = null; }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setError("");
      setLoading(false);
      pendingAlertIds.current.clear();
      return;
    }
    void refreshAlerts().catch(() => undefined);
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void refreshAlerts().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [refreshAlerts, user?.id]);

  const addAlert = async (data: AlertDraft, postedBy = "Connect-T", postedById?: string, ward?: string) => {
    const fingerprint = alertFingerprint(data, postedById, ward);
    const requestId = pendingAlertIds.current.get(fingerprint) || makeAlertRequestId();
    pendingAlertIds.current.set(fingerprint, requestId);

    const expiresAt = data.expiresAt || new Date(Date.now() + ALERT_ACTIVE_MS).toISOString();
    const mediaUri = await toUploadableMediaUri(data.media?.uri);
    const payload = {
      id: requestId,
      title: data.title.trim(),
      body: data.body.trim(),
      type: data.type,
      category: data.category || null,
      priority: data.priority || "normal",
      language: data.language || "en",
      status: data.status || (data.publishAt ? "scheduled" : "published"),
      publish_at: data.publishAt || null,
      location: data.location || null,
      valid_until: data.validUntil || formatValidUntil(expiresAt),
      expires_at: expiresAt,
      target_audience: data.targetAudience || (ward ? "Ward residents" : "All citizens"),
      media_uri: mediaUri,
      media_type: data.media?.type || null,
      media_file_name: data.media?.fileName || null,
      media_mime_type: data.media?.mimeType || null,
      media_duration: data.media?.duration || null,
      posted_by: postedBy,
      posted_by_id: postedById || null,
      ward: ward || null,
    };

    const result = await apiPost<{ alert?: any; alertId?: string }>("/api/alerts", payload);
    pendingAlertIds.current.delete(fingerprint);
    const created = normalizeBackendAlert(result.alert || { ...payload, id: result.alertId || payload.id, created_at: new Date().toISOString() });
    setAlerts((current) => activeAlerts([created, ...current.filter((item) => item.id !== created.id)]));
    await refreshAlerts();
    return created;
  };

  const updateAlert = async (id: string, data: Partial<AlertDraft>) => {
    const mediaUri = data.media?.uri ? await toUploadableMediaUri(data.media.uri) : undefined;
    const result = await apiPatch<{ alert?: any }>(`/api/alerts/${encodeURIComponent(id)}`, {
      ...data,
      publish_at: data.publishAt,
      target_audience: data.targetAudience,
      expires_at: data.expiresAt,
      media_uri: mediaUri,
      media_type: data.media?.type,
      media_file_name: data.media?.fileName,
      media_mime_type: data.media?.mimeType,
      media_duration: data.media?.duration,
    });
    const updated = normalizeBackendAlert(result.alert || { ...data, id });
    setAlerts((current) => activeAlerts(current.map((item) => item.id === id ? { ...item, ...updated } : item)));
    await refreshAlerts();
    return updated;
  };

  const removeAlert = async (id: string) => {
    const previous = alerts;
    setAlerts((items) => items.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/alerts/${encodeURIComponent(id)}`);
      await refreshAlerts();
    } catch (requestError) {
      setAlerts(previous);
      throw requestError;
    }
  };

  const markAlertRead = async (id: string) => {
    const previous = alerts;
    setAlerts((items) => items.map((item) => item.id === id ? { ...item, isRead: true } : item));
    try {
      await apiPost(`/api/alerts/${encodeURIComponent(id)}/read`, {});
    } catch (requestError) {
      setAlerts(previous);
      throw requestError;
    }
  };

  const value = useMemo(() => ({ alerts, loading, error, lastUpdatedAt, addAlert, updateAlert, removeAlert, markAlertRead, refreshAlerts }), [alerts, loading, error, lastUpdatedAt, refreshAlerts]);
  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlerts must be used inside AlertProvider");
  return context;
}
