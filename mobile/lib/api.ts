import { apiUrl } from "@/constants/api";
import { safeUserMessage } from "@/lib/errorSafety";
import { deleteSessionSecret, getSessionSecret, setSessionSecret } from "@/lib/secureSessionStorage";

const REQUEST_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 60_000;
const AUTH_TOKEN_KEY = "connect_t_auth_token_v1";
const JOB_AUTH_TOKEN_KEY = "connect_t_job_auth_token_v1";
const OTP_VERIFICATION_KEY = "connect_t_otp_verification_v1";

const inFlightGets = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

export class ApiError extends Error {
  status?: number;
  code?: string;
  internalMessage?: string;

  constructor(message: string, options: { status?: number; code?: string; internalMessage?: string } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.internalMessage = options.internalMessage;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getUserErrorMessage(error: unknown, fallback = "Something went wrong. Please try again after some time.") {
  if (isApiError(error)) return error.message || fallback;
  if (error instanceof Error) return safeUserMessage(error.message, fallback);
  return fallback;
}

export async function storeAuthToken(token?: string | null) {
  if (!token) return;
  await setSessionSecret(AUTH_TOKEN_KEY, token);
  await deleteSessionSecret(OTP_VERIFICATION_KEY);
  clearGetCache();
}

export async function clearAuthToken() {
  await Promise.all([
    deleteSessionSecret(AUTH_TOKEN_KEY),
    deleteSessionSecret(OTP_VERIFICATION_KEY),
  ]);
  clearGetCache();
}

export async function storeJobsAuthToken(token?: string | null) {
  if (!token) return;
  await setSessionSecret(JOB_AUTH_TOKEN_KEY, token);
  await deleteSessionSecret(OTP_VERIFICATION_KEY);
  clearGetCache();
}

export async function clearJobsAuthToken() {
  await deleteSessionSecret(JOB_AUTH_TOKEN_KEY);
  clearGetCache();
}

export async function storeOtpVerificationToken(token?: string | null) {
  if (token) await setSessionSecret(OTP_VERIFICATION_KEY, token);
  else await deleteSessionSecret(OTP_VERIFICATION_KEY);
}

function tokenPayload(token?: string | null): Record<string, any> | null {
  if (!token) return null;
  try {
    const encoded = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!encoded) return null;
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(globalThis.atob(padded));
  } catch {
    return null;
  }
}

function isUsableToken(token?: string | null) {
  const payload = tokenPayload(token);
  return !!payload?.exp && Number(payload.exp) > Math.floor(Date.now() / 1000);
}

function isSuperAdminToken(token?: string | null) {
  const payload = tokenPayload(token);
  return payload?.role === "super_admin" || payload?.isSuperAdmin === true;
}

export async function getStoredAuthToken() {
  const token = await getSessionSecret(AUTH_TOKEN_KEY);
  if (isUsableToken(token)) return token;
  if (token) await deleteSessionSecret(AUTH_TOKEN_KEY);
  return null;
}

export async function getStoredJobsAuthToken() {
  const token = await getSessionSecret(JOB_AUTH_TOKEN_KEY);
  if (isUsableToken(token)) return token;
  if (token) await deleteSessionSecret(JOB_AUTH_TOKEN_KEY);
  return null;
}

async function getAuthHeaders(path: string, body?: unknown, multipart = false) {
  const [storedCivicToken, storedJobsToken, otpVerification] = await Promise.all([
    getSessionSecret(AUTH_TOKEN_KEY),
    getSessionSecret(JOB_AUTH_TOKEN_KEY),
    getSessionSecret(OTP_VERIFICATION_KEY),
  ]);
  const civicToken = isUsableToken(storedCivicToken) ? storedCivicToken : null;
  const jobsToken = isUsableToken(storedJobsToken) ? storedJobsToken : null;

  if (storedCivicToken && !civicToken) void deleteSessionSecret(AUTH_TOKEN_KEY);
  if (storedJobsToken && !jobsToken) void deleteSessionSecret(JOB_AUTH_TOKEN_KEY);
  const isUnifiedJobsSession = path === "/api/job-portal/session";
  const token = path.startsWith("/api/job-portal/") && !isUnifiedJobsSession
    ? isSuperAdminToken(civicToken)
      ? civicToken
      : jobsToken || civicToken
    : civicToken;
  const headers: Record<string, string> = {};

  // React Native and browsers must generate the multipart boundary themselves.
  if (body !== undefined && !multipart) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (otpVerification) headers["X-OTP-Verification"] = otpVerification;

  return Object.keys(headers).length ? headers : undefined;
}

async function readError(res: Response, fallback: string): Promise<{ message: string; code?: string }> {
  const text = await res.text().catch(() => "");
  if (!text) return { message: fallback };

  try {
    const parsed = JSON.parse(text);
    return {
      message: String(parsed?.error || parsed?.message || fallback),
      code: parsed?.code ? String(parsed.code) : undefined,
    };
  } catch {
    return { message: text || fallback };
  }
}

function clearGetCache() {
  cacheGeneration += 1;
  inFlightGets.clear();
}

export function invalidateApiCache() {
  clearGetCache();
}

function safeServerMessage(serverMessage: string) {
  return safeUserMessage(serverMessage, "");
}

function friendlyStatusMessage(status: number, serverMessage: string) {
  const safeMessage = safeServerMessage(serverMessage);
  if (status === 401) return "Your session could not be verified. Please log in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return safeMessage || "The requested information was not found.";
  if (status === 408 || status === 429) return safeMessage || "Please wait a moment and try again.";
  if (status >= 500) return "Something went wrong. Please try again after some time.";
  if ([400, 409, 413, 415, 422].includes(status)) {
    return safeMessage || "We could not complete that request. Please check the details and try again.";
  }
  return "We could not complete that request. Please try again.";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseSuccess<T>(res: Response, method: string, path: string): Promise<T> {
  if (res.status === 204) return {} as T;
  const text = await res.text().catch(() => "");
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("The server returned an invalid response. Please try again.", {
      status: res.status,
      internalMessage: `${method} ${path}: invalid JSON response`,
    });
  }
}

async function assertResponse(res: Response, method: string, path: string) {
  if (res.ok) return;
  const serverError = await readError(res, "");
  throw new ApiError(friendlyStatusMessage(res.status, serverError.message), {
    status: res.status,
    code: serverError.code,
    internalMessage: `${method} ${path}: ${res.status} ${serverError.message}`,
  });
}

async function request<T = any>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const url = apiUrl(path);
  const requestGeneration = cacheGeneration;
  const key = `${requestGeneration}:${url}`;

  if (method === "GET") {
    const pending = inFlightGets.get(key);
    if (pending) return pending as Promise<T>;
  } else {
    clearGetCache();
  }

  const promise = (async () => {
    let res: Response;
    try {
      res = await fetchWithTimeout(url, {
        method,
        headers: await getAuthHeaders(path, body),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      const internalMessage = error instanceof Error ? error.message : String(error || "Network request failed");
      throw new ApiError("Unable to connect right now. Check your internet and try again.", { internalMessage });
    }
    await assertResponse(res, method, path);
    return parseSuccess<T>(res, method, path);
  })();

  if (method === "GET") {
    inFlightGets.set(key, promise);
    void promise.then(
      () => inFlightGets.delete(key),
      () => inFlightGets.delete(key),
    );
  }
  return promise;
}

export async function apiPostForm<T = any>(path: string, form: FormData): Promise<T> {
  clearGetCache();
  let res: Response;
  try {
    res = await fetchWithTimeout(apiUrl(path), {
      method: "POST",
      headers: await getAuthHeaders(path, form, true),
      body: form,
    }, UPLOAD_TIMEOUT_MS);
  } catch (error) {
    const internalMessage = error instanceof Error ? error.message : String(error || "Upload failed");
    throw new ApiError("The upload could not be completed. Check your connection and try again.", { internalMessage });
  }
  await assertResponse(res, "POST", path);
  return parseSuccess<T>(res, "POST", path);
}

export async function apiGet<T = any>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export async function apiPost<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export async function apiPut<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>("PUT", path, body);
}

export async function apiPatch<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>("PATCH", path, body);
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  return request<T>("DELETE", path);
}
