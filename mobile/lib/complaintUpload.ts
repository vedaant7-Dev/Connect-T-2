import { apiUrl } from "@/constants/api";
import { ApiError, friendlyStatusMessage, getStoredAuthToken, invalidateApiCache } from "@/lib/api";
import { connectivityErrorMessage } from "@/lib/networkStatus";

const COMPLAINT_UPLOAD_TIMEOUT_MS = 3 * 60 * 1000;

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

export async function uploadComplaintForm<T = any>(path: string, form: FormData): Promise<T> {
  invalidateApiCache();
  const token = await getStoredAuthToken();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const finishResolve = (value: T) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const finishReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const rejectTransport = async (internalMessage: string, fallback: string) => {
      const message = await connectivityErrorMessage(new Error(internalMessage), fallback);
      finishReject(new ApiError(message, {
        code: "COMPLAINT_UPLOAD_NETWORK_UNAVAILABLE",
        internalMessage,
      }));
    };

    xhr.open("POST", apiUrl(path));
    xhr.timeout = COMPLAINT_UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader("Accept", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.onload = () => {
      try {
        const status = Number(xhr.status || 0);
        if (!status) {
          void rejectTransport(
            `POST ${path}: XMLHttpRequest completed with status 0`,
            "The complaint image could not reach the server. Check your internet connection and try again.",
          );
          return;
        }

        const payload: any = parsePayload(xhr.responseText || "", status);
        if (status < 200 || status >= 300) {
          const serverMessage = String(payload?.error || payload?.message || "");
          finishReject(new ApiError(friendlyStatusMessage(status, serverMessage), {
            status,
            code: payload?.code ? String(payload.code) : undefined,
            internalMessage: `POST ${path}: ${status} ${serverMessage}`,
          }));
          return;
        }

        finishResolve(payload as T);
      } catch (error) {
        finishReject(error instanceof ApiError
          ? error
          : new ApiError("The server returned an invalid response. Please try again."));
      }
    };

    xhr.onerror = () => {
      void rejectTransport(
        `POST ${path}: XMLHttpRequest network error`,
        "The complaint image could not reach the server. Check your internet connection and try again.",
      );
    };

    xhr.ontimeout = () => finishReject(new ApiError(
      "The complaint image upload took too long. Keep the app open, check your connection and try again.",
      {
        code: "COMPLAINT_UPLOAD_TIMEOUT",
        internalMessage: `POST ${path}: upload timed out after ${COMPLAINT_UPLOAD_TIMEOUT_MS}ms`,
      },
    ));

    xhr.onabort = () => finishReject(new ApiError("The complaint image upload was cancelled.", {
      code: "COMPLAINT_UPLOAD_ABORTED",
      internalMessage: `POST ${path}: upload aborted`,
    }));

    try {
      // Do not set multipart/form-data manually. XMLHttpRequest adds the correct
      // boundary and is more reliable than React Native fetch for local file URIs.
      xhr.send(form);
    } catch (error) {
      finishReject(new ApiError("The complaint image upload could not be started. Please choose the image again and retry.", {
        code: "COMPLAINT_UPLOAD_START_FAILED",
        internalMessage: error instanceof Error ? error.message : String(error || "XHR send failed"),
      }));
    }
  });
}

export { COMPLAINT_UPLOAD_TIMEOUT_MS };
