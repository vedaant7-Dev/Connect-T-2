import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, Text, useColorScheme, TouchableOpacity } from "react-native";
import Animated from "react-native-reanimated";
import { useLanguage } from "@/context/LanguageContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";

function AnimatedTabBar(props: any) {
  const { state, descriptors, navigation } = props;
  const { tabBarAnimatedStyle } = useTabBarVisibility();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isAndroid = Platform.OS === "android";

  const TAB_HEIGHT = isWeb ? 72 : isAndroid ? 64 : 80;
  const BOTTOM_PAD = isWeb ? 14 : isAndroid ? 8 : 24;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_HEIGHT,
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          overflow: "hidden",
        },
        tabBarAnimatedStyle,
      ]}
    >
      {isIOS ? (
        <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
      )}
      <View style={{ flex: 1, flexDirection: "row", paddingTop: 8, paddingBottom: BOTTOM_PAD }}>
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
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel="SOS"
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: isFocused ? "#B91C1C" : "#DC2626",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: -22,
                    borderWidth: 3.5,
                    borderColor: "white",
                    shadowColor: "#DC2626",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.45,
                    shadowRadius: 12,
                    elevation: 10,
                    gap: 2,
                  }}
                >
                  <Feather name="phone-call" size={17} color="white" />
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
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
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
