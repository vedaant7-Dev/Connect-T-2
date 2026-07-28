import { apiUrl } from "@/constants/api";

export type NetworkQuality = "checking" | "online" | "slow" | "offline";

export type NetworkState = {
  quality: NetworkQuality;
  checkedAt: number;
  latencyMs?: number;
};

const listeners = new Set<(state: NetworkState) => void>();
let currentState: NetworkState = { quality: "checking", checkedAt: 0 };
let activeProbe: Promise<NetworkState> | null = null;

function publish(state: NetworkState) {
  currentState = state;
  listeners.forEach((listener) => listener(state));
  return state;
}

export function getNetworkState() {
  return currentState;
}

export function subscribeNetworkState(listener: (state: NetworkState) => void) {
  listeners.add(listener);
  listener(currentState);
  return () => listeners.delete(listener);
}

export function browserReportsOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export async function probeNetwork(timeoutMs = 8_000): Promise<NetworkState> {
  if (activeProbe) return activeProbe;

  activeProbe = (async () => {
    if (browserReportsOffline()) {
      return publish({ quality: "offline", checkedAt: Date.now() });
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${apiUrl("/api/healthz")}?connection_probe=${startedAt}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const latencyMs = Date.now() - startedAt;
      if (!response.ok) return publish({ quality: "offline", checkedAt: Date.now(), latencyMs });
      return publish({ quality: latencyMs >= 3_500 ? "slow" : "online", checkedAt: Date.now(), latencyMs });
    } catch {
      return publish({ quality: "offline", checkedAt: Date.now() });
    } finally {
      clearTimeout(timeout);
      activeProbe = null;
    }
  })();

  return activeProbe;
}

export async function connectivityErrorMessage(error: unknown, slowFallback: string) {
  const state = browserReportsOffline()
    ? publish({ quality: "offline", checkedAt: Date.now() })
    : await probeNetwork(5_000).catch(() => getNetworkState());

  if (state.quality === "offline") {
    return "Internet connection lost. Reconnect and try again.";
  }

  if (error instanceof Error && error.name === "AbortError") {
    return slowFallback;
  }

  return state.quality === "slow"
    ? slowFallback
    : "Unable to connect right now. Please try again.";
}
