const DEFAULT_API_BASE_URL = "https://saddlebrown-pheasant-544481.hostingersite.com";

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim()) ||
  DEFAULT_API_BASE_URL;

export function apiUrl(path: string) {
  const cleanBase = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input?.url || String(input);
}

if (!(globalThis as any).__CONNECT_T_FETCH_DIAGNOSTICS__) {
  (globalThis as any).__CONNECT_T_FETCH_DIAGNOSTICS__ = true;
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    try {
      return await originalFetch(input, init);
    } catch (error) {
      const method = init?.method || "GET";
      const rawMessage = error instanceof Error ? error.message : String(error || "Unknown network error");
      throw new Error([
        `${method} request failed`,
        `Base URL: ${API_BASE_URL}`,
        `Request URL: ${url}`,
        `Error: ${rawMessage}`,
      ].join("\n"));
    }
  };
}
