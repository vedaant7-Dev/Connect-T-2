import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { JobsProvider } from "@/context/JobsContext";
import { JobsAuthProvider } from "@/context/JobsAuthContext";

const GREEN = "#16A34A";
const MUTED = "#94A3B8";

const TABS = [
  { name: "index", icon: "grid", label: "Dashboard" },
  { name: "officers", icon: "users", label: "Officers" },
  { name: "jobs", icon: "briefcase", label: "Jobs" },
  { name: "broadcast", icon: "radio", label: "Broadcast" },
  { name: "reports", icon: "bar-chart-2", label: "Reports" },
];

function SuperAdminTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View style={{ flexDirection: "row", backgroundColor: "white", paddingBottom: bottomInset, paddingTop: 7, borderTopWidth: 1, borderTopColor: "#E2E8F0", shadowColor: "#166534", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10 }}>
      {TABS.map((tab) => {
        const route = state.routes.find((item: any) => item.name === tab.name);
        if (!route) return null;
        const isFocused = activeRouteName === tab.name;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(tab.name);
        };

        return (
          <TouchableOpacity key={tab.name} onPress={onPress} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 3, minWidth: 0 }} activeOpacity={0.72} accessibilityRole="button" accessibilityState={isFocused ? { selected: true } : {}}>
            <View style={{ width: 38, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: isFocused ? "rgba(22,163,74,0.12)" : "transparent", borderRadius: 16, borderWidth: isFocused ? 1 : 0, borderColor: "rgba(22,163,74,0.18)" }}>
              <Feather name={tab.icon as any} size={18} color={isFocused ? GREEN : MUTED} />
            </View>
            <Text numberOfLines={1} style={{ fontSize: 9.2, fontFamily: isFocused ? "Inter_700Bold" : "Inter_600SemiBold", color: isFocused ? GREEN : MUTED, marginTop: 2, maxWidth: 72 }}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FloatingSettingsButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      onPress={() => router.push("/super-admin/settings" as any)}
      activeOpacity={0.86}
      style={{
        position: "absolute",
        top: (Platform.OS === "web" ? 24 : Math.max(insets.top, 8)) + 10,
        right: 14,
        width: 40,
        height: 40,
        borderRadius: 15,
        backgroundColor: "rgba(255,255,255,0.96)",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#052E16",
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        borderWidth: 1,
        borderColor: "rgba(22,163,74,0.22)",
        zIndex: 999,
      }}
    >
      <Feather name="settings" size={19} color={GREEN} />
    </TouchableOpacity>
  );
}

export default function SuperAdminLayout() {
  const { user } = useAuth();

  if (!user || (user.role !== "super_admin" && !user.isSuperAdmin)) return null;

  return (
    <JobsAuthProvider>
      <JobsProvider>
        <View style={{ flex: 1 }}>
          <Tabs tabBar={(props) => <SuperAdminTabBar {...props} />} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="officers" />
            <Tabs.Screen name="jobs" />
            <Tabs.Screen name="broadcast" />
            <Tabs.Screen name="reports" />
            <Tabs.Screen name="settings" options={{ href: null }} />
            <Tabs.Screen name="access" options={{ href: null }} />
          </Tabs>
          <FloatingSettingsButton />
        </View>
      </JobsProvider>
    </JobsAuthProvider>
  );
}
