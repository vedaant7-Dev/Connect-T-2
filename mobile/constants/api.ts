export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://connect-t-2.onrender.com";

export function buildApiUrl(path: string) {
  const cleanBase = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}
