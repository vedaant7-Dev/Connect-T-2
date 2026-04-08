import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Asset } from "expo-asset";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSplash } from "@/components/AppSplash";
import { ComplaintProvider } from "@/context/ComplaintContext";
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
    const currentTab = inTabs ? segments[1] : undefined;

    if (!user && !inLogin) {
      router.replace("/login");
    } else if (user && inLogin) {
      if (user.role === "nagarsevak") {
        router.replace("/(tabs)/admin" as any);
      } else {
        router.replace("/(tabs)");
      }
    } else if (user && user.role === "nagarsevak" && inTabs && currentTab !== "admin") {
      router.replace("/(tabs)/admin" as any);
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="complaint/new"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="complaint/[id]"
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
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    Asset.loadAsync([logoImage]).then(() => setAssetsReady(true)).catch(() => setAssetsReady(true));
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
              <ComplaintProvider>
                <FeedProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <TabBarVisibilityProvider>
                      <AuthGate>
                        <RootLayoutNav />
                      </AuthGate>
                      {!splashDone && (
                        <AppSplash onFinish={() => setSplashDone(true)} />
                      )}
                    </TabBarVisibilityProvider>
                  </GestureHandlerRootView>
                </FeedProvider>
              </ComplaintProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
