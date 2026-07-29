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
