import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useAuth } from "@/context/AuthContext";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { user } = useAuth();

  const adminColor = user?.role === "nagarsevak"
    ? "#059669"
    : user?.role === "head_admin"
    ? "#7C3AED"
    : "#94A3B8";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          elevation: 0,
          height: isWeb ? 84 : 62,
          paddingBottom: isWeb ? 20 : 6,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "700",
          fontFamily: "Inter_600SemiBold",
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Feather name={focused ? "home" : "home"} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="complaints"
        options={{
          title: "Complaints",
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: focused ? "#1E40AF" : "#EFF6FF",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
              shadowColor: focused ? "#1E40AF" : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: focused ? 4 : 0,
            }}>
              <Feather name="edit-3" size={20} color={focused ? "white" : "#2563EB"} />
            </View>
          ),
          tabBarActiveTintColor: "#1E40AF",
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: "Emergency",
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: focused ? "#DC2626" : "#FEE2E2",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 2,
            }}>
              <Feather name="phone-call" size={19} color={focused ? "white" : "#DC2626"} />
            </View>
          ),
          tabBarActiveTintColor: "#DC2626",
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="rss" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: user?.role === "nagarsevak"
            ? "Nagarsevak"
            : user?.role === "head_admin"
            ? "Admin"
            : "Admin",
          tabBarIcon: ({ focused }) => (
            <Feather
              name={user?.role === "head_admin" ? "shield" : user?.role === "nagarsevak" ? "briefcase" : "user"}
              size={20}
              color={focused ? adminColor : "#94A3B8"}
            />
          ),
          tabBarActiveTintColor: adminColor,
        }}
      />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
