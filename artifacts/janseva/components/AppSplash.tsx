import React from "react";
import {
  View, Text, StyleSheet, Dimensions, Image, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface AppSplashProps {
  onFinish: () => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  return (
    <View style={styles.container}>
      {/* Smooth gradient background */}
      <LinearGradient
        colors={["#0F1D42", "#1E3A8A", "#2563EB", "#3B82F6", "#60A5FA"]}
        locations={[0, 0.2, 0.5, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative arc rings */}
      <View style={[styles.ring, styles.ringOuter]} />
      <View style={[styles.ring, styles.ringInner]} />

      {/* ── Centre content ── */}
      <View style={styles.centre}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoGlow} />
          <Image
            source={require("../assets/images/logo_transparent.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        {/* Taglines */}
        <View style={styles.taglineWrap}>
          <Text style={styles.taglineEn}>Citizen Services Platform</Text>
          <Text style={styles.taglineHi}>नागरिकों की सेवा में</Text>
        </View>

        {/* Powered by */}
        <Text style={styles.poweredBy}>Powered by VBA Party</Text>
      </View>

      {/* ── Footer: flag + stamp + Continue button ── */}
      <View style={styles.footer}>
        {/* Indian flag stripes */}
        <View style={styles.flagRow}>
          <View style={[styles.stripe, { backgroundColor: "#F97316" }]} />
          <View style={[styles.stripe, { backgroundColor: "rgba(255,255,255,0.75)" }]} />
          <View style={[styles.stripe, { backgroundColor: "#22C55E" }]} />
        </View>
        <Text style={styles.footerText}>ULMC Ulhasnagar  ·  JanSeva 2025</Text>

        {/* Continue button */}
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={onFinish}
          activeOpacity={0.82}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.22)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGrad}
          >
            <Text style={styles.continueBtnText}>Get Started</Text>
            <View style={styles.continueBtnIcon}>
              <Feather name="arrow-right" size={18} color="#1E3A8A" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.continueHint}>Tap to continue</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(99,146,234,0.13)",
  },
  ringOuter: {
    width: width * 1.6,
    height: width * 1.6,
    top: -width * 0.92,
  },
  ringInner: {
    width: width * 1.15,
    height: width * 1.15,
    bottom: -width * 0.78,
  },
  centre: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  logoWrap: {
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#3B82F6",
    opacity: 0.13,
  },
  logoImg: {
    width: 190,
    height: 190,
  },
  taglineWrap: {
    alignItems: "center",
    gap: 6,
  },
  poweredBy: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
    marginTop: 16,
  },
  taglineEn: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.8,
  },
  taglineHi: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
  },

  footer: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    paddingBottom: 52,
    paddingHorizontal: 32,
  },
  flagRow: { flexDirection: "row", gap: 3, marginBottom: 2 },
  stripe: { width: 28, height: 3.5, borderRadius: 2 },
  footerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.28)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  continueBtn: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  continueBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "white",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  continueBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  continueHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
});
