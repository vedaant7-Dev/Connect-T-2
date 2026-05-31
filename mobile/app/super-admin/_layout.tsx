import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { JobsProvider } from "@/context/JobsContext";
import { JobsAuthProvider } from "@/context/JobsAuthContext";

const GREEN = "#16A34A";
const MUTED = "#94A3B8";

function SuperAdminTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { name: "index", icon: "grid", label: "Dashboard" },
    { name: "officers", icon: "users", label: "Officers" },
    { name: "jobs", icon: "briefcase", label: "Jobs" },
    { name: "broadcast", icon: "radio", label: "Broadcast" },
    { name: "reports", icon: "bar-chart-2", label: "Reports" },
  ];

  const visibleRoutes = state.routes.filter((r: any) => r.name !== "settings" && r.name !== "access");
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View style={{ flexDirection: "row", backgroundColor: "white", paddingBottom: Platform.OS === "ios" ? insets.bottom : 8, paddingTop: 7, borderTopWidth: 1, borderTopColor: "#E2E8F0", shadowColor: "#166534", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10 }}>
      {visibleRoutes.map((route: any) => {
        const tab = tabs.find((t) => t.name === route.name) || tabs[0];
        const isFocused = activeRouteName === route.name;
        return (
          <TouchableOpacity key={route.key} onPress={() => navigation.navigate(route.name)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 3 }} activeOpacity={0.72}>
            <View style={{ width: 38, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: isFocused ? "rgba(22,163,74,0.12)" : "transparent", borderRadius: 16, borderWidth: isFocused ? 1 : 0, borderColor: "rgba(22,163,74,0.18)" }}>
              <Feather name={tab.icon as any} size={19} color={isFocused ? GREEN : MUTED} />
            </View>
            <Text numberOfLines={1} style={{ fontSize: 8.7, fontFamily: isFocused ? "Inter_700Bold" : "Inter_600SemiBold", color: isFocused ? GREEN : MUTED, marginTop: 2, maxWidth: 70 }}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SuperAdminLayout() {
  const { user } = useAuth();

  if (!user || (user.role !== "super_admin" && !user.isSuperAdmin)) return null;

  return (
    <JobsAuthProvider>
      <JobsProvider>
        <Tabs tabBar={(props) => <SuperAdminTabBar {...props} />} screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="officers" />
          <Tabs.Screen name="jobs" />
          <Tabs.Screen name="broadcast" />
          <Tabs.Screen name="reports" />
          <Tabs.Screen name="settings" />
          <Tabs.Screen name="access" />
        </Tabs>
      </JobsProvider>
    </JobsAuthProvider>
  );
}
