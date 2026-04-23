import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, Text, useColorScheme, TouchableOpacity } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/context/LanguageContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useAuth } from "@/context/AuthContext";
import ComplaintBubbleIcon from "@/components/ComplaintBubbleIcon";

function AnimatedTabBar(props: any) {
  const { state, descriptors, navigation } = props;
  const { tabBarAnimatedStyle } = useTabBarVisibility();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const BOTTOM_INSET = isWeb ? 14 : Math.max(insets.bottom, 8);
  const TAB_HEIGHT = (isWeb ? 58 : 56) + BOTTOM_INSET;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_HEIGHT,
        },
        tabBarAnimatedStyle,
      ]}
    >
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
        {isIOS ? (
          <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
        )}
      </View>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingBottom: BOTTOM_INSET }}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];

          if (options.href === null || route.name === "services" || route.name === "admin" || route.name === "emergency") return null;

          const isFocused = state.index === index;
          const tintColor = isFocused ? "#EA580C" : "#94A3B8";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const iconMap: Record<string, string> = {
            index: "home",
            feed: "rss",
            profile: "user",
          };

          const label = typeof options.title === "string" ? options.title : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.8}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 6 }}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              {route.name === "complaints" ? (
                <ComplaintBubbleIcon color={tintColor} size={22} />
              ) : (
                <Feather name={(iconMap[route.name] || "circle") as any} size={22} color={tintColor} />
              )}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  fontFamily: "Inter_700Bold",
                  marginTop: 3,
                  color: tintColor,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isNagarsevak = user?.role === "nagarsevak";

  return (
    <Tabs
      tabBar={(props) => isNagarsevak ? null : <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#EA580C",
        tabBarInactiveTintColor: "#94A3B8",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          href: isNagarsevak ? null : undefined,
        }}
      />

      <Tabs.Screen
        name="emergency"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="complaints"
        options={{
          title: t("complaints"),
          href: isNagarsevak ? null : undefined,
        }}
      />

      <Tabs.Screen
        name="feed"
        options={{
          title: t("feed"),
          href: isNagarsevak ? null : undefined,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          href: isNagarsevak ? null : undefined,
        }}
      />

      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}
