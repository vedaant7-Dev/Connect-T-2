import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Image,
} from "react-native";
import TopShade from "@/components/TopShade";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import {
  INTER_BOLD,
  INTER_REGULAR,
} from "@/constants/Fonts";

const { width } = Dimensions.get("window");

export type SplashPortal = "citizen" | "nagarsevak" | "super_admin";

interface AppSplashProps {
  onFinish: (portal: SplashPortal) => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const [step, setStep] = useState<"splash" | "choose">("splash");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoPress = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);

    if (logoTapCount.current >= 7) {
      logoTapCount.current = 0;
      onFinish("super_admin");
      return;
    }

    logoTapTimer.current = setTimeout(() => {
      logoTapCount.current = 0;
    }, 2500);
  };

  const handleContinue = () => {
    setStep("choose");
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        locations={[0, 0.25, 0.55, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <TopShade height={220} />
      <View style={[s2.blob, s2.b1]} />
      <View style={[s2.blob, s2.b2]} />
      <View style={[s2.ring, s2.r1]} />
      <View style={[s2.ring, s2.r2]} />
      <View style={[s2.ring, s2.r3]} />

      {step === "splash" && (
        <>
          <View style={styles.centre}>
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={handleLogoPress}
              style={styles.logoWrap}
            >
              <Image
                source={require("../assets/images/connectt-logo-v3.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.appName}>Connect T</Text>
            <View style={styles.taglineWrap}>
              <Text style={styles.taglineEn}>Civic Services Platform</Text>
              <Text style={styles.taglineHi}>सबका साथ, सबका विकास</Text>
            </View>
            <Text style={styles.poweredBy}>Powered by Connect T</Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.82}>
              <View style={styles.continueBtnInner}>
                <Text style={styles.continueBtnText}>Continue</Text>
                <View style={styles.continueBtnIcon}>
                  <Feather name="arrow-right" size={18} color="#059669" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.continueHint}>Tap to continue</Text>
          </View>
        </>
      )}

      {step === "choose" && (
        <Animated.View style={[styles.chooseWrap, { opacity: fadeAnim }]}>
          <Text style={styles.chooseTitle}>Connect T</Text>
          <Text style={styles.chooseSubtitle}>Who are you? Select your role to continue</Text>

          <View style={styles.portalRow}>
            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => onFinish("citizen")}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#1E40AF", "#2563EB"]} style={styles.portalIconWrap}>
                <Feather name="user" size={26} color="white" />
              </LinearGradient>
              <Text style={styles.portalCardTitle}>Citizen{"\n"}Login</Text>
              <Text style={styles.portalCardSub}>File complaints & access civic services</Text>
              <View style={[styles.portalArrow, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="arrow-right" size={13} color="#2563EB" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => onFinish("nagarsevak")}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.portalIconWrap}>
                <Feather name="shield" size={26} color="white" />
              </LinearGradient>
              <Text style={styles.portalCardTitle}>Nagarsevak{"\n"}Login</Text>
              <Text style={styles.portalCardSub}>Ward officer dashboard & complaints</Text>
              <View style={[styles.portalArrow, { backgroundColor: "#FFF7ED" }]}>
                <Feather name="arrow-right" size={13} color="#EA580C" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.chooseFooter}>AMBERNATH MUNICIPAL COUNCIL</Text>
        </Animated.View>
      )}
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
  centre: { alignItems: "center", flex: 1, justifyContent: "center" },
  logoWrap: { marginBottom: 18, alignItems: "center", justifyContent: "center" },
  logoImg: { width: 200, height: 200 },
  appName: {
    fontSize: 32, fontWeight: "900", color: "white",
    fontFamily: INTER_BOLD, letterSpacing: -0.5, marginBottom: 10,
  },
  taglineWrap: { alignItems: "center", gap: 6 },
  taglineEn: { fontSize: 15, color: "rgba(255,255,255,0.75)", fontFamily: INTER_REGULAR, letterSpacing: 0.8 },
  taglineHi: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: INTER_REGULAR, letterSpacing: 1.5 },
  poweredBy: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: INTER_REGULAR, letterSpacing: 0.5, marginTop: 16 },
  footer: { width: "100%", alignItems: "center", gap: 12, paddingBottom: 52, paddingHorizontal: 32 },
  continueBtn: { width: "100%", borderRadius: 18, overflow: "hidden", backgroundColor: "white" },
  continueBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, paddingHorizontal: 24, gap: 12 },
  continueBtnText: { fontSize: 17, fontWeight: "700", color: "#059669", fontFamily: INTER_BOLD, letterSpacing: 0.3 },
  continueBtnIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  continueHint: { fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: INTER_REGULAR, letterSpacing: 0.5 },
  chooseWrap: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  chooseTitle: { fontSize: 26, fontWeight: "900", color: "white", fontFamily: INTER_BOLD, letterSpacing: -0.3, marginBottom: 4 },
  chooseSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: INTER_REGULAR, marginBottom: 32, textAlign: "center" },
  portalRow: { flexDirection: "row", gap: 14, width: "100%", marginBottom: 36 },
  portalCard: {
    flex: 1, backgroundColor: "white", borderRadius: 20, padding: 18,
    alignItems: "flex-start", gap: 8,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  portalIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  portalCardTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", fontFamily: INTER_BOLD, lineHeight: 21 },
  portalCardSub: { fontSize: 10, color: "#64748B", fontFamily: INTER_REGULAR, lineHeight: 14 },
  portalArrow: {
    marginTop: 4, width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center", alignSelf: "flex-end",
  },
  chooseFooter: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: INTER_REGULAR, letterSpacing: 2 },
});

const s2 = StyleSheet.create({
  blob: { position: "absolute", borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.20)" },
  ring: { position: "absolute", borderRadius: 9999, borderColor: "rgba(255,255,255,0.20)", borderWidth: 1.5 },
  b1: { width: width * 0.50, height: width * 0.50, top: -width * 0.16, right: -width * 0.14 },
  b2: { width: width * 0.28, height: width * 0.28, bottom: -width * 0.10, left: -width * 0.08 },
  r1: { width: width * 0.88, height: width * 0.88, top: -width * 0.32, right: -width * 0.32 },
  r2: { width: width * 0.62, height: width * 0.62, top: -width * 0.10, right: -width * 0.10 },
  r3: { width: width * 0.72, height: width * 0.72, bottom: -width * 0.28, left: -width * 0.26 },
});
