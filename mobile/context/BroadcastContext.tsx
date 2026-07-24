import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPatch, apiPost, getUserErrorMessage } from "@/lib/api";

export type BroadcastStatus = "draft" | "scheduled" | "sent" | "archived";
export type BroadcastAudience = "all" | "citizen" | "nagarsevak" | "seeker" | "employer";
export type BroadcastLanguage = "en" | "mr" | "hi";

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
};

type BroadcastContextValue = {
  broadcasts: AppBroadcast[];
  loading: boolean;
  error: string;
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
  });
}

function makeIdempotencyKey() {
  return `broadcast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

export function BroadcastProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<AppBroadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        setError(getUserErrorMessage(requestError, "Broadcasts could not be loaded. Pull down to try again."));
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

    const result = await apiPost<{ broadcast: any }>("/api/broadcasts", {
      ...data,
      idempotencyKey,
    });
    pendingIdempotencyKeys.current.delete(fingerprint);
    const created = normalizeBroadcast(result.broadcast);
    setBroadcasts((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
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
    refreshBroadcasts,
    createBroadcast,
    archiveBroadcast,
    markBroadcastRead,
  }), [archiveBroadcast, broadcasts, createBroadcast, error, loading, markBroadcastRead, refreshBroadcasts]);

  return <BroadcastContext.Provider value={value}>{children}</BroadcastContext.Provider>;
}

export function useBroadcasts() {
  const context = useContext(BroadcastContext);
  if (!context) throw new Error("useBroadcasts must be used inside BroadcastProvider");
  return context;
}
