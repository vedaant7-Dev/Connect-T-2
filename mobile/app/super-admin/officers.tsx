import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AppScrollView } from "@/components/AppScrollView";
import { useComplaints } from "@/context/ComplaintContext";
import { NagarsevakAccessStatus, NagarsevakAssignment, useNagarsevakAssignments } from "@/hooks/useNagarsevakAssignments";
import { getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
type Filter = "all" | NagarsevakAccessStatus;

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
  const { assignments, loading, error, refetch, updateStatus } = useNagarsevakAssignments();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [updating, setUpdating] = useState("");
  const [notice, setNotice] = useState("");

  const records = useMemo(() => assignments.filter((item) => filter === "all" || item.status === filter), [assignments, filter]);
  const uniqueWards = useMemo(() => new Set(assignments.map((item) => item.wardCode).filter(Boolean)).size, [assignments]);
  const signedInCount = assignments.filter((item) => item.hasLoggedIn).length;

  const wardStats = (item: NagarsevakAssignment) => {
    if (!item.wardCode) return { total: 0, pending: 0, resolved: 0 };
    const wardName = `Ward ${item.wardCode}`;
    const wardComplaints = complaints.filter((complaint) => complaint.ward === wardName || complaint.wardCode === item.wardCode);
    return {
      total: wardComplaints.length,
      pending: wardComplaints.filter((complaint) => ["submitted", "assigned", "in_progress"].includes(complaint.status)).length,
      resolved: wardComplaints.filter((complaint) => complaint.status === "resolved").length,
    };
  };

  const changeStatus = (item: NagarsevakAssignment, status: NagarsevakAccessStatus) => {
    Alert.alert(
      status === "active" ? "Activate Nagarsevak access?" : status === "inactive" ? "Deactivate Nagarsevak access?" : "Revoke Nagarsevak access?",
      `${item.name} will ${status === "active" ? "receive" : "no longer receive"} Nagarsevak access after this change.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "active" ? "Activate" : status === "inactive" ? "Deactivate" : "Revoke",
          style: status === "active" ? "default" : "destructive",
          onPress: async () => {
            setUpdating(item.id);
            setNotice("");
            try {
              await updateStatus(item.id, status);
              setNotice("Nagarsevak access updated successfully.");
            } catch (requestError) {
              setNotice(getUserErrorMessage(requestError, "Nagarsevak access could not be updated."));
            } finally {
              setUpdating("");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 12 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>AUTHORIZED ROLE DIRECTORY</Text>
            <Text style={styles.title}>Nagarsevak Management</Text>
            <Text style={styles.subtitle}>Official roster, access status and first-login linking</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push("/super-admin/officer/new" as any)} activeOpacity={0.84}>
            <Feather name="user-plus" size={19} color={GREEN} />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          {[
            { label: "Official records", value: assignments.length },
            { label: "Active", value: assignments.filter((item) => item.status === "active").length },
            { label: "Wards", value: uniqueWards },
            { label: "Signed in", value: signedInCount },
          ].map((item, index) => (
            <View key={item.label} style={styles.statItem}>
              <Text style={styles.statValue}>{item.value}</Text><Text style={styles.statLabel}>{item.label}</Text>
              {index < 3 ? <View style={styles.statDivider} /> : null}
            </View>
          ))}
        </View>
      </LinearGradient>

      <AppScrollView style={styles.flex} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} onAppRefresh={() => refetch(search)} showsVerticalScrollIndicator={false}>
        {notice ? <View style={styles.notice}><Feather name="info" size={15} color="#166534" /><Text style={styles.noticeText}>{notice}</Text><TouchableOpacity onPress={() => setNotice("")}><Feather name="x" size={15} color="#64748B" /></TouchableOpacity></View> : null}

        <View style={styles.searchShell}>
          <Feather name="search" size={17} color="#94A3B8" />
          <TextInput value={search} onChangeText={(value) => { setSearch(value); if (!value) void refetch(); }} onSubmitEditing={() => void refetch(search)} placeholder="Search English name, mobile or designation" placeholderTextColor="#94A3B8" style={styles.searchInput} returnKeyType="search" />
          {search ? <TouchableOpacity onPress={() => { setSearch(""); void refetch(); }}><Feather name="x-circle" size={17} color="#94A3B8" /></TouchableOpacity> : null}
        </View>

        <View style={styles.filters}>
          {(["all", "active", "inactive", "revoked"] as Filter[]).map((item) => (
            <TouchableOpacity key={item} style={[styles.filterButton, filter === item && styles.filterActive]} onPress={() => setFilter(item)} activeOpacity={0.8}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{filter === "all" ? "All role records" : `${filter.charAt(0).toUpperCase()}${filter.slice(1)} records`} ({records.length})</Text><TouchableOpacity onPress={() => void refetch(search)}><Feather name="refresh-cw" size={16} color={GREEN} /></TouchableOpacity></View>

        {loading ? <View style={styles.empty}><ActivityIndicator color={GREEN} /><Text style={styles.emptyText}>Loading official roster…</Text></View> : error ? <View style={styles.empty}><Feather name="alert-triangle" size={28} color="#D97706" /><Text style={styles.emptyTitle}>Roster unavailable</Text><Text style={styles.emptyText}>{error}</Text></View> : records.length === 0 ? <View style={styles.empty}><Feather name="users" size={30} color="#CBD5E1" /><Text style={styles.emptyTitle}>No matching records</Text><Text style={styles.emptyText}>Change the status filter or search.</Text></View> : records.map((item) => {
          const tone = statusColors(item.status);
          const stats = wardStats(item);
          const isUpdating = updating === item.id;
          return (
            <View key={item.id} style={styles.officerCard}>
              <View style={styles.officerTop}>
                <View style={styles.serialBadge}><Text style={styles.serialText}>{item.sourceSerial || item.name.charAt(0)}</Text></View>
                <View style={styles.officerCopy}>
                  <Text style={styles.officerName}>{item.name}</Text>
                  <View style={styles.metaRow}><Feather name="phone" size={11} color="#64748B" /><Text style={styles.metaText}>+91 {item.mobile}</Text><Text style={styles.metaDot}>•</Text><Text style={styles.designation}>{item.wardOrDesignation}</Text></View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}><Text style={[styles.statusText, { color: tone.text }]}>{item.status}</Text></View>
              </View>

              <View style={styles.infoStrip}>
                <View style={styles.infoItem}><Text style={styles.infoValue}>{item.hasLoggedIn ? "Linked" : "Waiting"}</Text><Text style={styles.infoLabel}>Account</Text></View>
                <View style={styles.infoItem}><Text style={styles.infoValue}>{dateLabel(item.lastLoginAt)}</Text><Text style={styles.infoLabel}>Last login</Text></View>
                <View style={styles.infoItem}><Text style={styles.infoValue}>{item.source === "official_nagarsevak_pdf" ? "Official PDF" : "Admin"}</Text><Text style={styles.infoLabel}>Source</Text></View>
              </View>

              {item.wardCode ? <View style={styles.complaintStrip}>{[{ label: "Complaints", value: stats.total, color: "#2563EB" }, { label: "Open", value: stats.pending, color: "#D97706" }, { label: "Resolved", value: stats.resolved, color: "#059669" }].map((stat) => <View key={stat.label} style={styles.complaintItem}><Text style={[styles.complaintValue, { color: stat.color }]}>{stat.value}</Text><Text style={styles.complaintLabel}>{stat.label}</Text></View>)}</View> : null}

              <View style={styles.actions}>
                {isUpdating ? <ActivityIndicator color={GREEN} style={styles.loadingAction} /> : (
                  <>
                    <TouchableOpacity style={styles.actionButton} onPress={() => changeStatus(item, item.status === "active" ? "inactive" : "active")}><Feather name={item.status === "active" ? "pause" : "play"} size={14} color={item.status === "active" ? "#D97706" : GREEN} /><Text style={[styles.actionText, { color: item.status === "active" ? "#D97706" : GREEN }]}>{item.status === "active" ? "Deactivate" : "Activate"}</Text></TouchableOpacity>
                    {item.status !== "revoked" ? <TouchableOpacity style={styles.actionButton} onPress={() => changeStatus(item, "revoked")}><Feather name="user-x" size={14} color="#DC2626" /><Text style={[styles.actionText, { color: "#DC2626" }]}>Revoke</Text></TouchableOpacity> : null}
                  </>
                )}
              </View>
            </View>
          );
        })}
      </AppScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, root: { flex: 1, backgroundColor: "#F1F5F9" }, header: { paddingHorizontal: 18, paddingBottom: 18 }, headerTop: { flexDirection: "row", alignItems: "center" }, headerCopy: { flex: 1 }, eyebrow: { fontSize: 9, color: "#BBF7D0", fontFamily: "Inter_700Bold", letterSpacing: 1.1 }, title: { fontSize: 21, color: "white", fontFamily: "Inter_700Bold", marginTop: 3 }, subtitle: { fontSize: 10.5, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 3 }, addButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 17, paddingVertical: 12, marginTop: 16 }, statItem: { flex: 1, alignItems: "center" }, statValue: { fontSize: 17, color: "white", fontFamily: "Inter_700Bold" }, statLabel: { fontSize: 8.5, color: "rgba(255,255,255,0.62)", fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" }, statDivider: { position: "absolute", right: 0, height: "80%", top: "10%", width: 1, backgroundColor: "rgba(255,255,255,0.13)" },
  content: { padding: 15 }, notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 14, padding: 11, marginBottom: 11 }, noticeText: { flex: 1, fontSize: 11, color: "#166534", lineHeight: 16, fontFamily: "Inter_500Medium" }, searchShell: { minHeight: 49, backgroundColor: "white", borderRadius: 16, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: "#E2E8F0" }, searchInput: { flex: 1, fontSize: 12.5, color: "#0F172A", fontFamily: "Inter_500Medium", paddingVertical: 0 }, filters: { flexDirection: "row", gap: 7, marginVertical: 12 }, filterButton: { flex: 1, minHeight: 37, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" }, filterActive: { backgroundColor: GREEN, borderColor: GREEN }, filterText: { fontSize: 9.5, color: "#64748B", fontFamily: "Inter_700Bold", textTransform: "capitalize" }, filterTextActive: { color: "white" }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9, paddingHorizontal: 2 }, sectionTitle: { fontSize: 13.5, color: "#334155", fontFamily: "Inter_700Bold" },
  empty: { backgroundColor: "white", borderRadius: 20, padding: 27, alignItems: "center", gap: 7 }, emptyTitle: { fontSize: 14, color: "#334155", fontFamily: "Inter_700Bold" }, emptyText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center" }, officerCard: { backgroundColor: "white", borderRadius: 19, padding: 14, marginBottom: 10, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }, officerTop: { flexDirection: "row", alignItems: "center" }, serialBadge: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }, serialText: { fontSize: 14, color: "#15803D", fontFamily: "Inter_700Bold" }, officerCopy: { flex: 1, minWidth: 0 }, officerName: { fontSize: 13, color: "#0F172A", fontFamily: "Inter_700Bold" }, metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 4 }, metaText: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_500Medium" }, metaDot: { fontSize: 10, color: "#CBD5E1" }, designation: { fontSize: 10.5, color: GREEN, fontFamily: "Inter_700Bold" }, statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 }, statusText: { fontSize: 8.5, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  infoStrip: { flexDirection: "row", marginTop: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#F1F5F9" }, infoItem: { flex: 1, alignItems: "center" }, infoValue: { fontSize: 9.5, color: "#334155", fontFamily: "Inter_700Bold", textAlign: "center" }, infoLabel: { fontSize: 8.5, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 2 }, complaintStrip: { flexDirection: "row", gap: 7, marginTop: 10 }, complaintItem: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 11, paddingVertical: 7, alignItems: "center" }, complaintValue: { fontSize: 13, fontFamily: "Inter_700Bold" }, complaintLabel: { fontSize: 8.5, color: "#64748B", fontFamily: "Inter_400Regular" }, actions: { flexDirection: "row", gap: 8, marginTop: 11 }, actionButton: { flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, actionText: { fontSize: 10, fontFamily: "Inter_700Bold" }, loadingAction: { flex: 1, height: 38 },
});
