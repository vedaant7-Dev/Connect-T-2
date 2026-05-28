const DEFAULT_API_BASE_URL = "https://connect-t-2.onrender.com";

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim()) ||
  DEFAULT_API_BASE_URL;

export function apiUrl(path: string) {
  const cleanBase = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
