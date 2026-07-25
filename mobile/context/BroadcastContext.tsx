import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPatch, apiPost, getUserErrorMessage, isApiError } from "@/lib/api";
import { uploadBroadcastForm } from "@/lib/broadcastUpload";

export type BroadcastStatus = "draft" | "scheduled" | "sent" | "archived";
export type BroadcastAudience = "all" | "citizen" | "nagarsevak" | "seeker" | "employer";
export type BroadcastLanguage = "en" | "mr" | "hi";
export type BroadcastMediaType = "image" | "video";

export type BroadcastMediaUpload = {
  uri: string;
  type: BroadcastMediaType;
  mimeType: string;
  fileName: string;
  sizeBytes?: number;
  durationMs?: number | null;
  webFile?: Blob | null;
};

export type AppBroadcast = {
  id: string;
  title: string;
  body: string;
  category: "announcement" | "emergency" | "information" | "notice";
  language: BroadcastLanguage;
  audienceRole: BroadcastAudience;
  ward?: string;
  status: BroadcastStatus;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  mediaUri?: string;
  mediaType?: BroadcastMediaType;
  mediaFileName?: string;
  mediaMimeType?: string;
  mediaSizeBytes?: number;
  mediaDurationSeconds?: number;
  externalPushStatus: "not_configured" | "pending" | "sent" | "failed";
  externalPushMessage?: string;
  deliveredCount: number;
  readCount: number;
  isRead: boolean;
};

export type NewBroadcast = {
  title: string;
  body: string;
  category: AppBroadcast["category"];
  language: BroadcastLanguage;
  audienceRole: BroadcastAudience;
  ward?: string;
  scheduledAt?: string;
  idempotencyKey?: string;
  media?: BroadcastMediaUpload | null;
};

type BroadcastContextValue = {
  broadcasts: AppBroadcast[];
  loading: boolean;
  error: string;
  uploadProgress: number | null;
  refreshBroadcasts: () => Promise<void>;
  createBroadcast: (data: NewBroadcast) => Promise<AppBroadcast>;
  archiveBroadcast: (id: string) => Promise<void>;
  markBroadcastRead: (id: string) => Promise<void>;
};

const BroadcastContext = createContext<BroadcastContextValue | null>(null);

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function normalizeBroadcast(raw: any): AppBroadcast {
  const rawMediaType = raw.mediaType || raw.media_type;
  return {
    id: String(raw.id),
    title: String(raw.title || "Broadcast"),
    body: String(raw.body || ""),
    category: ["emergency", "information", "notice"].includes(raw.category) ? raw.category : "announcement",
    language: ["mr", "hi"].includes(raw.language) ? raw.language : "en",
    audienceRole: ["citizen", "nagarsevak", "seeker", "employer"].includes(raw.audienceRole || raw.audience_role)
      ? raw.audienceRole || raw.audience_role
      : "all",
    ward: raw.ward || undefined,
    status: ["draft", "scheduled", "archived"].includes(raw.status) ? raw.status : "sent",
    scheduledAt: raw.scheduledAt || raw.scheduled_at || undefined,
    sentAt: raw.sentAt || raw.sent_at || undefined,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    createdBy: String(raw.createdBy || raw.created_by || ""),
    createdByName: String(raw.createdByName || raw.created_by_name || "Connect-T"),
    mediaUri: raw.mediaUri || raw.media_uri || undefined,
    mediaType: rawMediaType === "video" ? "video" : rawMediaType === "image" ? "image" : undefined,
    mediaFileName: raw.mediaFileName || raw.media_file_name || undefined,
    mediaMimeType: raw.mediaMimeType || raw.media_mime_type || undefined,
    mediaSizeBytes: Number(raw.mediaSizeBytes ?? raw.media_size_bytes ?? 0) || undefined,
    mediaDurationSeconds: Number(raw.mediaDurationSeconds ?? raw.media_duration_seconds ?? 0) || undefined,
    externalPushStatus: ["pending", "sent", "failed"].includes(raw.externalPushStatus || raw.external_push_status)
      ? raw.externalPushStatus || raw.external_push_status
      : "not_configured",
    externalPushMessage: raw.externalPushMessage || raw.external_push_message || undefined,
    deliveredCount: Number(raw.deliveredCount ?? raw.delivered_count ?? 0),
    readCount: Number(raw.readCount ?? raw.read_count ?? 0),
    isRead: toBoolean(raw.isRead ?? raw.is_read ?? raw.read_at),
  };
}

function broadcastFingerprint(data: NewBroadcast) {
  return JSON.stringify({
    title: data.title.trim(),
    body: data.body.trim(),
    category: data.category,
    language: data.language,
    audienceRole: data.audienceRole,
    ward: data.ward || "",
    scheduledAt: data.scheduledAt || "",
    media: data.media ? `${data.media.fileName}:${data.media.sizeBytes || 0}:${data.media.durationMs || 0}` : "",
  });
}

function makeIdempotencyKey() {
  return `broadcast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function routeAwareMessage(error: unknown, fallback: string) {
  if (isApiError(error) && error.code === "ROUTE_NOT_FOUND") {
    return "Broadcast API is not deployed on the connected backend. Redeploy the connect-t-2 backend from the latest main branch, then try again.";
  }
  return getUserErrorMessage(error, fallback);
}

function appendField(form: FormData, key: string, value?: string) {
  if (value !== undefined && value !== "") form.append(key, value);
}

function buildBroadcastForm(data: NewBroadcast, idempotencyKey: string) {
  const form = new FormData();
  appendField(form, "title", data.title);
  appendField(form, "body", data.body);
  appendField(form, "category", data.category);
  appendField(form, "language", data.language);
  appendField(form, "audienceRole", data.audienceRole);
  appendField(form, "ward", data.ward);
  appendField(form, "scheduledAt", data.scheduledAt);
  appendField(form, "idempotencyKey", idempotencyKey);

  const media = data.media;
  if (media) {
    if (Platform.OS === "web" && media.webFile) {
      form.append("media", media.webFile, media.fileName);
    } else {
      form.append("media", {
        uri: media.uri,
        name: media.fileName,
        type: media.mimeType,
      } as any);
    }
  }
  return form;
}

export function BroadcastProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<AppBroadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const refreshing = useRef<Promise<void> | null>(null);
  const pendingIdempotencyKeys = useRef(new Map<string, string>());

  const refreshBroadcasts = useCallback(async () => {
    if (!user) {
      setBroadcasts([]);
      setError("");
      return;
    }
    if (refreshing.current) return refreshing.current;
    const request = (async () => {
      setLoading(true);
      try {
        const result = await apiGet<{ broadcasts?: any[] }>("/api/broadcasts");
        setBroadcasts((result.broadcasts || []).map(normalizeBroadcast));
        setError("");
      } catch (requestError) {
        setError(routeAwareMessage(requestError, "Broadcasts could not be loaded. Pull down to try again."));
        throw requestError;
      } finally {
        setLoading(false);
        refreshing.current = null;
      }
    })();
    refreshing.current = request;
    return request;
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setBroadcasts([]);
      setUploadProgress(null);
      pendingIdempotencyKeys.current.clear();
      return;
    }
    void refreshBroadcasts().catch(() => undefined);
  }, [refreshBroadcasts, user?.id]);

  useEffect(() => {
    if (!user) return;
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void refreshBroadcasts().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [refreshBroadcasts, user?.id]);

  const createBroadcast = useCallback(async (data: NewBroadcast) => {
    const fingerprint = broadcastFingerprint(data);
    const idempotencyKey = pendingIdempotencyKeys.current.get(fingerprint) || data.idempotencyKey || makeIdempotencyKey();
    pendingIdempotencyKeys.current.set(fingerprint, idempotencyKey);
    setUploadProgress(data.media ? 0 : null);

    try {
      const result = data.media
        ? await uploadBroadcastForm<{ broadcast: any }>("/api/broadcasts", buildBroadcastForm(data, idempotencyKey), setUploadProgress)
        : await apiPost<{ broadcast: any }>("/api/broadcasts", { ...data, idempotencyKey });
      pendingIdempotencyKeys.current.delete(fingerprint);
      const created = normalizeBroadcast(result.broadcast);
      setBroadcasts((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      return created;
    } catch (requestError) {
      if (isApiError(requestError) && requestError.code === "ROUTE_NOT_FOUND") {
        throw new Error(routeAwareMessage(requestError, "Broadcast service is unavailable."));
      }
      throw requestError;
    } finally {
      setUploadProgress(null);
    }
  }, []);

  const archiveBroadcast = useCallback(async (id: string) => {
    await apiPatch(`/api/broadcasts/${encodeURIComponent(id)}`, { action: "archive" });
    setBroadcasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const markBroadcastRead = useCallback(async (id: string) => {
    setBroadcasts((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
    try {
      await apiPost(`/api/broadcasts/${encodeURIComponent(id)}/read`, {});
    } catch (requestError) {
      setBroadcasts((current) => current.map((item) => item.id === id ? { ...item, isRead: false } : item));
      throw requestError;
    }
  }, []);

  const value = useMemo(() => ({
    broadcasts,
    loading,
    error,
    uploadProgress,
    refreshBroadcasts,
    createBroadcast,
    archiveBroadcast,
    markBroadcastRead,
  }), [archiveBroadcast, broadcasts, createBroadcast, error, loading, markBroadcastRead, refreshBroadcasts, uploadProgress]);

  return <BroadcastContext.Provider value={value}>{children}</BroadcastContext.Provider>;
}

export function useBroadcasts() {
  const context = useContext(BroadcastContext);
  if (!context) throw new Error("useBroadcasts must be used inside BroadcastProvider");
  return context;
}
