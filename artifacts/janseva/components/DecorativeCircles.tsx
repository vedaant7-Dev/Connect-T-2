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
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderColor: "rgba(255,255,255,0.10)",
  },
  b1: { width: 130, height: 130, top: -50, right: -30 },
  b2: { width: 70,  height: 70,  bottom: -25, left: 20 },
  b3: { width: 45,  height: 45,  top: 10, left: "55%" },
  r1: { width: 200, height: 200, top: -80, right: -70, borderWidth: 1.5 },
  r2: { width: 110, height: 110, bottom: -45, left: -30, borderWidth: 1 },
  r3: { width: 80,  height: 80,  top: -20, left: "30%", borderWidth: 1 },
});
