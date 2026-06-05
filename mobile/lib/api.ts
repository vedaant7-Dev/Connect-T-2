import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL, apiUrl } from "@/constants/api";

const GET_CACHE_TTL_MS = 20_000;
const REQUEST_TIMEOUT_MS = 15_000;
const AUTH_TOKEN_KEY = "connect_t_auth_token_v1";

const getCache = new Map<string, { at: number; data: unknown }>();
const inFlightGets = new Map<string, Promise<unknown>>();

export async function storeAuthToken(token?: string | null) {
  if (token) await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken() {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

async function getAuthHeaders(body?: unknown) {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = {};

  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  return Object.keys(headers).length ? headers : undefined;
}

async function readError(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text);
    return parsed?.error || parsed?.message || text;
  } catch {
    return text;
  }
}

function cacheKey(path: string) {
  return apiUrl(path);
}

function clearGetCache() {
  getCache.clear();
}

function apiFailureMessage(method: string, path: string, url: string, error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || "Unknown network error");
  return [
    `${method} ${path} failed`,
    `Base URL: ${API_BASE_URL}`,
    `Request URL: ${url}`,
    `Error: ${rawMessage}`,
  ].join("\n");
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function request<T = any>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const url = apiUrl(path);
  const key = cacheKey(path);

  if (method === "GET") {
    const cached = getCache.get(key);
    if (cached && Date.now() - cached.at < GET_CACHE_TTL_MS) {
      return cached.data as T;
    }

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
        headers: await getAuthHeaders(body),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(apiFailureMessage(method, path, url, error));
    }

    if (!res.ok) {
      throw new Error(
        [
          `${method} ${path} failed with ${res.status}`,
          `Base URL: ${API_BASE_URL}`,
          `Request URL: ${url}`,
          await readError(res, `${method} ${path} failed with ${res.status}`),
        ].join("\n"),
      );
    }

    if (res.status === 204) return {} as T;

    const text = await res.text().catch(() => "");
    const data = (text ? JSON.parse(text) : {}) as T;

    if (method === "GET") {
      getCache.set(key, { at: Date.now(), data });
    }

    return data;
  })();

  if (method === "GET") {
    inFlightGets.set(key, promise);
    promise.finally(() => inFlightGets.delete(key));
  }

  return promise;
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
