import { apiUrl } from "@/constants/api";
import { ApiError, getStoredAuthToken, invalidateApiCache } from "@/lib/api";

const COMMUNITY_UPLOAD_TIMEOUT_MS = 3 * 60 * 1000;

function messageFor(status: number, serverMessage: string) {
  if (status === 401) return "Your session could not be verified. Please log in again.";
  if (status === 403) return "Only approved Nagarsevaks and Super Admin can post in this community.";
  if (status === 413) return serverMessage || "The selected media is too large.";
  if ([400, 415, 422, 429].includes(status)) return serverMessage || "Check the post details and try again.";
  if (status >= 500) return "The community post could not be uploaded right now.";
  return serverMessage || "The community upload could not be completed.";
}

export async function uploadCommunityForm<T = any>(form: FormData, onProgress?: (percentage: number) => void): Promise<T> {
  invalidateApiCache();
  const token = await getStoredAuthToken();
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/api/nagarsevak-community/posts"));
    xhr.timeout = COMMUNITY_UPLOAD_TIMEOUT_MS;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return;
      onProgress?.(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onload = () => {
      let payload: any = {};
      try { payload = xhr.responseText ? JSON.parse(xhr.responseText) : {}; }
      catch { payload = {}; }
      if (xhr.status < 200 || xhr.status >= 300) {
        const serverMessage = String(payload?.error || payload?.message || "");
        reject(new ApiError(messageFor(xhr.status, serverMessage), { status: xhr.status }));
        return;
      }
      onProgress?.(100);
      resolve(payload as T);
    };
    xhr.onerror = () => reject(new ApiError("The upload could not be completed. Check your internet and try again."));
    xhr.ontimeout = () => reject(new ApiError("The upload took too long. Check your connection and try again."));
    xhr.onabort = () => reject(new ApiError("The upload was cancelled."));
    onProgress?.(0);
    xhr.send(form);
  });
}
