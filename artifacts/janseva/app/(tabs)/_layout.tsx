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
          height: isWeb ? 80 : Platform.OS === "android" ? 64 : 80,
          paddingTop: 8,
          paddingBottom: isWeb ? 18 : Platform.OS === "android" ? 10 : 24,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          fontFamily: "Inter_600SemiBold",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="complaints"
        options={{
          title: "Complaints",
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: focused ? "#1E40AF" : "#EFF6FF",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: focused ? "#1E40AF" : "transparent",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.35,
              shadowRadius: 6,
              elevation: focused ? 4 : 0,
              marginTop: -8,
            }}>
              <Feather name="edit-3" size={20} color={focused ? "white" : "#2563EB"} />
            </View>
          ),
          tabBarActiveTintColor: "#1E40AF",
          tabBarLabel: "Complaints",
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: "SOS",
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: focused ? "#DC2626" : "#FEE2E2",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#DC2626",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 6,
              marginTop: -16,
              borderWidth: 3,
              borderColor: "white",
            }}>
              <Feather name="phone-call" size={20} color={focused ? "white" : "#DC2626"} />
            </View>
          ),
          tabBarActiveTintColor: "#DC2626",
          tabBarLabel: "SOS",
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color }) => <Feather name="rss" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
