import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import { useSuperAdminAccess, SuperAdminAssignment } from "@/hooks/useSuperAdminAccess";
import { apiGet, getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const DARK = "#14532D";

type PendingAccessAction =
  | { kind: "status"; item: SuperAdminAssignment; nextStatus: "active" | "inactive" }
  | { kind: "remove"; item: SuperAdminAssignment }
  | null;

function cleanMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function readableDate(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function statusTone(status: string) {
  if (status === "active") return { bg: "#DCFCE7", text: "#15803D", icon: "check-circle" as const };
  if (status === "inactive") return { bg: "#FEF3C7", text: "#B45309", icon: "pause-circle" as const };
  return { bg: "#FEE2E2", text: "#B91C1C", icon: "x-circle" as const };
}

export default function SuperAdminAccessManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    assignments,
    loading,
    error,
    refetch,
    addAssignment,
    setAssignmentStatus,
    removeAssignment,
  } = useSuperAdminAccess();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAccessAction>(null);
  const [actionError, setActionError] = useState("");

  const counts = useMemo(() => ({
    active: assignments.filter((item) => item.status === "active").length,
    inactive: assignments.filter((item) => item.status === "inactive").length,
    signedIn: assignments.filter((item) => item.hasLoggedIn).length,
  }), [assignments]);

  const loadAudit = async () => {
    try {
      const data = await apiGet<any>("/api/super-admin/role-audit-logs?limit=12");
      setAuditLogs(data.logs || []);
    } catch {
      setAuditLogs([]);
    }
  };

  const refreshAll = async () => {
    await Promise.all([refetch(search), loadAudit()]);
  };

  useEffect(() => { void loadAudit(); }, []);

  const handleSearch = () => void refetch(search);

  const openAction = (action: Exclude<PendingAccessAction, null>) => {
    setActionError("");
    setPendingAction(action);
  };

  const closeAction = () => {
    if (submitting) return;
    setActionError("");
    setPendingAction(null);
  };

  const handleAdd = async () => {
    setNotice("");
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) {
      setNotice("Enter the administrator's full name.");
      return;
    }
    if (cleanMobile(mobile).length !== 10) {
      setNotice("Enter a valid 10 digit mobile number.");
      return;
    }
    setSubmitting(true);
    try {
      await addAssignment({ name: name.trim(), mobile: cleanMobile(mobile) });
      setName("");
      setMobile("");
      setNotice("Super Admin access added. The person can now use the normal OTP login.");
      await loadAudit();
    } catch (requestError) {
      setNotice(getUserErrorMessage(requestError, "Super Admin access could not be added."));
    } finally {
      setSubmitting(false);
    }
  };

  const runPendingAction = async () => {
    if (!pendingAction || submitting) return;
    const action = pendingAction;
    setSubmitting(true);
    setNotice("");
    setActionError("");
    try {
      if (action.kind === "status") {
        await setAssignmentStatus(action.item.id, action.nextStatus);
        setNotice(`Access ${action.nextStatus === "active" ? "activated" : "deactivated"} successfully.`);
      } else {
        await removeAssignment(action.item.id);
        setNotice("Super Admin access removed successfully. The audit history has been retained.");
      }
      await refreshAll();
      setPendingAction(null);
    } catch (requestError) {
      setActionError(getUserErrorMessage(
        requestError,
        action.kind === "remove" ? "Access could not be removed." : "Access could not be updated.",
      ));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmTitle = !pendingAction
    ? ""
    : pendingAction.kind === "remove"
      ? "Remove Super Admin access?"
      : pendingAction.nextStatus === "active"
        ? "Activate Super Admin access?"
        : "Deactivate Super Admin access?";

  const confirmMessage = !pendingAction
    ? ""
    : pendingAction.kind === "remove"
      ? `${pendingAction.item.name} will lose Super Admin access immediately. Their user data will not be deleted, and this action will remain in the role audit log.`
      : pendingAction.nextStatus === "active"
        ? `${pendingAction.item.name} will be allowed to open the Super Admin dashboard again using the verified OTP login.`
        : `${pendingAction.item.name} will no longer be able to open the Super Admin dashboard. Their account and audit history will remain safe.`;

  const confirmLabel = !pendingAction
    ? "Confirm"
    : pendingAction.kind === "remove"
      ? "Remove access"
      : pendingAction.nextStatus === "active"
        ? "Activate"
        : "Deactivate";

  const confirmIcon = !pendingAction
    ? "check" as const
    : pendingAction.kind === "remove"
      ? "trash-2" as const
      : pendingAction.nextStatus === "active"
        ? "user-check" as const
        : "pause-circle" as const;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#052E16", DARK, GREEN]} style={styles.header}>
        <View style={[styles.headerInner, { paddingTop: (Platform.OS === "web" ? 40 : insets.top) + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={19} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>SECURITY & ROLES</Text>
            <Text style={styles.headerTitle}>Access Management</Text>
            <Text style={styles.headerSub}>Phone-based Super Admin authorization</Text>
          </View>
          <View style={styles.headerIcon}><Feather name="shield" size={22} color="#166534" /></View>
        </View>
      </LinearGradient>

      <AppScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        onAppRefresh={refreshAll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          {[
            { label: "Active", value: counts.active, icon: "user-check", color: "#16A34A", bg: "#DCFCE7" },
            { label: "Inactive", value: counts.inactive, icon: "user-x", color: "#D97706", bg: "#FEF3C7" },
            { label: "Signed in", value: counts.signedIn, icon: "log-in", color: "#2563EB", bg: "#DBEAFE" },
          ].map((item) => (
            <View key={item.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: item.bg }]}><Feather name={item.icon as any} size={15} color={item.color} /></View>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {notice ? (
          <View style={styles.noticeBox} accessibilityLiveRegion="polite">
            <Feather name="info" size={16} color="#166534" />
            <Text style={styles.noticeText}>{notice}</Text>
            <TouchableOpacity onPress={() => setNotice("")} accessibilityRole="button" accessibilityLabel="Dismiss message"><Feather name="x" size={16} color="#64748B" /></TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}><Feather name="user-plus" size={18} color={GREEN} /></View>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.cardTitle}>Add Super Admin</Text>
              <Text style={styles.cardSub}>No access code is generated or shared.</Text>
            </View>
          </View>
          <Text style={styles.label}>Full name</Text>
          <View style={styles.inputShell}><Feather name="user" size={16} color="#94A3B8" /><TextInput value={name} onChangeText={setName} placeholder="First name and surname" placeholderTextColor="#94A3B8" autoCapitalize="words" style={styles.input} /></View>
          <Text style={styles.label}>Mobile number</Text>
          <View style={styles.inputShell}><Text style={styles.prefix}>+91</Text><TextInput value={mobile} onChangeText={(value) => setMobile(cleanMobile(value))} placeholder="10 digit mobile number" placeholderTextColor="#94A3B8" keyboardType="number-pad" maxLength={10} style={styles.input} /></View>
          <TouchableOpacity style={[styles.addButton, submitting && styles.disabled]} onPress={handleAdd} disabled={submitting} activeOpacity={0.86} accessibilityRole="button" accessibilityState={{ disabled: submitting }}>
            {submitting && !pendingAction ? <ActivityIndicator color="white" /> : <><Feather name="plus" size={17} color="white" /><Text style={styles.addButtonText}>Authorize mobile number</Text></>}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>Authorized Super Admins</Text><Text style={styles.sectionSub}>Search, activate, deactivate or remove access</Text></View>
          <TouchableOpacity style={styles.refreshButton} onPress={() => void refreshAll()} accessibilityRole="button" accessibilityLabel="Refresh access records"><Feather name="refresh-cw" size={15} color={GREEN} /></TouchableOpacity>
        </View>
        <View style={styles.searchShell}>
          <Feather name="search" size={17} color="#94A3B8" />
          <TextInput value={search} onChangeText={(value) => { setSearch(value); if (!value) void refetch(); }} onSubmitEditing={handleSearch} placeholder="Search name or mobile" placeholderTextColor="#94A3B8" style={styles.searchInput} returnKeyType="search" />
          {search ? <TouchableOpacity onPress={() => { setSearch(""); void refetch(); }} accessibilityRole="button" accessibilityLabel="Clear search"><Feather name="x-circle" size={17} color="#94A3B8" /></TouchableOpacity> : null}
        </View>

        {loading ? (
          <View style={styles.emptyCard}><ActivityIndicator color={GREEN} /><Text style={styles.emptyText}>Loading access records…</Text></View>
        ) : error ? (
          <View style={styles.emptyCard}><Feather name="alert-triangle" size={28} color="#D97706" /><Text style={styles.emptyTitle}>Records unavailable</Text><Text style={styles.emptyText}>{error}</Text></View>
        ) : assignments.length === 0 ? (
          <View style={styles.emptyCard}><Feather name="users" size={30} color="#CBD5E1" /><Text style={styles.emptyTitle}>No matching administrators</Text><Text style={styles.emptyText}>Add a mobile number or change your search.</Text></View>
        ) : assignments.map((item) => {
          const tone = statusTone(item.status);
          const actionDisabled = item.isPrimary || submitting;
          return (
            <View key={item.id} style={styles.assignmentCard}>
              <View style={styles.assignmentTop}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>
                <View style={styles.assignmentCopy}>
                  <View style={styles.nameRow}><Text style={styles.assignmentName} numberOfLines={1}>{item.name}</Text>{item.isPrimary ? <View style={styles.primaryPill}><Feather name="shield" size={10} color="#7C3AED" /><Text style={styles.primaryPillText}>Primary</Text></View> : null}</View>
                  <Text style={styles.assignmentMobile}>+91 {item.mobile}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}><Feather name={tone.icon} size={12} color={tone.text} /><Text style={[styles.statusText, { color: tone.text }]}>{item.status}</Text></View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}><Text style={styles.metaLabel}>Last login</Text><Text style={styles.metaValue}>{readableDate(item.lastLoginAt)}</Text></View>
                <View style={styles.metaItem}><Text style={styles.metaLabel}>Added by</Text><Text style={styles.metaValue}>{item.addedByName || (item.source === "environment" ? "System setup" : "Migration")}</Text></View>
                <View style={styles.metaItem}><Text style={styles.metaLabel}>Created</Text><Text style={styles.metaValue}>{readableDate(item.createdAt)}</Text></View>
                <View style={styles.metaItem}><Text style={styles.metaLabel}>Signed in before</Text><Text style={styles.metaValue}>{item.hasLoggedIn ? "Yes" : "No"}</Text></View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, item.isPrimary && styles.actionDisabled]}
                  disabled={actionDisabled}
                  onPress={() => openAction({ kind: "status", item, nextStatus: item.status === "active" ? "inactive" : "active" })}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: actionDisabled }}
                >
                  <Feather name={item.status === "active" ? "pause" : "play"} size={14} color={item.isPrimary ? "#94A3B8" : item.status === "active" ? "#D97706" : GREEN} />
                  <Text style={[styles.actionText, { color: item.isPrimary ? "#94A3B8" : item.status === "active" ? "#D97706" : GREEN }]}>{item.status === "active" ? "Deactivate" : "Activate"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, item.isPrimary && styles.actionDisabled]}
                  disabled={actionDisabled}
                  onPress={() => openAction({ kind: "remove", item })}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: actionDisabled }}
                >
                  <Feather name="trash-2" size={14} color={item.isPrimary ? "#94A3B8" : "#DC2626"} />
                  <Text style={[styles.actionText, { color: item.isPrimary ? "#94A3B8" : "#DC2626" }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Role Audit Logs</Text><Text style={styles.sectionSub}>Recent privileged access changes</Text></View></View>
        <View style={styles.auditCard}>
          {auditLogs.length === 0 ? <Text style={styles.emptyText}>No role changes have been recorded yet.</Text> : auditLogs.map((log) => (
            <View key={String(log.id)} style={styles.auditRow}>
              <View style={styles.auditDot}><Feather name="activity" size={13} color={GREEN} /></View>
              <View style={styles.auditCopy}><Text style={styles.auditAction}>{String(log.action || "Role updated").replace(/_/g, " ")}</Text><Text style={styles.auditMeta}>{log.actor_name || "System"} · {log.target_name || log.target_phone || "Role record"}</Text><Text style={styles.auditTime}>{readableDate(log.created_at)}</Text></View>
            </View>
          ))}
        </View>
      </AppScrollView>

      <ConfirmActionModal
        visible={!!pendingAction}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel="Cancel"
        icon={confirmIcon}
        confirmIcon={confirmIcon}
        tone={pendingAction && (pendingAction.kind === "remove" || (pendingAction.kind === "status" && pendingAction.nextStatus === "inactive")) ? "danger" : "primary"}
        busy={submitting}
        errorMessage={actionError}
        onCancel={closeAction}
        onConfirm={runPendingAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, root: { flex: 1, backgroundColor: "#F1F5F9" },
  header: { paddingBottom: 24 }, headerInner: { paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 }, headerEyebrow: { fontSize: 9.5, color: "#BBF7D0", fontFamily: "Inter_700Bold", letterSpacing: 1 }, headerTitle: { fontSize: 22, color: "white", fontFamily: "Inter_700Bold", marginTop: 2 }, headerSub: { fontSize: 11, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 2 },
  headerIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, paddingTop: 16 }, statsRow: { flexDirection: "row", gap: 9, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: "white", borderRadius: 17, padding: 11, alignItems: "center", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }, statIcon: { width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 6 }, statValue: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold" }, statLabel: { fontSize: 9.5, color: "#64748B", fontFamily: "Inter_500Medium" },
  noticeBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 15, padding: 12, marginBottom: 14 }, noticeText: { flex: 1, fontSize: 11.5, lineHeight: 17, color: "#166534", fontFamily: "Inter_500Medium" },
  card: { backgroundColor: "white", borderRadius: 22, padding: 16, marginBottom: 20, shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 }, cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 }, cardHeaderIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }, cardHeaderCopy: { flex: 1 }, cardTitle: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_700Bold" }, cardSub: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  label: { fontSize: 11.5, color: "#334155", fontFamily: "Inter_700Bold", marginTop: 10, marginBottom: 7 }, inputShell: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 }, prefix: { color: "#475569", fontSize: 13, fontFamily: "Inter_700Bold" }, input: { flex: 1, fontSize: 13.5, color: "#0F172A", fontFamily: "Inter_600SemiBold", paddingVertical: 0 }, addButton: { minHeight: 51, borderRadius: 16, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }, addButtonText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" }, disabled: { opacity: 0.6 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 2 }, sectionTitle: { fontSize: 15.5, color: "#0F172A", fontFamily: "Inter_700Bold" }, sectionSub: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 }, refreshButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  searchShell: { minHeight: 49, borderRadius: 16, backgroundColor: "white", flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, marginBottom: 11, borderWidth: 1, borderColor: "#E2E8F0" }, searchInput: { flex: 1, fontSize: 13, color: "#0F172A", fontFamily: "Inter_500Medium", paddingVertical: 0 },
  emptyCard: { backgroundColor: "white", borderRadius: 20, padding: 25, alignItems: "center", gap: 7, marginBottom: 18 }, emptyTitle: { fontSize: 14, color: "#334155", fontFamily: "Inter_700Bold", textAlign: "center" }, emptyText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16 },
  assignmentCard: { backgroundColor: "white", borderRadius: 20, padding: 14, marginBottom: 10, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }, assignmentTop: { flexDirection: "row", alignItems: "center" }, avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }, avatarText: { fontSize: 17, color: "#15803D", fontFamily: "Inter_700Bold" }, assignmentCopy: { flex: 1, minWidth: 0 }, nameRow: { flexDirection: "row", alignItems: "center", gap: 6 }, assignmentName: { maxWidth: "72%", fontSize: 13.5, color: "#0F172A", fontFamily: "Inter_700Bold" }, assignmentMobile: { fontSize: 11, color: "#64748B", fontFamily: "Inter_500Medium", marginTop: 3 }, primaryPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F3E8FF", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3 }, primaryPillText: { fontSize: 8.5, color: "#7C3AED", fontFamily: "Inter_700Bold" }, statusPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 }, statusText: { fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" }, metaItem: { flexBasis: "47%", flexGrow: 1 }, metaLabel: { fontSize: 8.5, color: "#94A3B8", fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.3 }, metaValue: { fontSize: 10.5, color: "#475569", fontFamily: "Inter_500Medium", marginTop: 2 }, actionRow: { flexDirection: "row", gap: 8, marginTop: 13 }, actionButton: { flex: 1, minHeight: 39, borderRadius: 13, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, actionDisabled: { backgroundColor: "#F8FAFC", opacity: 0.65 }, actionText: { fontSize: 10.5, fontFamily: "Inter_700Bold" },
  auditCard: { backgroundColor: "white", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 }, auditRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }, auditDot: { width: 31, height: 31, borderRadius: 11, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }, auditCopy: { flex: 1 }, auditAction: { fontSize: 11.5, color: "#0F172A", fontFamily: "Inter_700Bold", textTransform: "capitalize" }, auditMeta: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 }, auditTime: { fontSize: 9.5, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 2 },
});
