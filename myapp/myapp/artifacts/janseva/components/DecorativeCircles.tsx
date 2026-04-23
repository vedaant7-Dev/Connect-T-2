import React from "react";
import { View, StyleSheet } from "react-native";

export default function DecorativeCircles() {
  return (
    <>
      <View style={[s.blob, s.b1]} />
      <View style={[s.blob, s.b2]} />
      <View style={[s.blob, s.b3]} />
      <View style={[s.ring, s.r1]} />
      <View style={[s.ring, s.r2]} />
      <View style={[s.ring, s.r3]} />
    </>
  );
}

const s = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderColor: "rgba(255,255,255,0.10)",
  },
  b1: { width: 160, height: 160, top: -40,  right: -40 },
  b2: { width: 90,  height: 90,  bottom: -30, left: 10 },
  b3: { width: 55,  height: 55,  top: 18, left: "52%" },
  r1: { width: 220, height: 220, top: -60,  right: -60, borderWidth: 3 },
  r2: { width: 130, height: 130, bottom: -50, left: -20, borderWidth: 2.5 },
  r3: { width: 90,  height: 90,  top: -10, left: "28%", borderWidth: 2 },
});
