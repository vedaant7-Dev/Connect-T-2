import { apiUrl } from "@/constants/api";
import { ApiError, getStoredAuthToken, invalidateApiCache } from "@/lib/api";

const BROADCAST_UPLOAD_TIMEOUT_MS = 3 * 60 * 1000;

function userMessage(status: number, serverMessage: string) {
  if (status === 401) return "Your session could not be verified. Please log in again.";
  if (status === 403) return "You do not have permission to create this broadcast.";
  if (status === 404) return serverMessage || "Broadcast API is not available on the connected backend.";
  if (status === 413) return serverMessage || "The selected media is too large.";
  if ([400, 409, 415, 422, 429].includes(status)) return serverMessage || "Check the broadcast details and try again.";
  if (status >= 500) return "The broadcast service could not complete the upload. Please try again after some time.";
  return serverMessage || "The broadcast upload could not be completed.";
}

export async function uploadBroadcastForm<T = any>(path: string, form: FormData): Promise<T> {
  invalidateApiCache();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BROADCAST_UPLOAD_TIMEOUT_MS);

  try {
    const token = await getStoredAuthToken();
    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    let payload: any = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        if (!response.ok) payload = { message: text };
        else throw new ApiError("The server returned an invalid response. Please try again.", { status: response.status });
      }
    }
    if (!response.ok) {
      const serverMessage = String(payload?.error || payload?.message || "");
      throw new ApiError(userMessage(response.status, serverMessage), {
        status: response.status,
        code: payload?.code ? String(payload.code) : undefined,
        internalMessage: `POST ${path}: ${response.status} ${serverMessage}`,
      });
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const internalMessage = error instanceof Error ? error.message : String(error || "Broadcast upload failed");
    if (internalMessage.toLowerCase().includes("abort")) {
      throw new ApiError("The media upload took too long. Check your connection and try again.", { internalMessage });
    }
    throw new ApiError("The upload could not be completed. Check your internet and try again.", { internalMessage });
  } finally {
    clearTimeout(timeout);
  }
}

export { BROADCAST_UPLOAD_TIMEOUT_MS };
