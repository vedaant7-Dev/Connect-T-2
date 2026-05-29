import { apiUrl } from "@/constants/api";

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

async function request<T = any>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readError(res, `${method} ${path} failed with ${res.status}`));
  }

  if (res.status === 204) return {} as T;

  const text = await res.text().catch(() => "");
  return (text ? JSON.parse(text) : {}) as T;
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
