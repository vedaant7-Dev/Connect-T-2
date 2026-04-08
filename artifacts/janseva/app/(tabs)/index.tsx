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

import { UtilityCard } from "@/components/UtilityCard";
import { QuickServiceGrid } from "@/components/QuickServiceGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { emergencyContacts } from "@/data/mumbaiServices";

const quickServices = [
  { id: "hospital", label: "Hospitals", icon: "activity", color: "#DC2626", bg: "#FEE2E2" },
  { id: "childHospital", label: "Child Care", icon: "heart", color: "#7C3AED", bg: "#EDE9FE" },
  { id: "clinic", label: "Clinics", icon: "plus-circle", color: "#059669", bg: "#D1FAE5" },
  { id: "police", label: "Police", icon: "shield", color: "#1E40AF", bg: "#DBEAFE" },
  { id: "bank", label: "Banks", icon: "credit-card", color: "#D97706", bg: "#FEF3C7" },
  { id: "postOffice", label: "Post Office", icon: "mail", color: "#0EA5E9", bg: "#BAE6FD" },
  { id: "school", label: "Schools", icon: "book-open", color: "#7C3AED", bg: "#EDE9FE" },
  { id: "shamshanbhumi", label: "Crematorium", icon: "wind", color: "#475569", bg: "#F1F5F9" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleSOS = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Linking.openURL("tel:112");
  };

  const handleServicePress = (id: string) => {
    router.push({ pathname: "/(tabs)/services", params: { category: id } });
  };

  const handleCallEmergency = (number: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL(`tel:${number}`);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1E3A8A", "#1E40AF", "#2563EB", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Jai Bhim</Text>
            <Text style={styles.subGreeting}>Mumbai Citizen Services</Text>
          </View>
          <TouchableOpacity onPress={handleSOS} style={styles.miniSOS} activeOpacity={0.85}>
            <Feather name="phone-call" size={16} color="white" />
            <Text style={styles.miniSOSText}>SOS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertBanner}>
          <View style={styles.alertIcon}>
            <Feather name="info" size={14} color="#F59E0B" />
          </View>
          <View style={styles.alertText}>
            <Text style={styles.alertTitle}>BMC Update</Text>
            <Text style={styles.alertBody}>Water supply restricted in Area 4 — 8AM to 2PM today</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Utility Status" />
        <View style={styles.utilityRow}>
          <UtilityCard
            title="Water Supply"
            value="14"
            unit="Hours/day"
            status="Reduced"
            statusOk={false}
            icon="droplet"
            gradColors={["#0EA5E9", "#2563EB"]}
            lastUpdated="2 hrs ago"
          />
          <UtilityCard
            title="Electricity"
            value="24"
            unit="Hours/day"
            status="Normal"
            statusOk={true}
            icon="zap"
            gradColors={["#F59E0B", "#D97706"]}
            lastUpdated="30 min ago"
          />
        </View>

        <SectionHeader title="Quick Services" actionLabel="All Services" onAction={() => router.push("/(tabs)/services")} />
        <View style={styles.servicesCard}>
          <QuickServiceGrid services={quickServices} onPress={handleServicePress} />
        </View>

        <SectionHeader title="Emergency Contacts" actionLabel="View All" onAction={() => router.push("/(tabs)/emergency")} />
        <View style={styles.emergencyGrid}>
          {emergencyContacts.slice(0, 4).map((ec, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.emergencyItem}
              onPress={() => handleCallEmergency(ec.number)}
              activeOpacity={0.8}
            >
              <View style={[styles.emergencyIconBox, { backgroundColor: ec.bg }]}>
                <Feather name={ec.icon as any} size={20} color={ec.color} />
              </View>
              <Text style={styles.emergencyName}>{ec.name}</Text>
              <Text style={[styles.emergencyNumber, { color: ec.color }]}>{ec.number}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Nearest Hospitals" actionLabel="All Hospitals" onAction={() => handleServicePress("hospital")} />
        <View style={styles.hospitalList}>
          {[
            { name: "Bombay Hospital", dist: "2.1 km", type: "General" },
            { name: "KEM Hospital", dist: "3.2 km", type: "Govt. Multi-Specialty" },
            { name: "Tata Memorial", dist: "3.5 km", type: "Cancer Specialty" },
          ].map((h, i) => (
            <TouchableOpacity key={i} style={styles.hospitalRow} onPress={() => handleServicePress("hospital")} activeOpacity={0.8}>
              <View style={styles.hospitalLeft}>
                <View style={styles.hospitalIcon}>
                  <Feather name="activity" size={14} color="#DC2626" />
                </View>
                <View>
                  <Text style={styles.hospitalName}>{h.name}</Text>
                  <Text style={styles.hospitalType}>{h.type}</Text>
                </View>
              </View>
              <View style={styles.hospitalRight}>
                <View style={styles.hospitalDistBadge}>
                  <Feather name="navigation" size={9} color="#2563EB" />
                  <Text style={styles.hospitalDist}>{h.dist}</Text>
                </View>
                <Feather name="chevron-right" size={14} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  subGreeting: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  miniSOS: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  miniSOSText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  alertBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
    alignItems: "flex-start",
  },
  alertIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alertText: { flex: 1 },
  alertTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FDE68A",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  alertBody: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  scroll: { flex: 1 },
  content: { padding: 16 },
  utilityRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  servicesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emergencyGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  emergencyItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 4,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emergencyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emergencyName: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
  emergencyNumber: {
    fontSize: 14,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
  hospitalList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 18,
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  hospitalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  hospitalIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  hospitalName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  hospitalType: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  hospitalRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hospitalDistBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  hospitalDist: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    fontFamily: "Inter_600SemiBold",
  },
});
