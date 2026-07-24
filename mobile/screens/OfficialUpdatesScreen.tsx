import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { alertVisibleForWard, AppAlert, useAlerts } from "@/context/AlertContext";
import { AppBroadcast, useBroadcasts } from "@/context/BroadcastContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { updatesCopy } from "@/i18n/updatesCopy";
import { getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const BG = "#EBEFFC";

type OfficialItem =
  | { key: string; kind: "alert"; createdAt: string; alert: AppAlert }
  | { key: string; kind: "broadcast"; createdAt: string; broadcast: AppBroadcast };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Recently";
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function alertConfig(item: AppAlert) {
  if (item.type === "emergency") return { label: "Emergency", color: "#B91C1C", bg: "#FEE2E2", icon: "alert-octagon" as const };
  if (item.type === "alert") return { label: "Alert", color: "#DC2626", bg: "#FEF2F2", icon: "alert-triangle" as const };
  return { label: "News", color: "#166534", bg: "#DCFCE7", icon: "radio" as const };
}

function broadcastConfig(item: AppBroadcast) {
  if (item.category === "emergency") return { color: "#B91C1C", bg: "#FEE2E2", icon: "alert-octagon" as const };
  if (item.category === "information") return { color: "#1D4ED8", bg: "#DBEAFE", icon: "info" as const };
  if (item.category === "notice") return { color: "#6D28D9", bg: "#EDE9FE", icon: "file-text" as const };
  return { color: "#B45309", bg: "#FEF3C7", icon: "radio" as const };
}

function AlertCard({ item, canDelete, onOpen, onDelete }: { item: AppAlert; canDelete: boolean; onOpen: () => void; onDelete: () => void }) {
  const config = alertConfig(item);
  return (
    <TouchableOpacity style={[styles.card, !item.isRead && styles.unreadCard]} activeOpacity={0.86} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${config.label}: ${item.title}`}>
      {item.media?.type === "image" ? (
        <View style={styles.mediaWrap}>
          <Image source={{ uri: item.media.uri }} style={styles.image} />
          {!item.isRead ? <View style={styles.unreadDot} /> : null}
        </View>
      ) : (
        <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
          <Feather name={item.media?.type === "video" ? "play-circle" : config.icon} size={23} color={config.color} />
          {!item.isRead ? <View style={styles.unreadDot} /> : null}
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}><View style={[styles.typePill, { backgroundColor: config.bg }]}><Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text></View><Text style={styles.date}>{formatDate(item.createdAt)}</Text></View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
        <View style={styles.metaRow}><View style={styles.meta}><Feather name="user" size={10} color="#64748B" /><Text style={styles.metaText} numberOfLines={1}>{item.postedBy}</Text></View><View style={styles.meta}><Feather name={item.ward || item.location ? "map-pin" : "users"} size={10} color="#64748B" /><Text style={styles.metaText} numberOfLines={1}>{item.ward || item.location || "All citizens"}</Text></View></View>
      </View>
      {canDelete ? <TouchableOpacity style={styles.deleteButton} onPress={(event) => { event.stopPropagation(); onDelete(); }} accessibilityLabel={`Remove ${item.title}`}><Feather name="trash-2" size={15} color="#DC2626" /></TouchableOpacity> : <Feather name="chevron-right" size={17} color="#CBD5E1" />}
    </TouchableOpacity>
  );
}

function BroadcastCard({ item, label, sentLabel, pushMissingLabel, onOpen }: { item: AppBroadcast; label: string; sentLabel: string; pushMissingLabel: string; onOpen: () => void }) {
  const config = broadcastConfig(item);
  return (
    <TouchableOpacity style={[styles.card, !item.isRead && styles.unreadCard]} activeOpacity={0.86} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${label}: ${item.title}`}>
      <View style={[styles.iconBox, { backgroundColor: config.bg }]}><Feather name={config.icon} size={23} color={config.color} />{!item.isRead ? <View style={styles.unreadDot} /> : null}</View>
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}><View style={[styles.typePill, { backgroundColor: config.bg }]}><Text style={[styles.typeText, { color: config.color }]}>{label}</Text></View><Text style={styles.date}>{formatDate(item.sentAt || item.createdAt)}</Text></View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
        <View style={styles.metaRow}><View style={styles.meta}><Feather name="check-circle" size={10} color="#64748B" /><Text style={styles.metaText}>{sentLabel}</Text></View><View style={styles.meta}><Feather name="users" size={10} color="#64748B" /><Text style={styles.metaText} numberOfLines={1}>{item.ward || item.audienceRole}</Text></View></View>
        {item.externalPushStatus === "not_configured" ? <Text style={styles.pushWarning}>{pushMissingLabel}</Text> : null}
      </View>
      <Feather name="chevron-right" size={17} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function OfficialUpdatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const c = (key: Parameters<typeof updatesCopy>[1]) => updatesCopy(language, key);
  const { alerts: allAlerts, loading: alertLoading, error: alertError, refreshAlerts, removeAlert } = useAlerts();
  const { broadcasts, loading: broadcastLoading, error: broadcastError, refreshBroadcasts, markBroadcastRead } = useBroadcasts();
  const [selectedBroadcast, setSelectedBroadcast] = useState<AppBroadcast | null>(null);

  const canPublish = user?.role === "nagarsevak" || user?.role === "super_admin" || !!user?.isSuperAdmin;
  const isSuperAdmin = user?.role === "super_admin" || !!user?.isSuperAdmin;

  const refresh = useCallback(async () => {
    await Promise.allSettled([refreshAlerts(), refreshBroadcasts()]);
  }, [refreshAlerts, refreshBroadcasts]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const visibleAlerts = useMemo(() => {
    if (!user) return [];
    if (isSuperAdmin || user.role === "nagarsevak") return allAlerts;
    return allAlerts.filter((item) => alertVisibleForWard(item, user.ward || user.wardCode));
  }, [allAlerts, isSuperAdmin, user]);

  const sentBroadcasts = useMemo(() => broadcasts.filter((item) => item.status === "sent"), [broadcasts]);

  const items = useMemo<OfficialItem[]>(() => [
    ...visibleAlerts.map((alert) => ({ key: `alert:${alert.id}`, kind: "alert" as const, createdAt: alert.publishAt || alert.createdAt, alert })),
    ...sentBroadcasts.map((broadcast) => ({ key: `broadcast:${broadcast.id}`, kind: "broadcast" as const, createdAt: broadcast.sentAt || broadcast.createdAt, broadcast })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [sentBroadcasts, visibleAlerts]);

  const counts = useMemo(() => ({
    alerts: visibleAlerts.filter((item) => item.type === "alert" || item.type === "emergency").length,
    news: visibleAlerts.filter((item) => item.type === "news").length,
    broadcasts: sentBroadcasts.length,
    unread: visibleAlerts.filter((item) => !item.isRead).length + sentBroadcasts.filter((item) => !item.isRead).length,
  }), [sentBroadcasts, visibleAlerts]);

  const openBroadcast = async (item: AppBroadcast) => {
    setSelectedBroadcast(item);
    if (!item.isRead) {
      try {
        await markBroadcastRead(item.id);
        setSelectedBroadcast({ ...item, isRead: true });
      } catch {
        // The message remains readable even when receipt sync fails; the next
        // refresh retries the authoritative read state.
      }
    }
  };

  const confirmDelete = (item: AppAlert) => Alert.alert(c("removeTitle"), `${c("removeMessage")}\n\n${item.title}`, [
    { text: c("cancel"), style: "cancel" },
    { text: c("remove"), style: "destructive", onPress: () => void removeAlert(item.id).catch((requestError) => Alert.alert(c("removeFailed"), getUserErrorMessage(requestError))) },
  ]);

  const loading = alertLoading || broadcastLoading;
  const error = alertError || broadcastError;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)" as any)} style={styles.back}><Feather name="chevron-left" size={20} color="white" /><Text style={styles.backText}>{c("back")}</Text></TouchableOpacity>
          <View style={styles.headerActions}>
            {isSuperAdmin ? <TouchableOpacity onPress={() => router.push("/super-admin/broadcast" as any)} style={styles.secondaryHeaderAction}><Feather name="radio" size={15} color="white" /><Text style={styles.secondaryHeaderText}>{c("broadcasts")}</Text></TouchableOpacity> : null}
            {canPublish ? <TouchableOpacity onPress={() => router.push("/alert/new" as any)} style={styles.post}><Feather name="plus" size={15} color="#166534" /><Text style={styles.postText}>{c("post")}</Text></TouchableOpacity> : null}
          </View>
        </View>
        <Text style={styles.headerTitle}>{c("title")}</Text>
        <Text style={styles.headerSub}>{canPublish ? c("managerSub") : c("citizenSub")}</Text>
        <View style={styles.stats}><Stat value={items.length} label={c("total")} /><Stat value={counts.alerts} label={c("alerts")} /><Stat value={counts.news} label={c("news")} /><Stat value={counts.unread} label={c("unread")} /></View>
      </LinearGradient>

      {error ? <TouchableOpacity style={styles.errorBanner} onPress={() => void refresh()}><Feather name="wifi-off" size={15} color="#B45309" /><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>{c("retry")}</Text></TouchableOpacity> : null}

      {loading && !items.length ? <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /><Text style={styles.loadingText}>{c("loading")}</Text></View> : <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        refreshing={loading}
        onRefresh={() => void refresh()}
        renderItem={({ item }) => item.kind === "alert" ? <AlertCard item={item.alert} canDelete={isSuperAdmin || (user?.role === "nagarsevak" && String(item.alert.postedById || "") === String(user.id))} onOpen={() => router.push(`/alert/${item.alert.id}` as any)} onDelete={() => confirmDelete(item.alert)} /> : <BroadcastCard item={item.broadcast} label={c("broadcast")} sentLabel={c("sentInApp")} pushMissingLabel={c("externalPushMissing")} onOpen={() => void openBroadcast(item.broadcast)} />}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 12) + 28 }, !items.length && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Feather name="bell" size={30} color={GREEN} /></View><Text style={styles.emptyTitle}>{c("emptyTitle")}</Text><Text style={styles.emptyText}>{canPublish ? c("emptyManager") : c("emptyCitizen")}</Text>{canPublish ? <TouchableOpacity style={styles.emptyAction} onPress={() => router.push("/alert/new" as any)}><Text style={styles.emptyActionText}>{c("post")}</Text></TouchableOpacity> : null}</View>}
      />}

      <Modal visible={!!selectedBroadcast} transparent animationType="fade" onRequestClose={() => setSelectedBroadcast(null)}>
        <View style={styles.modalOverlay} accessibilityViewIsModal>
          <View style={styles.detailModal}>
            <View style={styles.detailIcon}><Feather name="radio" size={25} color="#B45309" /></View>
            <Text style={styles.detailType}>{c("officialUpdate")}</Text>
            <Text style={styles.detailTitle}>{selectedBroadcast?.title}</Text>
            <Text style={styles.detailBody}>{selectedBroadcast?.body}</Text>
            <View style={styles.detailMeta}><Feather name="users" size={12} color="#64748B" /><Text style={styles.detailMetaText}>{selectedBroadcast?.ward || selectedBroadcast?.audienceRole || c("allCitizens")}</Text></View>
            <Text style={styles.detailDate}>{selectedBroadcast ? formatDate(selectedBroadcast.sentAt || selectedBroadcast.createdAt) : ""}</Text>
            {selectedBroadcast?.externalPushStatus === "not_configured" ? <View style={styles.detailWarning}><Feather name="info" size={13} color="#B45309" /><Text style={styles.detailWarningText}>{selectedBroadcast.externalPushMessage || c("externalPushMissing")}</Text></View> : null}
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedBroadcast(null)}><Text style={styles.closeText}>{c("close")}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  secondaryHeaderAction: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)" },
  secondaryHeaderText: { color: "white", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  post: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, borderRadius: 13, backgroundColor: "white" },
  postText: { color: "#166534", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 23, color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { marginTop: 4, fontSize: 11.5, lineHeight: 17, color: "rgba(255,255,255,0.76)", fontFamily: "Inter_400Regular" },
  stats: { marginTop: 14, flexDirection: "row", gap: 7 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)" },
  statValue: { fontSize: 18, color: "white", fontFamily: "Inter_700Bold" },
  statLabel: { marginTop: 1, fontSize: 8.8, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_500Medium" },
  errorBanner: { margin: 14, marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 7, padding: 11, borderRadius: 13, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  errorText: { flex: 1, fontSize: 10.5, color: "#92400E", fontFamily: "Inter_500Medium" },
  retry: { color: "#B45309", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 11.5, fontFamily: "Inter_500Medium" },
  list: { padding: 14, gap: 10 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  unreadCard: { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
  mediaWrap: { position: "relative", flexShrink: 0 },
  iconBox: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 },
  unreadDot: { position: "absolute", top: 5, right: 5, width: 9, height: 9, borderRadius: 5, backgroundColor: "#DC2626", borderWidth: 1.5, borderColor: "white" },
  image: { width: 58, height: 58, borderRadius: 15, backgroundColor: "#F8FAFC" },
  cardContent: { flex: 1, minWidth: 0 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typeText: { fontSize: 9.5, fontFamily: "Inter_700Bold" },
  date: { fontSize: 8.8, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  title: { marginTop: 6, fontSize: 14, color: "#0F172A", lineHeight: 18, fontFamily: "Inter_700Bold" },
  body: { marginTop: 4, fontSize: 11.5, lineHeight: 17, color: "#64748B", fontFamily: "Inter_400Regular" },
  metaRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 5 },
  meta: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: "#F8FAFC" },
  metaText: { maxWidth: 130, fontSize: 9.3, color: "#64748B", fontFamily: "Inter_500Medium" },
  pushWarning: { marginTop: 7, color: "#B45309", fontSize: 9.2, fontFamily: "Inter_600SemiBold" },
  deleteButton: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#FEF2F2" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 26 },
  emptyIcon: { width: 64, height: 64, borderRadius: 21, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 11, fontSize: 16, color: "#0F172A", textAlign: "center", fontFamily: "Inter_700Bold" },
  emptyText: { marginTop: 5, fontSize: 11.5, lineHeight: 17, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular" },
  emptyAction: { marginTop: 14, minHeight: 44, paddingHorizontal: 15, borderRadius: 13, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  emptyActionText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22, backgroundColor: "rgba(15,23,42,0.6)" },
  detailModal: { width: "100%", maxWidth: 380, borderRadius: 24, backgroundColor: "white", padding: 22, alignItems: "center" },
  detailIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  detailType: { marginTop: 10, color: "#B45309", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  detailTitle: { marginTop: 6, color: "#0F172A", fontSize: 19, lineHeight: 25, textAlign: "center", fontFamily: "Inter_700Bold" },
  detailBody: { marginTop: 10, color: "#475569", fontSize: 13, lineHeight: 20, textAlign: "center", fontFamily: "Inter_400Regular" },
  detailMeta: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: "#F8FAFC" },
  detailMetaText: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_600SemiBold" },
  detailDate: { marginTop: 8, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" },
  detailWarning: { marginTop: 12, width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 6, borderRadius: 12, backgroundColor: "#FFFBEB", padding: 9 },
  detailWarningText: { flex: 1, color: "#92400E", fontSize: 9.8, lineHeight: 14, fontFamily: "Inter_400Regular" },
  closeButton: { marginTop: 18, minWidth: 120, minHeight: 46, borderRadius: 14, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  closeText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
});
