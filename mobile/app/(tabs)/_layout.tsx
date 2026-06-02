import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, Text, useColorScheme, TouchableOpacity } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/context/LanguageContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useAuth } from "@/context/AuthContext";
import ComplaintBubbleIcon from "@/components/ComplaintBubbleIcon";

const ORANGE = "#EA580C";
const GREEN = "#16A34A";
const MUTED = "#94A3B8";

function AnimatedTabBar(props: any) {
  const { state, descriptors, navigation } = props;
  const { tabBarAnimatedStyle } = useTabBarVisibility();
  const colorScheme = useColorScheme();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  const BOTTOM_INSET = isWeb ? 14 : Math.max(insets.bottom, 8);
  const TAB_HEIGHT = (isWeb ? 58 : 56) + BOTTOM_INSET;

  return (
    <Animated.View style={[{ position: "absolute", bottom: 0, left: 0, right: 0, height: TAB_HEIGHT }, tabBarAnimatedStyle]}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
        {isIOS ? <View style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />}
      </View>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingBottom: BOTTOM_INSET }}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          if (options.href === null || route.name === "services" || route.name === "admin" || route.name === "ward" || route.name === "news" || route.name === "emergency") return null;
          const isFocused = state.index === index;
          const tintColor = isFocused ? ORANGE : MUTED;
          const onPress = () => { const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true }); if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params); };
          const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });
          const iconMap: Record<string, string> = { index: "home", feed: "rss", profile: "user" };
          const label = typeof options.title === "string" ? options.title : route.name;
          return <TouchableOpacity key={route.key} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 6 }} accessibilityRole="button" accessibilityState={isFocused ? { selected: true } : {}} accessibilityLabel={label}>{route.name === "complaints" ? <ComplaintBubbleIcon color={tintColor} size={22} /> : <Feather name={(iconMap[route.name] || "circle") as any} size={22} color={tintColor} />}<Text style={{ fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 3, color: tintColor }}>{label}</Text></TouchableOpacity>;
        })}
      </View>
    </Animated.View>
  );
}

function NagarsevakTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 14 : Math.max(insets.bottom, 8);
  const orderedNames = ["admin", "ward", "news", "profile"];
  const routeByName = Object.fromEntries(state.routes.map((route: any) => [route.name, route]));
  const activeRouteName = state.routes[state.index]?.name;
  const labelMap: Record<string, string> = { admin: "Home", ward: "Ward", news: "News", profile: "Profile" };
  const iconMap: Record<string, string> = { admin: "home", ward: "users", news: "radio", profile: "user" };

  return (
    <View style={{ flexDirection: "row", backgroundColor: "white", paddingBottom: bottomInset, paddingTop: 7, borderTopWidth: 1, borderTopColor: "#E2E8F0", shadowColor: "#166534", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10 }}>
      {orderedNames.map((name) => {
        const route: any = routeByName[name];
        if (!route) return null;
        const isFocused = activeRouteName === name;
        const label = labelMap[name] || descriptors[route.key]?.options?.title || name;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (isFocused || event.defaultPrevented) return;

          if (typeof navigation.jumpTo === "function") {
            navigation.jumpTo(route.name, route.params);
          } else {
            navigation.navigate(route.name, route.params);
          }
        };
        return <TouchableOpacity key={route.key} onPress={onPress} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 3 }} activeOpacity={0.72}><View style={{ width: 42, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: isFocused ? "rgba(22,163,74,0.12)" : "transparent", borderRadius: 16, borderWidth: isFocused ? 1 : 0, borderColor: "rgba(22,163,74,0.18)" }}><Feather name={(iconMap[name] || "circle") as any} size={20} color={isFocused ? GREEN : MUTED} /></View><Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: isFocused ? "Inter_700Bold" : "Inter_600SemiBold", color: isFocused ? GREEN : MUTED, marginTop: 2 }}>{label}</Text></TouchableOpacity>;
      })}
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isNagarsevak = user?.role === "nagarsevak";

  return (
    <Tabs backBehavior="history" initialRouteName={isNagarsevak ? "admin" : "index"} tabBar={(props) => isNagarsevak ? <NagarsevakTabBar {...props} /> : <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, tabBarActiveTintColor: isNagarsevak ? GREEN : ORANGE, tabBarInactiveTintColor: MUTED }}>
      <Tabs.Screen name="admin" options={{ title: "Home", href: isNagarsevak ? undefined : null }} />
      <Tabs.Screen name="ward" options={{ title: "Ward", href: isNagarsevak ? undefined : null }} />
      <Tabs.Screen name="news" options={{ title: "News", href: isNagarsevak ? undefined : null }} />
      <Tabs.Screen name="profile" options={{ title: t("profile"), href: undefined }} />
      <Tabs.Screen name="index" options={{ title: t("home"), href: isNagarsevak ? null : undefined }} />
      <Tabs.Screen name="emergency" options={{ href: null }} />
      <Tabs.Screen name="complaints" options={{ title: t("complaints"), href: isNagarsevak ? null : undefined }} />
      <Tabs.Screen name="feed" options={{ title: t("feed"), href: isNagarsevak ? null : undefined }} />
      <Tabs.Screen name="services" options={{ href: null }} />
    </Tabs>
  );
}