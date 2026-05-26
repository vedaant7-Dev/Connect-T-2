import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { JobsProvider } from "@/context/JobsContext";
import { JobsAuthProvider } from "@/context/JobsAuthContext";

function SuperAdminTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { name: "index", icon: "grid", label: "Dashboard" },
    { name: "officers", icon: "users", label: "Officers" },
    { name: "jobs", icon: "briefcase", label: "Jobs" },
    { name: "broadcast", icon: "radio", label: "Broadcast" },
    { name: "reports", icon: "bar-chart-2", label: "Reports" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "white",
        paddingBottom: Platform.OS === "ios" ? insets.bottom : 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
      }}
    >
      {state.routes.filter((r: any) => r.name !== "settings" && r.name !== "access").map((route: any, index: number) => {
        const tab = tabs.find((t) => t.name === route.name) || tabs[0];
        const isFocused = state.routes[state.index]?.name === route.name;
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
            activeOpacity={0.7}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: isFocused
                  ? "rgba(22,163,74,0.12)"
                  : "transparent",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Feather
                name={tab.icon as any}
                size={20}
                color={isFocused ? "#16A34A" : "#94A3B8"}
              />
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_400Regular",
                  color: isFocused ? "#16A34A" : "#94A3B8",
                  marginTop: 2,
                }}
              >
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SuperAdminLayout() {
  const { user } = useAuth();

  if (!user || (user.role !== "super_admin" && !user.isSuperAdmin)) {
    return null;
  }

  return (
    <JobsAuthProvider>
      <JobsProvider>
        <Tabs
          tabBar={(props) => <SuperAdminTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
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
