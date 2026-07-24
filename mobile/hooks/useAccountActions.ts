import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { useAuth } from "@/context/AuthContext";

export type AccountAction = "logout" | "to_jobs" | "to_civic" | null;

export function useAccountActions() {
  const router = useRouter();
  const { logout } = useAuth();
  const [pendingAction, setPendingAction] = useState<AccountAction>(null);
  const [busy, setBusy] = useState(false);

  const resetNavigation = useCallback((destination: string) => {
    // Expo Router keeps nested portal stacks. Dismissing before replace prevents
    // Android back from reopening the portal that the user just left.
    try {
      (router as any).dismissAll?.();
    } catch {
      // A root-only stack has nothing to dismiss.
    }
    router.replace(destination as any);
  }, [router]);

  const runPendingAction = useCallback(async () => {
    if (!pendingAction || busy) return;
    setBusy(true);
    try {
      if (pendingAction === "logout") {
        await logout("/login");
        resetNavigation("/login");
      } else if (pendingAction === "to_jobs") {
        // JobsAuthGate sends first-time users to profile setup and restores
        // returning users directly to their saved role dashboard.
        resetNavigation("/jobs");
      } else {
        resetNavigation("/(tabs)");
      }
      setPendingAction(null);
    } finally {
      setBusy(false);
    }
  }, [busy, logout, pendingAction, resetNavigation]);

  return {
    pendingAction,
    busy,
    requestLogout: () => setPendingAction("logout"),
    requestJobsPortal: () => setPendingAction("to_jobs"),
    requestCivicPortal: () => setPendingAction("to_civic"),
    cancelAction: () => {
      if (!busy) setPendingAction(null);
    },
    runPendingAction,
  };
}
