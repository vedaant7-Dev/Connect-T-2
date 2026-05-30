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

function isSuperAdminUser(user: any) {
  return user?.role === "super_admin" || user?.isSuperAdmin === true;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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
    const currentTab = inTabs ? segments[1] : undefined;

    if (inJobs || inPortalSelect || inSecretAccess || inSuperAdminLogin || inNagarsevak) return;
    if (inSuperAdmin && user && isSuperAdminUser(user)) return;

    if (!user && !inLogin) {
      router.replace("/login");
    } else if (user && inLogin) {
      if (isSuperAdminUser(user)) {
        router.replace("/super-admin" as any);
      } else if (user.role === "nagarsevak") {
        router.replace("/(tabs)/admin" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    } else if (user && isSuperAdminUser(user) && !inSuperAdmin) {
      router.replace("/super-admin" as any);
    } else if (user && user.role === "nagarsevak" && !isSuperAdminUser(user) && inTabs && currentTab !== "admin") {
      router.replace("/(tabs)/admin" as any);
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      setSplashDone(true);
      if (isSuperAdminUser(user)) {
        staticRouter.replace("/super-admin" as any);
      } else if (user.role === "nagarsevak") {
        staticRouter.replace("/(tabs)/admin" as any);
      } else {
        staticRouter.replace("/(tabs)" as any);
      }
    }
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

    if ((portal as string) === "super_admin") {
      if (user && isSuperAdminUser(user)) staticRouter.replace("/super-admin" as any);
      else staticRouter.replace("/super-admin-login" as any);
      return;
    }

    if ((portal as string) === "nagarsevak") {
      if (user && user.role === "nagarsevak" && !isSuperAdminUser(user)) staticRouter.replace("/(tabs)/admin" as any);
      else if (user && isSuperAdminUser(user)) staticRouter.replace("/super-admin" as any);
      else staticRouter.replace("/nagarsevak/login" as any);
      return;
    }

    staticRouter.replace(user ? "/(tabs)" : "/login");
  };

  return (
    <>
      {children}
      {!splashDone && <AppSplash onFinish={handleFinish} />}
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
