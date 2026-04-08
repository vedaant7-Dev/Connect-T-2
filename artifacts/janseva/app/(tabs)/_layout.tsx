import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, Text, useColorScheme, TouchableOpacity } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/context/LanguageContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";

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

          if (options.href === null || route.name === "services" || route.name === "admin") return null;

          const isFocused = state.index === index;
          const tintColor = isFocused ? "#2563EB" : "#94A3B8";

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

          if (route.name === "emergency") {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.8}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", marginTop: -28 }}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel="SOS"
              >
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: isFocused ? "#B91C1C" : "#DC2626",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 4,
                    borderColor: "white",
                    shadowColor: "#DC2626",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    elevation: 10,
                    gap: 1,
                  }}
                >
                  <Feather name="phone-call" size={18} color="white" />
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "900",
                      color: "white",
                      letterSpacing: 1.5,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    SOS
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }

          const iconMap: Record<string, string> = {
            index: "home",
            complaints: "edit-3",
            feed: "rss",
            profile: "user",
          };

          const iconName = iconMap[route.name] || "circle";
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
              <Feather name={iconName as any} size={22} color={tintColor} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  fontFamily: "Inter_600SemiBold",
                  marginTop: 2,
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

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
        }}
      />

      <Tabs.Screen
        name="complaints"
        options={{
          title: t("complaints"),
        }}
      />

      <Tabs.Screen
        name="emergency"
        options={{
          title: "SOS",
        }}
      />

      <Tabs.Screen
        name="feed"
        options={{
          title: t("feed"),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
        }}
      />

      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}
