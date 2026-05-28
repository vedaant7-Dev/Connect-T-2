import { apiUrl } from "@/constants/api";

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path));

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `GET ${path} failed with ${res.status}`);
  }

  return res.json();
}

export async function apiPost<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `POST ${path} failed with ${res.status}`);
  }

  return res.json();
}

export async function apiPut<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `PUT ${path} failed with ${res.status}`);
  }

  return res.json();
}
