import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform, Modal,
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
import { useLanguage } from "@/context/LanguageContext";

const alertsAndNews = [
  { id: "1", type: "alert", icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2", title: "Water Supply Restricted", body: "Camp 4 area: Supply from 8AM–2PM only today. Store water in advance.", detail: "Due to maintenance work on the main pipeline near Camp 4, water supply will be restricted from 8AM to 2PM today (27-Apr-2025). Residents are advised to store water in advance. The Ulhasnagar Municipal Corporation (ULMC) Water Department is working to restore full supply by evening. For complaints, contact the ULMC helpline at 0251-2721100.", source: "ULMC Water Dept.", date: "27 Apr 2025", time: "2h ago" },
  { id: "2", type: "news", icon: "info", color: "#2563EB", bg: "#DBEAFE", title: "Road Repair Notice", body: "Station Road, Camp 4 repair from 26-Apr to 30-Apr. Expect delays.", detail: "The ULMC Road Division has started repair and resurfacing work on Station Road, Camp 4 (from Ambernath Junction to Camp 4 Market). Work will continue from 26-Apr to 30-Apr 2025. Heavy vehicles are restricted during 9AM-6PM. Commuters are advised to use alternate routes via Manpada Road. The estimated cost of repair is Rs 45 Lakhs under the Smart City Mission.", source: "ULMC Road Division", date: "25 Apr 2025", time: "5h ago" },
  { id: "3", type: "alert", icon: "zap", color: "#D97706", bg: "#FEF3C7", title: "Planned Power Cut", body: "Camp 2 & Camp 3: 10AM–4PM on 27-Apr for transformer upgrade.", detail: "MSEDCL has scheduled a planned power outage in Camp 2 and Camp 3 areas on 27-Apr-2025 from 10AM to 4PM for upgrading the 132KV transformer at Camp 2 substation. This upgrade will improve power supply reliability for over 15,000 households. Hospitals and emergency services will have backup generator arrangements. For updates, call MSEDCL helpline 1912.", source: "MSEDCL Ulhasnagar", date: "26 Apr 2025", time: "Yesterday" },
  { id: "4", type: "news", icon: "calendar", color: "#059669", bg: "#D1FAE5", title: "Cleanliness Drive", body: "ULMC Swachh Ulhasnagar drive this Sunday 7AM — Camp 4 Municipal Ground.", detail: "ULMC is organizing a Swachh Ulhasnagar Cleanliness Drive this Sunday (28-Apr-2025) starting at 7AM from Camp 4 Municipal Ground. All citizens are invited to participate. Free gloves, masks, and cleaning equipment will be provided. Nagarsevaks from all 14 wards will lead teams. Refreshments will be served. Special awards for the cleanest ward will be announced. Register at the ULMC office or call 0251-2721100.", source: "ULMC Swachh Bharat Cell", date: "25 Apr 2025", time: "1d ago" },
  { id: "5", type: "alert", icon: "cloud-drizzle", color: "#7C3AED", bg: "#EDE9FE", title: "Heavy Rain Warning", body: "IMD: Orange alert for Thane district on 28-Apr. Avoid low-lying areas.", detail: "The India Meteorological Department (IMD) has issued an Orange Alert for Thane district including Ulhasnagar on 28-Apr-2025. Heavy to very heavy rainfall (115-204 mm) is expected. Citizens in low-lying areas near Ulhas River and Waldhuni River are advised to stay alert. NDRF teams are on standby. Avoid waterlogged roads. Emergency helplines: ULMC Control Room 0251-2721100, Fire Brigade 101, Police 100.", source: "IMD Mumbai & ULMC Disaster Cell", date: "27 Apr 2025", time: "3h ago" },
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
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedAlert, setSelectedAlert] = useState<typeof alertsAndNews[0] | null>(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<string | null>(null);

  const recentComplaints = complaints.slice(0, 3);
  const pendingCount = complaints.filter((c) => ["submitted", "assigned", "in_progress"].includes(c.status)).length;
  const resolvedCount = complaints.filter((c) => c.status === "resolved").length;
  const roleColor = getRoleColor(user?.role);

  const notifCount = alertsAndNews.length;

  const handleCall = (number: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${number}`);
  };

  const handleServiceTap = (categoryId: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push({ pathname: "/(tabs)/services", params: { category: categoryId } } as any);
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
                <Feather
                  name={user?.role === "head_admin" ? "shield" : user?.role === "nagarsevak" ? "briefcase" : "user"}
                  size={9}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.rolePillText}>{getRoleLabel(user?.role)}</Text>
              </View>
              <Text style={styles.wardText}>{user?.ward || "Ulhasnagar"}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn} activeOpacity={0.82} onPress={() => setShowNotifPanel(true)}>
              <Feather name="bell" size={18} color="white" />
              {notifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{notifCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.alertBanner} activeOpacity={0.82} onPress={() => setSelectedAlert(alertsAndNews[0])}>
          <View style={styles.alertIconBox}>
            <Feather name="info" size={14} color="#F59E0B" />
          </View>
          <View style={styles.alertText}>
            <Text style={styles.alertTitle}>ULMC Update</Text>
            <Text style={styles.alertBody}>Water supply restricted in Camp 4 — 8AM to 2PM today</Text>
          </View>
          <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* REPORT A PROBLEM CTA */}
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

        {/* ALERTS & NEWS */}
        <View style={styles.alertsSection}>
          <View style={styles.alertsSectionHeader}>
            <View style={styles.alertsSectionTitleRow}>
              <View style={styles.alertsDot} />
              <Text style={styles.alertsSectionTitle}>Alerts & News</Text>
            </View>
            <View style={styles.alertsLivePill}>
              <View style={styles.alertsLiveDot} />
              <Text style={styles.alertsLiveText}>LIVE</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingBottom: 2 }}>
            {alertsAndNews.map((item) => (
              <TouchableOpacity key={item.id} style={styles.alertCard} activeOpacity={0.88} onPress={() => setSelectedAlert(item)}>
                <View style={[styles.alertCardIcon, { backgroundColor: item.bg }]}>
                  <Feather name={item.icon as any} size={16} color={item.color} />
                </View>
                <View style={styles.alertCardBody}>
                  <View style={styles.alertCardRow}>
                    <View style={[styles.alertTypePill, { backgroundColor: item.bg }]}>
                      <Text style={[styles.alertTypeText, { color: item.color }]}>
                        {item.type === "alert" ? `⚠ ${t("alert")}` : `📢 ${t("news")}`}
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
          <UtilityCard title="Water Supply" value="14" unit="Hours/day" status="Reduced" statusOk={false} icon="droplet" gradColors={["#0EA5E9", "#2563EB"]} lastUpdated="2 hrs ago" onPress={() => setSelectedUtility("water")} />
          <UtilityCard title="Electricity" value="24" unit="Hours/day" status="Normal" statusOk={true} icon="zap" gradColors={["#F59E0B", "#D97706"]} lastUpdated="30 min ago" onPress={() => setSelectedUtility("electricity")} />
        </View>

        {/* QUICK SERVICES */}
        <SectionHeader title="Quick Services" actionLabel="All Services" onAction={() => router.push("/(tabs)/services" as any)} />
        <View style={styles.servicesCard}>
          <View style={styles.servicesGrid}>
            {quickServices.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={styles.serviceItem}
                activeOpacity={0.8}
                onPress={() => handleServiceTap(svc.id)}
              >
                <View style={[styles.serviceIcon, { backgroundColor: svc.bg }]}>
                  <Feather name={svc.icon as any} size={22} color={svc.color} />
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

      {/* Notification Panel Modal */}
      <Modal visible={showNotifPanel} transparent animationType="fade" onRequestClose={() => setShowNotifPanel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.notifHeader}>
              <Feather name="bell" size={20} color="#2563EB" />
              <Text style={styles.modalTitle}>{t("alertsAndNews")}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420, width: "100%" }}>
              {alertsAndNews.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.notifItem}
                  activeOpacity={0.8}
                  onPress={() => { setShowNotifPanel(false); setTimeout(() => setSelectedAlert(item), 200); }}
                >
                  <View style={[styles.notifItemIcon, { backgroundColor: item.bg }]}>
                    <Feather name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <Text style={styles.notifItemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.notifItemTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.notifItemBody} numberOfLines={2}>{item.body}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNotifPanel(false)} activeOpacity={0.85}>
              <Text style={styles.modalCloseBtnText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Utility Detail Modal */}
      <Modal visible={!!selectedUtility} transparent animationType="fade" onRequestClose={() => setSelectedUtility(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {selectedUtility === "water" && (
                <>
                  <View style={[styles.modalIconWrap, { backgroundColor: "#BAE6FD" }]}>
                    <Feather name="droplet" size={28} color="#0EA5E9" />
                  </View>
                  <Text style={styles.modalTitle}>{t("waterSupply")}</Text>
                  <View style={styles.utilityStatRow}>
                    <View style={styles.utilityStat}>
                      <Text style={[styles.utilityStatNum, { color: "#DC2626" }]}>14</Text>
                      <Text style={styles.utilityStatLabel}>{t("hoursDay")}</Text>
                    </View>
                    <View style={styles.utilityStatDivider} />
                    <View style={styles.utilityStat}>
                      <Text style={[styles.utilityStatNum, { color: "#D97706" }]}>{t("reduced")}</Text>
                      <Text style={styles.utilityStatLabel}>Status</Text>
                    </View>
                  </View>
                  <View style={styles.modalDivider} />
                  <Text style={styles.modalBody}>
                    Water supply in Ulhasnagar is currently restricted to 14 hours per day due to maintenance work on the main distribution pipeline. Camp 4 and Camp 5 areas are most affected with supply available from 6AM–8PM only.{"\n\n"}
                    The ULMC Water Department is conducting repairs on the 900mm main pipeline from Barvi Dam. Normal 24-hour supply is expected to resume by 1st May 2025.{"\n\n"}
                    For water tanker requests, contact ULMC Water Helpline: 0251-2721100{"\n"}
                    Tanker booking: 0251-2721155
                  </Text>
                  <View style={styles.modalSourceRow}>
                    <Feather name="info" size={12} color="#64748B" />
                    <Text style={styles.modalSourceText}>Source: ULMC Water Department · Updated 2 hrs ago</Text>
                  </View>
                </>
              )}
              {selectedUtility === "electricity" && (
                <>
                  <View style={[styles.modalIconWrap, { backgroundColor: "#FEF3C7" }]}>
                    <Feather name="zap" size={28} color="#D97706" />
                  </View>
                  <Text style={styles.modalTitle}>{t("electricity")}</Text>
                  <View style={styles.utilityStatRow}>
                    <View style={styles.utilityStat}>
                      <Text style={[styles.utilityStatNum, { color: "#059669" }]}>24</Text>
                      <Text style={styles.utilityStatLabel}>{t("hoursDay")}</Text>
                    </View>
                    <View style={styles.utilityStatDivider} />
                    <View style={styles.utilityStat}>
                      <Text style={[styles.utilityStatNum, { color: "#059669" }]}>{t("normal")}</Text>
                      <Text style={styles.utilityStatLabel}>Status</Text>
                    </View>
                  </View>
                  <View style={styles.modalDivider} />
                  <Text style={styles.modalBody}>
                    Power supply across Ulhasnagar is currently normal with 24-hour availability. MSEDCL has completed the transformer upgrade at Camp 2 substation.{"\n\n"}
                    Planned maintenance schedule:{"\n"}
                    • Camp 2 substation — Completed{"\n"}
                    • Camp 3 feeder line — 28 Apr, 10AM-2PM{"\n"}
                    • Ambernath East substation — No planned outage{"\n\n"}
                    For power complaints, call MSEDCL Helpline: 1912{"\n"}
                    SMS ULHAS to 1912 for outage updates
                  </Text>
                  <View style={styles.modalSourceRow}>
                    <Feather name="info" size={12} color="#64748B" />
                    <Text style={styles.modalSourceText}>Source: MSEDCL Ulhasnagar Division · Updated 30 min ago</Text>
                  </View>
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedUtility(null)} activeOpacity={0.85}>
              <Text style={styles.modalCloseBtnText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Alert Detail Modal */}
      <Modal visible={!!selectedAlert} transparent animationType="fade" onRequestClose={() => setSelectedAlert(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {selectedAlert && (
                <>
                  <View style={[styles.modalIconWrap, { backgroundColor: selectedAlert.bg }]}>
                    <Feather name={selectedAlert.icon as any} size={28} color={selectedAlert.color} />
                  </View>
                  <View style={[styles.modalTypePill, { backgroundColor: selectedAlert.bg }]}>
                    <Text style={[styles.modalTypeText, { color: selectedAlert.color }]}>
                      {selectedAlert.type === "alert" ? `⚠ ${t("alert")}` : `📢 ${t("news")}`}
                    </Text>
                  </View>
                  <Text style={styles.modalTitle}>{selectedAlert.title}</Text>
                  <View style={styles.modalMetaRow}>
                    <Feather name="calendar" size={12} color="#94A3B8" />
                    <Text style={styles.modalMetaText}>{selectedAlert.date}</Text>
                    <View style={styles.modalMetaDot} />
                    <Feather name="clock" size={12} color="#94A3B8" />
                    <Text style={styles.modalMetaText}>{selectedAlert.time}</Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <Text style={styles.modalBody}>{selectedAlert.detail}</Text>
                  <View style={styles.modalSourceRow}>
                    <Feather name="info" size={12} color="#64748B" />
                    <Text style={styles.modalSourceText}>Source: {selectedAlert.source}</Text>
                  </View>
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedAlert(null)} activeOpacity={0.85}>
              <Text style={styles.modalCloseBtnText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  greeting: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  rolePillText: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.85)", fontFamily: "Inter_600SemiBold" },
  wardText: { fontSize: 10, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" },
  headerRight: { gap: 6, alignItems: "flex-end" },
  notifBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  notifBadge: { position: "absolute", top: -4, right: -4, width: 17, height: 17, borderRadius: 9, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "white" },
  notifBadgeText: { fontSize: 8, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  alertBanner: { flexDirection: "row", gap: 10, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 12, alignItems: "center" },
  alertIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(245,158,11,0.2)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
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
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
  },
  serviceItem: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  serviceIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 13,
  },
  emergencyGrid: { flexDirection: "row", gap: 10, marginBottom: 4 },
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
  alertCard: { width: 230, backgroundColor: "white", borderRadius: 16, overflow: "hidden", shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#F1F5F9" },
  alertCardIcon: { padding: 14, paddingBottom: 0, alignSelf: "flex-start" },
  alertCardBody: { padding: 12 },
  alertCardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  alertTypePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  alertTypeText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  alertCardTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  alertCardTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 4 },
  alertCardDesc: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 16 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalSheet: {
    backgroundColor: "white", borderRadius: 24, padding: 24, width: "100%",
    maxWidth: 420, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center", marginBottom: 12, alignSelf: "center",
  },
  modalTypePill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    alignSelf: "center", marginBottom: 10,
  },
  modalTypeText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  modalTitle: {
    fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold",
    textAlign: "center", marginBottom: 8,
  },
  modalMetaRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    justifyContent: "center", marginBottom: 12,
  },
  modalMetaText: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  modalMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#CBD5E1" },
  modalDivider: { height: 1, backgroundColor: "#F1F5F9", width: "100%", marginBottom: 14 },
  modalBody: {
    fontSize: 13, color: "#374151", fontFamily: "Inter_400Regular",
    lineHeight: 20, textAlign: "left", width: "100%",
  },
  modalSourceRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9", width: "100%",
  },
  modalSourceText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", flex: 1 },
  modalCloseBtn: {
    width: "100%", paddingVertical: 14, borderRadius: 14, marginTop: 16,
    alignItems: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0",
  },
  modalCloseBtnText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  notifHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, width: "100%",
  },
  notifItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  notifItemIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  notifItemTitle: {
    fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", flex: 1,
  },
  notifItemTime: {
    fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", flexShrink: 0,
  },
  notifItemBody: {
    fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 16,
  },
  utilityStatRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 20, marginTop: 12, marginBottom: 14,
  },
  utilityStat: { alignItems: "center", gap: 2 },
  utilityStatNum: {
    fontSize: 28, fontWeight: "900", fontFamily: "Inter_700Bold",
  },
  utilityStatLabel: {
    fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular",
  },
  utilityStatDivider: {
    width: 1, height: 40, backgroundColor: "#F1F5F9",
  },
});
