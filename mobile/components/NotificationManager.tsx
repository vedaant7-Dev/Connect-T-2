import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";

const CHANNEL_ID = "connectt-updates";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function notificationRoute(data: Record<string, unknown>) {
  const explicit = typeof data.route === "string" ? data.route : "";
  if (explicit) return explicit;
  if (data.complaintId) return `/complaint/${String(data.complaintId)}`;
  if (data.broadcastId || data.alertId || data.type === "news" || data.type === "broadcast") return "/(tabs)/feed";
  return "/portal-select";
}

async function enablePushNotifications() {
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Connect-T Updates",
      description: "Complaints, ward news, notices, broadcasts and civic status updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#16A34A",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) throw new Error("Expo project ID is missing from app configuration.");
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export default function NotificationManager() {
  const { user } = useAuth();
  const router = useRouter();
  const registeredFor = useRef("");

  useEffect(() => {
    if (!user?.id || Platform.OS === "web") return;
    const registrationKey = `${user.id}:${Constants.expoConfig?.version || ""}`;
    if (registeredFor.current === registrationKey) return;
    let cancelled = false;

    enablePushNotifications()
      .then(async (expoPushToken) => {
        if (!expoPushToken || cancelled) return;
        await apiPost("/api/notifications/register", {
          expoPushToken,
          platform: Platform.OS,
          appVersion: Constants.expoConfig?.version || "unknown",
        });
        registeredFor.current = registrationKey;
      })
      .catch((error) => console.warn("Notification registration failed", error?.message || error));

    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = (response.notification.request.content.data || {}) as Record<string, unknown>;
      router.push(notificationRoute(data) as any);
      void Notifications.setBadgeCountAsync(0).catch(() => undefined);
    };

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
    const appSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void Notifications.setBadgeCountAsync(0).catch(() => undefined);
    });
    return () => {
      responseSubscription.remove();
      appSubscription.remove();
    };
  }, [router]);

  return null;
}
