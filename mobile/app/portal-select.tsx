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
          <Text style={styles.subtitle}>Choose your service to continue</Text>
        </View>

        <View style={styles.portalRow}>
          <TouchableOpacity style={styles.portalCard} onPress={() => router.replace("/login" as any)} activeOpacity={0.85}>
            <LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.portalIconWrap}>
              <Feather name="home" size={26} color="white" />
            </LinearGradient>
            <Text style={styles.portalTitle}>Civic{"\n"}Service</Text>
            <Text style={styles.portalSub}>Complaints, alerts and municipal services</Text>
            <View style={styles.portalArrow}><Feather name="arrow-right" size={14} color="#EA580C" /></View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.portalCard} onPress={() => router.replace("/jobs/login" as any)} activeOpacity={0.85}>
            <LinearGradient colors={["#EA580C", "#F97316"]} style={styles.portalIconWrap}>
              <Feather name="briefcase" size={26} color="white" />
            </LinearGradient>
            <Text style={styles.portalTitle}>Job{"\n"}Portal</Text>
            <Text style={styles.portalSub}>Find jobs and hire local Ambernath talent</Text>
            <View style={styles.portalArrow}><Feather name="arrow-right" size={14} color="#EA580C" /></View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.adminLink} onPress={() => router.push("/secret-access" as any)} activeOpacity={0.75}>
          <Feather name="shield" size={13} color="rgba(255,255,255,0.68)" />
          <Text style={styles.adminText}>Admin Access</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  logoRow: { alignItems: "center", marginBottom: 36 },
  appName: { fontSize: 28, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", textAlign: "center" },
  portalRow: { flexDirection: "row", gap: 12, width: "100%", marginBottom: 22 },
  portalCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    alignItems: "flex-start",
    gap: 7,
    shadowColor: "#7C2D12",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  portalIconWrap: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  portalTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold", lineHeight: 20 },
  portalSub: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 14 },
  portalArrow: { marginTop: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  adminLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  adminText: { fontSize: 11, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_600SemiBold" },
});

const ps = StyleSheet.create({
  b1: { position: "absolute", borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.20)", width: width * 0.50, height: width * 0.50, top: -width * 0.16, right: -width * 0.14 },
  b2: { position: "absolute", borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.20)", width: width * 0.30, height: width * 0.30, bottom: -width * 0.10, left: -width * 0.08 },
  r1: { position: "absolute", borderRadius: 9999, borderColor: "rgba(255,255,255,0.20)", borderWidth: 1.5, width: width * 0.88, height: width * 0.88, top: -width * 0.32, right: -width * 0.32 },
  r2: { position: "absolute", borderRadius: 9999, borderColor: "rgba(255,255,255,0.20)", borderWidth: 1, width: width * 0.62, height: width * 0.62, top: -width * 0.10, right: -width * 0.10 },
  r3: { position: "absolute", borderRadius: 9999, borderColor: "rgba(255,255,255,0.20)", borderWidth: 1.5, width: width * 0.72, height: width * 0.72, bottom: -width * 0.28, left: -width * 0.26 },
});
