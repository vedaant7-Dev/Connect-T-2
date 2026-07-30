import { deleteSessionSecret, getSessionSecret } from "@/lib/secureSessionStorage";

const CIVIC_TOKEN_KEY = "connect_t_auth_token_v1";
const LEGACY_JOB_TOKEN_KEY = "connect_t_job_auth_token_v1";
const INSTALL_FLAG = "__connectTUnifiedCivicJobAuthInstalled";
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

function requestUrl(input: any): string {
  if (typeof input === "string") return input;
  if (typeof URL !== "undefined" && input instanceof URL) return input.toString();
  return String(input?.url || "");
}

function withCivicToken(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.delete("X-OTP-Verification");
  return { ...(init || {}), headers };
}

function installUnifiedCivicJobAuth() {
  const runtime = globalThis as any;
  if (typeof runtime.atob !== "function") {
    runtime.atob = (value: string) => decodeBase64(value);
  }
  if (runtime[INSTALL_FLAG] || typeof runtime.fetch !== "function") return;

  runtime[INSTALL_FLAG] = true;
  const originalFetch = runtime.fetch.bind(runtime) as typeof fetch;

  // Remove any token created by the retired standalone Job Portal session.
  void deleteSessionSecret(LEGACY_JOB_TOKEN_KEY).catch(() => undefined);

  runtime.fetch = async (input: any, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    if (!url.includes("/api/job-portal/")) return originalFetch(input, init);

    const civicToken = await getSessionSecret(CIVIC_TOKEN_KEY).catch(() => null);
    if (!civicToken) return originalFetch(input, init);
    return originalFetch(input, withCivicToken(init, civicToken));
  };
}

installUnifiedCivicJobAuth();

export {};
