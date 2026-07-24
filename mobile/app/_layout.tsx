import "../global.css";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter, useSegments, router as staticRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSplash, SplashPortal } from "@/components/AppSplash";
import { ComplaintProvider } from "@/context/ComplaintContext";
import { AlertProvider } from "@/context/AlertContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BroadcastProvider } from "@/context/BroadcastContext";
import { FeedProvider } from "@/context/FeedContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { TabBarVisibilityProvider } from "@/context/TabBarVisibilityContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const NAGARSEVAK_ALLOWED_TABS = new Set(["admin", "ward", "news", "profile"]);

function isSuperAdminUser(user: any) {
  return user?.role === "super_admin" || user?.isSuperAdmin === true;
}

function dashboardForUser(user: any) {
  if (!user) return "/login";
  if (isSuperAdminUser(user)) return "/super-admin";
  if (user.role === "nagarsevak") return "/(tabs)/admin";
  return "/portal-select";
}

function ProtectedCacheResetter() {
  const { user, loading } = useAuth();
  const client = useQueryClient();
  const previouslyAuthenticated = useRef<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (previouslyAuthenticated.current === true && !user) client.clear();
    previouslyAuthenticated.current = !!user;
  }, [client, loading, user]);

  return null;
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
    const inSuperAdminLogin = first === "super-admin-login";
    const inSuperAdmin = first === "super-admin";
    const inNagarsevak = first === "nagarsevak";
    const inAlert = first === "alert";
    const inComplaint = first === "complaint";
    const currentTab = inTabs ? String(segments[1] || "") : undefined;
    const isPublicRoute = !first || inLogin || inSuperAdminLogin || inNagarsevak;

    if (!user && logoutTarget) {
      if (!inLogin) router.replace("/login" as any);
      clearLogoutTarget();
      return;
    }

    if (!user && !isPublicRoute) {
      router.replace("/login" as any);
      return;
    }

    if (!user) return;

    if (inLogin || inSuperAdminLogin || inNagarsevak) {
      router.replace(dashboardForUser(user) as any);
      return;
    }

    if (isSuperAdminUser(user) && !inSuperAdmin && !inAlert && !inComplaint) {
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

      if (!alive) return;
      setBootChecked(true);
    };

    boot();
    return () => { alive = false; };
  }, [user, loading]);

  const handleFinish = async (_portal: SplashPortal) => {
    setSplashDone(true);
    staticRouter.replace("/login" as any);
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
      <Stack.Screen name="alert/[id]" options={{ headerShown: false }} />
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
    if ((fontsLoaded || fontError) && assetsReady) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, assetsReady]);

  if ((!fontsLoaded && !fontError) || !assetsReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <ProtectedCacheResetter />
              <AlertProvider>
                <BroadcastProvider>
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
                </BroadcastProvider>
              </AlertProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
