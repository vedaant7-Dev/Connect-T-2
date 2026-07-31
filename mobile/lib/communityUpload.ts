import { apiUrl } from "@/constants/api";
import { ApiError, getStoredAuthToken, invalidateApiCache } from "@/lib/api";

const COMMUNITY_UPLOAD_TIMEOUT_MS = 3 * 60 * 1000;
const PRIMARY_COMMUNITY_PATH = "/api/nagarsevak-community/posts";
const LEGACY_COMMUNITY_PATH = "/api/nagarsevak-community";
const ROUTE_UNAVAILABLE_STATUSES = new Set([404, 405, 501, 503]);

function messageFor(status: number, serverMessage: string) {
  if (status === 401) return "Your session could not be verified. Please log in again.";
  if (status === 403) return "Only approved Nagarsevaks and Super Admin can post in this community.";
  if (status === 413) return serverMessage || "The selected media is too large.";
  if ([400, 415, 422, 429].includes(status)) return serverMessage || "Check the post details and try again.";
  if (ROUTE_UNAVAILABLE_STATUSES.has(status)) {
    return "Nagarsevak Community is not available on the currently deployed backend. Your post is still open; publish it after the backend is updated.";
  }
  if (status >= 500) return "The community post could not be uploaded right now.";
  return serverMessage || "The community upload could not be completed.";
}

function readFormValue(form: FormData, key: string): unknown {
  const compatibleForm = form as any;
  if (typeof compatibleForm.get === "function") {
    try {
      return compatibleForm.get(key);
    } catch {
      // React Native's FormData implementation may not expose get().
    }
  }
  const parts = Array.isArray(compatibleForm._parts) ? compatibleForm._parts : [];
  const match = parts.find((part: unknown) => Array.isArray(part) && part[0] === key);
  return match?.[1];
}

function hasFormValue(form: FormData, key: string) {
  const compatibleForm = form as any;
  if (typeof compatibleForm.has === "function") {
    try {
      return compatibleForm.has(key);
    } catch {
      // Fall back to inspecting React Native FormData parts.
    }
  }
  const parts = Array.isArray(compatibleForm._parts) ? compatibleForm._parts : [];
  return parts.some((part: unknown) => Array.isArray(part) && part[0] === key);
}

function addLegacyAliases(form: FormData) {
  const postType = String(readFormValue(form, "postType") || "message").trim().toLowerCase();
  const legacyType = postType === "update" ? "announcement" : postType;
  const title = String(readFormValue(form, "title") || "").trim();
  const content = String(readFormValue(form, "content") || "").trim();
  const legacyMessage = [title, content].filter(Boolean).join("\n\n");

  if (!hasFormValue(form, "type")) form.append("type", legacyType || "message");
  if (!hasFormValue(form, "message")) form.append("message", legacyMessage);
}

type UploadAttempt<T> = {
  ok: boolean;
  status: number;
  payload: T | any;
};

function sendUpload<T>(
  path: string,
  form: FormData,
  token: string | null,
  onProgress?: (percentage: number) => void,
): Promise<UploadAttempt<T>> {
  return new Promise<UploadAttempt<T>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(path));
    xhr.timeout = COMMUNITY_UPLOAD_TIMEOUT_MS;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return;
      onProgress?.(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onload = () => {
      let payload: any = {};
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        payload = {};
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, payload });
    };
    xhr.onerror = () => reject(new ApiError("The upload could not be completed. Check your internet and try again."));
    xhr.ontimeout = () => reject(new ApiError("The upload took too long. Check your connection and try again."));
    xhr.onabort = () => reject(new ApiError("The upload was cancelled."));
    xhr.send(form);
  });
}

export async function uploadCommunityForm<T = any>(form: FormData, onProgress?: (percentage: number) => void): Promise<T> {
  invalidateApiCache();
  addLegacyAliases(form);
  const token = await getStoredAuthToken();
  onProgress?.(0);

  let attempt = await sendUpload<T>(PRIMARY_COMMUNITY_PATH, form, token, onProgress);
  if (!attempt.ok && ROUTE_UNAVAILABLE_STATUSES.has(attempt.status)) {
    attempt = await sendUpload<T>(LEGACY_COMMUNITY_PATH, form, token, onProgress);
  }

  if (!attempt.ok) {
    const serverMessage = String(attempt.payload?.error || attempt.payload?.message || "");
    throw new ApiError(messageFor(attempt.status, serverMessage), { status: attempt.status });
  }

  onProgress?.(100);
  return attempt.payload as T;
}
