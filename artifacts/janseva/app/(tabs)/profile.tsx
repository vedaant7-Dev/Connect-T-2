import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const menuItems = [
  { icon: "map-pin", label: "My Area / Ward", value: "Ward 14 — Dadar", color: "#2563EB" },
  { icon: "bell", label: "Notifications", value: "Enabled", color: "#7C3AED" },
  { icon: "droplet", label: "Water Bill", value: "Consumer ID: MH-22014", color: "#0EA5E9" },
  { icon: "zap", label: "Electricity Bill", value: "Meter No: 45612389", color: "#D97706" },
  { icon: "file-text", label: "Complaint Status", value: "2 Active", color: "#059669" },
  { icon: "info", label: "About JanSeva", value: "v1.0 · Mumbai", color: "#475569" },
];

const usefulLinks = [
  { label: "BMC Official Website", url: "https://portal.mcgm.gov.in", icon: "globe" },
  { label: "Maharashtra Govt Portal", url: "https://maharashtra.gov.in", icon: "globe" },
  { label: "RTI Portal", url: "https://rtionline.gov.in", icon: "file-text" },
  { label: "Aadhaar Services", url: "https://uidai.gov.in", icon: "user" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1E3A8A", "#1E40AF", "#2563EB", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Feather name="user" size={28} color="#2563EB" />
            </View>
            <View style={styles.avatarBadge}>
              <Feather name="check" size={8} color="white" />
            </View>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>Mumbai Citizen</Text>
            <Text style={styles.profileSub}>Dadar West · Ward 14</Text>
            <View style={styles.verifiedBadge}>
              <Feather name="shield" size={10} color="#4ADE80" />
              <Text style={styles.verifiedText}>Aadhaar Verified</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      >
        <View style={styles.statsRow}>
          {[
            { label: "Complaints", value: "2", icon: "message-circle", color: "#059669" },
            { label: "Calls Made", value: "12", icon: "phone", color: "#2563EB" },
            { label: "Ward", value: "14", icon: "map-pin", color: "#D97706" },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Feather name={stat.icon as any} size={16} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>MY DETAILS</Text>
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.menuRow, i < menuItems.length - 1 && styles.menuRowBorder]} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + "15" }]}>
                <Feather name={item.icon as any} size={16} color={item.color} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuValue}>{item.value}</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>USEFUL LINKS</Text>
        <View style={styles.menuCard}>
          {usefulLinks.map((link, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuRow, i < usefulLinks.length - 1 && styles.menuRowBorder]}
              onPress={() => Linking.openURL(link.url)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#EFF6FF" }]}>
                <Feather name={link.icon as any} size={16} color="#2563EB" />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{link.label}</Text>
              </View>
              <Feather name="external-link" size={14} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerBrand}>JanSeva</Text>
          <Text style={styles.footerTagline}>नागरिक सेवा · Citizen Services Platform</Text>
          <Text style={styles.footerVersion}>v1.0 · Mumbai · 2025</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  profileText: { flex: 1 },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  profileSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(74,222,128,0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4ADE80",
    fontFamily: "Inter_600SemiBold",
  },
  content: { padding: 16 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "Inter_500Medium",
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.2,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 2,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 18,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuText: { flex: 1 },
  menuLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    fontFamily: "Inter_600SemiBold",
  },
  menuValue: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  footerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  footerBrand: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1E40AF",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  footerTagline: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    textAlign: "center",
  },
  footerVersion: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
});
