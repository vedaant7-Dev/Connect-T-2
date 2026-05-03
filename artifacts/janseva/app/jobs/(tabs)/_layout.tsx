import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useJobsAuth } from "@/context/JobsAuthContext";

function JobsTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { jobsUser } = useJobsAuth();
  const TAB_H = Platform.OS === "web" ? 64 : 56 + Math.max(insets.bottom, 8);

  const TABS = [
    { name: "index",   label: "Jobs",     icon: "home"   as const, path: "/jobs/(tabs)" },
    ...(jobsUser?.role === "employer"
      ? [{ name: "post", label: "Post Job", icon: "plus-circle" as const, path: "/jobs/(tabs)/post" }]
      : [{ name: "applied", label: "Applied",  icon: "check-circle" as const, path: "/jobs/(tabs)/applied" }]),
    { name: "profile", label: "Profile",  icon: "user"        as const, path: "/jobs/(tabs)/profile" },
  ];

  return (
    <View style={[styles.tabBar, { height: TAB_H, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const active =
          pathname === tab.path ||
          pathname.startsWith(`${tab.path}/`) ||
          (tab.name === "index" && (pathname === "/jobs/(tabs)/index" || pathname === "/jobs/(tabs)"));
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => router.replace(tab.path as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
              <Feather name={tab.icon} size={20} color={active ? "#EA580C" : "#94A3B8"} />
            </View>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function JobsTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => <JobsTabBar />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="post" />
      <Tabs.Screen name="applied" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
    shadowColor: "#EA580C",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingTop: 8 },
  tabIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tabIconWrapActive: { backgroundColor: "#FFF7ED" },
  tabLabel: { fontSize: 10, fontWeight: "600", color: "#94A3B8", fontFamily: "Inter_600SemiBold" },
  tabLabelActive: { color: "#EA580C", fontFamily: "Inter_700Bold" },
});
