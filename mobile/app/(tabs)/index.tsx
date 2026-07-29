import { AppScrollView } from "@/components/AppScrollView";
import ComplaintMediaViewer from "@/components/ComplaintMediaViewer";
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform, Modal, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { UtilityCard } from "@/components/UtilityCard";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/context/AuthContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAlerts, AppAlert, wardKey } from "@/context/AlertContext";
import { useBroadcasts } from "@/context/BroadcastContext";
import { useComplaints, Complaint } from "@/context/ComplaintContext";
import { fetchEmergencyContacts, fetchServiceCatalog, EmergencyContact } from "@/lib/servicesApi";
import { displayUtilityStatus, fetchUtilityStatuses, statusIsOk, UtilityStatus, utilityLastUpdated } from "@/lib/utilityStatusApi";

const quickServices = [
  { id: "hospital", label: "Hospitals", icon: "hospital-building", color: "#DC2626", bg: "#FEE2E2" },
  { id: "childHospital", label: "Child Care", icon: "baby-face-outline", color: "#7C3AED", bg: "#EDE9FE" },
  { id: "clinic", label: "Clinics", icon: "stethoscope", color: "#059669", bg: "#D1FAE5" },
  { id: "police", label: "Police", icon: "shield-star-outline", color: "#B45309", bg: "#FFEDD5" },
  { id: "bank", label: "Banks", icon: "bank-outline", color: "#D97706", bg: "#FEF3C7" },
  { id: "postOffice", label: "Post Office", icon: "email-outline", color: "#0EA5E9", bg: "#BAE6FD" },
  { id: "school", label: "Schools", icon: "school-outline", color: "#7C3AED", bg: "#EDE9FE" },
  { id: "shamshanbhumi", label: "Crematorium", icon: "fire", color: "#475569", bg: "#F1F5F9" },
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
  const { alerts: allAlerts, refreshAlerts } = useAlerts();
  const { broadcasts, refreshBroadcasts } = useBroadcasts();
  const { complaints, refreshComplaints } = useComplaints();
  const [selectedAlert, setSelectedAlert] = useState<AppAlert | null>(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<UtilityStatus | null>(null);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [serviceShortcuts, setServiceShortcuts] = useState<typeof quickServices>([]);
  const [utilityStatuses, setUtilityStatuses] = useState<UtilityStatus[]>([]);

  const roleColor = getRoleColor(user?.role);
  const readAlertsKey = `connectt_read_alerts_${user?.id || "guest"}`;
  const alerts = allAlerts.filter((a) => !a.ward || (!!user?.ward && wardKey(a.ward) === wardKey(user.ward)));
  const newsItems = alerts.filter((item) => item.type === "news");
  const myComplaints = complaints.filter((c) =>
    (user?.mobile && c.userMobile === user.mobile) ||
    (user?.name && c.userName === user.name)
  );
  const complaintNotifs = myComplaints.filter((c) => c.status === "assigned" || c.status === "in_progress" || c.status === "resolved");

  type NotifItem =
    | { kind: "complaint"; id: string; createdAt: string; complaint: Complaint }
    | { kind: "news"; id: string; createdAt: string; alert: AppAlert };

  // Complaints are intentionally excluded from Home. Citizens track them only in the Complaints tab.
  const notifItems: NotifItem[] = newsItems
    .map((a) => ({ kind: "news" as const, id: `n-${a.id}`, createdAt: a.createdAt, alert: a }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    let mounted = true;

    fetchEmergencyContacts()
      .then((contacts) => {
        if (mounted) setEmergencyContacts(contacts);
      })
      .catch(() => {
        if (mounted) setEmergencyContacts([]);
      });

    fetchServiceCatalog()
      .then((categories) => {
        if (!mounted) return;
        setServiceShortcuts(
          categories.map((cat) => ({
            id: cat.id,
            label: cat.label,
            icon: cat.icon,
            color: cat.color,
            bg: cat.bgColor,
          })),
        );
      })
      .catch(() => {
        if (mounted) setServiceShortcuts([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(readAlertsKey)
      .then((stored) => {
        if (stored) setReadAlertIds(JSON.parse(stored));
      })
      .catch(() => {});
  }, [readAlertsKey]);

  useEffect(() => {
    if (!user?.ward) {
      setUtilityStatuses([]);
      return;
    }

    let mounted = true;

    fetchUtilityStatuses(user.ward, user.wardCode)
      .then((statuses) => {
        if (mounted) setUtilityStatuses(statuses);
      })
      .catch(() => {
        if (mounted) setUtilityStatuses([]);
      });

    return () => {
      mounted = false;
    };
  }, [user?.ward, user?.wardCode]);

  const markAlertsRead = (ids: string[]) => {
    if (ids.length === 0) return;
    const merged = Array.from(new Set([...readAlertIds, ...ids]));
    setReadAlertIds(merged);
    AsyncStorage.setItem(readAlertsKey, JSON.stringify(merged)).catch(() => {});
  };

  const openNotifications = () => {
    setShowNotifPanel(true);
    const ids = notifItems.map((i) => (i.kind === "news" ? i.alert.id : i.complaint.id));
    markAlertsRead(ids);
  };

  const openAlertDetail = (item: AppAlert) => {
    markAlertsRead([item.id]);
    setSelectedAlert(item);
  };

  const notifCount = notifItems.filter((i) => {
    const aid = i.kind === "news" ? i.alert.id : i.complaint.id;
    return !readAlertIds.includes(aid);
  }).length;

  const handleCall = (number: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${number}`);
  };

  const handleServiceTap = (categoryId: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push({ pathname: "/(tabs)/services", params: { category: categoryId } } as any);
  };

  const defaultWard = user?.ward || "Ambernath";
  const waterStatus = utilityStatuses.find((item) => item.utilityType === "water");
  const electricityStatus = utilityStatuses.find((item) => item.utilityType === "electricity");
  const utilityItems: UtilityStatus[] = [
    waterStatus || {
      id: "default-water",
      ward: defaultWard,
      wardCode: user?.wardCode || null,
      utilityType: "water",
      title: t("waterSupply"),
      status: "normal",
      hoursPerDay: "—",
      scheduleText: "No ward update posted yet.",
      description: "No water supply update has been posted for your ward yet.",
      helpline: "AMC Water Helpline: 0251-2604100",
      source: "Ward Utility Desk",
    },
    electricityStatus || {
      id: "default-electricity",
      ward: defaultWard,
      wardCode: user?.wardCode || null,
      utilityType: "electricity",
      title: t("electricity"),
      status: "normal",
      hoursPerDay: "—",
      scheduleText: "No ward update posted yet.",
      description: "No electricity update has been posted for your ward yet.",
      helpline: "MSEDCL Helpline: 1912",
      source: "Ward Utility Desk",
    },
  ];

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
            <TouchableOpacity style={styles.notifBtn} activeOpacity={0.82} onPress={openNotifications}>
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

      <AppScrollView
        onAppRefresh={() => Promise.all([refreshAlerts(), refreshBroadcasts(), refreshComplaints()]).then(() => undefined)}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 8) + 60 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* REPORT AN ISSUE CTA */}
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
          {utilityItems.map((item) => (
            <UtilityCard
              key={item.utilityType}
              title={item.utilityType === "water" ? t("waterSupply") : t("electricity")}
              value={item.hoursPerDay || "—"}
              unit={t("hoursDay")}
              status={displayUtilityStatus(item.status)}
              statusOk={statusIsOk(item.status)}
              icon={item.utilityType === "water" ? "droplet" : "zap"}
              gradColors={item.utilityType === "water" ? (["#0EA5E9", "#0EA5E9"] as const) : (["#F59E0B", "#F59E0B"] as const)}
              lastUpdated={utilityLastUpdated(item.updatedAt)}
              onPress={() => setSelectedUtility(item)}
            />
          ))}
        </View>

        {/* QUICK SERVICES */}
        <SectionHeader title={t("quickServices")} actionLabel={t("allServices")} onAction={() => router.push("/(tabs)/services" as any)} />
        <View style={styles.servicesCard}>
          <View style={styles.servicesGrid}>
            {Array.from({ length: Math.ceil(serviceShortcuts.length / 4) }, (_, rowIndex) => serviceShortcuts.slice(rowIndex * 4, rowIndex * 4 + 4)).map((row, rowIndex) => (
              <View key={`service-row-${rowIndex}`} style={styles.serviceRow}>
                {row.map((svc) => (
                  <TouchableOpacity
                    key={svc.id}
                    style={styles.serviceItem}
                    activeOpacity={0.8}
                    onPress={() => handleServiceTap(svc.id)}
                  >
                    <View style={[styles.serviceIcon, { backgroundColor: svc.bg }]}>
                      <MaterialCommunityIcons name={svc.icon as any} size={21} color={svc.color} />
                    </View>
                    <Text style={styles.serviceLabel}>{svc.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
          <Text style={styles.pageFooterSub}>Civic Services · सबका साथ, सबका विकास</Text>
          <Text style={styles.pageFooterVersion}>v1.0</Text>
        </View>
      </AppScrollView>

      {/* Notification Panel Modal */}
      <Modal visible={showNotifPanel} transparent animationType="fade" onRequestClose={() => setShowNotifPanel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.notifHeader}>
              <Feather name="bell" size={20} color="#EA580C" />
              <Text style={styles.modalTitle}>Notifications</Text>
            </View>
            <AppScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420, width: "100%" }}>
              {notifItems.length === 0 ? (
                <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
                  <Feather name="bell-off" size={32} color="#CBD5E1" />
                  <Text style={{ fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" }}>No notifications right now</Text>
                </View>
              ) : notifItems.map((item) => {
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

                if (item.kind === "complaint") {
                  const c = item.complaint;
                  const statusMap: Record<string, { label: string; color: string; bg: string; icon: any }> = {
                    assigned: { label: "Assigned", color: "#7C3AED", bg: "#EDE9FE", icon: "user-check" },
                    in_progress: { label: "In Progress", color: "#2563EB", bg: "#DBEAFE", icon: "loader" },
                    resolved: { label: "Resolved", color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
                  };
                  const s = statusMap[c.status] || statusMap.assigned;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.notifItem}
                      activeOpacity={0.8}
                      onPress={() => {
                        markAlertsRead([c.id]);
                        setShowNotifPanel(false);
                        setTimeout(() => router.push(`/complaint/${c.id}`), 200);
                      }}
                    >
                      <View style={[styles.notifItemIcon, { backgroundColor: s.bg }]}>
                        <Feather name={s.icon} size={16} color={s.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                          <Text style={styles.notifItemTitle} numberOfLines={1}>{c.title}</Text>
                          <Text style={styles.notifItemTime}>{timeStr}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: s.bg }}>
                            <Text style={{ fontSize: 9, fontWeight: "800", color: s.color, fontFamily: "Inter_700Bold" }}>{s.label.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.notifItemBody} numberOfLines={1}>{c.id}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }

                const a = item.alert;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.notifItem}
                    activeOpacity={0.8}
                    onPress={() => {
                      markAlertsRead([a.id]);
                      setShowNotifPanel(false);
                      setTimeout(() => setSelectedAlert(a), 200);
                    }}
                  >
                    <View style={[styles.notifItemIcon, { backgroundColor: "#DBEAFE" }]}>
                      <Feather name="file-text" size={16} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <Text style={styles.notifItemTitle} numberOfLines={1}>{a.title}</Text>
                        <Text style={styles.notifItemTime}>{timeStr}</Text>
                      </View>
                      <Text style={styles.notifItemBody} numberOfLines={2}>{a.body}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </AppScrollView>
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
            <AppScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {selectedUtility && (() => {
                const isWater = selectedUtility.utilityType === "water";
                const color = isWater ? "#0EA5E9" : "#D97706";
                const bg = isWater ? "#BAE6FD" : "#FEF3C7";
                return (
                  <>
                    <View style={[styles.modalIconWrap, { backgroundColor: bg }]}>
                      <Feather name={isWater ? "droplet" : "zap"} size={28} color={color} />
                    </View>
                    <Text style={styles.modalTitle}>{isWater ? t("waterSupply") : t("electricity")}</Text>
                    <View style={styles.utilityStatRow}>
                      <View style={styles.utilityStat}>
                        <Text style={[styles.utilityStatNum, { color }]}>{selectedUtility.hoursPerDay || "—"}</Text>
                        <Text style={styles.utilityStatLabel}>{t("hoursDay")}</Text>
                      </View>
                      <View style={styles.utilityStatDivider} />
                      <View style={styles.utilityStat}>
                        <Text style={[styles.utilityStatNum, { color }]}>{displayUtilityStatus(selectedUtility.status)}</Text>
                        <Text style={styles.utilityStatLabel}>Status</Text>
                      </View>
                    </View>
                    <View style={styles.modalDivider} />
                    <Text style={styles.modalBody}>
                      {selectedUtility.scheduleText ? selectedUtility.scheduleText + "\n\n" : ""}
                      {selectedUtility.description || "No detailed utility update has been posted for your ward yet."}
                      {selectedUtility.helpline ? "\n\n" + selectedUtility.helpline : ""}
                    </Text>
                    <View style={styles.modalSourceRow}>
                      <Feather name="map-pin" size={12} color="#64748B" />
                      <Text style={styles.modalSourceText}>Ward: {selectedUtility.ward}</Text>
                    </View>
                    <View style={styles.modalSourceRow}>
                      <Feather name="info" size={12} color="#64748B" />
                      <Text style={styles.modalSourceText}>
                        Source: {selectedUtility.source || "Ward Utility Desk"} · Updated {utilityLastUpdated(selectedUtility.updatedAt)}
                      </Text>
                    </View>
                  </>
                );
              })()}
            </AppScrollView>
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
            <AppScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
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
                    {selectedAlert.media?.type === "image" ? (
                      <Image source={{ uri: selectedAlert.media.uri }} style={styles.modalMediaImage} />
                    ) : selectedAlert.media?.type === "video" ? (
                      <ComplaintMediaViewer uri={selectedAlert.media.uri} title={selectedAlert.title} label="Official video" accentColor="#EA580C" />
                    ) : null}
                    <View style={styles.alertDetailGrid}>
                      {!!selectedAlert.priority && (
                        <View style={styles.alertDetailChip}>
                          <Feather name="flag" size={12} color={cardColor} />
                          <Text style={styles.alertDetailText}>{selectedAlert.priority}</Text>
                        </View>
                      )}
                      {!!selectedAlert.category && (
                        <View style={styles.alertDetailChip}>
                          <Feather name="tag" size={12} color={cardColor} />
                          <Text style={styles.alertDetailText}>{selectedAlert.category}</Text>
                        </View>
                      )}
                      {!!selectedAlert.location && (
                        <View style={styles.alertDetailChip}>
                          <Feather name="map-pin" size={12} color={cardColor} />
                          <Text style={styles.alertDetailText}>{selectedAlert.location}</Text>
                        </View>
                      )}
                      {!!selectedAlert.validUntil && (
                        <View style={styles.alertDetailChip}>
                          <Feather name="calendar" size={12} color={cardColor} />
                          <Text style={styles.alertDetailText}>Valid until {selectedAlert.validUntil}</Text>
                        </View>
                      )}
                      {!!selectedAlert.targetAudience && (
                        <View style={styles.alertDetailChip}>
                          <Feather name="users" size={12} color={cardColor} />
                          <Text style={styles.alertDetailText}>{selectedAlert.targetAudience}</Text>
                        </View>
                      )}
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
            </AppScrollView>
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
  servicesCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, marginBottom: 18, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  servicesGrid: {
    gap: 14,
  },
  serviceRow: {
    flexDirection: "row",
    gap: 8,
  },
  serviceItem: {
    flex: 1,
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
    fontSize: 11,
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
  alertCardList: { gap: 10 },
  alertCard: { width: "100%", minHeight: 108, flexDirection: "row", alignItems: "stretch", gap: 12, backgroundColor: "white", borderRadius: 16, padding: 12, overflow: "hidden", shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#F1F5F9" },
  alertCardMedia: { width: 86, minHeight: 84, borderRadius: 14, backgroundColor: "#F8FAFC" },
  alertCardVideo: { width: 86, minHeight: 84, borderRadius: 14, backgroundColor: "#0F172A" },
  alertCardVideoText: { fontSize: 9, fontWeight: "800", fontFamily: "Inter_700Bold", textAlign: "center" },
  alertCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  alertCardBody: { flex: 1, paddingVertical: 2 },
  alertCardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  alertTypePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  alertTypeText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  alertCardTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  alertCardTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 4 },
  alertLocationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  alertLocationText: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", flex: 1 },
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
  modalMediaImage: { width: "100%", height: 180, borderRadius: 16, marginBottom: 14, backgroundColor: "#F8FAFC" },
  modalVideoBox: { width: "100%", height: 140, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 },
  modalVideoPlayer: { width: "100%", height: 220, borderRadius: 16, marginBottom: 14, backgroundColor: "#0F172A" },
  modalVideoText: { fontSize: 12, fontWeight: "800", fontFamily: "Inter_700Bold" },
  alertDetailGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  alertDetailChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  alertDetailText: { fontSize: 11, color: "#475569", fontFamily: "Inter_600SemiBold", fontWeight: "600", textTransform: "capitalize" },
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
