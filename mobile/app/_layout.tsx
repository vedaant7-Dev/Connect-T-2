import "react-native-reanimated";

import React from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import {
<<<<<<< HEAD
  INTER_REGULAR,
  INTER_MEDIUM,
  INTER_SEMIBOLD,
  INTER_BOLD,
  INTER_EXTRABOLD,
  INTER_LIGHT,
} from "../constants/Fonts";
import { Image } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments, router as staticRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSplash, SplashPortal } from "@/components/AppSplash";
import { ComplaintProvider } from "@/context/ComplaintContext";
import { AlertProvider } from "@/context/AlertContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FeedProvider } from "@/context/FeedContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { TabBarVisibilityProvider } from "@/context/TabBarVisibilityContext";
=======
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
>>>>>>> e8796f4 (optimize android build configuration)

import { useFonts } from "expo-font";

import { AuthProvider } from "../context/AuthContext";
import { ComplaintProvider } from "../context/ComplaintContext";

const queryClient = new QueryClient();

<<<<<<< HEAD
function isSuperAdminUser(user: any) {
  return user?.role === "super_admin" || user?.isSuperAdmin === true;
}

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
    const inSuperAdmin = segments[0] === "super-admin";
    const currentTab = inTabs ? segments[1] : undefined;

    if (inJobs) return;
    if (inPortalSelect) return;

    if (inSuperAdmin && user && isSuperAdminUser(user)) return;

    if (!user && !inLogin) {
      router.replace("/login");
    } else if (user && inLogin) {
      if (isSuperAdminUser(user)) {
        router.replace("/super-admin" as any);
      } else if (user.role === "nagarsevak") {
        router.replace("/(tabs)/admin" as any);
      } else {
        router.replace("/(tabs)/");
      }
    } else if (user && isSuperAdminUser(user) && !inSuperAdmin) {
      router.replace("/super-admin" as any);
    } else if (user && user.role === "nagarsevak" && !isSuperAdminUser(user) && inTabs && currentTab !== "admin") {
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
      if (isSuperAdminUser(user)) {
        staticRouter.replace("/super-admin" as any);
      } else if (user.role === "nagarsevak") {
        staticRouter.replace("/(tabs)/admin" as any);
      } else {
        staticRouter.replace("/(tabs)/");
      }
    }
  }, [user, loading]);

  const handleFinish = async (portal: SplashPortal) => {
    setSplashDone(true);
    if (portal === "super_admin") {
      staticRouter.replace("/super-admin" as any);
    } else if (portal === "nagarsevak") {
      if (user && user.role === "nagarsevak" && !isSuperAdminUser(user)) {
        staticRouter.replace("/(tabs)/admin" as any);
      } else if (user && isSuperAdminUser(user)) {
        staticRouter.replace("/super-admin" as any);
      } else {
        staticRouter.replace("/nagarsevak/login" as any);
      }
    } else {
      if (user) {
        if (isSuperAdminUser(user)) {
          staticRouter.replace("/super-admin" as any);
        } else if (user.role === "nagarsevak") {
          staticRouter.replace("/(tabs)/admin" as any);
        } else {
          staticRouter.replace("/(tabs)/");
        }
      } else {
        staticRouter.replace("/login");
      }
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

=======
>>>>>>> e8796f4 (optimize android build configuration)
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ComplaintProvider>
              <StatusBar style="light" />

              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="select-service" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="jobs" />
                <Stack.Screen name="nagarsevak" />
                <Stack.Screen name="super-admin" />
                <Stack.Screen name="complaint" />
                <Stack.Screen name="alert" />
              </Stack>
            </ComplaintProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
