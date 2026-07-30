import React, { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AppScrollView } from "@/components/AppScrollView";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import { useComplaints } from "@/context/ComplaintContext";
import { NagarsevakAccessStatus, NagarsevakAssignment, useNagarsevakAssignments } from "@/hooks/useNagarsevakAssignments";
import { getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const DARK_GREEN = "#052E16";
type Filter = "all" | NagarsevakAccessStatus;
type PendingOfficerAction = { item: NagarsevakAssignment; status: NagarsevakAccessStatus } | null;

function dateLabel(value?: string | null) {
  if (!value) return "Not signed in";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not signed in" : date.toLocaleDateString();
}

function statusColors(status: NagarsevakAccessStatus) {
  if (status === "active") return { bg: "#DCFCE7", text: "#15803D" };
  if (status === "inactive") return { bg: "#FEF3C7", text: "#B45309" };
  return { bg: "#FEE2E2", text: "#B91C1C" };
}

export default function NagarsevakManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { complaints } = useComplaints();
  const { assignments, loading, error, refetch, updateStatus, assignWard } = useNagarsevakAssignments();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [updating, setUpdating] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingOfficerAction>(null);
  const [actionError, setActionError] = useState("");
  const [wardTarget, setWardTarget] = useState<NagarsevakAssignment | null>(null);
  const [selectedWard, setSelectedWard] = useState("");
  const [wardSaving, setWardSaving] = useState(false);
  const [wardError, setWardError] = useState("");

  const records = useMemo(
    () => assignments.filter((item) => filter === "all" || item.status === filter),
    [assignments, filter],
  );
  const uniqueWards = useMemo(() => new Set(assignments.map((item) => item.wardCode).filter(Boolean)).size, [assignments]);
  const signedInCount = assignments.filter((item) => item.hasLoggedIn).length;

  const wardStats = (item: NagarsevakAssignment) => {
    if (!item.wardCode) return { total: 0, pending: 0, resolved: 0 };
    const wardName = `Ward ${item.wardCode}`;
    const wardComplaints = complaints.filter(
      (complaint) => complaint.ward === wardName || String(complaint.wardCode || "") === item.wardCode,
    );
    return {
      total: wardComplaints.length,
      pending: wardComplaints.filter((complaint) => ["submitted", "assigned", "in_progress"].includes(complaint.status)).length,
      resolved: wardComplaints.filter((complaint) => complaint.status === "resolved").length,
    };
  };

  const openAction = (action: Exclude<PendingOfficerAction, null>) => {
    setActionError("");
    setPendingAction(action);
  };

  const closeAction = () => {
    if (updating) return;
    setActionError("");
    setPendingAction(null);
  };

  const runPendingAction = async () => {
    if (!pendingAction || updating) return;
    const action = pendingAction;
    setUpdating(action.item.id);
    setActionError("");
    try {
      await updateStatus(action.item.id, action.status);
      await refetch(search);
      setPendingAction(null);
    } catch (requestError) {
      setActionError(getUserErrorMessage(requestError, "Nagarsevak access could not be updated."));
    } finally {
      setUpdating("");
    }
  };

  const openWardPicker = (item: NagarsevakAssignment) => {
    setWardTarget(item);
    setSelectedWard(item.wardCode || "");
    setWardError("");
  };

  const closeWardPicker = () => {
    if (wardSaving) return;
    setWardTarget(null);
    setSelectedWard("");
    setWardError("");
  };

  const saveWard = async () => {
    if (!wardTarget || !selectedWard || wardSaving) return;
    setWardSaving(true);
    setWardError("");
    try {
      await assignWard(wardTarget.id, selectedWard);
      await refetch(search);
      closeWardPicker();
    } catch (requestError) {
      setWardError(getUserErrorMessage(requestError, "Ward could not be assigned."));
    } finally {
      setWardSaving(false);
    }
  };

  const confirmTitle = !pendingAction
    ? ""
    : pendingAction.status === "active"
      ? "Activate Nagarsevak access?"
      : pendingAction.status === "inactive"
        ? "Deactivate Nagarsevak access?"
        : "Revoke Nagarsevak access?";

  const confirmMessage = !pendingAction
    ? ""
    : pendingAction.status === "active"
      ? `${pendingAction.item.name} will be allowed to use the Nagarsevak dashboard.`
      : pendingAction.status === "inactive"
        ? `${pendingAction.item.name} will temporarily lose Nagarsevak dashboard access.`
        : `${pendingAction.item.name} will lose Nagarsevak authorization.`;

  const confirmLabel = !pendingAction
    ? "Confirm"
    : pendingAction.status === "active"
      ? "Activate"
      : pendingAction.status === "inactive"
        ? "Deactivate"
        : "Revoke access";

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[DARK_GREEN, "#166534", GREEN]}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 12 }]}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>AUTHORIZED ROLE DIRECTORY</Text>
            <Text style={styles.title}>Nagarsevak Management</Text>
            <Text style={styles.subtitle}>Manage access and assign wards</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/super-admin/officer/new" as any)}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel="Add Nagarsevak"
          >
            <Feather name="user-plus" size={19} color={GREEN} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: "Records", value: assignments.length },
            { label: "In Progress", value: assignments.filter((item) => item.status === "active").length },
            { label: "Wards", value: uniqueWards },
            { label: "Signed in", value: signedInCount },
          ].map((item, index) => (
            <View key={item.label} style={styles.statItem}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
              {index < 3 ? <View style={styles.statDivider} /> : null}
            </View>
          ))}
        </View>
      </LinearGradient>

      <AppScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        onAppRefresh={() => refetch(search)}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchShell}>
          <Feather name="search" size={17} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              if (!value) void refetch();
            }}
            onSubmitEditing={() => void refetch(search)}
            placeholder="Search name, mobile or ward"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(""); void refetch(); }} accessibilityLabel="Clear search">
              <Feather name="x-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filters}>
          {(["all", "active", "inactive", "revoked"] as Filter[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.filterButton, filter === item && styles.filterActive]}
              onPress={() => setFilter(item)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{filter === "all" ? "All role records" : `${filter.charAt(0).toUpperCase()}${filter.slice(1)} records`} ({records.length})</Text>
          <TouchableOpacity onPress={() => void refetch(search)} accessibilityLabel="Refresh Nagarsevak records">
            <Feather name="refresh-cw" size={17} color={GREEN} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={GREEN} /><Text style={styles.emptyText}>Loading records…</Text></View>
        ) : error ? (
          <View style={styles.empty}><Feather name="alert-triangle" size={28} color="#D97706" /><Text style={styles.emptyTitle}>Records unavailable</Text><Text style={styles.emptyText}>{error}</Text></View>
        ) : records.length === 0 ? (
          <View style={styles.empty}><Feather name="users" size={30} color="#CBD5E1" /><Text style={styles.emptyTitle}>No matching records</Text></View>
        ) : records.map((item) => {
          const tone = statusColors(item.status);
          const stats = wardStats(item);
          const isUpdating = updating === item.id;
          const actionsDisabled = !!updating;
          return (
            <View key={item.id} style={styles.officerCard}>
              <View style={styles.officerTop}>
                <View style={styles.serialBadge}><Text style={styles.serialText}>{item.sourceSerial || item.name.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.officerName}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <Feather name="phone" size={11} color="#64748B" />
                    <Text style={styles.metaText}>+91 {item.mobile}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.statusText, { color: tone.text }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.assignmentRow}>
                <View style={styles.assignmentIcon}><Feather name="map-pin" size={15} color={item.wardCode ? GREEN : "#D97706"} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignmentLabel}>ASSIGNED WARD</Text>
                  <Text style={styles.assignmentValue}>{item.wardCode ? `Ward ${item.wardCode}` : "Not assigned"}</Text>
                  {item.wardOrDesignation && item.wardOrDesignation !== "Not assigned" ? (
                    <Text style={styles.designationText} numberOfLines={1}>{item.wardOrDesignation}</Text>
                  ) : null}
                </View>
                {item.status !== "revoked" ? (
                  <TouchableOpacity style={styles.assignWardButton} onPress={() => openWardPicker(item)} activeOpacity={0.82}>
                    <Feather name="edit-2" size={13} color={GREEN} />
                    <Text style={styles.assignWardText}>{item.wardCode ? "Change" : "Assign"}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.infoStrip}>
                <View style={styles.infoItem}><Text style={styles.infoValue}>{item.hasLoggedIn ? "Linked" : "Waiting"}</Text><Text style={styles.infoLabel}>Account</Text></View>
                <View style={styles.infoItem}><Text style={styles.infoValue}>{dateLabel(item.lastLoginAt)}</Text><Text style={styles.infoLabel}>Last login</Text></View>
                <View style={styles.infoItem}><Text style={styles.infoValue}>{item.source === "official_nagarsevak_pdf" ? "Official" : "Admin"}</Text><Text style={styles.infoLabel}>Source</Text></View>
              </View>

              {item.wardCode ? (
                <View style={styles.complaintStrip}>
                  {[
                    { label: "Complaints", value: stats.total, color: "#2563EB" },
                    { label: "Open", value: stats.pending, color: "#D97706" },
                    { label: "Resolved", value: stats.resolved, color: "#059669" },
                  ].map((stat) => (
                    <View key={stat.label} style={styles.complaintItem}>
                      <Text style={[styles.complaintValue, { color: stat.color }]}>{stat.value}</Text>
                      <Text style={styles.complaintLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.actions}>
                {isUpdating ? <ActivityIndicator color={GREEN} style={{ flex: 1 }} /> : (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, actionsDisabled && { opacity: 0.5 }]}
                      disabled={actionsDisabled}
                      onPress={() => openAction({ item, status: item.status === "active" ? "inactive" : "active" })}
                    >
                      <Feather name={item.status === "active" ? "pause" : "play"} size={14} color={item.status === "active" ? "#D97706" : GREEN} />
                      <Text style={[styles.actionText, { color: item.status === "active" ? "#D97706" : GREEN }]}>{item.status === "active" ? "Deactivate" : "Activate"}</Text>
                    </TouchableOpacity>
                    {item.status !== "revoked" ? (
                      <TouchableOpacity style={styles.actionButton} disabled={actionsDisabled} onPress={() => openAction({ item, status: "revoked" })}>
                        <Feather name="user-x" size={14} color="#DC2626" />
                        <Text style={[styles.actionText, { color: "#DC2626" }]}>Revoke</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          );
        })}
      </AppScrollView>

      <ConfirmActionModal
        visible={!!pendingAction}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel="Cancel"
        icon={pendingAction?.status === "active" ? "user-check" : pendingAction?.status === "inactive" ? "pause-circle" : "user-x"}
        confirmIcon={pendingAction?.status === "active" ? "user-check" : pendingAction?.status === "inactive" ? "pause-circle" : "user-x"}
        tone={pendingAction?.status === "active" ? "primary" : "danger"}
        busy={!!updating}
        errorMessage={actionError}
        onCancel={closeAction}
        onConfirm={runPendingAction}
      />

      <Modal visible={!!wardTarget} transparent animationType="slide" onRequestClose={closeWardPicker}>
        <View style={styles.modalOverlay}>
          <View style={[styles.wardSheet, { paddingBottom: Math.max(insets.bottom, 12) + 18 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{wardTarget?.wardCode ? "Change Ward" : "Assign Ward"}</Text>
                <Text style={styles.sheetSubtitle}>{wardTarget?.name}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={closeWardPicker}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity>
            </View>

            <AppScrollView style={{ maxHeight: 380 }} contentContainerStyle={styles.wardGrid} showsVerticalScrollIndicator={false}>
              {Array.from({ length: 29 }, (_, index) => String(index + 1)).map((ward) => {
                const selected = selectedWard === ward;
                return (
                  <TouchableOpacity key={ward} style={[styles.wardButton, selected && styles.wardButtonSelected]} onPress={() => setSelectedWard(ward)} activeOpacity={0.8}>
                    <Text style={[styles.wardButtonText, selected && styles.wardButtonTextSelected]}>Ward {ward}</Text>
                  </TouchableOpacity>
                );
              })}
            </AppScrollView>

            {wardError ? <Text style={styles.wardError}>{wardError}</Text> : null}
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeWardPicker} disabled={wardSaving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, (!selectedWard || wardSaving) && { opacity: 0.55 }]} onPress={saveWard} disabled={!selectedWard || wardSaving}>
                {wardSaving ? <ActivityIndicator color="white" /> : <><Feather name="check" size={16} color="white" /><Text style={styles.saveText}>Save Ward</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  header: { paddingHorizontal: 12, paddingBottom: 16 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  eyebrow: { color: "#86EFAC", fontSize: 9.5, letterSpacing: 1.2, fontFamily: "Inter_700Bold" },
  title: { color: "white", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  subtitle: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  addButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  statsRow: { marginTop: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", flexDirection: "row", paddingVertical: 10 },
  statItem: { flex: 1, alignItems: "center", position: "relative" },
  statValue: { color: "white", fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.68)", fontSize: 8.5, fontFamily: "Inter_500Medium", marginTop: 1 },
  statDivider: { position: "absolute", right: 0, top: 4, bottom: 4, width: 1, backgroundColor: "rgba(255,255,255,0.18)" },
  content: { padding: 10 },
  searchShell: { minHeight: 48, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9 },
  searchInput: { flex: 1, color: "#0F172A", fontSize: 13, fontFamily: "Inter_500Medium" },
  filters: { flexDirection: "row", gap: 7, marginTop: 10 },
  filterButton: { flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  filterActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { color: "#64748B", fontSize: 10, textTransform: "capitalize", fontFamily: "Inter_700Bold" },
  filterTextActive: { color: "white" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13, marginBottom: 8, paddingHorizontal: 2 },
  sectionTitle: { color: "#334155", fontSize: 13, fontFamily: "Inter_700Bold" },
  empty: { backgroundColor: "white", borderRadius: 18, padding: 28, alignItems: "center", gap: 8 },
  emptyTitle: { color: "#334155", fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyText: { color: "#64748B", fontSize: 11.5, textAlign: "center", fontFamily: "Inter_400Regular" },
  officerCard: { backgroundColor: "white", borderRadius: 18, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  officerTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  serialBadge: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  serialText: { color: GREEN, fontSize: 13, fontFamily: "Inter_700Bold" },
  officerName: { color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaText: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_500Medium" },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 9, textTransform: "capitalize", fontFamily: "Inter_700Bold" },
  assignmentRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, padding: 11, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  assignmentIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  assignmentLabel: { color: "#94A3B8", fontSize: 8.5, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  assignmentValue: { color: "#0F172A", fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 1 },
  designationText: { color: "#64748B", fontSize: 9.5, fontFamily: "Inter_400Regular", marginTop: 1 },
  assignWardButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", flexDirection: "row", alignItems: "center", gap: 5 },
  assignWardText: { color: GREEN, fontSize: 10.5, fontFamily: "Inter_700Bold" },
  infoStrip: { flexDirection: "row", marginTop: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#F1F5F9", paddingVertical: 9 },
  infoItem: { flex: 1, alignItems: "center" },
  infoValue: { color: "#334155", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  infoLabel: { color: "#94A3B8", fontSize: 8.5, fontFamily: "Inter_500Medium", marginTop: 1 },
  complaintStrip: { flexDirection: "row", marginTop: 9, borderRadius: 12, backgroundColor: "#F8FAFC", paddingVertical: 8 },
  complaintItem: { flex: 1, alignItems: "center" },
  complaintValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  complaintLabel: { color: "#94A3B8", fontSize: 8.5, fontFamily: "Inter_500Medium" },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionButton: { flex: 1, minHeight: 40, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  actionText: { fontSize: 10.5, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.56)" },
  wardSheet: { maxHeight: "88%", backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 10 },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 10 },
  sheetTitle: { color: "#0F172A", fontSize: 19, fontFamily: "Inter_700Bold" },
  sheetSubtitle: { color: "#64748B", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  wardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 },
  wardButton: { width: "31%", minHeight: 46, borderRadius: 13, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  wardButtonSelected: { borderColor: GREEN, backgroundColor: "#DCFCE7" },
  wardButtonText: { color: "#475569", fontSize: 11, fontFamily: "Inter_700Bold" },
  wardButtonTextSelected: { color: "#15803D" },
  wardError: { color: "#DC2626", fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 12, fontFamily: "Inter_700Bold" },
  saveButton: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  saveText: { color: "white", fontSize: 12, fontFamily: "Inter_700Bold" },
});
