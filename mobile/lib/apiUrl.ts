const DEFAULT_API_BASE_URL = "https://newapp.e-bjp.in";

export function normalizeApiBaseUrl(value?: string | null) {
  const configured = String(value || "").trim() || DEFAULT_API_BASE_URL;

  // Every API path in the app already starts with /api. Some build providers
  // configure EXPO_PUBLIC_API_URL with /api appended, which otherwise produces
  // requests such as /api/api/auth/send-otp.
  return configured.replace(/\/+$/, "").replace(/(?:\/api)+$/i, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);

export function buildApiUrl(path: string, baseUrl: string = API_BASE_URL) {
  const cleanBase = normalizeApiBaseUrl(baseUrl);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export function apiUrl(path: string) {
  return buildApiUrl(path);
}
