import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { EmergencyButton } from "@/components/EmergencyButton";
import { emergencyContacts } from "@/data/mumbaiServices";

const tips = [
  "Stay calm and describe your exact location",
  "Call 112 for all emergencies in India",
  "Keep your Aadhaar number ready for hospitals",
  "Note your area's ward number for BMC calls",
];

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const router = useRouter();

  const handleCall = (number: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Linking.openURL(`tel:${number}`);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#7F1D1D", "#991B1B", "#DC2626", "#EF4444"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency</Text>
        <Text style={styles.headerSub}>One-tap access to all emergency services</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sosSection}>
          <Text style={styles.sosSectionTitle}>Emergency SOS</Text>
          <Text style={styles.sosSectionSub}>Tap to call National Emergency Number 112</Text>
          <EmergencyButton />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>ALL EMERGENCY NUMBERS</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.contactGrid}>
          {emergencyContacts.map((ec, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.contactCard}
              onPress={() => handleCall(ec.number)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: ec.bg }]}>
                <Feather name={ec.icon as any} size={22} color={ec.color} />
              </View>
              <Text style={styles.contactName}>{ec.name}</Text>
              <View style={[styles.callBadge, { backgroundColor: ec.bg }]}>
                <Feather name="phone" size={10} color={ec.color} />
                <Text style={[styles.callNumber, { color: ec.color }]}>{ec.number}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Feather name="info" size={16} color="#2563EB" />
            <Text style={styles.tipsTitle}>Emergency Tips</Text>
          </View>
          {tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipNum}>
                <Text style={styles.tipNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.nearestCard}>
          <LinearGradient
            colors={["#1E3A8A", "#2563EB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nearestGrad}
          >
            <View style={styles.nearestLeft}>
              <Feather name="map-pin" size={18} color="white" />
              <View>
                <Text style={styles.nearestTitle}>Nearest Hospital</Text>
                <Text style={styles.nearestName}>Bombay Hospital — 2.1 km</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => handleCall("022-22067676")}
              activeOpacity={0.85}
            >
              <Feather name="phone" size={14} color="#1E40AF" />
              <Text style={styles.callBtnText}>Call Now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  scroll: { flex: 1 },
  content: { padding: 16 },
  sosSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  sosSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  sosSectionSub: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
    textAlign: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  contactCard: {
    width: "22%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    gap: 6,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  contactName: {
    fontSize: 9,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
  callBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
  },
  callNumber: {
    fontSize: 11,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
  tipsCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E40AF",
    fontFamily: "Inter_700Bold",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  tipNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  tipNumText: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  tipText: {
    fontSize: 12,
    color: "#1E40AF",
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  nearestCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
  },
  nearestGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  nearestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  nearestTitle: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  nearestName: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E40AF",
    fontFamily: "Inter_700Bold",
  },
});
