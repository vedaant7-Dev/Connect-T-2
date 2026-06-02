import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useJobsAuth } from "@/context/JobsAuthContext";

const ORANGE = "#EA580C";
const MUTED = "#94A3B8";

function JobsTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { jobsUser } = useJobsAuth();
  const TAB_H = Platform.OS === "web" ? 66 : 58 + Math.max(insets.bottom, 8);
  const activeRouteName = state.routes[state.index]?.name;

  const tabs = jobsUser?.role === "employer"
    ? [
        { name: "index", label: "Jobs", icon: "home" },
        { name: "post", label: "Post", icon: "plus-circle" },
        { name: "messages", label: "Chats", icon: "message-circle" },
        { name: "profile", label: "Profile", icon: "user" },
      ]
    : [
        { name: "index", label: "Home", icon: "home" },
        { name: "applied", label: "Applied", icon: "check-circle" },
        { name: "messages", label: "Chats", icon: "message-circle" },
        { name: "profile", label: "Profile", icon: "user" },
      ];

  return (
    <View style={[styles.tabBar, { height: TAB_H, paddingBottom: Math.max(insets.bottom, 8) }]}> 
      {tabs.map((tab) => {
        const route = state.routes.find((item: any) => item.name === tab.name);
        if (!route) return null;
        const active = activeRouteName === tab.name;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) navigation.navigate(tab.name);
        };
        return (
          <TouchableOpacity key={tab.name} style={styles.tabItem} onPress={onPress} activeOpacity={0.72}>
            <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
              <Feather name={tab.icon as any} size={18} color={active ? ORANGE : MUTED} />
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
    <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <JobsTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="post" />
      <Tabs.Screen name="applied" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="resume" options={{ href: null }} />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#FFEDD5", shadowColor: "#B45309", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 10 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: 8, minWidth: 0 },
  tabIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  tabIconWrapActive: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  tabLabel: { fontSize: 9.8, fontWeight: "600", color: MUTED, fontFamily: "Inter_600SemiBold" },
  tabLabelActive: { color: ORANGE, fontFamily: "Inter_700Bold" },
});
