import "../global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Stack,
  router as staticRouter,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppSplash, type SplashPortal } from "@/components/AppSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AlertProvider } from "@/context/AlertContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ComplaintProvider } from "@/context/ComplaintContext";
import { FeedProvider } from "@/context/FeedContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { TabBarVisibilityProvider } from "@/context/TabBarVisibilityContext";

void SplashScreen.preventAutoHideAsync().catch(() => {});

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

    const root = segments[0];
    const currentTab = root === "(tabs)" ? segments[1] : undefined;

    const inIndex = !root || root === "index";
    const inLogin = root === "login";
    const inTabs = root === "(tabs)";
    const inJobs = root === "jobs";
    const inPortalSelect = root === "portal-select";
    const inSecretAccess = root === "secret-access";
    const inSuperAdmin = root === "super-admin";
    const inNagarsevakAuth = root === "nagarsevak";

    if (inIndex || inPortalSelect || inSecretAccess || inJobs || inNagarsevakAuth) {
      return;
    }

    if (inSuperAdmin) {
      if (!user) {
        router.replace("/secret-access" as any);
        return;
      }

      if (!isSuperAdminUser(user)) {
        if (user.role === "nagarsevak") {
          router.replace("/(tabs)/admin" as any);
        } else {
          router.replace("/(tabs)" as any);
        }
      }

      return;
    }

    if (!user && !inLogin) {
      router.replace("/login" as any);
      return;
    }

    if (user && inLogin) {
      if (isSuperAdminUser(user)) {
        router.replace("/super-admin" as any);
      } else if (user.role === "nagarsevak") {
        router.replace("/(tabs)/admin" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
      return;
    }

    if (user && isSuperAdminUser(user) && !inSuperAdmin) {
      router.replace("/super-admin" as any);
      return;
    }

    if (
      user &&
      user.role === "nagarsevak" &&
      !isSuperAdminUser(user) &&
      inTabs &&
      currentTab !== "admin"
    ) {
      router.replace("/(tabs)/admin" as any);
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false);

  const handleFinish = async (portal: SplashPortal) => {
    setSplashDone(true);

    if (portal === "secret_access") {
      staticRouter.replace("/secret-access" as any);
      return;
    }

    staticRouter.replace("/portal-select" as any);
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
      <Stack.Screen name="index" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="portal-select" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="secret-access" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="super-admin-login" options={{ headerShown: false, animation: "fade" }} />

      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="super-admin" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="jobs" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="nagarsevak" options={{ headerShown: false, animation: "fade" }} />

      <Stack.Screen
        name="complaint/new"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen name="complaint/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="complaint/list" options={{ headerShown: false }} />

      <Stack.Screen
        name="alert/new"
        options={{ headerShown: false, presentation: "modal" }}
      />
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
    Inter_800ExtraBold,
  });

  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    setAssetsReady(true);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && assetsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, assetsReady]);

  if ((!fontsLoaded && !fontError) || !assetsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" translucent backgroundColor="transparent" />
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
