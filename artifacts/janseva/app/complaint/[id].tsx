import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useComplaints, ComplaintStatus } from "@/context/ComplaintContext";
import { useLanguage } from "@/context/LanguageContext";

const statusLabelKeys: Record<ComplaintStatus, string> = {
  submitted: "submitted", assigned: "assigned", in_progress: "inProgress",
  resolved: "resolved", rejected: "rejected",
};

const statusConfig: Record<ComplaintStatus, { color: string; bg: string; icon: string }> = {
  submitted: { color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  assigned: { color: "#2563EB", bg: "#DBEAFE", icon: "user-check" },
  in_progress: { color: "#7C3AED", bg: "#EDE9FE", icon: "tool" },
  resolved: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  rejected: { color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
};

const categoryLabelKeys: Record<string, string> = {
  roads: "roads", water: "waterSupply", electricity: "electricity", garbage: "garbage",
  drainage: "drainage", streetlight: "streetLight", encroachment: "encroachment", other: "other",
};

const categoryConfig: Record<string, { icon: string; color: string; bg: string }> = {
  roads: { icon: "truck", color: "#92400E", bg: "#FEF3C7" },
  water: { icon: "droplet", color: "#0369A1", bg: "#BAE6FD" },
  electricity: { icon: "zap", color: "#D97706", bg: "#FEF3C7" },
  garbage: { icon: "trash-2", color: "#059669", bg: "#D1FAE5" },
  drainage: { icon: "git-merge", color: "#0EA5E9", bg: "#EFF6FF" },
  streetlight: { icon: "sun", color: "#7C3AED", bg: "#EDE9FE" },
  encroachment: { icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2" },
  other: { icon: "more-horizontal", color: "#475569", bg: "#F1F5F9" },
};

const timelineSteps: ComplaintStatus[] = ["submitted", "assigned", "in_progress", "resolved"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function ComplaintDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { getComplaintById } = useComplaints();
  const { t } = useLanguage();

  const fadeAnim = useRef(new Animated.Value(fresh === "1" ? 0 : 1)).current;

  useEffect(() => {
    if (fresh === "1") {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, []);

  const complaint = getComplaintById(id);

  if (!complaint) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "#64748B" }}>{t("complaintNotFound")}</Text>
      </View>
    );
  }

  const st = statusConfig[complaint.status];
  const cat = categoryConfig[complaint.category] || categoryConfig.other;
  const currentStepIdx = complaint.status === "rejected" ? -1 : timelineSteps.indexOf(complaint.status);

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={fresh === "1" ? ["#065F46", "#047857", "#059669"] : ["#1E3A8A", "#1E40AF", "#2563EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {fresh === "1" && (
              <View style={styles.successPill}>
                <Feather name="check-circle" size={12} color="#6EE7B7" />
                <Text style={styles.successPillText}>{t("complaintRegistered")}</Text>
              </View>
            )}
            <Text style={styles.headerTitle} numberOfLines={2}>{complaint.title}</Text>
            <Text style={styles.headerSub}># {complaint.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Feather name={st.icon as any} size={12} color="white" />
            <Text style={styles.statusBadgeText}>{t(statusLabelKeys[complaint.status])}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 8) + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo */}
        {complaint.photoUri ? (
          <View style={styles.photoCard}>
            <Image source={{ uri: complaint.photoUri }} style={styles.photo} />
            <View style={styles.photoLabel}>
              <Feather name="camera" size={12} color="#64748B" />
              <Text style={styles.photoLabelText}>{t("problemPhoto")}</Text>
            </View>
          </View>
        ) : null}

        {/* Status tracker */}
        <View style={styles.trackerCard}>
          <Text style={styles.trackerTitle}>{t("complaintStatus")}</Text>
          <View style={styles.trackerSteps}>
            {timelineSteps.map((step, idx) => {
              const done = idx < currentStepIdx;
              const active = idx === currentStepIdx;
              const sConfig = statusConfig[step];
              return (
                <React.Fragment key={step}>
                  <View style={styles.trackerItem}>
                    <View style={[
                      styles.trackerDot,
                      done && { backgroundColor: "#059669", borderColor: "#059669" },
                      active && { backgroundColor: sConfig.color, borderColor: sConfig.color },
                      !done && !active && { backgroundColor: "white", borderColor: "#E2E8F0" },
                    ]}>
                      {done ? (
                        <Feather name="check" size={10} color="white" />
                      ) : (
                        <Feather
                          name={sConfig.icon as any}
                          size={10}
                          color={active ? "white" : "#CBD5E1"}
                        />
                      )}
                    </View>
                    <Text style={[
                      styles.trackerLabel,
                      active && { color: sConfig.color, fontFamily: "Inter_700Bold" },
                      done && { color: "#059669" },
                    ]}>
                      {t(statusLabelKeys[step])}
                    </Text>
                  </View>
                  {idx < timelineSteps.length - 1 && (
                    <View style={[
                      styles.trackerLine,
                      { backgroundColor: done ? "#059669" : "#E2E8F0" },
                    ]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailCard}>
          <Text style={styles.detailSectionTitle}>{t("complaintDetails")}</Text>
          <View style={styles.detailRow}>
            <View style={[styles.catIconWrap, { backgroundColor: cat.bg }]}>
              <Feather name={cat.icon as any} size={14} color={cat.color} />
            </View>
            <View>
              <Text style={styles.detailLabel}>{t("category")}</Text>
              <Text style={styles.detailValue}>{t(categoryLabelKeys[complaint.category] || "other")}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={[styles.catIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="map-pin" size={14} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>{t("location")}</Text>
              <Text style={styles.detailValue}>{complaint.location}</Text>
              <Text style={styles.detailSub}>{complaint.ward}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={[styles.catIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="calendar" size={14} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.detailLabel}>{t("submittedOn")}</Text>
              <Text style={styles.detailValue}>{formatDate(complaint.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.detailLabel}>{t("description")}</Text>
            <Text style={[styles.detailValue, { marginTop: 6, lineHeight: 20 }]}>{complaint.description}</Text>
          </View>
          {complaint.assignedTo && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={[styles.catIconWrap, { backgroundColor: "#DBEAFE" }]}>
                  <Feather name="user-check" size={14} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.detailLabel}>{t("assignedTo")}</Text>
                  <Text style={styles.detailValue}>{complaint.assignedTo}</Text>
                </View>
              </View>
            </>
          )}
          {complaint.resolvedNote && (
            <>
              <View style={styles.divider} />
              <View style={styles.resolvedNote}>
                <Feather name="check-circle" size={14} color="#059669" />
                <Text style={styles.resolvedNoteText}>{complaint.resolvedNote}</Text>
              </View>
            </>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.detailSectionTitle}>{t("activityTimeline")}</Text>
          {complaint.timeline.slice().reverse().map((entry, idx) => {
            const eSt = statusConfig[entry.status];
            return (
              <View key={idx} style={styles.timelineEntry}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.tlDot, { backgroundColor: eSt.bg }]}>
                    <Feather name={eSt.icon as any} size={10} color={eSt.color} />
                  </View>
                  {idx < complaint.timeline.length - 1 && <View style={styles.tlLine} />}
                </View>
                <View style={styles.timelineRight}>
                  <View style={styles.tlHeader}>
                    <Text style={[styles.tlStatus, { color: eSt.color }]}>{t(statusLabelKeys[entry.status])}</Text>
                    <Text style={styles.tlTime}>{formatDate(entry.timestamp)}</Text>
                  </View>
                  {entry.note ? <Text style={styles.tlNote}>{entry.note}</Text> : null}
                  {entry.updatedBy ? (
                    <Text style={styles.tlBy}>— {entry.updatedBy}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  headerCenter: { flex: 1 },
  successPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(110,231,183,0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 6,
  },
  successPillText: { fontSize: 10, fontWeight: "700", color: "#6EE7B7", fontFamily: "Inter_600SemiBold" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "700", color: "white", fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  content: { padding: 14 },
  photoCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "white",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  photo: { width: "100%", height: 200 },
  photoLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  photoLabelText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },
  trackerCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  trackerTitle: { fontSize: 13, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 16 },
  trackerSteps: { flexDirection: "row", alignItems: "flex-start" },
  trackerItem: { alignItems: "center", gap: 6, flexShrink: 0 },
  trackerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  trackerLine: { flex: 1, height: 2, borderRadius: 1, marginTop: 13, marginHorizontal: 4 },
  trackerLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#94A3B8",
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    maxWidth: 60,
  },
  detailCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  detailSectionTitle: { fontSize: 13, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 14 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  catIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailLabel: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  detailSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  resolvedNote: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#D1FAE5",
    borderRadius: 10,
    padding: 10,
    alignItems: "flex-start",
  },
  resolvedNoteText: { flex: 1, fontSize: 12, color: "#065F46", fontFamily: "Inter_400Regular", lineHeight: 18 },
  timelineCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineEntry: { flexDirection: "row", gap: 12, marginBottom: 4 },
  timelineLeft: { alignItems: "center", width: 28, flexShrink: 0 },
  tlDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tlLine: { flex: 1, width: 2, backgroundColor: "#F1F5F9", marginTop: 4 },
  timelineRight: { flex: 1, paddingBottom: 16 },
  tlHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  tlStatus: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  tlTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  tlNote: { fontSize: 12, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 2 },
  tlBy: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
