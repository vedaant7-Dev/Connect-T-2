import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface TopShadeProps {
  height?: number;
}

export default function TopShade({ height = 180 }: TopShadeProps) {
  return (
    <LinearGradient
      colors={["rgba(253,186,116,0.45)", "rgba(253,186,116,0.00)"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.shade, { height, pointerEvents: "none" }]}
    />
  );
}

const styles = StyleSheet.create({
  shade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
