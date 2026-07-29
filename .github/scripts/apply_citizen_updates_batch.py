from pathlib import Path
import json
import re
import textwrap

ROOT = Path(__file__).resolve().parents[2]


def write(relative: str, content: str) -> None:
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content).lstrip(), encoding="utf-8")


def replace_once(relative: str, old: str, new: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected source block not found in {relative}: {old[:120]!r}")
    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")


# ---------------------------------------------------------------------------
# Native complaint upload: use XMLHttpRequest so Android content:// images and
# slow mobile multipart uploads do not fail through React Native fetch.
# ---------------------------------------------------------------------------
write("mobile/lib/complaintUpload.ts", r'''
import { apiUrl } from "@/constants/api";
import { ApiError, getStoredAuthToken, invalidateApiCache } from "@/lib/api";
import { connectivityErrorMessage } from "@/lib/networkStatus";

export const COMPLAINT_UPLOAD_TIMEOUT_MS = 4 * 60 * 1000;

function parsePayload(text: string, status: number) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    if (status >= 200 && status < 300) {
      throw new ApiError("The server returned an invalid response. Please try again.", { status });
    }
    return { message: text };
  }
}

function statusMessage(status: number, serverMessage: string) {
  if (status === 401) return "Your session could not be verified. Please log in again.";
  if (status === 403) return serverMessage || "This account cannot submit complaints.";
  if (status === 413) return serverMessage || "The selected image is too large.";
  if (status === 415) return serverMessage || "Choose a valid JPEG, PNG or WebP image.";
  if ([400, 409, 422, 429].includes(status)) return serverMessage || "Check the complaint details and try again.";
  if (status >= 500) return "The complaint service is temporarily unavailable. Please try again.";
  return serverMessage || "The complaint could not be submitted.";
}

export async function uploadComplaintForm<T = any>(
  form: FormData,
  onProgress?: (percentage: number) => void,
): Promise<T> {
  invalidateApiCache();
  const token = await getStoredAuthToken();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/api/complaints"));
    xhr.timeout = COMPLAINT_UPLOAD_TIMEOUT_MS;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // Do not set Content-Type manually. React Native must add the multipart
    // boundary for content:// and file:// assets.

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return;
      onProgress?.(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
    };

    xhr.onload = () => {
      try {
        const payload: any = parsePayload(xhr.responseText || "", xhr.status);
        if (xhr.status < 200 || xhr.status >= 300) {
          const serverMessage = String(payload?.error || payload?.message || "");
          reject(new ApiError(statusMessage(xhr.status, serverMessage), {
            status: xhr.status,
            code: payload?.code ? String(payload.code) : undefined,
            internalMessage: `POST /api/complaints: ${xhr.status} ${serverMessage}`,
          }));
          return;
        }
        onProgress?.(100);
        resolve(payload as T);
      } catch (error) {
        reject(error instanceof ApiError ? error : new ApiError("The server returned an invalid response. Please try again."));
      }
    };

    xhr.onerror = () => {
      void connectivityErrorMessage(
        new Error("XMLHttpRequest network error"),
        "Your internet connection is weak. Keep the app open and try submitting again.",
      ).then((message) => reject(new ApiError(message, {
        code: "COMPLAINT_UPLOAD_NETWORK_UNAVAILABLE",
        internalMessage: "POST /api/complaints: XMLHttpRequest network error",
      })));
    };
    xhr.ontimeout = () => reject(new ApiError(
      "The image upload took too long. Check your connection and try again.",
      { code: "COMPLAINT_UPLOAD_TIMEOUT", internalMessage: `Upload timed out after ${COMPLAINT_UPLOAD_TIMEOUT_MS}ms` },
    ));
    xhr.onabort = () => reject(new ApiError("The complaint upload was cancelled.", { code: "COMPLAINT_UPLOAD_ABORTED" }));

    try {
      onProgress?.(0);
      xhr.send(form);
    } catch (error) {
      reject(new ApiError("The complaint upload could not be started. Please try again.", {
        code: "COMPLAINT_UPLOAD_START_FAILED",
        internalMessage: error instanceof Error ? error.message : String(error || "XHR send failed"),
      }));
    }
  });
}
''')

replace_once(
    "mobile/context/ComplaintContext.tsx",
    'import { ApiError, apiGet, apiPatch, apiPost, apiPostForm, isApiError } from "@/lib/api";\nimport { getNetworkState, probeNetwork } from "@/lib/networkStatus";',
    'import { ApiError, apiGet, apiPatch, apiPost, isApiError } from "@/lib/api";\nimport { uploadComplaintForm } from "@/lib/complaintUpload";\nimport { getNetworkState, probeNetwork } from "@/lib/networkStatus";',
)
replace_once(
    "mobile/context/ComplaintContext.tsx",
    '      return await apiPostForm<any>("/api/complaints", createForm());',
    '      return await uploadComplaintForm<any>(createForm());',
)
replace_once(
    "mobile/context/ComplaintContext.tsx",
    '''\nexport function ComplaintProvider({ children }: { children: ReactNode }) {''',
    '''\nasync function submitJsonWithNetworkRecovery(payload: Record<string, unknown>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await apiPost<any>("/api/complaints", payload);
    } catch (error) {
      lastError = error;
      if (!isApiError(error) || error.status !== undefined || attempt === 1) throw error;
      const network = getNetworkState().quality === "offline" ? await probeNetwork(10_000) : getNetworkState();
      if (network.quality === "offline") throw error;
      await wait(1_500);
    }
  }
  throw lastError;
}

export function ComplaintProvider({ children }: { children: ReactNode }) {''',
)
replace_once(
    "mobile/context/ComplaintContext.tsx",
    '''      result = await apiPost<any>("/api/complaints", {
        ...payload,
        id: clientRequestId,
        client_request_id: clientRequestId,
        photo_url: null,
      });''',
    '''      result = await submitJsonWithNetworkRecovery({
        ...payload,
        id: clientRequestId,
        client_request_id: clientRequestId,
        photo_url: null,
      });''',
)

# ---------------------------------------------------------------------------
# Broadcast context and management actions.
# ---------------------------------------------------------------------------
write("mobile/context/BroadcastContext.tsx", r'''
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { apiDelete, apiGet, apiPatch, apiPost, getUserErrorMessage, isApiError } from "@/lib/api";
import { uploadBroadcastForm } from "@/lib/broadcastUpload";

export type BroadcastStatus = "draft" | "scheduled" | "sent" | "paused";
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
  pauseBroadcast: (id: string) => Promise<void>;
  resumeBroadcast: (id: string) => Promise<void>;
  deleteBroadcast: (id: string) => Promise<void>;
  markBroadcastRead: (id: string) => Promise<void>;
};

const BroadcastContext = createContext<BroadcastContextValue | null>(null);

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function normalizeBroadcast(raw: any): AppBroadcast {
  const rawMediaType = raw.mediaType || raw.media_type;
  const rawStatus = String(raw.status || "sent").toLowerCase();
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
    status: ["draft", "scheduled", "paused"].includes(rawStatus) ? rawStatus as BroadcastStatus : "sent",
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
    title: data.title.trim(), body: data.body.trim(), category: data.category, language: data.language,
    audienceRole: data.audienceRole, ward: data.ward || "", scheduledAt: data.scheduledAt || "",
    media: data.media ? `${data.media.fileName}:${data.media.sizeBytes || 0}:${data.media.durationMs || 0}` : "",
  });
}

function makeIdempotencyKey() {
  return `broadcast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function routeAwareMessage(error: unknown, fallback: string) {
  if (isApiError(error) && error.code === "ROUTE_NOT_FOUND") {
    return "Broadcast API is not deployed on the connected backend. Redeploy the latest backend and try again.";
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
  if (data.media) {
    if (Platform.OS === "web" && data.media.webFile) form.append("media", data.media.webFile, data.media.fileName);
    else form.append("media", { uri: data.media.uri, name: data.media.fileName, type: data.media.mimeType } as any);
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
    if (!user) { setBroadcasts([]); setError(""); return; }
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
    if (!user) { setBroadcasts([]); setUploadProgress(null); pendingIdempotencyKeys.current.clear(); return; }
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

  const runAction = useCallback(async (id: string, action: "pause" | "resume") => {
    const result = await apiPatch<{ broadcast?: any }>(`/api/broadcasts/${encodeURIComponent(id)}`, { action });
    setBroadcasts((current) => current.map((item) => item.id === id
      ? result.broadcast ? normalizeBroadcast(result.broadcast) : { ...item, status: action === "pause" ? "paused" : "sent" }
      : item));
  }, []);

  const pauseBroadcast = useCallback((id: string) => runAction(id, "pause"), [runAction]);
  const resumeBroadcast = useCallback((id: string) => runAction(id, "resume"), [runAction]);
  const deleteBroadcast = useCallback(async (id: string) => {
    await apiDelete(`/api/broadcasts/${encodeURIComponent(id)}`);
    setBroadcasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const markBroadcastRead = useCallback(async (id: string) => {
    setBroadcasts((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
    try { await apiPost(`/api/broadcasts/${encodeURIComponent(id)}/read`, {}); }
    catch (requestError) {
      setBroadcasts((current) => current.map((item) => item.id === id ? { ...item, isRead: false } : item));
      throw requestError;
    }
  }, []);

  const value = useMemo(() => ({
    broadcasts, loading, error, uploadProgress, refreshBroadcasts, createBroadcast,
    pauseBroadcast, resumeBroadcast, deleteBroadcast, markBroadcastRead,
  }), [broadcasts, loading, error, uploadProgress, refreshBroadcasts, createBroadcast, pauseBroadcast, resumeBroadcast, deleteBroadcast, markBroadcastRead]);

  return <BroadcastContext.Provider value={value}>{children}</BroadcastContext.Provider>;
}

export function useBroadcasts() {
  const context = useContext(BroadcastContext);
  if (!context) throw new Error("useBroadcasts must be used inside BroadcastProvider");
  return context;
}
''')

write("mobile/screens/BroadcastCenterMediaScreen.tsx", r'''
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import AppDateTimePicker from "@/components/AppDateTimePicker";
import BroadcastMediaPicker from "@/components/BroadcastMediaPicker";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import { AppBroadcast, BroadcastAudience, BroadcastLanguage, BroadcastMediaUpload, useBroadcasts } from "@/context/BroadcastContext";
import { useAuth } from "@/context/AuthContext";
import { NAGARSEVAK_WARDS } from "@/data/wards";
import { getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const ORANGE = "#EA580C";
const BG = "#EEF2F7";

const CATEGORIES: Array<{ key: AppBroadcast["category"]; label: string; icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = [
  { key: "announcement", label: "Announcement", icon: "radio", color: "#B45309", bg: "#FEF3C7" },
  { key: "emergency", label: "Emergency", icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2" },
  { key: "information", label: "Information", icon: "info", color: "#2563EB", bg: "#DBEAFE" },
  { key: "notice", label: "Notice", icon: "file-text", color: "#7C3AED", bg: "#EDE9FE" },
];
const AUDIENCES: Array<{ key: BroadcastAudience; label: string }> = [
  { key: "all", label: "All users" }, { key: "citizen", label: "Citizens" }, { key: "nagarsevak", label: "Nagarsevaks" },
  { key: "seeker", label: "Job Seekers" }, { key: "employer", label: "Employers" },
];
const LANGUAGES: Array<{ key: BroadcastLanguage; label: string }> = [
  { key: "en", label: "English" }, { key: "mr", label: "मराठी" }, { key: "hi", label: "हिंदी" },
];

function formatDate(value?: string) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
function makeIdempotencyKey() { return `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`; }
function statusMeta(status: AppBroadcast["status"]) {
  if (status === "scheduled") return { label: "Scheduled", color: "#B45309", bg: "#FEF3C7" };
  if (status === "paused") return { label: "Paused", color: "#7C3AED", bg: "#EDE9FE" };
  if (status === "draft") return { label: "Draft", color: "#475569", bg: "#F1F5F9" };
  return { label: "Sent", color: "#166534", bg: "#DCFCE7" };
}

type CardProps = {
  item: AppBroadcast;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
};
function BroadcastCard({ item, onPause, onResume, onDelete }: CardProps) {
  const category = CATEGORIES.find((entry) => entry.key === item.category) || CATEGORIES[0];
  const status = statusMeta(item.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.categoryIcon, { backgroundColor: category.bg }]}><Feather name={category.icon} size={18} color={category.color} /></View>
        <View style={styles.cardCopy}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardMeta}>{item.ward || "All wards"} · {item.audienceRole} · {item.language.toUpperCase()}</Text></View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View>
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      {item.mediaUri ? item.mediaType === "image" ? <Image source={{ uri: item.mediaUri }} style={styles.cardImage} resizeMode="cover" /> : (
        <TouchableOpacity style={styles.videoRow} onPress={() => void Linking.openURL(item.mediaUri!)} accessibilityRole="button">
          <Feather name="play-circle" size={28} color={ORANGE} /><View style={styles.videoCopy}><Text style={styles.videoTitle}>Attached video</Text><Text style={styles.videoMeta}>{item.mediaDurationSeconds ? `${item.mediaDurationSeconds} seconds` : "Up to 5 minutes"}</Text></View><Feather name="external-link" size={16} color="#64748B" />
        </TouchableOpacity>
      ) : null}
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{item.deliveredCount}</Text><Text style={styles.metricLabel}>Delivered</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{item.readCount}</Text><Text style={styles.metricLabel}>Read</Text></View>
        <View style={styles.metric}><Text style={[styles.metricValue, styles.providerValue]}>{item.externalPushStatus === "not_configured" ? "In-app" : item.externalPushStatus}</Text><Text style={styles.metricLabel}>Delivery</Text></View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{formatDate(item.status === "scheduled" ? item.scheduledAt : item.sentAt || item.createdAt)}</Text>
        <View style={styles.actionRow}>
          {item.status === "paused" ? (
            <TouchableOpacity style={[styles.actionButton, styles.resumeButton]} onPress={onResume}><Feather name="play" size={14} color="#166534" /><Text style={styles.resumeText}>Resume</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.pauseButton]} onPress={onPause}><Feather name="pause" size={14} color="#7C3AED" /><Text style={styles.pauseText}>Pause</Text></TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}><Feather name="trash-2" size={14} color="#DC2626" /><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function BroadcastCenterMediaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { broadcasts, loading, error, refreshBroadcasts, createBroadcast, pauseBroadcast, resumeBroadcast, deleteBroadcast } = useBroadcasts();
  const isSuperAdmin = user?.role === "super_admin" || !!user?.isSuperAdmin;
  const [composeVisible, setComposeVisible] = useState(false);
  const [wardPickerVisible, setWardPickerVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const [category, setCategory] = useState<AppBroadcast["category"]>("announcement");
  const [audienceRole, setAudienceRole] = useState<BroadcastAudience>("all");
  const [language, setLanguage] = useState<BroadcastLanguage>("en");
  const [ward, setWard] = useState("All Wards"); const [scheduledAt, setScheduledAt] = useState("");
  const [media, setMedia] = useState<BroadcastMediaUpload | null>(null); const [formError, setFormError] = useState("");
  const [pendingAction, setPendingAction] = useState<{ kind: "pause" | "resume" | "delete"; item: AppBroadcast } | null>(null);
  const [actionBusy, setActionBusy] = useState(false); const [actionError, setActionError] = useState("");

  useFocusEffect(useCallback(() => { void refreshBroadcasts().catch(() => undefined); }, [refreshBroadcasts]));
  const active = broadcasts;
  const stats = useMemo(() => ({
    sent: active.filter((item) => item.status === "sent").length,
    scheduled: active.filter((item) => item.status === "scheduled").length,
    paused: active.filter((item) => item.status === "paused").length,
    read: active.reduce((total, item) => total + item.readCount, 0),
  }), [active]);

  const resetForm = () => { setTitle(""); setBody(""); setCategory("announcement"); setAudienceRole("all"); setLanguage("en"); setWard("All Wards"); setScheduledAt(""); setMedia(null); setFormError(""); };
  const send = async () => {
    if (sending) return; setFormError("");
    if (title.trim().length < 3) return setFormError("Enter a clear broadcast title.");
    if (body.trim().length < 5) return setFormError("Enter a detailed message.");
    if (scheduledAt && Number.isNaN(new Date(scheduledAt).getTime())) return setFormError("Choose a valid future date and time.");
    setSending(true);
    try {
      await createBroadcast({ title: title.trim(), body: body.trim(), category, audienceRole: isSuperAdmin ? audienceRole : "citizen", language,
        ward: isSuperAdmin && ward === "All Wards" ? undefined : isSuperAdmin ? ward : user?.ward,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined, idempotencyKey: makeIdempotencyKey(), media });
      setComposeVisible(false); resetForm(); await refreshBroadcasts();
    } catch (requestError) { setFormError(getUserErrorMessage(requestError, "Broadcast could not be created. Please try again.")); }
    finally { setSending(false); }
  };

  const runPendingAction = async () => {
    if (!pendingAction || actionBusy) return;
    setActionBusy(true); setActionError("");
    try {
      if (pendingAction.kind === "pause") await pauseBroadcast(pendingAction.item.id);
      else if (pendingAction.kind === "resume") await resumeBroadcast(pendingAction.item.id);
      else await deleteBroadcast(pendingAction.item.id);
      setPendingAction(null);
    } catch (requestError) { setActionError(getUserErrorMessage(requestError, "The broadcast could not be changed.")); }
    finally { setActionBusy(false); }
  };
  const actionTitle = pendingAction?.kind === "delete" ? "Delete broadcast?" : pendingAction?.kind === "pause" ? "Pause broadcast?" : "Resume broadcast?";
  const actionMessage = pendingAction?.kind === "delete"
    ? `Delete “${pendingAction?.item.title || "this broadcast"}”? This permanently removes the broadcast and its delivery history.`
    : pendingAction?.kind === "pause"
      ? `Pause “${pendingAction?.item.title || "this broadcast"}”? Citizens will stop seeing it until you resume it.`
      : `Resume “${pendingAction?.item.title || "this broadcast"}”? It will become visible again according to its schedule.`;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 10 }]}>
        <View style={styles.headerRow}><TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace("/super-admin" as any)}><Feather name="chevron-left" size={20} color="white" /><Text style={styles.backText}>Back</Text></TouchableOpacity><TouchableOpacity style={styles.createButton} onPress={() => setComposeVisible(true)}><Feather name="plus" size={15} color="#166534" /><Text style={styles.createText}>Create</Text></TouchableOpacity></View>
        <Text style={styles.headerTitle}>Broadcast Center</Text><Text style={styles.headerSub}>Send immediate or scheduled in-app updates with an optional image or five-minute video.</Text>
        <View style={styles.statsRow}><Stat value={stats.sent} label="Sent" /><Stat value={stats.scheduled} label="Scheduled" /><Stat value={stats.paused} label="Paused" /><Stat value={stats.read} label="Read" /></View>
      </LinearGradient>
      {error ? <TouchableOpacity style={styles.errorBanner} onPress={() => void refreshBroadcasts().catch(() => undefined)}><Feather name="alert-triangle" size={15} color="#B45309" /><Text style={styles.errorText}>{error}</Text><Text style={styles.retryText}>Retry</Text></TouchableOpacity> : null}
      <AppScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 28 }]} onAppRefresh={() => refreshBroadcasts()}>
        <View style={styles.infoBanner}><Feather name="shield" size={17} color="#1D4ED8" /><Text style={styles.infoText}>Pause temporarily hides a broadcast. Delete permanently removes it after confirmation.</Text></View>
        {loading && !active.length ? <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /><Text style={styles.centerText}>Loading broadcasts...</Text></View> : null}
        {!loading && !active.length ? <View style={styles.empty}><Feather name="radio" size={34} color={GREEN} /><Text style={styles.emptyTitle}>No broadcasts yet</Text><Text style={styles.emptyText}>Create the first update for citizens or a selected audience.</Text></View> : null}
        {active.map((item) => <BroadcastCard key={item.id} item={item} onPause={() => setPendingAction({ kind: "pause", item })} onResume={() => setPendingAction({ kind: "resume", item })} onDelete={() => setPendingAction({ kind: "delete", item })} />)}
      </AppScrollView>

      <ConfirmActionModal visible={!!pendingAction} title={actionTitle} message={actionMessage} confirmLabel={pendingAction?.kind === "delete" ? "Delete" : pendingAction?.kind === "pause" ? "Pause" : "Resume"} confirmIcon={pendingAction?.kind === "delete" ? "trash-2" : pendingAction?.kind === "pause" ? "pause" : "play"} tone={pendingAction?.kind === "delete" ? "danger" : "primary"} busy={actionBusy} errorMessage={actionError} onCancel={() => { if (!actionBusy) { setPendingAction(null); setActionError(""); } }} onConfirm={runPendingAction} />

      <Modal visible={composeVisible} transparent animationType="slide" onRequestClose={() => !sending && setComposeVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHeader}><View style={styles.sheetHeaderCopy}><Text style={styles.sheetTitle}>Create Broadcast</Text><Text style={styles.sheetSub}>Preview audience, schedule and attachment before sending</Text></View><TouchableOpacity style={styles.closeButton} onPress={() => setComposeVisible(false)} disabled={sending}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
            <AppScrollView contentContainerStyle={styles.formContent} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
              <Label text="CATEGORY" /><View style={styles.choiceWrap}>{CATEGORIES.map((item) => <TouchableOpacity key={item.key} style={[styles.choice, category === item.key && { backgroundColor: item.bg, borderColor: item.color }]} onPress={() => setCategory(item.key)}><Feather name={item.icon} size={14} color={category === item.key ? item.color : "#64748B"} /><Text style={[styles.choiceText, category === item.key && { color: item.color }]}>{item.label}</Text></TouchableOpacity>)}</View>
              <Label text="TITLE *" /><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Clear public title" placeholderTextColor="#94A3B8" returnKeyType="next" />
              <Label text="MESSAGE *" /><TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={setBody} placeholder="Write the complete public message" placeholderTextColor="#94A3B8" multiline textAlignVertical="top" />
              <Label text="ATTACHMENT (OPTIONAL)" /><BroadcastMediaPicker value={media} onChange={setMedia} onError={setFormError} disabled={sending} />
              <Label text="CONTENT LANGUAGE" /><View style={styles.choiceWrap}>{LANGUAGES.map((item) => <TouchableOpacity key={item.key} style={[styles.choice, language === item.key && styles.choiceActive]} onPress={() => setLanguage(item.key)}><Text style={[styles.choiceText, language === item.key && styles.choiceTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
              {isSuperAdmin ? <><Label text="AUDIENCE" /><View style={styles.choiceWrap}>{AUDIENCES.map((item) => <TouchableOpacity key={item.key} style={[styles.choice, audienceRole === item.key && styles.choiceActive]} onPress={() => setAudienceRole(item.key)}><Text style={[styles.choiceText, audienceRole === item.key && styles.choiceTextActive]}>{item.label}</Text></TouchableOpacity>)}</View><Label text="WARD" /><TouchableOpacity style={[styles.input, styles.picker]} onPress={() => setWardPickerVisible(true)}><Text style={styles.pickerText}>{ward}</Text><Feather name="chevron-down" size={16} color="#64748B" /></TouchableOpacity></> : <View style={styles.scopeBanner}><Feather name="shield" size={14} color="#166534" /><Text style={styles.scopeText}>Nagarsevak broadcasts are limited to citizens in {user?.ward || "the assigned ward"}.</Text></View>}
              <Label text="SCHEDULE (OPTIONAL)" /><AppDateTimePicker value={scheduledAt} onChange={setScheduledAt} placeholder="Select date and time" minimumDate={new Date(Date.now() + 60_000)} accessibilityLabel="Schedule date and time" /><Text style={styles.help}>Leave blank to send immediately. Scheduled broadcasts require a future time.</Text>
              <View style={styles.preview}><Text style={styles.previewLabel}>PREVIEW</Text><Text style={styles.previewTitle}>{title.trim() || "Broadcast title"}</Text><Text style={styles.previewBody}>{body.trim() || "Your message preview will appear here."}</Text><Text style={styles.previewMeta}>{ward} · {audienceRole} · {language.toUpperCase()}{media ? ` · ${media.type}` : ""}</Text></View>
              {formError ? <Text style={styles.formError} accessibilityLiveRegion="assertive">{formError}</Text> : null}
              <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={send} disabled={sending}>{sending ? <ActivityIndicator color="white" /> : <Feather name={scheduledAt ? "clock" : "send"} size={17} color="white" />}<Text style={styles.sendText}>{sending ? (media ? "Uploading..." : "Saving...") : scheduledAt ? "Schedule broadcast" : "Send in-app broadcast"}</Text></TouchableOpacity>
            </AppScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={wardPickerVisible} transparent animationType="slide" onRequestClose={() => setWardPickerVisible(false)}><View style={styles.modalOverlay}><View style={[styles.sheet, styles.wardSheet]}><View style={styles.handle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Select Ward</Text><TouchableOpacity style={styles.closeButton} onPress={() => setWardPickerVisible(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><AppScrollView contentContainerStyle={styles.wardList}>{["All Wards", ...NAGARSEVAK_WARDS].map((item) => <TouchableOpacity key={item} style={[styles.wardRow, ward === item && styles.wardActive]} onPress={() => { setWard(item); setWardPickerVisible(false); }}><Text style={[styles.wardText, ward === item && styles.choiceTextActive]}>{item}</Text>{ward === item ? <Feather name="check" size={16} color={ORANGE} /> : null}</TouchableOpacity>)}</AppScrollView></View></View></Modal>
    </View>
  );
}
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function Stat({ value, label }: { value: number; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG }, header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 }, backText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" }, createButton: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 13, backgroundColor: "white", paddingHorizontal: 13 }, createText: { color: "#166534", fontSize: 12, fontFamily: "Inter_700Bold" },
  headerTitle: { color: "white", fontSize: 23, fontFamily: "Inter_700Bold" }, headerSub: { marginTop: 4, color: "rgba(255,255,255,0.75)", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" }, statsRow: { marginTop: 14, flexDirection: "row", gap: 7 }, stat: { flex: 1, alignItems: "center", borderRadius: 13, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.14)" }, statValue: { color: "white", fontSize: 17, fontFamily: "Inter_700Bold" }, statLabel: { marginTop: 1, color: "rgba(255,255,255,0.68)", fontSize: 8.8, fontFamily: "Inter_500Medium" },
  content: { padding: 14, gap: 11 }, infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 15, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" }, infoText: { flex: 1, color: "#1D4ED8", fontSize: 10.5, lineHeight: 16, fontFamily: "Inter_400Regular" }, errorBanner: { margin: 14, marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 13, padding: 11, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" }, errorText: { flex: 1, color: "#92400E", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_500Medium" }, retryText: { color: "#B45309", fontSize: 10.5, fontFamily: "Inter_700Bold" }, center: { padding: 34, alignItems: "center" }, centerText: { marginTop: 8, color: "#64748B", fontSize: 11.5, fontFamily: "Inter_500Medium" },
  empty: { padding: 30, alignItems: "center", borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, emptyTitle: { marginTop: 10, color: "#0F172A", fontSize: 16, fontFamily: "Inter_700Bold" }, emptyText: { marginTop: 5, color: "#64748B", fontSize: 11.5, textAlign: "center", fontFamily: "Inter_400Regular" },
  card: { padding: 14, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, cardTop: { flexDirection: "row", alignItems: "center", gap: 10 }, categoryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, cardCopy: { flex: 1, minWidth: 0 }, cardTitle: { color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" }, cardMeta: { marginTop: 2, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" }, statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }, statusText: { fontSize: 8.8, fontFamily: "Inter_700Bold" }, cardBody: { marginTop: 10, color: "#475569", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" }, cardImage: { marginTop: 10, width: "100%", height: 180, borderRadius: 14, backgroundColor: "#F1F5F9" },
  videoRow: { marginTop: 10, minHeight: 64, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 10 }, videoCopy: { flex: 1 }, videoTitle: { color: "#9A3412", fontSize: 11.5, fontFamily: "Inter_700Bold" }, videoMeta: { marginTop: 2, color: "#C2410C", fontSize: 9.5, fontFamily: "Inter_400Regular" }, metrics: { marginTop: 12, flexDirection: "row", gap: 6 }, metric: { flex: 1, minHeight: 52, borderRadius: 12, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" }, metricValue: { color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold" }, providerValue: { color: "#B45309", fontSize: 10.5 }, metricLabel: { marginTop: 2, color: "#94A3B8", fontSize: 8.2, fontFamily: "Inter_500Medium" },
  cardFooter: { marginTop: 10, gap: 8 }, cardDate: { color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" }, actionRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end" }, actionButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1 }, pauseButton: { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }, resumeButton: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }, deleteButton: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }, pauseText: { color: "#7C3AED", fontSize: 10.5, fontFamily: "Inter_700Bold" }, resumeText: { color: "#166534", fontSize: 10.5, fontFamily: "Inter_700Bold" }, deleteText: { color: "#DC2626", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.58)" }, sheet: { maxHeight: "94%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", overflow: "hidden" }, handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", marginTop: 10 }, sheetHeader: { minHeight: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }, sheetHeaderCopy: { flex: 1, minWidth: 0 }, sheetTitle: { color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" }, sheetSub: { marginTop: 2, color: "#64748B", fontSize: 10.5, fontFamily: "Inter_400Regular" }, closeButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" }, formContent: { padding: 18, paddingBottom: 38 }, label: { marginTop: 12, marginBottom: 6, color: "#64748B", fontSize: 9.8, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 14, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_400Regular" }, textArea: { minHeight: 110, paddingTop: 13, paddingBottom: 13 }, choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, choice: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }, choiceActive: { borderColor: "#FED7AA", backgroundColor: "#FFF7ED" }, choiceText: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_600SemiBold" }, choiceTextActive: { color: ORANGE }, picker: { flexDirection: "row", alignItems: "center" }, pickerText: { flex: 1, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_500Medium" }, scopeBanner: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 12, padding: 10, backgroundColor: "#DCFCE7" }, scopeText: { flex: 1, color: "#166534", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_500Medium" }, help: { marginTop: 5, color: "#94A3B8", fontSize: 9.8, lineHeight: 14, fontFamily: "Inter_400Regular" }, preview: { marginTop: 16, borderRadius: 16, padding: 13, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, previewLabel: { color: "#C2410C", fontSize: 9, letterSpacing: 1, fontFamily: "Inter_700Bold" }, previewTitle: { marginTop: 8, color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" }, previewBody: { marginTop: 7, color: "#475569", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" }, previewMeta: { marginTop: 8, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_500Medium" }, formError: { marginTop: 12, color: "#DC2626", fontSize: 11.5, lineHeight: 17, textAlign: "center", fontFamily: "Inter_600SemiBold" }, sendButton: { marginTop: 16, minHeight: 50, borderRadius: 14, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, sendText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" }, disabled: { opacity: 0.65 }, wardSheet: { maxHeight: "72%" }, wardList: { padding: 16 }, wardRow: { minHeight: 52, flexDirection: "row", alignItems: "center", borderRadius: 13, paddingHorizontal: 13, marginBottom: 6, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" }, wardActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }, wardText: { flex: 1, color: "#334155", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
''')

# ---------------------------------------------------------------------------
# Citizen News tab: combine Alerts, Broadcasts and community posts.
# ---------------------------------------------------------------------------
write("mobile/app/(tabs)/feed.tsx", r'''
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Image, Share, TextInput, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useFeed, FeedPost, PostType } from "@/context/FeedContext";
import { AppAlert, useAlerts, wardKey } from "@/context/AlertContext";
import { AppBroadcast, useBroadcasts } from "@/context/BroadcastContext";
import { ambernathWards } from "@/data/mumbaiServices";
import { useAuth } from "@/context/AuthContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";

const postTypeConfig: Record<PostType, { color: string; bg: string; icon: string }> = {
  announcement: { color: "#DC2626", bg: "#FEE2E2", icon: "alert-circle" }, update: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" }, complaint: { color: "#D97706", bg: "#FEF3C7", icon: "alert-triangle" }, general: { color: "#EA580C", bg: "#FFEDD5", icon: "message-circle" },
};
const roleBadgeColor: Record<string, { bg: string; text: string }> = { citizen: { bg: "#FFF7ED", text: "#EA580C" }, nagarsevak: { bg: "#ECFDF5", text: "#059669" }, super_admin: { bg: "#EDE9FE", text: "#6D28D9" } };
function timeAgo(dateStr: string) { const ts = new Date(dateStr).getTime(); if (!Number.isFinite(ts)) return "now"; const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000)); if (mins < 1) return "now"; if (mins < 60) return `${mins}m`; const hours = Math.floor(mins / 60); return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`; }
function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) { const initials = name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U"; return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: size * 0.35, color: "white", fontFamily: "Inter_700Bold" }}>{initials}</Text></View>; }
function InlineVideo({ uri }: { uri: string }) { return <TouchableOpacity style={styles.postVideo} activeOpacity={0.85} onPress={() => void Linking.openURL(uri)} accessibilityRole="button" accessibilityLabel="Play attached video"><Feather name="play-circle" size={32} color="#EA580C" /><Text style={styles.postVideoText}>Play attached video</Text></TouchableOpacity>; }
async function shareText(title: string, body: string) { const message = `${title}\n\n${body}\n\n— Connect-T Ambernath`; if (Platform.OS === "web" && typeof navigator !== "undefined" && (navigator as any).share) await (navigator as any).share({ title, text: message }); else await Share.share({ title, message }); }

function PostCard({ post, userId }: { post: FeedPost; userId: string }) {
  const router = useRouter(); const { toggleLike } = useFeed(); const liked = post.likes.includes(userId); const type = postTypeConfig[post.type] || postTypeConfig.general; const role = roleBadgeColor[String(post.authorRole || "").toLowerCase()] || roleBadgeColor.citizen;
  return <View style={[styles.card, post.pinned && styles.cardPinned]}>{post.pinned ? <View style={styles.pinnedBar}><Feather name="bookmark" size={10} color="#7C3AED" /><Text style={styles.pinnedText}>Pinned official post</Text></View> : null}<View style={styles.cardMeta}><Avatar name={post.authorName} color={post.avatarColor} size={34} /><View style={styles.authorCopy}><Text style={styles.cardAuthor} numberOfLines={1}>{post.authorName}</Text><Text style={styles.cardTime}>{timeAgo(post.createdAt)}</Text></View><View style={[styles.roleBadge, { backgroundColor: role.bg }]}><Text style={[styles.roleBadgeText, { color: role.text }]}>{post.authorRole}</Text></View></View><View style={[styles.typePill, { backgroundColor: type.bg }]}><Feather name={type.icon as any} size={10} color={type.color} /><Text style={[styles.typePillText, { color: type.color }]}>{post.type}</Text></View><Text style={styles.cardContent}>{post.content}</Text>{post.imageUri ? <Image source={{ uri: post.imageUri }} style={styles.postImage} resizeMode="contain" /> : null}<View style={styles.cardActions}><TouchableOpacity style={styles.action} onPress={() => { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void toggleLike(post.id, userId); }}><Feather name="heart" size={17} color={liked ? "#DC2626" : "#64748B"} /><Text style={[styles.actionText, liked && styles.likedText]}>{post.likes.length || "Like"}</Text></TouchableOpacity><TouchableOpacity style={styles.action} onPress={() => router.push({ pathname: "/feed/comments/[id]", params: { id: post.id, title: post.content.slice(0, 80) } } as any)}><Feather name="message-circle" size={17} color="#64748B" /><Text style={styles.actionText}>{post.commentsCount || "Comment"}</Text></TouchableOpacity><TouchableOpacity style={styles.action} onPress={() => void shareText(`${post.authorName}'s post`, post.content)}><Feather name="share-2" size={17} color="#64748B" /><Text style={styles.actionText}>Share</Text></TouchableOpacity></View></View>;
}

function NewsAlertCard({ item }: { item: AppAlert }) {
  const isAlert = item.type === "alert" || item.type === "emergency"; const color = isAlert ? "#DC2626" : "#EA580C"; const bg = isAlert ? "#FEE2E2" : "#FFEDD5";
  return <View style={styles.card}><View style={styles.cardMeta}><Avatar name={item.postedBy || "Nagarsevak"} color="#16A34A" size={34} /><View style={styles.authorCopy}><Text style={styles.cardAuthor}>{item.postedBy || "Nagarsevak"}</Text><Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text></View><View style={[styles.roleBadge, { backgroundColor: "#ECFDF5" }]}><Text style={[styles.roleBadgeText, { color: "#059669" }]}>Official</Text></View></View><View style={[styles.typePill, { backgroundColor: bg }]}><Feather name={isAlert ? "alert-triangle" : "radio"} size={10} color={color} /><Text style={[styles.typePillText, { color }]}>{isAlert ? "alert" : "news"}</Text></View><Text style={styles.newsTitle}>{item.title}</Text><Text style={styles.cardContent}>{item.body}</Text>{item.media?.type === "image" ? <Image source={{ uri: item.media.uri }} style={styles.postImage} resizeMode="contain" /> : item.media?.type === "video" ? <InlineVideo uri={item.media.uri} /> : null}<TouchableOpacity style={styles.officialShare} onPress={() => void shareText(item.title, item.body)}><Feather name="share-2" size={14} color="#059669" /><Text style={styles.officialShareText}>Share official update</Text></TouchableOpacity></View>;
}

function broadcastMeta(category: AppBroadcast["category"]) {
  if (category === "emergency") return { label: "Emergency", icon: "alert-triangle" as const, color: "#DC2626", bg: "#FEE2E2" };
  if (category === "information") return { label: "Information", icon: "info" as const, color: "#2563EB", bg: "#DBEAFE" };
  if (category === "notice") return { label: "Notice", icon: "file-text" as const, color: "#7C3AED", bg: "#EDE9FE" };
  return { label: "Announcement", icon: "radio" as const, color: "#B45309", bg: "#FEF3C7" };
}
function BroadcastCard({ item, highlighted }: { item: AppBroadcast; highlighted: boolean }) {
  const router = useRouter(); const meta = broadcastMeta(item.category);
  return <TouchableOpacity style={[styles.card, styles.officialCard, highlighted && styles.highlightedCard]} onPress={() => router.push({ pathname: "/(tabs)/feed", params: { broadcastId: item.id } } as any)} activeOpacity={0.9}><View style={styles.cardMeta}><Avatar name={item.createdByName || "Connect-T"} color="#16A34A" size={34} /><View style={styles.authorCopy}><Text style={styles.cardAuthor}>{item.createdByName || "Connect-T"}</Text><Text style={styles.cardTime}>{timeAgo(item.sentAt || item.createdAt)}</Text></View><View style={[styles.roleBadge, { backgroundColor: "#ECFDF5" }]}><Text style={[styles.roleBadgeText, { color: "#059669" }]}>Official</Text></View></View><View style={[styles.typePill, { backgroundColor: meta.bg }]}><Feather name={meta.icon} size={10} color={meta.color} /><Text style={[styles.typePillText, { color: meta.color }]}>{meta.label}</Text></View><Text style={styles.newsTitle}>{item.title}</Text><Text style={styles.cardContent}>{item.body}</Text>{item.mediaType === "image" && item.mediaUri ? <Image source={{ uri: item.mediaUri }} style={styles.postImage} resizeMode="contain" /> : item.mediaType === "video" && item.mediaUri ? <InlineVideo uri={item.mediaUri} /> : null}<View style={styles.broadcastFooter}><View style={styles.newsInfoChip}><Feather name="map-pin" size={11} color="#64748B" /><Text style={styles.newsInfoText}>{item.ward || "All wards"}</Text></View><Text style={styles.openText}>Open update</Text><Feather name="chevron-right" size={16} color="#EA580C" /></View></TouchableOpacity>;
}

type FeedItem = { kind: "alert"; createdAt: string; item: AppAlert } | { kind: "broadcast"; createdAt: string; item: AppBroadcast } | { kind: "post"; createdAt: string; item: FeedPost };
export default function FeedScreen() {
  const insets = useSafeAreaInsets(); const topPad = Platform.OS === "web" ? 67 : insets.top; const tabHeight = Platform.OS === "web" ? 72 : 56 + Math.max(insets.bottom, 8);
  const { posts, refreshFeed } = useFeed(); const { alerts: allAlerts, refreshAlerts } = useAlerts(); const { broadcasts, refreshBroadcasts } = useBroadcasts(); const { user } = useAuth(); const { handleScroll } = useTabBarVisibility();
  const params = useLocalSearchParams<{ broadcastId?: string | string[] }>(); const requestedId = Array.isArray(params.broadcastId) ? params.broadcastId[0] : params.broadcastId;
  const userId = user?.id || "guest"; const [searchQuery, setSearchQuery] = useState(""); const [selectedWard, setSelectedWard] = useState<string | null>(null); const [refreshing, setRefreshing] = useState(false);
  const rawQuery = searchQuery.trim(); const query = rawQuery.toLowerCase(); const wardMatch = rawQuery.match(/^(?:ward\s*|w\.?\s*)?(\d{1,3})$/i); const wardDigits = wardMatch?.[1] || ""; const wardSuggestions = wardDigits ? ambernathWards.filter((ward) => wardKey(ward).startsWith(wardDigits)).slice(0, 8) : [];
  const items = useMemo<FeedItem[]>(() => {
    const visibleAlerts = allAlerts.filter((item) => !item.ward || (!!user?.ward && wardKey(item.ward) === wardKey(user.ward)));
    const visibleBroadcasts = broadcasts.filter((item) => item.status === "sent");
    let alerts = visibleAlerts, official = visibleBroadcasts, community = posts;
    if (selectedWard) { const key = wardKey(selectedWard); alerts = allAlerts.filter((item) => wardKey(item.ward) === key || (!!item.location && wardKey(item.location) === key)); official = visibleBroadcasts.filter((item) => !item.ward || wardKey(item.ward) === key); community = []; }
    else if (query && !wardDigits) { alerts = visibleAlerts.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(query)); official = visibleBroadcasts.filter((item) => `${item.title} ${item.body} ${item.category} ${item.createdByName}`.toLowerCase().includes(query)); community = posts.filter((item) => `${item.authorName} ${item.content} ${item.type}`.toLowerCase().includes(query)); }
    else if (wardDigits) { alerts = []; official = []; community = []; }
    return [...official.map((item) => ({ kind: "broadcast" as const, createdAt: item.sentAt || item.createdAt, item })), ...alerts.map((item) => ({ kind: "alert" as const, createdAt: item.publishAt || item.createdAt, item })), ...community.map((item) => ({ kind: "post" as const, createdAt: item.createdAt, item }))].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allAlerts, broadcasts, posts, query, selectedWard, user?.ward, wardDigits]);
  const refresh = async () => { setRefreshing(true); try { await Promise.allSettled([refreshFeed(), refreshAlerts(), refreshBroadcasts()]); } finally { setRefreshing(false); } };
  const clearSearch = () => { setSearchQuery(""); setSelectedWard(null); };
  return <View style={styles.root}><LinearGradient colors={["#C2410C", "#EA580C", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}><TopShade height={100} /><DecorativeCircles /><Text style={styles.headerTitle}>News Feed</Text><Text style={styles.headerSub}>Official municipal, ward and community updates</Text><View style={styles.searchBar}><Feather name="search" size={16} color="#94A3B8" />{selectedWard ? <View style={styles.activeWardChip}><Feather name="map-pin" size={12} color="#EA580C" /><Text style={styles.activeWardChipText}>{selectedWard}</Text></View> : <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search updates or enter ward number" placeholderTextColor="#94A3B8" style={styles.searchInput} returnKeyType="search" />}{(selectedWard || rawQuery) ? <TouchableOpacity onPress={clearSearch}><Feather name="x-circle" size={17} color="#94A3B8" /></TouchableOpacity> : null}</View>{wardDigits ? <View style={styles.wardSuggestRow}>{wardSuggestions.length ? wardSuggestions.map((ward) => <TouchableOpacity key={ward} style={styles.wardSuggestChip} onPress={() => { setSelectedWard(ward); setSearchQuery(""); }}><Feather name="map-pin" size={11} color="#C2410C" /><Text style={styles.wardSuggestText}>{ward}</Text></TouchableOpacity>) : <Text style={styles.searchHint}>No matching ward</Text>}</View> : null}</LinearGradient><FlatList refreshing={refreshing} onRefresh={() => void refresh()} data={items} keyExtractor={(entry) => `${entry.kind}:${entry.item.id}`} renderItem={({ item }) => item.kind === "broadcast" ? <BroadcastCard item={item.item} highlighted={item.item.id === requestedId} /> : item.kind === "alert" ? <NewsAlertCard item={item.item} /> : <PostCard post={item.item} userId={userId} />} contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 8) + 20 + tabHeight }, !items.length && styles.emptyList]} showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16} ItemSeparatorComponent={() => <View style={styles.separator} />} keyboardShouldPersistTaps="handled" ListEmptyComponent={<View style={styles.emptyState}><Feather name="inbox" size={40} color="#CBD5E1" /><Text style={styles.emptyTitle}>No matching updates</Text><Text style={styles.emptyText}>Pull down to refresh or change your search.</Text></View>} /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" }, header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" }, headerTitle: { fontSize: 22, color: "white", fontFamily: "Inter_700Bold" }, headerSub: { fontSize: 11.5, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 2 }, searchBar: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 13, minHeight: 48, marginTop: 12 }, searchInput: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", paddingVertical: 0 }, activeWardChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFEDD5", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 }, activeWardChipText: { flex: 1, color: "#C2410C", fontSize: 12, fontFamily: "Inter_700Bold" }, wardSuggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }, wardSuggestChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "white", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 18 }, wardSuggestText: { color: "#C2410C", fontSize: 10.5, fontFamily: "Inter_700Bold" }, searchHint: { color: "white", fontSize: 10.5, fontFamily: "Inter_600SemiBold" },
  list: { paddingTop: 8 }, emptyList: { flexGrow: 1 }, separator: { height: 8 }, card: { backgroundColor: "white", padding: 14, marginHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0" }, officialCard: { borderColor: "#D1FAE5" }, highlightedCard: { borderColor: "#EA580C", borderWidth: 2 }, cardPinned: { borderColor: "#C4B5FD", borderLeftWidth: 4 }, pinnedBar: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 7 }, pinnedText: { color: "#7C3AED", fontSize: 9.5, fontFamily: "Inter_700Bold" }, cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 }, authorCopy: { flex: 1, minWidth: 0 }, cardAuthor: { color: "#0F172A", fontSize: 13, fontFamily: "Inter_700Bold" }, cardTime: { color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular", marginTop: 2 }, roleBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999 }, roleBadgeText: { fontSize: 8.5, textTransform: "capitalize", fontFamily: "Inter_700Bold" }, typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start", marginBottom: 8 }, typePillText: { fontSize: 9, textTransform: "capitalize", fontFamily: "Inter_700Bold" }, newsTitle: { color: "#0F172A", fontSize: 16, lineHeight: 21, marginBottom: 5, fontFamily: "Inter_700Bold" }, cardContent: { color: "#334155", fontSize: 13, lineHeight: 20, marginBottom: 9, fontFamily: "Inter_400Regular" }, postImage: { width: "100%", height: 240, borderRadius: 14, marginBottom: 10, backgroundColor: "#F8FAFC" }, postVideo: { width: "100%", height: 150, borderRadius: 14, marginBottom: 10, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", alignItems: "center", justifyContent: "center" }, postVideoText: { marginTop: 7, color: "#EA580C", fontSize: 11, fontFamily: "Inter_700Bold" }, cardActions: { flexDirection: "row", justifyContent: "space-between", paddingTop: 9, borderTopWidth: 1, borderTopColor: "#F1F5F9" }, action: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 8, borderRadius: 10 }, actionText: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_600SemiBold" }, likedText: { color: "#DC2626" }, officialShare: { minHeight: 42, borderRadius: 12, backgroundColor: "#ECFDF5", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, officialShareText: { color: "#059669", fontSize: 11, fontFamily: "Inter_700Bold" }, broadcastFooter: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8 }, newsInfoChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 }, newsInfoText: { color: "#64748B", fontSize: 10, fontFamily: "Inter_600SemiBold" }, openText: { marginLeft: "auto", color: "#EA580C", fontSize: 10.5, fontFamily: "Inter_700Bold" }, emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }, emptyTitle: { marginTop: 10, color: "#334155", fontSize: 15, fontFamily: "Inter_700Bold" }, emptyText: { marginTop: 4, color: "#64748B", fontSize: 11, textAlign: "center", fontFamily: "Inter_400Regular" },
});
''')

write("mobile/components/CivicBroadcastExperience.tsx", r'''
import { Feather } from "@expo/vector-icons";
import { useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppBroadcast, useBroadcasts } from "@/context/BroadcastContext";

const ORANGE = "#EA580C";
const GREEN = "#16A34A";
function categoryMeta(category: AppBroadcast["category"]) {
  if (category === "emergency") return { label: "Emergency", icon: "alert-triangle" as const, color: "#B91C1C", bg: "#FEE2E2" };
  if (category === "information") return { label: "Information", icon: "info" as const, color: "#1D4ED8", bg: "#DBEAFE" };
  if (category === "notice") return { label: "Notice", icon: "file-text" as const, color: "#6D28D9", bg: "#EDE9FE" };
  return { label: "Announcement", icon: "radio" as const, color: "#B45309", bg: "#FEF3C7" };
}
function BroadcastDetailModal({ item, onClose }: { item: AppBroadcast | null; onClose: () => void }) {
  if (!item) return null; const meta = categoryMeta(item.category);
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalBackdrop} accessibilityViewIsModal><View style={styles.modalCard}><View style={styles.modalHeader}><View style={[styles.modalIcon, { backgroundColor: meta.bg }]}><Feather name={item.mediaType === "video" ? "play-circle" : item.mediaType === "image" ? "image" : meta.icon} size={24} color={meta.color} /></View><View style={styles.modalHeaderCopy}><Text style={[styles.modalType, { color: meta.color }]}>{meta.label}</Text><Text style={styles.modalDate}>{new Date(item.sentAt || item.createdAt).toLocaleString("en-IN")}</Text></View><TouchableOpacity style={styles.closeIcon} onPress={onClose}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}><Text style={styles.modalTitle}>{item.title}</Text><Text style={styles.modalBody}>{item.body}</Text>{item.mediaType === "image" && item.mediaUri ? <Image source={{ uri: item.mediaUri }} style={styles.fullImage} resizeMode="contain" /> : null}{item.mediaType === "video" && item.mediaUri ? <TouchableOpacity style={styles.playButton} onPress={() => void Linking.openURL(item.mediaUri!)}><Feather name="play-circle" size={22} color="white" /><Text style={styles.playText}>Play attached video</Text>{item.mediaDurationSeconds ? <Text style={styles.durationText}>{Math.ceil(item.mediaDurationSeconds / 60)} min</Text> : null}</TouchableOpacity> : null}<View style={styles.metaRow}><View style={styles.metaPill}><Feather name="users" size={12} color="#64748B" /><Text style={styles.metaText}>{item.ward || "All citizens"}</Text></View><View style={styles.metaPill}><Feather name="user" size={12} color="#64748B" /><Text style={styles.metaText}>{item.createdByName || "Connect-T"}</Text></View></View></ScrollView><TouchableOpacity style={styles.doneButton} onPress={onClose}><Text style={styles.doneText}>Back to News</Text></TouchableOpacity></View></View></Modal>;
}
export default function CivicBroadcastExperience() {
  const router = useRouter(); const segments = useSegments(); const params = useGlobalSearchParams<{ broadcastId?: string | string[] }>(); const { broadcasts, refreshBroadcasts, markBroadcastRead } = useBroadcasts(); const openedReadId = useRef<string | null>(null);
  const requestedId = Array.isArray(params.broadcastId) ? params.broadcastId[0] : params.broadcastId; const selectedBroadcast = requestedId ? broadcasts.find((item) => item.id === requestedId && item.status === "sent") || null : null; const firstSegment = String(segments[0] || ""); const secondSegment = String(segments[1] || ""); const isCitizenNewsTab = firstSegment === "(tabs)" && secondSegment === "feed"; const isLegacyNewsRoute = firstSegment === "alert" && secondSegment === "list"; const isNewsRoute = isCitizenNewsTab || isLegacyNewsRoute;
  useEffect(() => { if (requestedId && !selectedBroadcast) void refreshBroadcasts().catch(() => undefined); }, [refreshBroadcasts, requestedId, selectedBroadcast]);
  useEffect(() => { if (!selectedBroadcast || selectedBroadcast.isRead || openedReadId.current === selectedBroadcast.id) return; openedReadId.current = selectedBroadcast.id; void markBroadcastRead(selectedBroadcast.id).catch(() => { openedReadId.current = null; }); }, [markBroadcastRead, selectedBroadcast]);
  const closeBroadcast = () => { if (isCitizenNewsTab) router.replace("/(tabs)/feed" as any); else router.replace("/alert/list" as any); };
  return <BroadcastDetailModal item={isNewsRoute ? selectedBroadcast : null} onClose={closeBroadcast} />;
}
const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18, backgroundColor: "rgba(15,23,42,0.66)" }, modalCard: { width: "100%", maxWidth: 520, maxHeight: "92%", borderRadius: 24, backgroundColor: "white", padding: 18 }, modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, modalIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, modalHeaderCopy: { flex: 1 }, modalType: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter_700Bold" }, modalDate: { marginTop: 3, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" }, closeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" }, modalScroll: { marginTop: 14 }, modalContent: { paddingBottom: 10 }, modalTitle: { color: "#0F172A", fontSize: 21, lineHeight: 28, fontFamily: "Inter_700Bold" }, modalBody: { marginTop: 10, color: "#475569", fontSize: 13, lineHeight: 21, fontFamily: "Inter_400Regular" }, fullImage: { marginTop: 14, width: "100%", height: 300, borderRadius: 16, backgroundColor: "#F8FAFC" }, playButton: { marginTop: 14, minHeight: 54, borderRadius: 15, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: ORANGE }, playText: { color: "white", fontSize: 12.5, fontFamily: "Inter_700Bold" }, durationText: { marginLeft: "auto", color: "rgba(255,255,255,0.82)", fontSize: 10, fontFamily: "Inter_600SemiBold" }, metaRow: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 7 }, metaPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: "#F8FAFC" }, metaText: { color: "#64748B", fontSize: 10, fontFamily: "Inter_600SemiBold" }, doneButton: { marginTop: 14, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: GREEN }, doneText: { color: "white", fontSize: 12.5, fontFamily: "Inter_700Bold" },
});
''')

# Home: only announcements in the existing top Alerts bar; tapping opens the
# exact item in the News tab. Removing the global floating bar fixes overlap.
replace_once("mobile/app/(tabs)/index.tsx", 'import { useAlerts, AppAlert, wardKey } from "@/context/AlertContext";', 'import { useAlerts, AppAlert, wardKey } from "@/context/AlertContext";\nimport { useBroadcasts } from "@/context/BroadcastContext";')
replace_once("mobile/app/(tabs)/index.tsx", '  const { alerts: allAlerts, refreshAlerts } = useAlerts();\n  const { complaints, refreshComplaints } = useComplaints();', '  const { alerts: allAlerts, refreshAlerts } = useAlerts();\n  const { broadcasts, refreshBroadcasts } = useBroadcasts();\n  const { complaints, refreshComplaints } = useComplaints();')
replace_once("mobile/app/(tabs)/index.tsx", '''  const alerts = allAlerts.filter((a) => !a.ward || (!!user?.ward && wardKey(a.ward) === wardKey(user.ward)));
  const alertItems = alerts.filter((item) => item.type === "alert" || item.type === "emergency");
  const newsItems = alerts.filter((item) => item.type === "news");''', '''  const alerts = allAlerts.filter((a) => !a.ward || (!!user?.ward && wardKey(a.ward) === wardKey(user.ward)));
  const alertItems: AppAlert[] = broadcasts
    .filter((item) => item.status === "sent" && item.category === "announcement")
    .map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      type: "alert" as const,
      category: "announcement",
      priority: "important" as const,
      language: item.language,
      status: "published" as const,
      publishAt: item.sentAt || item.createdAt,
      targetAudience: item.audienceRole,
      media: item.mediaUri && item.mediaType ? { uri: item.mediaUri, type: item.mediaType } : null,
      createdAt: item.sentAt || item.createdAt,
      postedBy: item.createdByName,
      postedById: item.createdBy,
      ward: item.ward,
      isRead: item.isRead,
      deliveredCount: item.deliveredCount,
      readCount: item.readCount,
    }));
  const newsItems = alerts.filter((item) => item.type === "news");''')
replace_once("mobile/app/(tabs)/index.tsx", 'onAppRefresh={() => Promise.all([refreshAlerts(), refreshComplaints()]).then(() => undefined)}', 'onAppRefresh={() => Promise.all([refreshAlerts(), refreshBroadcasts(), refreshComplaints()]).then(() => undefined)}')
replace_once("mobile/app/(tabs)/index.tsx", '<Text style={styles.alertsEmptyText}>No alerts right now</Text>', '<Text style={styles.alertsEmptyText}>No announcements right now</Text>')
replace_once("mobile/app/(tabs)/index.tsx", '                const cardColor = "#DC2626";\n                const cardBg = "#FEE2E2";', '                const cardColor = "#C2410C";\n                const cardBg = "#FFEDD5";')
replace_once("mobile/app/(tabs)/index.tsx", 'onPress={() => openAlertDetail(item)}', 'onPress={() => router.push({ pathname: "/(tabs)/feed", params: { broadcastId: item.id } } as any)}')
replace_once("mobile/app/(tabs)/index.tsx", '<Feather name="alert-triangle" size={16} color={cardColor} />', '<Feather name="radio" size={16} color={cardColor} />')
replace_once("mobile/app/(tabs)/index.tsx", '                            ⚠ {t("alert")}', '                            Announcement')

# ---------------------------------------------------------------------------
# Backend broadcast pause/resume/delete actions, loaded before legacy update.
# ---------------------------------------------------------------------------
write("backend/broadcastActionsPatch.js", r'''
"use strict";
const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");
const { removeManagedMedia } = require("./mediaStorage");
let pool = null;
let installed = false;
function sendJson(res, status, payload) { if (res.headersSent) return res; return res.status(status).json(payload); }
function cleanText(value, max = 100) { return String(value || "").trim().slice(0, max); }
function isSuperAdmin(user) { return !!user && (user.role === "super_admin" || !!user.is_super_admin); }
async function currentUser(req) {
  const auth = verifyRequestToken(req); if (!auth?.sub || auth.scope === "job_portal") return null;
  const [rows] = await pool.query("SELECT id, mobile, role, is_super_admin FROM users WHERE id = ? LIMIT 1", [auth.sub]);
  const user = rows[0] || null; if (!user) return null;
  if (["nagarsevak", "super_admin"].includes(user.role)) { const active = await isPrivilegedRoleActive(pool, { userId: user.id, mobile: user.mobile, role: user.role }); if (!active) return null; }
  return user;
}
async function loadBroadcast(id, executor = pool, lock = false) { const [rows] = await executor.query(`SELECT * FROM broadcasts WHERE id = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`, [id]); return rows[0] || null; }
function canManage(user, row) { return isSuperAdmin(user) || String(row.created_by || "") === String(user?.id || ""); }
async function updateAction(req, res, next) {
  const action = cleanText(req.body?.action, 30).toLowerCase();
  if (action === "archive") return sendJson(res, 410, { success: false, code: "BROADCAST_ARCHIVE_REMOVED", message: "Archive has been replaced by Pause and Delete." });
  if (!["pause", "resume"].includes(action)) return next();
  try {
    if (!pool) throw new Error("Database pool unavailable");
    const user = await currentUser(req); if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again." });
    const id = cleanText(req.params?.id, 80); const existing = await loadBroadcast(id);
    if (!existing) return sendJson(res, 404, { success: false, message: "Broadcast not found." });
    if (!canManage(user, existing)) return sendJson(res, 403, { success: false, message: "You can manage only broadcasts created from your account." });
    if (action === "pause") {
      if (existing.status === "paused") return sendJson(res, 200, { success: true, broadcast: existing });
      if (!["sent", "scheduled"].includes(String(existing.status))) return sendJson(res, 409, { success: false, message: "Only sent or scheduled broadcasts can be paused." });
      await pool.query("UPDATE broadcasts SET status = 'paused' WHERE id = ?", [id]);
    } else {
      if (existing.status !== "paused") return sendJson(res, 409, { success: false, message: "Only paused broadcasts can be resumed." });
      const scheduledAt = existing.scheduled_at ? new Date(existing.scheduled_at) : null;
      const nextStatus = scheduledAt && Number.isFinite(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now() ? "scheduled" : "sent";
      await pool.query("UPDATE broadcasts SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN COALESCE(sent_at, NOW()) ELSE sent_at END WHERE id = ?", [nextStatus, nextStatus, id]);
    }
    return sendJson(res, 200, { success: true, broadcast: await loadBroadcast(id) });
  } catch (error) {
    console.warn("[BroadcastActionsPatch] update failed", error?.code || error?.name || "broadcast_action_error");
    return sendJson(res, 500, { success: false, message: "The broadcast could not be changed right now." });
  }
}
async function deleteBroadcast(req, res) {
  let mediaUri = null;
  try {
    if (!pool) throw new Error("Database pool unavailable");
    const user = await currentUser(req); if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again." });
    const id = cleanText(req.params?.id, 80); const connection = await pool.getConnection();
    try {
      await connection.beginTransaction(); const existing = await loadBroadcast(id, connection, true);
      if (!existing) { await connection.rollback(); return sendJson(res, 404, { success: false, message: "Broadcast not found." }); }
      if (!canManage(user, existing)) { await connection.rollback(); return sendJson(res, 403, { success: false, message: "You can delete only broadcasts created from your account." }); }
      mediaUri = existing.media_uri || null;
      await connection.query("DELETE FROM broadcast_receipts WHERE broadcast_id = ?", [id]);
      await connection.query("DELETE FROM broadcasts WHERE id = ?", [id]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    if (mediaUri) await removeManagedMedia(mediaUri, "broadcast").catch((error) => console.warn("[BroadcastActionsPatch] media cleanup warning", error?.code || "cleanup_error"));
    return sendJson(res, 200, { success: true, broadcastId: id, deleted: true });
  } catch (error) {
    console.warn("[BroadcastActionsPatch] delete failed", error?.code || error?.name || "broadcast_delete_error");
    return sendJson(res, 500, { success: false, message: "The broadcast could not be deleted right now." });
  }
}
try { const mysql = require("mysql2/promise"); const originalCreatePool = mysql.createPool; mysql.createPool = function patchedCreatePool(...args) { pool = originalCreatePool.apply(this, args); return pool; }; } catch (error) { console.warn("[BroadcastActionsPatch] database hook disabled", error.message); }
try {
  const express = require("express"); const originalPatch = express.application.patch; const originalDelete = express.application.delete;
  function install(app) { if (installed) return; installed = true; originalPatch.call(app, "/api/broadcasts/:id", updateAction); originalDelete.call(app, "/api/broadcasts/:id", deleteBroadcast); console.log("[BroadcastActionsPatch] pause, resume and delete actions active"); }
  express.application.patch = function patchedPatch(path, ...handlers) { install(this); return originalPatch.call(this, path, ...handlers); };
  express.application.delete = function patchedDelete(path, ...handlers) { install(this); return originalDelete.call(this, path, ...handlers); };
} catch (error) { console.warn("[BroadcastActionsPatch] route hook disabled", error.message); }
module.exports = { updateAction, deleteBroadcast };
''')

# ---------------------------------------------------------------------------
# Utility status management API and Nagarsevak current-update UI.
# ---------------------------------------------------------------------------
write("backend/utilityStatusActionsPatch.js", r'''
"use strict";
const { verifyRequestToken } = require("./authSecurity");
const { isPrivilegedRoleActive } = require("./roleAuthorization");
let pool = null;
let installed = false;
function sendJson(res, status, payload) { if (res.headersSent) return res; return res.status(status).json(payload); }
function clean(value, max = 500) { return String(value ?? "").trim().slice(0, max); }
function wardKey(value) { return clean(value, 160).toLowerCase().replace(/\s+/g, " "); }
function present(row) { return { id: row.id, ward: row.ward, wardCode: row.ward_code, utilityType: row.utility_type, title: row.title, status: row.status, hoursPerDay: row.hours_per_day, scheduleText: row.schedule_text, description: row.description, helpline: row.helpline, source: row.source, postedById: row.posted_by_id, postedByName: row.posted_by_name, createdAt: row.created_at, updatedAt: row.updated_at }; }
function isSuperAdmin(user) { return !!user && (user.role === "super_admin" || !!user.is_super_admin); }
async function currentUser(req) { const auth = verifyRequestToken(req); if (!auth?.sub || auth.scope === "job_portal") return null; const [rows] = await pool.query("SELECT id, mobile, role, ward, is_super_admin FROM users WHERE id = ? LIMIT 1", [auth.sub]); const user = rows[0] || null; if (!user) return null; if (["nagarsevak", "super_admin"].includes(user.role)) { const active = await isPrivilegedRoleActive(pool, { userId: user.id, mobile: user.mobile, role: user.role }); if (!active) return null; } return user; }
async function load(id, executor = pool, lock = false) { const [rows] = await executor.query(`SELECT * FROM utility_statuses WHERE id = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`, [id]); return rows[0] || null; }
function canManage(user, row) { return isSuperAdmin(user) || (user?.role === "nagarsevak" && String(row.posted_by_id || "") === String(user.id) && wardKey(row.ward) === wardKey(user.ward)); }
async function updateStatus(req, res) {
  try {
    if (!pool) throw new Error("Database pool unavailable"); const user = await currentUser(req); if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    const id = clean(req.params?.id, 80); const existing = await load(id); if (!existing || !existing.is_active) return sendJson(res, 404, { success: false, message: "Active utility status not found." });
    if (!canManage(user, existing)) return sendJson(res, 403, { success: false, message: "You can update only utility statuses posted from your account." });
    const status = clean(req.body?.status ?? existing.status, 60).toLowerCase(); if (!["normal", "reduced", "maintenance", "outage"].includes(status)) return sendJson(res, 400, { success: false, message: "Choose Normal, Reduced, Maintenance or Outage." });
    const title = clean(req.body?.title ?? existing.title, 190); const hours = clean(req.body?.hoursPerDay ?? req.body?.hours_per_day ?? existing.hours_per_day, 40) || null; const schedule = clean(req.body?.scheduleText ?? req.body?.schedule_text ?? existing.schedule_text, 500) || null; const description = clean(req.body?.description ?? existing.description, 3000) || null; const helpline = clean(req.body?.helpline ?? existing.helpline, 160) || null; const source = clean(req.body?.source ?? existing.source, 190) || null;
    if (!title || !schedule || !description) return sendJson(res, 400, { success: false, message: "Time and public message are required." });
    await pool.query("UPDATE utility_statuses SET title = ?, status = ?, hours_per_day = ?, schedule_text = ?, description = ?, helpline = ?, source = ?, is_active = 1 WHERE id = ?", [title, status, hours, schedule, description, helpline, source, id]);
    return sendJson(res, 200, { success: true, status: present(await load(id)) });
  } catch (error) { console.warn("[UtilityStatusActionsPatch] update failed", error?.code || error?.name || "utility_update_error"); return sendJson(res, 500, { success: false, message: "The utility status could not be updated right now." }); }
}
async function deleteStatus(req, res) {
  try {
    if (!pool) throw new Error("Database pool unavailable"); const user = await currentUser(req); if (!user) return sendJson(res, 401, { success: false, message: "Please log in again." });
    const id = clean(req.params?.id, 80); const existing = await load(id); if (!existing || !existing.is_active) return sendJson(res, 404, { success: false, message: "Active utility status not found." });
    if (!canManage(user, existing)) return sendJson(res, 403, { success: false, message: "You can delete only utility statuses posted from your account." });
    await pool.query("UPDATE utility_statuses SET is_active = 0 WHERE id = ?", [id]); return sendJson(res, 200, { success: true, statusId: id, deleted: true });
  } catch (error) { console.warn("[UtilityStatusActionsPatch] delete failed", error?.code || error?.name || "utility_delete_error"); return sendJson(res, 500, { success: false, message: "The utility status could not be deleted right now." }); }
}
try { const mysql = require("mysql2/promise"); const originalCreatePool = mysql.createPool; mysql.createPool = function patchedCreatePool(...args) { pool = originalCreatePool.apply(this, args); return pool; }; } catch (error) { console.warn("[UtilityStatusActionsPatch] database hook disabled", error.message); }
try { const express = require("express"); const originalPatch = express.application.patch; const originalDelete = express.application.delete; function install(app) { if (installed) return; installed = true; originalPatch.call(app, "/api/utility-status/:id", updateStatus); originalDelete.call(app, "/api/utility-status/:id", deleteStatus); console.log("[UtilityStatusActionsPatch] owner-bound edit and delete active"); } express.application.patch = function patchedPatch(path, ...handlers) { install(this); return originalPatch.call(this, path, ...handlers); }; express.application.delete = function patchedDelete(path, ...handlers) { install(this); return originalDelete.call(this, path, ...handlers); }; } catch (error) { console.warn("[UtilityStatusActionsPatch] route hook disabled", error.message); }
module.exports = { updateStatus, deleteStatus };
''')

write("mobile/lib/utilityStatusApi.ts", r'''
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
export type UtilityType = "water" | "electricity";
export type UtilityStatus = { id: string; ward: string; wardCode?: string | null; utilityType: UtilityType; title: string; status: string; hoursPerDay?: string | null; scheduleText?: string | null; description?: string | null; helpline?: string | null; source?: string | null; postedById?: string | null; postedByName?: string | null; createdAt?: string; updatedAt?: string; };
export type UtilityStatusInput = { ward?: string | null; wardCode?: string | null; utilityType: UtilityType; title?: string; status: string; hoursPerDay?: string; scheduleText?: string; description?: string; helpline?: string; source?: string; };
const listeners = new Set<() => void>();
function emitChange() { listeners.forEach((listener) => listener()); }
export function subscribeUtilityStatusChanges(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function statusIsOk(status?: string) { const key = String(status || "").toLowerCase(); return key === "normal" || key === "available" || key === "active" || key === "completed"; }
export function displayUtilityStatus(status?: string) { const key = String(status || "").toLowerCase(); if (key === "normal") return "Normal"; if (key === "reduced") return "Reduced"; if (key === "outage") return "Outage"; if (key === "maintenance") return "Maintenance"; if (key === "available") return "Available"; return status ? String(status) : "No Update"; }
export function utilityLastUpdated(value?: string) { if (!value) return "not updated"; const ts = new Date(value).getTime(); if (!ts) return "not updated"; const mins = Math.floor((Date.now() - ts) / 60000); const hours = Math.floor(mins / 60); const days = Math.floor(hours / 24); if (days > 0) return `${days}d ago`; if (hours > 0) return `${hours}h ago`; if (mins > 0) return `${mins}m ago`; return "just now"; }
export async function fetchUtilityStatuses(ward?: string | null, wardCode?: string | null) { const query = new URLSearchParams(); if (ward) query.set("ward", ward); if (wardCode) query.set("ward_code", wardCode); const suffix = query.toString(); const res = await apiGet<{ success: boolean; statuses: UtilityStatus[] }>(`/api/utility-status${suffix ? `?${suffix}` : ""}`); return Array.isArray(res.statuses) ? res.statuses : []; }
export async function postUtilityStatus(input: UtilityStatusInput) { const result = await apiPost<{ success: boolean; statusId: string }>("/api/utility-status", input); emitChange(); return result; }
export async function updateUtilityStatus(id: string, input: UtilityStatusInput) { const result = await apiPatch<{ success: boolean; status: UtilityStatus }>(`/api/utility-status/${encodeURIComponent(id)}`, input); emitChange(); return result.status; }
export async function deleteUtilityStatus(id: string) { const result = await apiDelete<{ success: boolean; statusId: string }>(`/api/utility-status/${encodeURIComponent(id)}`); emitChange(); return result; }
''')

write("mobile/components/UtilityStatusManager.tsx", r'''
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AppScrollView } from "@/components/AppScrollView";
import AppTimePicker, { formatTimeLabel } from "@/components/AppTimePicker";
import { deleteUtilityStatus, displayUtilityStatus, fetchUtilityStatuses, subscribeUtilityStatusChanges, updateUtilityStatus, UtilityStatus, UtilityType, utilityLastUpdated } from "@/lib/utilityStatusApi";
import { getUserErrorMessage } from "@/lib/api";
const GREEN = "#16A34A"; const ORANGE = "#EA580C";
function to24Hour(label: string) { const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i); if (!match) return ""; let hour = Number(match[1]); const minute = Number(match[2]); const period = match[3].toUpperCase(); if (hour === 12) hour = 0; if (period === "PM") hour += 12; return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`; }
function parseSchedule(value?: string | null) { const parts = String(value || "").split(/\s+to\s+/i); return parts.length === 2 ? [to24Hour(parts[0]), to24Hour(parts[1])] as const : ["", ""] as const; }
function minutes(value: string) { const match = value.match(/^(\d{2}):(\d{2})$/); return match ? Number(match[1]) * 60 + Number(match[2]) : null; }
function duration(start: string, end: string) { const a = minutes(start), b = minutes(end); if (a === null || b === null) return ""; let diff = b - a; if (diff <= 0) diff += 1440; const hours = diff / 60; return Number.isInteger(hours) ? String(hours) : hours.toFixed(1); }
export default function UtilityStatusManager({ ward, wardCode }: { ward: string; wardCode?: string }) {
  const [statuses, setStatuses] = useState<UtilityStatus[]>([]); const [loading, setLoading] = useState(false); const [editing, setEditing] = useState<UtilityStatus | null>(null); const [saving, setSaving] = useState(false); const [actionId, setActionId] = useState(""); const [error, setError] = useState(""); const [status, setStatus] = useState("normal"); const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [description, setDescription] = useState("");
  const load = useCallback(async () => { if (!ward && !wardCode) { setStatuses([]); return; } setLoading(true); try { setStatuses(await fetchUtilityStatuses(ward, wardCode)); setError(""); } catch (requestError) { setError(getUserErrorMessage(requestError, "Current utility updates could not be loaded.")); } finally { setLoading(false); } }, [ward, wardCode]);
  useEffect(() => { void load(); return subscribeUtilityStatusChanges(() => void load()); }, [load]);
  const openEdit = (item: UtilityStatus) => { const [nextStart, nextEnd] = parseSchedule(item.scheduleText); setEditing(item); setStatus(item.status || "normal"); setStart(nextStart); setEnd(nextEnd); setDescription(item.description || ""); setError(""); };
  const save = async () => { if (!editing || saving || !start || !end || !description.trim()) return; setSaving(true); setError(""); try { await updateUtilityStatus(editing.id, { utilityType: editing.utilityType, title: editing.title, status, hoursPerDay: duration(start, end), scheduleText: `${formatTimeLabel(start)} to ${formatTimeLabel(end)}`, description: description.trim(), helpline: editing.helpline || undefined, source: editing.source || undefined }); setEditing(null); } catch (requestError) { setError(getUserErrorMessage(requestError, "The utility update could not be saved.")); } finally { setSaving(false); } };
  const confirmDelete = (item: UtilityStatus) => Alert.alert("Delete utility status?", `Delete the current ${item.utilityType} update? Citizens will see “No ward update posted yet.”`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { setActionId(item.id); setError(""); try { await deleteUtilityStatus(item.id); } catch (requestError) { setError(getUserErrorMessage(requestError, "The utility update could not be deleted.")); } finally { setActionId(""); } } }]);
  return <View style={styles.panel}><View style={styles.heading}><View style={styles.icon}><Feather name="clipboard" size={16} color="#166534" /></View><View style={{ flex: 1 }}><Text style={styles.title}>Current Utility Updates</Text><Text style={styles.subtitle}>Check, edit or delete what citizens can see</Text></View><TouchableOpacity style={styles.refresh} onPress={() => void load()} disabled={loading}><Feather name="refresh-cw" size={15} color="#166534" /></TouchableOpacity></View>{error ? <Text style={styles.error}>{error}</Text> : null}{loading && !statuses.length ? <View style={styles.loading}><ActivityIndicator color={GREEN} /><Text style={styles.loadingText}>Loading current updates...</Text></View> : null}{!loading && !statuses.length ? <View style={styles.empty}><Feather name="info" size={20} color="#94A3B8" /><Text style={styles.emptyText}>No active utility update is posted for this ward.</Text></View> : null}{statuses.map((item) => <View key={item.id} style={styles.card}><View style={[styles.typeIcon, { backgroundColor: item.utilityType === "water" ? "#E0F2FE" : "#FEF3C7" }]}><Feather name={item.utilityType === "water" ? "droplet" : "zap"} size={18} color={item.utilityType === "water" ? "#0284C7" : "#D97706"} /></View><View style={styles.copy}><View style={styles.cardTitleRow}><Text style={styles.cardTitle}>{item.title}</Text><View style={styles.statusPill}><Text style={styles.statusText}>{displayUtilityStatus(item.status)}</Text></View></View><Text style={styles.schedule}>{item.scheduleText || "Timing not provided"}</Text><Text style={styles.message} numberOfLines={2}>{item.description || "No public message"}</Text><Text style={styles.updated}>Updated {utilityLastUpdated(item.updatedAt)} · {item.postedByName || "Nagarsevak"}</Text><View style={styles.actions}><TouchableOpacity style={styles.editButton} onPress={() => openEdit(item)}><Feather name="edit-3" size={14} color="#2563EB" /><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(item)} disabled={actionId === item.id}>{actionId === item.id ? <ActivityIndicator size="small" color="#DC2626" /> : <Feather name="trash-2" size={14} color="#DC2626" />}<Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View></View></View>)}
    <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => !saving && setEditing(null)}><KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHeader}><View style={{ flex: 1 }}><Text style={styles.sheetTitle}>Update {editing?.utilityType === "water" ? "Water" : "Electricity"} Status</Text><Text style={styles.sheetSub}>{ward}</Text></View><TouchableOpacity style={styles.close} onPress={() => setEditing(null)} disabled={saving}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><AppScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets><Text style={styles.label}>STATUS</Text><View style={styles.chips}>{["normal", "reduced", "maintenance", "outage"].map((item) => <TouchableOpacity key={item} style={[styles.chip, status === item && styles.chipActive]} onPress={() => setStatus(item)}><Text style={[styles.chipText, status === item && styles.chipTextActive]}>{displayUtilityStatus(item)}</Text></TouchableOpacity>)}</View><View style={styles.timeHeader}><Text style={styles.label}>SUPPLY / MAINTENANCE TIME</Text><TouchableOpacity style={styles.fullDay} onPress={() => { setStart("00:00"); setEnd("00:00"); }}><Feather name="sun" size={12} color="#15803D" /><Text style={styles.fullDayText}>24 Hours</Text></TouchableOpacity></View><View style={styles.timeRow}><View style={{ flex: 1 }}><Text style={styles.smallLabel}>START TIME</Text><AppTimePicker value={start} onChange={setStart} placeholder="Start time" /></View><View style={{ flex: 1 }}><Text style={styles.smallLabel}>END TIME</Text><AppTimePicker value={end} onChange={setEnd} placeholder="End time" /></View></View><Text style={styles.label}>PUBLIC MESSAGE</Text><TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Message for citizens" placeholderTextColor="#94A3B8" multiline textAlignVertical="top" />{error ? <Text style={styles.error}>{error}</Text> : null}<TouchableOpacity style={[styles.save, (!start || !end || !description.trim() || saving) && styles.disabled]} onPress={save} disabled={!start || !end || !description.trim() || saving}>{saving ? <ActivityIndicator color="white" /> : <Feather name="check" size={16} color="white" />}<Text style={styles.saveText}>{saving ? "Saving..." : "Save Updated Status"}</Text></TouchableOpacity></AppScrollView></View></KeyboardAvoidingView></Modal>
  </View>;
}
const styles = StyleSheet.create({ panel: { marginHorizontal: 12, marginBottom: 12, padding: 14, borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: "#D1FAE5" }, heading: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 12 }, icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" }, title: { color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" }, subtitle: { color: "#64748B", fontSize: 10.5, marginTop: 2, fontFamily: "Inter_400Regular" }, refresh: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" }, loading: { alignItems: "center", padding: 20, gap: 8 }, loadingText: { color: "#64748B", fontSize: 11, fontFamily: "Inter_500Medium" }, empty: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, backgroundColor: "#F8FAFC" }, emptyText: { flex: 1, color: "#64748B", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" }, card: { flexDirection: "row", gap: 10, padding: 12, marginTop: 8, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" }, typeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 }, cardTitle: { flex: 1, color: "#0F172A", fontSize: 13, fontFamily: "Inter_700Bold" }, statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#DCFCE7" }, statusText: { color: "#166534", fontSize: 9, fontFamily: "Inter_700Bold" }, schedule: { marginTop: 4, color: "#7C3AED", fontSize: 10.5, fontFamily: "Inter_600SemiBold" }, message: { marginTop: 4, color: "#475569", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" }, updated: { marginTop: 5, color: "#94A3B8", fontSize: 9, fontFamily: "Inter_400Regular" }, actions: { flexDirection: "row", gap: 8, marginTop: 9 }, editButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 11, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", flexDirection: "row", alignItems: "center", gap: 6 }, editText: { color: "#2563EB", fontSize: 10.5, fontFamily: "Inter_700Bold" }, deleteButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 11, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", flexDirection: "row", alignItems: "center", gap: 6 }, deleteText: { color: "#DC2626", fontSize: 10.5, fontFamily: "Inter_700Bold" }, error: { marginTop: 8, color: "#DC2626", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_600SemiBold" }, overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.6)" }, sheet: { maxHeight: "90%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", overflow: "hidden" }, handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", marginTop: 10 }, sheetHeader: { minHeight: 66, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }, sheetTitle: { color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" }, sheetSub: { marginTop: 2, color: "#64748B", fontSize: 10.5, fontFamily: "Inter_400Regular" }, close: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }, form: { padding: 18, paddingBottom: 36 }, label: { marginTop: 12, marginBottom: 7, color: "#64748B", fontSize: 9.5, letterSpacing: 0.8, fontFamily: "Inter_700Bold" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F1F5F9" }, chipActive: { backgroundColor: GREEN }, chipText: { color: "#475569", fontSize: 10.5, fontFamily: "Inter_700Bold" }, chipTextActive: { color: "white" }, timeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }, fullDay: { minHeight: 34, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", flexDirection: "row", alignItems: "center", gap: 5 }, fullDayText: { color: "#15803D", fontSize: 10, fontFamily: "Inter_700Bold" }, timeRow: { flexDirection: "row", gap: 8 }, smallLabel: { marginBottom: 6, color: "#64748B", fontSize: 9, fontFamily: "Inter_700Bold" }, input: { minHeight: 110, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", padding: 13, color: "#0F172A", fontSize: 13, fontFamily: "Inter_400Regular" }, save: { marginTop: 18, minHeight: 50, borderRadius: 14, backgroundColor: ORANGE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, saveText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" }, disabled: { opacity: 0.55 } });
''')
replace_once("mobile/app/(tabs)/admin.tsx", 'import AppTimePicker, { formatTimeLabel } from "@/components/AppTimePicker";', 'import AppTimePicker, { formatTimeLabel } from "@/components/AppTimePicker";\nimport UtilityStatusManager from "@/components/UtilityStatusManager";')
replace_once("mobile/app/(tabs)/admin.tsx", '''          </TouchableOpacity>
        </View>

        <View style={styles.dashboardGrid}>''', '''          </TouchableOpacity>
        </View>

        <UtilityStatusManager ward={assignedWard} wardCode={assignedWardCode} />

        <View style={styles.dashboardGrid}>''')

# Load action patches before the existing delivery/status patches so their
# routes are registered first and can safely intercept these actions.
replace_once("backend/productionBootstrap.js", '  "./utilityStatusPatch.js",', '  "./utilityStatusActionsPatch.js",\n  "./utilityStatusPatch.js",')
replace_once("backend/productionBootstrap.js", '  "./broadcastGovernancePatch.js",\n  "./broadcastDeliveryPatch.js",', '  "./broadcastGovernancePatch.js",\n  "./broadcastActionsPatch.js",\n  "./broadcastDeliveryPatch.js",')

# ---------------------------------------------------------------------------
# Regression contracts and stale archive expectation update.
# ---------------------------------------------------------------------------
write("backend/test/broadcast-management-actions.test.js", r'''
"use strict";
const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const test = require("node:test");
const root = path.resolve(__dirname, ".."); const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
test("broadcast pause resume delete patch is loaded before delivery", () => { const bootstrap = read("productionBootstrap.js"); assert.ok(bootstrap.indexOf('"./broadcastActionsPatch.js"') < bootstrap.indexOf('"./broadcastDeliveryPatch.js"')); const source = read("broadcastActionsPatch.js"); assert.match(source, /\["pause", "resume"\]/); assert.match(source, /BROADCAST_ARCHIVE_REMOVED/); assert.match(source, /DELETE FROM broadcast_receipts/); assert.match(source, /DELETE FROM broadcasts/); assert.match(source, /removeManagedMedia/); assert.match(source, /originalDelete\.call\(app, "\/api\/broadcasts\/:id"/); });
''')
write("backend/test/utility-status-management.test.js", r'''
"use strict";
const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const test = require("node:test");
const root = path.resolve(__dirname, ".."); const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
test("utility status edit delete is owner-bound and loaded first", () => { const bootstrap = read("productionBootstrap.js"); assert.ok(bootstrap.indexOf('"./utilityStatusActionsPatch.js"') < bootstrap.indexOf('"./utilityStatusPatch.js"')); const source = read("utilityStatusActionsPatch.js"); assert.match(source, /posted_by_id/); assert.match(source, /You can update only utility statuses posted from your account/); assert.match(source, /\/api\/utility-status\/:id/); assert.match(source, /is_active = 0/); });
''')
write("mobile/test/citizen-updates-management.test.mjs", r'''
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
test("citizen News tab includes every sent broadcast category", () => { const feed = read("app/(tabs)/feed.tsx"); assert.match(feed, /useBroadcasts/); assert.match(feed, /item\.status === "sent"/); assert.match(feed, /BroadcastCard/); assert.match(feed, /broadcastId/); });
test("home shows announcement broadcasts in the top alert section without floating overlay", () => { const home = read("app/(tabs)/index.tsx"); const experience = read("components/CivicBroadcastExperience.tsx"); assert.match(home, /item\.category === "announcement"/); assert.match(home, /pathname: "\/\(tabs\)\/feed"/); assert.doesNotMatch(experience, /floatingBar/); assert.match(experience, /secondSegment === "feed"/); });
test("broadcast center uses pause resume delete and no archive action", () => { const screen = read("screens/BroadcastCenterMediaScreen.tsx"); const context = read("context/BroadcastContext.tsx"); for (const word of ["Pause", "Resume", "Delete"]) assert.match(screen, new RegExp(word)); assert.doesNotMatch(screen, /Archive broadcast/); assert.match(context, /pauseBroadcast/); assert.match(context, /resumeBroadcast/); assert.match(context, /deleteBroadcast/); assert.doesNotMatch(context, /archiveBroadcast/); });
test("Nagarsevak can review edit and delete current utility statuses", () => { const admin = read("app/(tabs)/admin.tsx"); const manager = read("components/UtilityStatusManager.tsx"); const api = read("lib/utilityStatusApi.ts"); assert.match(admin, /UtilityStatusManager/); assert.match(manager, /Current Utility Updates/); assert.match(manager, /updateUtilityStatus/); assert.match(manager, /deleteUtilityStatus/); assert.match(api, /subscribeUtilityStatusChanges/); });
''')
write("mobile/test/complaint-native-upload.test.mjs", r'''
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
test("native complaint multipart uses bounded XHR with bearer token and no manual content type", () => { const upload = read("lib/complaintUpload.ts"); const context = read("context/ComplaintContext.tsx"); assert.match(upload, /new XMLHttpRequest\(\)/); assert.match(upload, /COMPLAINT_UPLOAD_TIMEOUT_MS = 4 \* 60 \* 1000/); assert.match(upload, /Authorization/); assert.doesNotMatch(upload, /setRequestHeader\("Content-Type"/); assert.match(context, /uploadComplaintForm/); assert.match(context, /submitJsonWithNetworkRecovery/); });
''')

# Update the stale source-contract test that referenced the retired screen.
path = ROOT / "mobile/test/official-updates-broadcast.test.mjs"
text = path.read_text(encoding="utf-8")
text = re.sub(
    r'test\("broadcast center supports audience language preview schedule and archive", \(\) => \{.*?\n\}\);',
    '''test("broadcast center supports audience language preview schedule and pause/delete", () => {
  const screen = read("screens/BroadcastCenterMediaScreen.tsx");
  assert.match(screen, /AUDIENCES/);
  assert.match(screen, /LANGUAGES/);
  assert.match(screen, /SCHEDULE \(OPTIONAL\)/);
  assert.match(screen, /PREVIEW/);
  assert.match(screen, /pauseBroadcast/);
  assert.match(screen, /deleteBroadcast/);
  assert.doesNotMatch(screen, /archiveBroadcast/);
});''',
    text,
    count=1,
    flags=re.S,
)
path.write_text(text, encoding="utf-8")

# Version bump for the next standalone package.
app_json_path = ROOT / "mobile/app.json"
app_json = json.loads(app_json_path.read_text(encoding="utf-8"))
app_json["expo"]["version"] = "1.0.3"
app_json["expo"]["android"]["versionCode"] = 4
app_json_path.write_text(json.dumps(app_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
replace_once("mobile/android/app/build.gradle", '        versionCode 3\n        versionName "1.0.2"', '        versionCode 4\n        versionName "1.0.3"')

# The workflow and this helper are temporary and must not enter the PR diff.
for relative in [".github/workflows/apply-citizen-updates-batch.yml", ".github/scripts/apply_citizen_updates_batch.py"]:
    target = ROOT / relative
    if target.exists():
        target.unlink()

print("Batched citizen updates, broadcast actions, utility management, and complaint upload fixes applied.")
