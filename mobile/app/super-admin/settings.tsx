import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import { useAuth } from "@/context/AuthContext";
import { useAccountActions } from "@/hooks/useAccountActions";

const GREEN = "#16A34A";
const ORANGE = "#EA580C";
const BG = "#EEF2F7";

type RouteCardProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
};

function RouteCard({ icon, title, description, color, onPress }: RouteCardProps) {
  return (
    <TouchableOpacity style={styles.routeCard} onPress={onPress} activeOpacity={0.84} accessibilityRole="button" accessibilityLabel={title}>
      <View style={[styles.routeIcon, { backgroundColor: `${color}18` }]}><Feather name={icon} size={18} color={color} /></View>
      <View style={styles.routeText}><Text style={styles.routeTitle}>{title}</Text><Text style={styles.routeDescription}>{description}</Text></View>
      <Feather name="chevron-right" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

function StatusRow({ icon, title, status, tone, description }: { icon: keyof typeof Feather.glyphMap; title: string; status: string; tone: "active" | "warning" | "info"; description: string }) {
  const theme = tone === "active"
    ? { color: "#166534", background: "#DCFCE7" }
    : tone === "warning"
      ? { color: "#B45309", background: "#FEF3C7" }
      : { color: "#1D4ED8", background: "#DBEAFE" };
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusIcon, { backgroundColor: theme.background }]}><Feather name={icon} size={17} color={theme.color} /></View>
      <View style={styles.statusBody}><Text style={styles.routeTitle}>{title}</Text><Text style={styles.routeDescription}>{description}</Text></View>
      <View style={[styles.statusPill, { backgroundColor: theme.background }]}><Text style={[styles.statusPillText, { color: theme.color }]}>{status}</Text></View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const accountActions = useAccountActions();
  const topPad = Platform.OS === "web" ? 58 : insets.top;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[styles.header, { paddingTop: topPad + 10 }]}>
        <View style={styles.headerTop}><View style={styles.headerBadge}><Feather name="settings" size={11} color="#6EE7B7" /><Text style={styles.headerBadgeText}>SYSTEM & ACCOUNT</Text></View></View>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>Production capability status and verified administration routes</Text>
      </LinearGradient>

      <AppScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) + 34 }}>
        <TouchableOpacity style={styles.profileCard} onPress={() => router.push("/super-admin/profile" as any)} activeOpacity={0.84}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.trim()?.charAt(0)?.toUpperCase() || "A"}</Text></View>
          <View style={styles.profileText}><Text style={styles.profileName}>{user?.name || "Super Admin"}</Text><View style={styles.verifiedRow}><View style={styles.adminPill}><Feather name="shield" size={10} color="#166534" /><Text style={styles.adminPillText}>SUPER ADMIN</Text></View><Feather name="check-circle" size={12} color={GREEN} /><Text style={styles.mobileText}>+91 {String(user?.mobile || "").replace(/\D/g, "").slice(-10)}</Text></View><Text style={styles.profileHint}>View and edit profile details. Verified mobile remains read-only.</Text></View>
          <Feather name="edit-2" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>ADMINISTRATION</Text>
        <View style={styles.group}>
          <RouteCard icon="shield" title="Super Admin Access" description="Authorize or revoke trusted mobile numbers" color={GREEN} onPress={() => router.push("/super-admin/access" as any)} />
          <RouteCard icon="users" title="Officers" description="Review approved Nagarsevaks and ward assignments" color="#2563EB" onPress={() => router.push("/super-admin/officers" as any)} />
          <RouteCard icon="bell" title="Alerts & News" description="Publish and review official ward or city updates" color={ORANGE} onPress={() => router.push("/alert/list" as any)} />
          <RouteCard icon="radio" title="Broadcast Center" description="Create auditable in-app broadcasts and review delivery status" color="#7C3AED" onPress={() => router.push("/super-admin/broadcast" as any)} />
        </View>

        <Text style={styles.sectionTitle}>PRODUCTION CAPABILITIES</Text>
        <View style={styles.group}>
          <StatusRow icon="git-branch" title="Complaint ward routing" status="Active" tone="active" description="Complaints are assigned using the verified citizen ward and approved officer mapping." />
          <StatusRow icon="smartphone" title="In-app broadcasts" status="Active" tone="active" description="Audience, ward, scheduling, delivery and read history are stored in MySQL." />
          <StatusRow icon="bell-off" title="External push notifications" status="Not configured" tone="warning" description="No device-token registration or push provider is configured. The app does not report fake push success." />
          <StatusRow icon="tool" title="Maintenance mode" status="Not enabled" tone="info" description="The previous switch changed only local UI state and has been removed until a backend access policy is implemented." />
        </View>

        <Text style={styles.sectionTitle}>APPLICATION</Text>
        <View style={styles.group}>
          <View style={styles.infoRow}><View style={[styles.routeIcon, { backgroundColor: "#EDE9FE" }]}><Feather name="code" size={17} color="#7C3AED" /></View><Text style={styles.infoLabel}>App version</Text><Text style={styles.infoValue}>1.0.0</Text></View>
          <View style={styles.infoRow}><View style={[styles.routeIcon, { backgroundColor: "#FEF3C7" }]}><Feather name="key" size={17} color="#B45309" /></View><Text style={styles.infoLabel}>Authentication</Text><Text style={styles.infoValue}>Mobile OTP</Text></View>
          <View style={styles.infoRow}><View style={[styles.routeIcon, { backgroundColor: "#DCFCE7" }]}><Feather name="database" size={17} color="#166534" /></View><Text style={styles.infoLabel}>Backend</Text><Text style={styles.infoValue}>Hostinger MySQL</Text></View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={accountActions.requestLogout} activeOpacity={0.84} accessibilityRole="button">
          <Feather name="log-out" size={18} color="#DC2626" /><Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </AppScrollView>

      <ConfirmActionModal
        visible={accountActions.pendingAction === "logout"}
        title="Logout from Connect-T?"
        message="This will securely clear Civic and Job Portal sessions on this device. Administrative records and account access will not be deleted."
        confirmLabel="Logout"
        icon="log-out"
        tone="danger"
        busy={accountActions.busy}
        onCancel={accountActions.cancelAction}
        onConfirm={accountActions.runPendingAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: "row", marginBottom: 8 },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.13)" },
  headerBadgeText: { color: "#6EE7B7", fontSize: 9, letterSpacing: 1.3, fontFamily: "Inter_700Bold" },
  headerTitle: { color: "white", fontSize: 23, fontFamily: "Inter_700Bold" },
  headerSub: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_400Regular" },
  scroll: { flex: 1 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, padding: 15, marginBottom: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#166534", fontSize: 20, fontFamily: "Inter_700Bold" },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { color: "#0F172A", fontSize: 16, fontFamily: "Inter_700Bold" },
  verifiedRow: { marginTop: 5, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  adminPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: "#DCFCE7" },
  adminPillText: { color: "#166534", fontSize: 8.5, fontFamily: "Inter_700Bold" },
  mobileText: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_500Medium" },
  profileHint: { marginTop: 5, color: "#94A3B8", fontSize: 10, lineHeight: 14, fontFamily: "Inter_400Regular" },
  sectionTitle: { marginLeft: 3, marginBottom: 8, color: "#64748B", fontSize: 10, letterSpacing: 1.1, fontFamily: "Inter_700Bold" },
  group: { marginBottom: 18, borderRadius: 19, overflow: "hidden", backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  routeCard: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  routeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  routeText: { flex: 1, minWidth: 0 },
  routeTitle: { color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_700Bold" },
  routeDescription: { marginTop: 3, color: "#64748B", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" },
  statusRow: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  statusIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  statusBody: { flex: 1, minWidth: 0 },
  statusPill: { maxWidth: 94, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  statusPillText: { fontSize: 8.5, textAlign: "center", fontFamily: "Inter_700Bold" },
  infoRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  infoLabel: { flex: 1, color: "#334155", fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  infoValue: { color: "#94A3B8", fontSize: 11, fontFamily: "Inter_500Medium" },
  logoutButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 16, backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA" },
  logoutText: { color: "#DC2626", fontSize: 14.5, fontFamily: "Inter_700Bold" },
});
