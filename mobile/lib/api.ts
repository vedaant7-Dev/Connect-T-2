const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export async function apiPost(path: string, body: unknown) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: "Invalid server response" };
  }
  return { ok: res.ok, status: res.status, data };
}

export async function apiGet(path: string) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url);
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: "Invalid server response" };
  }
  return { ok: res.ok, status: res.status, data };
}

export async function apiPatch(path: string, body: unknown) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: "Invalid server response" };
  }
  return { ok: res.ok, status: res.status, data };
}
