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

export async function uploadBroadcastForm<T = any>(
  path: string,
  form: FormData,
  onProgress?: (percentage: number) => void,
): Promise<T> {
  invalidateApiCache();
  const token = await getStoredAuthToken();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(path));
    xhr.timeout = BROADCAST_UPLOAD_TIMEOUT_MS;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return;
      const percentage = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress?.(percentage);
    };

    xhr.onload = () => {
      try {
        const payload: any = parsePayload(xhr.responseText || "", xhr.status);
        if (xhr.status < 200 || xhr.status >= 300) {
          const serverMessage = String(payload?.error || payload?.message || "");
          reject(new ApiError(userMessage(xhr.status, serverMessage), {
            status: xhr.status,
            code: payload?.code ? String(payload.code) : undefined,
            internalMessage: `POST ${path}: ${xhr.status} ${serverMessage}`,
          }));
          return;
        }
        onProgress?.(100);
        resolve(payload as T);
      } catch (error) {
        reject(error instanceof ApiError ? error : new ApiError("The server returned an invalid response. Please try again."));
      }
    };

    xhr.onerror = () => reject(new ApiError("The upload could not be completed. Check your internet and try again.", {
      internalMessage: `POST ${path}: XMLHttpRequest network error`,
    }));
    xhr.ontimeout = () => reject(new ApiError("The media upload took too long. Check your connection and try again.", {
      internalMessage: `POST ${path}: upload timed out after ${BROADCAST_UPLOAD_TIMEOUT_MS}ms`,
    }));
    xhr.onabort = () => reject(new ApiError("The media upload was cancelled.", {
      internalMessage: `POST ${path}: upload aborted`,
    }));

    try {
      onProgress?.(0);
      xhr.send(form);
    } catch (error) {
      reject(new ApiError("The upload could not be started. Please try again.", {
        internalMessage: error instanceof Error ? error.message : String(error || "XHR send failed"),
      }));
    }
  });
}

export { BROADCAST_UPLOAD_TIMEOUT_MS };
