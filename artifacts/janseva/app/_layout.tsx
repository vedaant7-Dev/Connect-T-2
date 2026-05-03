import "../global.css";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Asset } from "expo-asset";
import { Image } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments, router as staticRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSplash } from "@/components/AppSplash";
import { ComplaintProvider } from "@/context/ComplaintContext";
import { AlertProvider } from "@/context/AlertContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FeedProvider } from "@/context/FeedContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { TabBarVisibilityProvider } from "@/context/TabBarVisibilityContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === "login";
    const inTabs = segments[0] === "(tabs)";
    const inJobs = segments[0] === "jobs";
    const inPortalSelect = segments[0] === "portal-select";
    const currentTab = inTabs ? segments[1] : undefined;

    if (inJobs) return;
    if (inPortalSelect) return;

    if (!user && !inLogin) {
      router.replace("/login");
    } else if (user && inLogin) {
      router.replace(user.role === "nagarsevak" ? "/(tabs)/admin" as any : "/(tabs)/");
    } else if (user && user.role === "nagarsevak" && inTabs && currentTab !== "admin") {
      router.replace("/(tabs)/admin" as any);
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      setSplashDone(true);
      staticRouter.replace(user.role === "nagarsevak" ? "/(tabs)/admin" as any : "/(tabs)/");
    }
  }, [user, loading]);

  const handleFinish = async (portal: "civic" | "jobs") => {
    if (portal === "civic") {
      setSplashDone(true);
      staticRouter.replace(user ? (user.role === "nagarsevak" ? "/(tabs)/admin" as any : "/(tabs)/") : "/login");
    } else {
      setSplashDone(true);
      staticRouter.replace("/jobs/login" as any);
    }
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="jobs" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen
        name="complaint/new"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="complaint/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="complaint/list"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="alert/new"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="alert/list"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="service/[id]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

const logoImage = require("@/assets/images/logo_transparent.png");

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
    const preload = async () => {
      try {
        await Asset.loadAsync([logoImage]);
        const resolved = Asset.fromModule(logoImage);
        if (resolved.uri) {
          await Image.prefetch(resolved.uri);
        }
      } catch {}
      setAssetsReady(true);
    };
    preload();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && assetsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, assetsReady]);

  if ((!fontsLoaded && !fontError) || !assetsReady) return null;

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
