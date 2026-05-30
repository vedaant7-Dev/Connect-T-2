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
  const TAB_H = Platform.OS === "web" ? 66 : 58 + Math.max(insets.bottom, 8);

  const TABS = jobsUser?.role === "employer"
    ? [
        { name: "index",   label: "Jobs",     icon: "home"         as const, path: "/jobs/(tabs)" },
        { name: "post",    label: "Post",     icon: "plus-circle"  as const, path: "/jobs/(tabs)/post" },
        { name: "messages", label: "Chats",   icon: "message-circle" as const, path: "/jobs/(tabs)/messages" },
        { name: "profile", label: "Profile",  icon: "user"         as const, path: "/jobs/(tabs)/profile" },
      ]
    : [
        { name: "index",    label: "Home",     icon: "home"           as const, path: "/jobs/(tabs)" },
        { name: "applied",  label: "Applied",  icon: "check-circle"   as const, path: "/jobs/(tabs)/applied" },
        { name: "messages", label: "Chats",    icon: "message-circle" as const, path: "/jobs/(tabs)/messages" },
        { name: "resume",   label: "Resume",   icon: "file-text"      as const, path: "/jobs/(tabs)/resume" },
        { name: "profile",  label: "Profile",  icon: "user"           as const, path: "/jobs/(tabs)/profile" },
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
            activeOpacity={0.72}
          >
            <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
              <Feather name={tab.icon} size={19} color={active ? "#047857" : "#94A3B8"} />
            </View>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function JobsTabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <JobsTabBar />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="post" />
      <Tabs.Screen name="applied" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="resume" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#D1FAE5",
    shadowColor: "#064E3B",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: 8, minWidth: 0 },
  tabIconWrap: { width: 35, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tabIconWrapActive: { backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0" },
  tabLabel: { fontSize: 9.5, fontWeight: "600", color: "#94A3B8", fontFamily: "Inter_600SemiBold" },
  tabLabelActive: { color: "#047857", fontFamily: "Inter_700Bold" },
});