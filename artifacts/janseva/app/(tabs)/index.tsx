import React from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { UtilityCard } from "@/components/UtilityCard";
import { SectionHeader } from "@/components/SectionHeader";
import { emergencyContacts } from "@/data/mumbaiServices";
import { useComplaints, ComplaintStatus } from "@/context/ComplaintContext";
import { useAuth } from "@/context/AuthContext";

const alertsAndNews = [
  { id: "1", type: "alert", icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2", title: "Water Supply Restricted", body: "Area 4 (Dadar East): 8AM–2PM today. Store water in advance.", time: "2h ago" },
  { id: "2", type: "news", icon: "info", color: "#2563EB", bg: "#DBEAFE", title: "Road Work Notice", body: "LT Marg repair from 26-Apr to 30-Apr. Expect delays — use alternate routes.", time: "5h ago" },
  { id: "3", type: "alert", icon: "zap", color: "#D97706", bg: "#FEF3C7", title: "Planned Power Cut", body: "Sectors 11–14 (Mahim): 10AM–4PM on 27-Apr for transformer upgrade.", time: "Yesterday" },
  { id: "4", type: "news", icon: "calendar", color: "#059669", bg: "#D1FAE5", title: "Community Cleanliness Drive", body: "Join BMC's ward-wide cleanliness drive this Sunday at 7AM — Shivaji Park.", time: "1d ago" },
  { id: "5", type: "alert", icon: "cloud-drizzle", color: "#7C3AED", bg: "#EDE9FE", title: "Heavy Rain Warning", body: "IMD: Orange alert for Mumbai on 28-Apr. Avoid waterlogging-prone areas.", time: "3h ago" },
];

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

const statusConfig: Record<ComplaintStatus, { label: string; color: string; bg: string; icon: string }> = {
  submitted: { label: "Submitted", color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  assigned: { label: "Assigned", color: "#2563EB", bg: "#DBEAFE", icon: "user-check" },
  in_progress: { label: "In Progress", color: "#7C3AED", bg: "#EDE9FE", icon: "tool" },
  resolved: { label: "Resolved", color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
};

const categoryIcons: Record<string, string> = {
  roads: "truck", water: "droplet", electricity: "zap", garbage: "trash-2",
  drainage: "git-merge", streetlight: "sun", encroachment: "alert-triangle", other: "more-horizontal",
};

const greetings = ["Jai Bhim", "Jai Maharashtra", "Namaste", "Pranam"];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getRoleColor(role?: string) {
  if (role === "nagarsevak") return { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" };
  if (role === "head_admin") return { bg: "#F5F3FF", text: "#7C3AED", border: "#C4B5FD" };
  return { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" };
}

function getRoleLabel(role?: string) {
  if (role === "nagarsevak") return "Nagarsevak";
  if (role === "head_admin") return "Head Admin";
  return "Citizen";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const { complaints } = useComplaints();
  const { user, logout } = useAuth();

  const recentComplaints = complaints.slice(0, 3);
  const pendingCount = complaints.filter((c) => ["submitted", "assigned", "in_progress"].includes(c.status)).length;
  const resolvedCount = complaints.filter((c) => c.status === "resolved").length;
  const roleColor = getRoleColor(user?.role);

  const handleSOS = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Linking.openURL("tel:112");
  };

  const handleCall = (number: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${number}`);
  };

  const greeting = `${getGreeting()}, ${user?.name?.split(" ")[0] || "Citizen"} 👋`;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1E3A8A", "#1E40AF", "#2563EB", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.rolePill, { backgroundColor: roleColor.bg + "33", borderColor: "rgba(255,255,255,0.3)" }]}>
                <Feather name={user?.role === "head_admin" ? "shield" : user?.role === "nagarsevak" ? "briefcase" : "user"} size={9} color="rgba(255,255,255,0.8)" />
                <Text style={styles.rolePillText}>{getRoleLabel(user?.role)}</Text>
              </View>
              <Text style={styles.wardText}>{user?.ward || "Ward 8 — Dadar"}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleSOS} style={styles.sosBtn} activeOpacity={0.85}>
              <Feather name="phone-call" size={14} color="white" />
              <Text style={styles.sosBtnText}>SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.alertBanner}>
          <View style={styles.alertIcon}>
            <Feather name="info" size={14} color="#F59E0B" />
          </View>
          <View style={styles.alertText}>
            <Text style={styles.alertTitle}>BMC Update</Text>
            <Text style={styles.alertBody}>Water supply restricted in Area 4 — 8AM to 2PM today</Text>
          </View>
          <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* MAIN FEATURE — REPORT A PROBLEM */}
        <TouchableOpacity style={styles.complaintCTA} onPress={() => router.push("/complaint/new")} activeOpacity={0.88}>
          <LinearGradient colors={["#1E3A8A", "#2563EB", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.complaintCTAGrad}>
            <View style={styles.complaintCTAIcon}>
              <Feather name="camera" size={24} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.complaintCTATitle}>Report a Problem</Text>
              <Text style={styles.complaintCTASub}>Click photo → Ward officer resolves it</Text>
            </View>
            <View style={styles.complaintCTAArrow}>
              <Feather name="arrow-right" size={18} color="white" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* STATS */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(tabs)/complaints")} activeOpacity={0.8}>
            <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="clock" size={16} color="#D97706" />
            </View>
            <Text style={[styles.statNum, { color: "#D97706" }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(tabs)/complaints")} activeOpacity={0.8}>
            <View style={[styles.statIcon, { backgroundColor: "#D1FAE5" }]}>
              <Feather name="check-circle" size={16} color="#059669" />
            </View>
            <Text style={[styles.statNum, { color: "#059669" }]}>{resolvedCount}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(tabs)/feed")} activeOpacity={0.8}>
            <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
              <Feather name="rss" size={16} color="#2563EB" />
            </View>
            <Text style={[styles.statNum, { color: "#2563EB" }]}>Feed</Text>
            <Text style={styles.statLabel}>Community</Text>
          </TouchableOpacity>
          {(user?.role === "nagarsevak" || user?.role === "head_admin") && (
            <TouchableOpacity style={[styles.statCard, { backgroundColor: "#F5F3FF" }]} onPress={() => router.push("/(tabs)/admin")} activeOpacity={0.8}>
              <View style={[styles.statIcon, { backgroundColor: "#EDE9FE" }]}>
                <Feather name={user.role === "head_admin" ? "shield" : "briefcase"} size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.statNum, { color: "#7C3AED" }]}>Panel</Text>
              <Text style={styles.statLabel}>{user.role === "head_admin" ? "Admin" : "Officer"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ALERTS & IMPORTANT NEWS */}
        <View style={styles.alertsSection}>
          <View style={styles.alertsSectionHeader}>
            <View style={styles.alertsSectionTitleRow}>
              <View style={styles.alertsDot} />
              <Text style={styles.alertsSectionTitle}>Alerts & Important News</Text>
            </View>
            <View style={styles.alertsLivePill}>
              <View style={styles.alertsLiveDot} />
              <Text style={styles.alertsLiveText}>LIVE</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingBottom: 2 }}>
            {alertsAndNews.map((item) => (
              <TouchableOpacity key={item.id} style={styles.alertCard} activeOpacity={0.88}>
                <View style={[styles.alertCardIcon, { backgroundColor: item.bg }]}>
                  <Feather name={item.icon as any} size={16} color={item.color} />
                </View>
                <View style={styles.alertCardBody}>
                  <View style={styles.alertCardRow}>
                    <View style={[styles.alertTypePill, { backgroundColor: item.bg }]}>
                      <Text style={[styles.alertTypeText, { color: item.color }]}>
                        {item.type === "alert" ? "⚠ Alert" : "📢 News"}
                      </Text>
                    </View>
                    <Text style={styles.alertCardTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.alertCardTitle}>{item.title}</Text>
                  <Text style={styles.alertCardDesc} numberOfLines={2}>{item.body}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* RECENT COMPLAINTS */}
        <SectionHeader title="Recent Complaints" actionLabel="View All" onAction={() => router.push("/(tabs)/complaints")} />
        {recentComplaints.length > 0 ? (
          <View style={styles.complaintsCard}>
            {recentComplaints.map((complaint, idx) => {
              const st = statusConfig[complaint.status];
              const catIcon = categoryIcons[complaint.category] || "more-horizontal";
              return (
                <TouchableOpacity
                  key={complaint.id}
                  style={[styles.complaintRow, idx < recentComplaints.length - 1 && styles.complaintRowBorder]}
                  onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: complaint.id } })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.complaintRowIcon, { backgroundColor: st.bg }]}>
                    <Feather name={catIcon as any} size={14} color={st.color} />
                  </View>
                  <View style={styles.complaintRowText}>
                    <Text style={styles.complaintRowTitle} numberOfLines={1}>{complaint.title}</Text>
                    <Text style={styles.complaintRowLocation} numberOfLines={1}>{complaint.location}</Text>
                  </View>
                  <View style={[styles.complaintRowStatus, { backgroundColor: st.bg }]}>
                    <Feather name={st.icon as any} size={9} color={st.color} />
                    <Text style={[styles.complaintRowStatusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TouchableOpacity style={styles.noComplaintsCard} onPress={() => router.push("/complaint/new")} activeOpacity={0.8}>
            <Feather name="camera" size={24} color="#2563EB" />
            <Text style={styles.noComplaintsText}>Tap to report your first problem</Text>
          </TouchableOpacity>
        )}

        {/* UTILITY STATUS */}
        <SectionHeader title="Utility Status" />
        <View style={styles.utilityRow}>
          <UtilityCard title="Water Supply" value="14" unit="Hours/day" status="Reduced" statusOk={false} icon="droplet" gradColors={["#0EA5E9", "#2563EB"]} lastUpdated="2 hrs ago" />
          <UtilityCard title="Electricity" value="24" unit="Hours/day" status="Normal" statusOk={true} icon="zap" gradColors={["#F59E0B", "#D97706"]} lastUpdated="30 min ago" />
        </View>

        {/* QUICK SERVICES */}
        <SectionHeader title="Quick Services" actionLabel="All Services" onAction={() => router.push("/(tabs)/services" as any)} />
        <View style={styles.servicesCard}>
          <View style={styles.servicesGrid}>
            {quickServices.map((svc) => (
              <TouchableOpacity key={svc.id} style={styles.serviceItem} activeOpacity={0.8}>
                <View style={[styles.serviceIcon, { backgroundColor: svc.bg }]}>
                  <Feather name={svc.icon as any} size={20} color={svc.color} />
                </View>
                <Text style={styles.serviceLabel}>{svc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* EMERGENCY */}
        <SectionHeader title="Emergency Contacts" actionLabel="View All" onAction={() => router.push("/(tabs)/emergency")} />
        <View style={styles.emergencyGrid}>
          {emergencyContacts.slice(0, 4).map((ec, idx) => (
            <TouchableOpacity key={idx} style={styles.emergencyItem} onPress={() => handleCall(ec.number)} activeOpacity={0.8}>
              <View style={[styles.emergencyIconBox, { backgroundColor: ec.bg }]}>
                <Feather name={ec.icon as any} size={20} color={ec.color} />
              </View>
              <Text style={styles.emergencyName}>{ec.name}</Text>
              <Text style={[styles.emergencyNumber, { color: ec.color }]}>{ec.number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  greeting: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    borderWidth: 1,
  },
  rolePillText: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.85)", fontFamily: "Inter_600SemiBold" },
  wardText: { fontSize: 10, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" },
  headerRight: { gap: 6, alignItems: "flex-end" },
  sosBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#DC2626", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    shadowColor: "#DC2626", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  sosBtnText: { fontSize: 12, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  alertBanner: { flexDirection: "row", gap: 10, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 12, alignItems: "center" },
  alertIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(245,158,11,0.2)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 12, fontWeight: "700", color: "#FDE68A", fontFamily: "Inter_700Bold", marginBottom: 1 },
  alertBody: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", lineHeight: 15 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  complaintCTA: { borderRadius: 20, overflow: "hidden", marginBottom: 12, shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 },
  complaintCTAGrad: { flexDirection: "row", alignItems: "center", padding: 18, gap: 14 },
  complaintCTAIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  complaintCTATitle: { fontSize: 16, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  complaintCTASub: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 2 },
  complaintCTAArrow: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, alignItems: "center", gap: 4, shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statNum: { fontSize: 16, fontWeight: "900", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 8, color: "#94A3B8", fontFamily: "Inter_500Medium", fontWeight: "600", textAlign: "center" },
  complaintsCard: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", marginBottom: 18, shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  complaintRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  complaintRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  complaintRowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  complaintRowText: { flex: 1 },
  complaintRowTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  complaintRowLocation: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
  complaintRowStatus: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  complaintRowStatusText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  noComplaintsCard: { backgroundColor: "#EFF6FF", borderRadius: 16, padding: 20, alignItems: "center", gap: 8, marginBottom: 18, borderWidth: 1, borderColor: "#DBEAFE", borderStyle: "dashed" },
  noComplaintsText: { fontSize: 13, color: "#2563EB", fontFamily: "Inter_500Medium", fontWeight: "600" },
  utilityRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  servicesCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 18, shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  servicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  serviceItem: { width: "21%", alignItems: "center", gap: 6 },
  serviceIcon: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  serviceLabel: { fontSize: 10, fontWeight: "700", color: "#475569", textAlign: "center", fontFamily: "Inter_600SemiBold" },
  emergencyGrid: { flexDirection: "row", gap: 10, marginBottom: 18 },
  emergencyItem: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, alignItems: "center", gap: 4, shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  emergencyIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  emergencyName: { fontSize: 9, fontWeight: "700", color: "#475569", textAlign: "center", fontFamily: "Inter_600SemiBold" },
  emergencyNumber: { fontSize: 14, fontWeight: "900", fontFamily: "Inter_700Bold" },
  alertsSection: { marginBottom: 18 },
  alertsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  alertsSectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626" },
  alertsSectionTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  alertsLivePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  alertsLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#DC2626" },
  alertsLiveText: { fontSize: 9, fontWeight: "900", color: "#DC2626", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  alertCard: {
    width: 230, backgroundColor: "white", borderRadius: 16, overflow: "hidden",
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: "#F1F5F9",
  },
  alertCardIcon: { padding: 14, paddingBottom: 0, alignSelf: "flex-start" },
  alertCardBody: { padding: 12 },
  alertCardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  alertTypePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  alertTypeText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  alertCardTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  alertCardTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 4 },
  alertCardDesc: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 16 },
});
