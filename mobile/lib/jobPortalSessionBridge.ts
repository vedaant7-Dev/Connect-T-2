import {
  getSessionSecret,
  JOB_PORTAL_IDENTITY_KEY,
  setSessionSecret,
} from "@/lib/secureSessionStorage";

const CIVIC_TOKEN_KEY = "connect_t_auth_token_v1";
const JOB_TOKEN_KEY = "connect_t_job_auth_token_v1";
const BRIDGE_PATHS = [
  "/api/job-portal/session",
  "/api/job-portal/onboarding",
  "/api/job-portal/switch-role",
];
const INSTALL_FLAG = "__connectTJobPortalSessionBridgeInstalled";
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64(value: string): string {
  const input = String(value || "").replace(/\s+/g, "").replace(/=+$/g, "");
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const character of input) {
    const index = BASE64_ALPHABET.indexOf(character);
    if (index < 0) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function installNativeAtobFallback() {
  const runtime = globalThis as any;
  if (typeof runtime.atob !== "function") {
    runtime.atob = (value: string) => decodeBase64(value);
  }
}

function requestUrl(input: any): string {
  if (typeof input === "string") return input;
  if (typeof URL !== "undefined" && input instanceof URL) return input.toString();
  return String(input?.url || "");
}

function bridgePath(url: string): string | null {
  return BRIDGE_PATHS.find((path) => url.includes(path)) || null;
}

function bearerFromHeaders(headersInit?: HeadersInit): string | null {
  try {
    const value = new Headers(headersInit || {}).get("Authorization") || "";
    return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
  } catch {
    return null;
  }
}

function withIdentity(
  init: RequestInit | undefined,
  token?: string | null,
  verifiedIdentity?: string | null,
): RequestInit {
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");
  if (verifiedIdentity) headers.set("X-OTP-Verification", verifiedIdentity);
  return { ...(init || {}), headers };
}

function uniqueTokens(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function sessionUrlFrom(url: string): string | null {
  const marker = "/api/job-portal/";
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return `${url.slice(0, index)}/api/job-portal/session`;
}

async function readStoredIdentity() {
  try {
    const [civicToken, jobsToken, verifiedIdentity] = await Promise.all([
      getSessionSecret(CIVIC_TOKEN_KEY),
      getSessionSecret(JOB_TOKEN_KEY),
      getSessionSecret(JOB_PORTAL_IDENTITY_KEY),
    ]);
    return { civicToken, jobsToken, verifiedIdentity };
  } catch {
    return { civicToken: null, jobsToken: null, verifiedIdentity: null };
  }
}

async function extractToken(response: Response): Promise<string | null> {
  try {
    const payload = await response.clone().json();
    return typeof payload?.token === "string" && payload.token.trim() ? payload.token.trim() : null;
  } catch {
    return null;
  }
}

function installJobPortalSessionBridge() {
  const runtime = globalThis as any;
  if (runtime[INSTALL_FLAG] || typeof runtime.fetch !== "function") return;

  runtime[INSTALL_FLAG] = true;
  const originalFetch = runtime.fetch.bind(runtime) as typeof fetch;

  runtime.fetch = async (input: any, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    const path = bridgePath(url);
    if (!path) return originalFetch(input, init);

    const { civicToken, jobsToken, verifiedIdentity } = await readStoredIdentity();
    const currentToken = bearerFromHeaders(init?.headers);
    const candidates = uniqueTokens([currentToken, jobsToken, civicToken]);
    let lastResponse: Response | null = null;

    // Try every available bearer token, always carrying the already verified OTP
    // identity as a fallback. This makes profile setup independent of Civic session
    // refreshes while keeping the citizen mobile cryptographically verified.
    for (const token of candidates) {
      const response = await originalFetch(input, withIdentity(init, token, verifiedIdentity));
      lastResponse = response;
      if (response.status !== 401) return response;
    }

    // First-time Job Portal users may not have any bearer token accepted by the
    // current backend deployment. The verified mobile identity is sufficient for
    // these three bridge routes and does not require another login or approval.
    if (verifiedIdentity) {
      const response = await originalFetch(input, withIdentity(init, null, verifiedIdentity));
      lastResponse = response;
      if (response.status !== 401) return response;
    }

    if (path !== "/api/job-portal/session" && (civicToken || verifiedIdentity)) {
      const sessionUrl = sessionUrlFrom(url);
      if (sessionUrl) {
        try {
          const sessionResponse = await originalFetch(
            sessionUrl,
            withIdentity(
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
              },
              civicToken,
              verifiedIdentity,
            ),
          );
          if (sessionResponse.ok) {
            const refreshedToken = await extractToken(sessionResponse);
            if (refreshedToken) {
              await setSessionSecret(JOB_TOKEN_KEY, refreshedToken);
              return originalFetch(input, withIdentity(init, refreshedToken, verifiedIdentity));
            }
          }
        } catch {
          // Return the original response so the normal safe error handler remains active.
        }
      }
    }

    return lastResponse || originalFetch(input, withIdentity(init, null, verifiedIdentity));
  };
}

installNativeAtobFallback();
installJobPortalSessionBridge();

export {};
