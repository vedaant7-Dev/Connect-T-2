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
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { SectionHeader } from "@/components/SectionHeader";
import { emergencyContacts } from "@/data/mumbaiServices";
import { useAuth } from "@/context/AuthContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAlerts, AppAlert } from "@/context/AlertContext";

const quickServices = [
  { id: "hospital", label: "Hospitals", icon: "activity", color: "#DC2626", bg: "#FEE2E2" },
  { id: "childHospital", label: "Child Care", icon: "heart", color: "#7C3AED", bg: "#EDE9FE" },
  { id: "clinic", label: "Clinics", icon: "plus-circle", color: "#059669", bg: "#D1FAE5" },
  { id: "police", label: "Police", icon: "shield", color: "#B45309", bg: "#FFEDD5" },
  { id: "bank", label: "Banks", icon: "credit-card", color: "#D97706", bg: "#FEF3C7" },
  { id: "postOffice", label: "Post Office", icon: "mail", color: "#0EA5E9", bg: "#BAE6FD" },
  { id: "school", label: "Schools", icon: "book-open", color: "#7C3AED", bg: "#EDE9FE" },
  { id: "shamshanbhumi", label: "Crematorium", icon: "wind", color: "#475569", bg: "#F1F5F9" },
];


function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

function getRoleColor(role?: string) {
  if (role === "nagarsevak") return { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" };
  return { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" };
}

function getRoleLabelKey(role?: string) {
  if (role === "nagarsevak") return "nagarsevak";
  return "citizen";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const { t } = useLanguage();
  const { handleScroll } = useTabBarVisibility();
  const { alerts } = useAlerts();
  const [selectedAlert, setSelectedAlert] = useState<AppAlert | null>(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<string | null>(null);

  const roleColor = getRoleColor(user?.role);

  const notifCount = alerts.filter((i) => i.type === "alert").length;

  const handleCall = (number: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${number}`);
  };

  const handleServiceTap = (categoryId: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push({ pathname: "/(tabs)/services", params: { category: categoryId } } as any);
  };

  const greeting = `${t(getGreetingKey())}, ${user?.name?.split(" ")[0] || t("citizen")} 👋`;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12, overflow: "hidden" }]}
      >
        <TopShade height={100} />
        <DecorativeCircles />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.rolePill, { backgroundColor: roleColor.bg + "33", borderColor: "rgba(255,255,255,0.3)" }]}>
                <Feather
                  name={user?.role === "nagarsevak" ? "briefcase" : "user"}
                  size={9}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.rolePillText}>{t(getRoleLabelKey(user?.role))}</Text>
              </View>
              <Text style={styles.wardText}>{user?.ward || "Ambernath"}</Text>
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

      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 8) + 60 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* ALERTS & NEWS */}
        <View style={styles.alertsSection}>
          <View style={styles.alertsSectionHeader}>
            <View style={styles.alertsSectionTitleRow}>
              <View style={styles.alertsDot} />
              <Text style={styles.alertsSectionTitle}>{t("alerts")}</Text>
            </View>
            <View style={styles.alertsLivePill}>
              <View style={styles.alertsLiveDot} />
              <Text style={styles.alertsLiveText}>{t("live")}</Text>
            </View>
          </View>
          {alerts.length === 0 ? (
            <View style={styles.alertsEmpty}>
              <Feather name="bell-off" size={20} color="#CBD5E1" />
              <Text style={styles.alertsEmptyText}>No alerts right now</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingBottom: 2 }}>
              {alerts.map((item) => {
                const isAlert = item.type === "alert";
                const cardColor = isAlert ? "#DC2626" : "#EA580C";
                const cardBg = isAlert ? "#FEE2E2" : "#FFEDD5";
                const timeStr = (() => {
                  const diff = Date.now() - new Date(item.createdAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hours = Math.floor(mins / 60);
                  const days = Math.floor(hours / 24);
                  if (days > 0) return `${days}d ago`;
                  if (hours > 0) return `${hours}h ago`;
                  if (mins > 0) return `${mins}m ago`;
                  return "just now";
                })();
                return (
                  <TouchableOpacity key={item.id} style={styles.alertCard} activeOpacity={0.88} onPress={() => setSelectedAlert(item)}>
                    <View style={[styles.alertCardIcon, { backgroundColor: cardBg }]}>
                      <Feather name={isAlert ? "alert-triangle" : "radio"} size={16} color={cardColor} />
                    </View>
                    <View style={styles.alertCardBody}>
                      <View style={styles.alertCardRow}>
                        <View style={[styles.alertTypePill, { backgroundColor: cardBg }]}>
                          <Text style={[styles.alertTypeText, { color: cardColor }]}>
                            {isAlert ? `⚠ ${t("alert")}` : `📢 ${t("news")}`}
                          </Text>
                        </View>
                        <Text style={styles.alertCardTime}>{timeStr}</Text>
                      </View>
                      <Text style={styles.alertCardTitle}>{item.title}</Text>
                      <Text style={styles.alertCardDesc} numberOfLines={2}>{item.body}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* REPORT A PROBLEM CTA */}
        <TouchableOpacity style={styles.complaintCTA} onPress={() => router.push("/complaint/new")} activeOpacity={0.88}>
          <LinearGradient colors={["#15803D", "#16A34A", "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.complaintCTAGrad}>
            <View style={styles.complaintCTAIcon}>
              <Feather name="camera" size={24} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.complaintCTATitle}>{t("reportProblem")}</Text>
              <Text style={styles.complaintCTASub}>{t("reportProblemSub")}</Text>
            </View>
            <View style={styles.complaintCTAArrow}>
              <Feather name="arrow-right" size={18} color="white" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* UTILITY STATUS */}
        <SectionHeader title={t("utilityStatus")} />
        <View style={styles.utilityRow}>
          <UtilityCard title={t("waterSupply")} value="14" unit={t("hoursDay")} status={t("reduced")} statusOk={false} icon="droplet" gradColors={["#0EA5E9", "#0EA5E9"]} lastUpdated="2 hrs ago" onPress={() => setSelectedUtility("water")} />
          <UtilityCard title={t("electricity")} value="24" unit={t("hoursDay")} status={t("normal")} statusOk={true} icon="zap" gradColors={["#F59E0B", "#F59E0B"]} lastUpdated="30 min ago" onPress={() => setSelectedUtility("electricity")} />
        </View>

        {/* QUICK SERVICES */}
        <SectionHeader title={t("quickServices")} actionLabel={t("allServices")} onAction={() => router.push("/(tabs)/services" as any)} />
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
        <SectionHeader title={t("emergencyContacts")} actionLabel={t("viewAll")} onAction={() => router.push("/(tabs)/emergency")} />
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

        {/* PAGE FOOTER */}
        <View style={styles.pageFooter}>
          <Text style={styles.pageFooterBrand}>Connect T</Text>
          <Text style={styles.pageFooterSub}>BJP Member Services · सबका साथ, सबका विकास</Text>
          <Text style={styles.pageFooterVersion}>v1.0 · Bharatiya Janata Party · 2025</Text>
        </View>
      </ScrollView>

      {/* Notification Panel Modal */}
      <Modal visible={showNotifPanel} transparent animationType="fade" onRequestClose={() => setShowNotifPanel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.notifHeader}>
              <Feather name="bell" size={20} color="#EA580C" />
              <Text style={styles.modalTitle}>{t("alerts")}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420, width: "100%" }}>
              {alerts.length === 0 ? (
                <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
                  <Feather name="bell-off" size={32} color="#CBD5E1" />
                  <Text style={{ fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" }}>No alerts right now</Text>
                </View>
              ) : alerts.map((item) => {
                const isAlert = item.type === "alert";
                const cardColor = isAlert ? "#DC2626" : "#EA580C";
                const cardBg = isAlert ? "#FEE2E2" : "#FFEDD5";
                const timeStr = (() => {
                  const diff = Date.now() - new Date(item.createdAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hours = Math.floor(mins / 60);
                  const days = Math.floor(hours / 24);
                  if (days > 0) return `${days}d ago`;
                  if (hours > 0) return `${hours}h ago`;
                  if (mins > 0) return `${mins}m ago`;
                  return "just now";
                })();
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.notifItem}
                    activeOpacity={0.8}
                    onPress={() => { setShowNotifPanel(false); setTimeout(() => setSelectedAlert(item), 200); }}
                  >
                    <View style={[styles.notifItemIcon, { backgroundColor: cardBg }]}>
                      <Feather name={isAlert ? "alert-triangle" : "radio"} size={16} color={cardColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <Text style={styles.notifItemTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.notifItemTime}>{timeStr}</Text>
                      </View>
                      <Text style={styles.notifItemBody} numberOfLines={2}>{item.body}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
                    Water supply in Ambernath is currently restricted to 14 hours per day due to maintenance work on the main distribution pipeline from Barvi Dam. Station Area East and Vithalwadi areas are most affected with supply available from 6AM–8PM only.{"\n\n"}
                    The AMC Water Department is conducting repairs on the 900mm main pipeline from Barvi Dam. Normal 24-hour supply is expected to resume by 1st May 2025.{"\n\n"}
                    For water tanker requests, contact AMC Water Helpline: 0251-2604100{"\n"}
                    Tanker booking: 0251-2604155
                  </Text>
                  <View style={styles.modalSourceRow}>
                    <Feather name="info" size={12} color="#64748B" />
                    <Text style={styles.modalSourceText}>Source: AMC Water Department · Updated 2 hrs ago</Text>
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
                    Power supply across Ambernath is currently normal with 24-hour availability. MSEDCL has completed the transformer upgrade at MIDC Area substation.{"\n\n"}
                    Planned maintenance schedule:{"\n"}
                    • MIDC Area substation — Completed{"\n"}
                    • Vithalwadi feeder line — 28 Apr, 10AM-2PM{"\n"}
                    • Old Ambernath substation — No planned outage{"\n\n"}
                    For power complaints, call MSEDCL Helpline: 1912{"\n"}
                    SMS ULHAS to 1912 for outage updates
                  </Text>
                  <View style={styles.modalSourceRow}>
                    <Feather name="info" size={12} color="#64748B" />
                    <Text style={styles.modalSourceText}>Source: MSEDCL Ambernath Division · Updated 30 min ago</Text>
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
              {selectedAlert && (() => {
                const isAlert = selectedAlert.type === "alert";
                const cardColor = isAlert ? "#DC2626" : "#EA580C";
                const cardBg = isAlert ? "#FEE2E2" : "#FFEDD5";
                const dateStr = new Date(selectedAlert.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                const timeStr = new Date(selectedAlert.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                return (
                  <>
                    <View style={[styles.modalIconWrap, { backgroundColor: cardBg }]}>
                      <Feather name={isAlert ? "alert-triangle" : "radio"} size={28} color={cardColor} />
                    </View>
                    <View style={[styles.modalTypePill, { backgroundColor: cardBg }]}>
                      <Text style={[styles.modalTypeText, { color: cardColor }]}>
                        {isAlert ? `⚠ ${t("alert")}` : `📢 ${t("news")}`}
                      </Text>
                    </View>
                    <Text style={styles.modalTitle}>{selectedAlert.title}</Text>
                    <View style={styles.modalMetaRow}>
                      <Feather name="calendar" size={12} color="#94A3B8" />
                      <Text style={styles.modalMetaText}>{dateStr}</Text>
                      <View style={styles.modalMetaDot} />
                      <Feather name="clock" size={12} color="#94A3B8" />
                      <Text style={styles.modalMetaText}>{timeStr}</Text>
                    </View>
                    <View style={styles.modalDivider} />
                    <Text style={styles.modalBody}>{selectedAlert.body}</Text>
                    <View style={styles.modalSourceRow}>
                      <Feather name="user" size={12} color="#64748B" />
                      <Text style={styles.modalSourceText}>Posted by: {selectedAlert.postedBy}</Text>
                    </View>
                  </>
                );
              })()}
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
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
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
  complaintCTA: { borderRadius: 20, overflow: "hidden", marginBottom: 12, shadowColor: "#B45309", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 },
  complaintCTAGrad: { flexDirection: "row", alignItems: "center", padding: 18, gap: 14 },
  complaintCTAIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  complaintCTAImage: { width: 52, height: 52, flexShrink: 0 },
  complaintCTATitle: { fontSize: 16, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  complaintCTASub: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 2 },
  complaintCTAArrow: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, alignItems: "center", gap: 4, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statNum: { fontSize: 16, fontWeight: "900", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 8, color: "#94A3B8", fontFamily: "Inter_500Medium", fontWeight: "600", textAlign: "center" },
  complaintsCard: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", marginBottom: 18, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  complaintRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  complaintRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  complaintRowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  complaintRowText: { flex: 1 },
  complaintRowTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  complaintRowLocation: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
  complaintRowStatus: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  complaintRowStatusText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  noComplaintsCard: { backgroundColor: "#FFF7ED", borderRadius: 16, padding: 20, alignItems: "center", gap: 8, marginBottom: 18, borderWidth: 1, borderColor: "#FFEDD5", borderStyle: "dashed" },
  noComplaintsText: { fontSize: 13, color: "#EA580C", fontFamily: "Inter_500Medium", fontWeight: "600" },
  utilityRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  servicesCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 18, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
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
  emergencyGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  emergencyItem: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, alignItems: "center", gap: 4, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  emergencyIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  emergencyName: { fontSize: 9, fontWeight: "700", color: "#475569", textAlign: "center", fontFamily: "Inter_600SemiBold" },
  emergencyNumber: { fontSize: 14, fontWeight: "900", fontFamily: "Inter_700Bold" },
  alertsEmpty: { height: 88, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", borderStyle: "dashed", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", gap: 6 },
  alertsEmptyText: { fontSize: 12, color: "#CBD5E1", fontFamily: "Inter_500Medium", fontWeight: "500" },
  alertsSection: { marginBottom: 18 },
  alertsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  alertsSectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626" },
  alertsSectionTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  alertsLivePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  alertsLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#DC2626" },
  alertsLiveText: { fontSize: 9, fontWeight: "900", color: "#DC2626", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  alertCard: { width: 230, backgroundColor: "white", borderRadius: 16, overflow: "hidden", shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#F1F5F9" },
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
  pageFooter: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 4,
  },
  pageFooterBrand: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
    color: "#EA580C",
    letterSpacing: -0.3,
  },
  pageFooterSub: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 2,
  },
  pageFooterVersion: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
