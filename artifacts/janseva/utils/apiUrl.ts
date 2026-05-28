import Constants from "expo-constants";

export function getApiUrl(path: string): string {
  const envUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  if (envUrl) return `${envUrl}${path}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  try {
    const hostUri: string =
      (Constants.expoConfig as any)?.hostUri ??
      (Constants as any)?.manifest?.hostUri ??
      "";
    if (hostUri) {
      const base = hostUri.startsWith("http") ? hostUri : `https://${hostUri}`;
      return `${base.replace(/\/$/, "")}${path}`;
    }
  } catch {}

  return path;
}
