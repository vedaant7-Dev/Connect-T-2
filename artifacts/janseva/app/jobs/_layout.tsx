import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { JobsAuthProvider, useJobsAuth } from "@/context/JobsAuthContext";
import { JobsProvider } from "@/context/JobsContext";

function JobsAuthGate({ children }: { children: React.ReactNode }) {
  const { jobsUser, loading } = useJobsAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[1] === "login";
    if (!jobsUser && !inLogin) {
      router.replace("/jobs/login" as any);
    } else if (jobsUser && inLogin) {
      router.replace("/jobs/(tabs)" as any);
    }
  }, [jobsUser, loading, segments]);

  return <>{children}</>;
}

export default function JobsLayout() {
  return (
    <JobsAuthProvider>
      <JobsProvider>
        <JobsAuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" options={{ animation: "fade" }} />
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            <Stack.Screen name="search" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="results" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="resume" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
          </Stack>
        </JobsAuthGate>
      </JobsProvider>
    </JobsAuthProvider>
  );
}
