import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopShade from "@/components/TopShade";

const { width } = Dimensions.get("window");

export default function PortalSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        locations={[0, 0.25, 0.55, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <TopShade height={220} />
      <View style={ps.b1} />
      <View style={ps.b2} />
      <View style={ps.r1} />
      <View style={ps.r2} />
      <View style={ps.r3} />

      <View style={[styles.wrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.logoRow}>
          <Text style={styles.appName}>Connect T</Text>
          <Text style={styles.subtitle}>Choose your portal to continue</Text>
        </View>

        <View style={styles.portalRow}>
          <TouchableOpacity
            style={styles.portalCard}
            onPress={() => router.replace("/(tabs)" as any)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.portalIconWrap}>
              <Feather name="home" size={28} color="white" />
            </LinearGradient>
            <Text style={styles.portalTitle}>Civic{"\n"}Services</Text>
            <Text style={styles.portalSub}>Complaints, community & municipal services</Text>
            <View style={styles.portalArrow}>
              <Feather name="arrow-right" size={14} color="#EA580C" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.portalCard}
            onPress={() => router.replace("/jobs/login" as any)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#92400E", "#C2410C"]} style={styles.portalIconWrap}>
              <Feather name="briefcase" size={28} color="white" />
            </LinearGradient>
            <Text style={styles.portalTitle}>Job{"\n"}Portal</Text>
            <Text style={styles.portalSub}>Find jobs & hire local talent in Ambernath</Text>
            <View style={styles.portalArrow}>
              <Feather name="arrow-right" size={14} color="#EA580C" />
            </View>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },

  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },

  logoRow: { alignItems: "center", marginBottom: 40 },
  appName: { fontSize: 28, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", textAlign: "center" },

  portalRow: { flexDirection: "row", gap: 14, width: "100%", marginBottom: 40 },
  portalCard: {
    flex: 1, backgroundColor: "white", borderRadius: 20, padding: 18,
    alignItems: "flex-start", gap: 8,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  portalIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  portalTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", lineHeight: 22 },
  portalSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 15 },
  portalArrow: { marginTop: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },

  footer: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "Inter_400Regular", letterSpacing: 1 },
});

const ps = StyleSheet.create({
  b1: { position: "absolute", borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.20)", width: width * 0.50, height: width * 0.50, top: -width * 0.16, right: -width * 0.14 },
  b2: { position: "absolute", borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.20)", width: width * 0.30, height: width * 0.30, bottom: -width * 0.10, left: -width * 0.08 },
  r1: { position: "absolute", borderRadius: 9999, borderColor: "rgba(255,255,255,0.20)", borderWidth: 1.5, width: width * 0.88, height: width * 0.88, top: -width * 0.32, right: -width * 0.32 },
  r2: { position: "absolute", borderRadius: 9999, borderColor: "rgba(255,255,255,0.20)", borderWidth: 1, width: width * 0.62, height: width * 0.62, top: -width * 0.10, right: -width * 0.10 },
  r3: { position: "absolute", borderRadius: 9999, borderColor: "rgba(255,255,255,0.20)", borderWidth: 1.5, width: width * 0.72, height: width * 0.72, bottom: -width * 0.28, left: -width * 0.26 },
});
