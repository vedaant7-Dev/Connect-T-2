import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import DecorativeCircles from "./DecorativeCircles";
import TopShade from "./TopShade";

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
}

export function GradientHeader({ title, subtitle, rightComponent }: GradientHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient
      colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: topPadding + 12, overflow: "hidden" }]}
    >
      <TopShade height={100} />
      <DecorativeCircles />
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightComponent ? <View>{rightComponent}</View> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
});
