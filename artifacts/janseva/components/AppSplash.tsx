import React, { useState } from "react";
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Image,
} from "react-native";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface AppSplashProps {
  onFinish: (portal: "civic" | "jobs") => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const [step, setStep] = useState<"splash" | "choose">("splash");
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const handleContinue = () => {
    setStep("choose");
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
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
      <View style={[s2.blob, s2.b3]} />
      <View style={[s2.ring, s2.r1]} />
      <View style={[s2.ring, s2.r2]} />
      <View style={[s2.ring, s2.r3]} />

      {step === "splash" && (
        <>
          <View style={styles.centre}>
            <View style={styles.logoWrap}>
              <Image
                source={require("../assets/images/connectt-logo-v3.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Connect T</Text>
            <View style={styles.taglineWrap}>
              <Text style={styles.taglineEn}>BJP Member Services Platform</Text>
              <Text style={styles.taglineHi}>सबका साथ, सबका विकास</Text>
            </View>
            <Text style={styles.poweredBy}>Powered by BJP</Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.82}>
              <View style={styles.continueBtnGrad}>
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
          <Text style={styles.chooseSubtitle}>Choose your portal to continue</Text>

          <View style={styles.portalRow}>
            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => onFinish("civic")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#C2410C", "#EA580C"]}
                style={styles.portalIconWrap}
              >
                <Feather name="home" size={28} color="white" />
              </LinearGradient>
              <Text style={styles.portalCardTitle}>Civic{"\n"}Services</Text>
              <Text style={styles.portalCardSub}>Complaints, community & municipal services</Text>
              <View style={styles.portalArrow}>
                <Feather name="arrow-right" size={14} color="#EA580C" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => onFinish("jobs")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#C2410C", "#EA580C"]}
                style={styles.portalIconWrap}
              >
                <Feather name="briefcase" size={28} color="white" />
              </LinearGradient>
              <Text style={styles.portalCardTitle}>Job{"\n"}Portal</Text>
              <Text style={styles.portalCardSub}>Find jobs & hire local talent in Ambernath</Text>
              <View style={styles.portalArrow}>
                <Feather name="arrow-right" size={14} color="#EA580C" />
              </View>
            </TouchableOpacity>
          </View>

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
    fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 10,
  },
  taglineWrap: { alignItems: "center", gap: 6 },
  taglineEn: { fontSize: 15, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", letterSpacing: 0.8 },
  taglineHi: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", letterSpacing: 1.5 },
  poweredBy: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", letterSpacing: 0.5, marginTop: 16 },

  footer: { width: "100%", alignItems: "center", gap: 12, paddingBottom: 52, paddingHorizontal: 32 },
  flagRow: { flexDirection: "row", gap: 3, marginBottom: 2 },
  stripe: { width: 28, height: 3.5, borderRadius: 2 },
  footerText: { fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "Inter_400Regular", letterSpacing: 1.5, marginBottom: 8 },
  continueBtn: { width: "100%", borderRadius: 18, overflow: "hidden", backgroundColor: "white" },
  continueBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, paddingHorizontal: 24, gap: 12 },
  continueBtnText: { fontSize: 17, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  continueBtnIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  continueHint: { fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "Inter_400Regular", letterSpacing: 0.5 },

  chooseWrap: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  chooseTitle: { fontSize: 26, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 4 },
  chooseSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginBottom: 32, textAlign: "center" },

  portalRow: { flexDirection: "row", gap: 14, width: "100%", marginBottom: 36 },
  portalCard: {
    flex: 1, backgroundColor: "white", borderRadius: 20, padding: 18,
    alignItems: "flex-start", gap: 8,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  portalIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  portalCardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", lineHeight: 22 },
  portalCardSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 15 },
  portalArrow: {
    marginTop: 4, width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center",
    alignSelf: "flex-end",
  },
  chooseFooter: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "Inter_400Regular", letterSpacing: 1 },
});

const s2 = StyleSheet.create({
  blob: { position: "absolute", borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.20)" },
  ring: { position: "absolute", borderRadius: 9999, borderColor: "rgba(255,255,255,0.20)", borderWidth: 1.5 },
  b1: { width: width * 0.50, height: width * 0.50, top: -width * 0.16, right: -width * 0.14 },
  b2: { width: width * 0.28, height: width * 0.28, bottom: -width * 0.10, left: -width * 0.08 },
  b3: { width: 0, height: 0 },
  r1: { width: width * 0.88, height: width * 0.88, top: -width * 0.32, right: -width * 0.32 },
  r2: { width: width * 0.62, height: width * 0.62, top: -width * 0.10, right: -width * 0.10 },
  r3: { width: width * 0.72, height: width * 0.72, bottom: -width * 0.28, left: -width * 0.26 },
});
