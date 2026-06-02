import "../global.css";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments, router as staticRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSplash, SplashPortal } from "@/components/AppSplash";
import { ComplaintProvider } from "@/context/ComplaintContext";
import { AlertProvider } from "@/context/AlertContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FeedProvider } from "@/context/FeedContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { TabBarVisibilityProvider } from "@/context/TabBarVisibilityContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const JOB_SESSION_KEY = "connectt_jobs_session_v2";
const NAGARSEVAK_ALLOWED_TABS = new Set(["admin", "ward", "news", "profile"]);

function isSuperAdminUser(user: any) {
  return user?.role === "super_admin" || user?.isSuperAdmin === true;
}

function dashboardForUser(user: any) {
  if (!user) return "/portal-select";
  if (isSuperAdminUser(user)) return "/super-admin";
  if (user.role === "nagarsevak") return "/(tabs)/admin";
  return "/(tabs)";
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, logoutTarget, clearLogoutTarget } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const first = String(segments[0] || "");
    const inLogin = first === "login";
    const inTabs = first === "(tabs)";
    const inJobs = first === "jobs";
    const inPortalSelect = first === "portal-select";
    const inSecretAccess = first === "secret-access";
    const inSuperAdminLogin = first === "super-admin-login";
    const inSuperAdmin = first === "super-admin";
    const inNagarsevak = first === "nagarsevak";
    const currentTab = inTabs ? String(segments[1] || "") : undefined;
    const isPublicRoute = !first || inLogin || inJobs || inPortalSelect || inSecretAccess || inSuperAdminLogin || inNagarsevak;

    if (!user && !isPublicRoute) {
      const target = logoutTarget || "/portal-select";
      router.replace(target as any);
      if (logoutTarget) clearLogoutTarget();
      return;
    }

    if (!user) return;

    if (inLogin || inSuperAdminLogin || inNagarsevak) {
      router.replace(dashboardForUser(user) as any);
      return;
    }

    if (isSuperAdminUser(user) && !inSuperAdmin) {
      router.replace("/super-admin" as any);
    } else if (user.role === "nagarsevak" && !isSuperAdminUser(user) && inTabs && !NAGARSEVAK_ALLOWED_TABS.has(currentTab || "")) {
      router.replace("/(tabs)/admin" as any);
    }
  }, [user, loading, logoutTarget, clearLogoutTarget, segments, router]);

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    let alive = true;

    const boot = async () => {
      if (user) {
        if (!alive) return;
        setSplashDone(true);
        staticRouter.replace(dashboardForUser(user) as any);
        setBootChecked(true);
        return;
      }

      try {
        const savedJobUser = await AsyncStorage.getItem(JOB_SESSION_KEY);
        if (savedJobUser) {
          if (!alive) return;
          setSplashDone(true);
          staticRouter.replace("/jobs/(tabs)" as any);
          setBootChecked(true);
          return;
        }
      } catch {
        // Ignore stored job-session read failures and show default splash.
      }

      if (!alive) return;
      setBootChecked(true);
    };

    boot();
    return () => { alive = false; };
  }, [user, loading]);

  const handleFinish = async (portal: SplashPortal) => {
    setSplashDone(true);

    if (portal === "portal_select") {
      staticRouter.replace("/portal-select" as any);
      return;
    }

    if (portal === "secret_access") {
      staticRouter.replace("/secret-access" as any);
      return;
    }

    staticRouter.replace("/portal-select" as any);
  };

  return (
    <>
      {children}
      {bootChecked && !splashDone && !user && <AppSplash onFinish={handleFinish} />}
    </>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="portal-select" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="secret-access" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="super-admin-login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="super-admin" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="jobs" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="nagarsevak" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="complaint/new" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="complaint/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="complaint/list" options={{ headerShown: false }} />
      <Stack.Screen name="alert/new" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="alert/list" options={{ headerShown: false }} />
      <Stack.Screen name="service/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    setAssetsReady(true);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && assetsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, assetsReady]);

  if ((!fontsLoaded && !fontError) || !assetsReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <AlertProvider>
                <ComplaintProvider>
                  <FeedProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <TabBarVisibilityProvider>
                        <AppShell>
                          <AuthGate>
                            <RootLayoutNav />
                          </AuthGate>
                        </AppShell>
                      </TabBarVisibilityProvider>
                    </GestureHandlerRootView>
                  </FeedProvider>
                </ComplaintProvider>
              </AlertProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
