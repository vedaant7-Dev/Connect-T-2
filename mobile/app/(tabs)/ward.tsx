import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, User } from "@/context/AuthContext";
import { useComplaints } from "@/context/ComplaintContext";
import { wardMatchesNagarsevak } from "@/data/wards";

const GREEN = "#16A34A";
const BG = "#ebeffc";
const USERS_KEY = "janseva_users";

type CitizenSummary = User & { complaintCount: number; pendingCount: number; resolvedCount: number };

function cleanPhone(value?: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function initials(name?: string) {
  return String(name || "CT").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function NagarsevakWardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 54 : insets.top;
  const { user } = useAuth();
  const { complaints } = useComplaints();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CitizenSummary | null>(null);

  const loadUsers = async () => {
    try {
      const raw = await AsyncStorage.getItem(USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setUsers(Array.isArray(parsed) ? parsed : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const wardMembers = useMemo<CitizenSummary[]>(() => {
    const nagarsevakWard = user?.ward || "";
    const q = search.trim().toLowerCase();
    return users
      .filter((item) => item.role === "citizen")
      .filter((item) => !nagarsevakWard || wardMatchesNagarsevak(item.ward || "", nagarsevakWard))
      .map((item) => {
        const phone = cleanPhone(item.mobile);
        const userComplaints = complaints.filter((c) => cleanPhone(c.userMobile) === phone || c.userId === item.id);
        return {
          ...item,
          complaintCount: userComplaints.length,
          pendingCount: userComplaints.filter((c) => c.status === "submitted" || c.status === "assigned" || c.status === "in_progress").length,
          resolvedCount: userComplaints.filter((c) => c.status === "resolved").length,
        };
      })
      .filter((item) => {
        if (!q) return true;
        return [item.name, item.mobile, item.ward, item.address, item.email, item.id].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => b.complaintCount - a.complaintCount || String(a.name).localeCompare(String(b.name)));
  }, [users, complaints, search, user?.ward]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#166534", GREEN, "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}> 
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>WARD MEMBERS</Text>
            <Text style={styles.title}>{user?.ward || "My Ward"}</Text>
            <Text style={styles.sub}>Registered citizens and complaint activity</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadUsers} activeOpacity={0.85}>
            <Feather name="refresh-cw" size={18} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.statRow}>
          <Stat label="Members" value={wardMembers.length} icon="users" />
          <Stat label="Complaints" value={wardMembers.reduce((sum, item) => sum + item.complaintCount, 0)} icon="file-text" />
          <Stat label="Pending" value={wardMembers.reduce((sum, item) => sum + item.pendingCount, 0)} icon="clock" />
        </View>
      </LinearGradient>

      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#94A3B8" />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search member, phone, address..." placeholderTextColor="#94A3B8" style={styles.searchInput as any} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><Feather name="x" size={16} color="#94A3B8" /></TouchableOpacity>}
      </View>

      <FlatList
        data={wardMembers}
        keyExtractor={(item) => item.id || item.mobile}
        contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom, 8) + 92 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.88}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(item.name)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.memberName} numberOfLines={1}>{item.name || "Citizen"}</Text>
              <Text style={styles.memberMeta}>+91 {cleanPhone(item.mobile)} · {item.ward || "Ward not set"}</Text>
              <View style={styles.chipRow}>
                <Chip icon="file-text" text={`${item.complaintCount} complaints`} />
                <Chip icon="clock" text={`${item.pendingCount} pending`} />
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.empty}><Feather name="users" size={38} color="#CBD5E1" /><Text style={styles.emptyTitle}>No ward members found</Text><Text style={styles.emptySub}>Citizens registered in your ward will appear here.</Text></View>}
      />

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}> 
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.avatarLarge}><Text style={styles.avatarTextLarge}>{initials(selected?.name)}</Text></View>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity>
            </View>
            <Text style={styles.detailName}>{selected?.name || "Citizen"}</Text>
            <Text style={styles.detailSub}>+91 {cleanPhone(selected?.mobile)} · {selected?.ward || "Ward not set"}</Text>
            <View style={styles.detailStats}>
              <StatCard label="Total" value={selected?.complaintCount || 0} />
              <StatCard label="Pending" value={selected?.pendingCount || 0} />
              <StatCard label="Resolved" value={selected?.resolvedCount || 0} />
            </View>
            <Detail icon="map-pin" label="Address" value={selected?.address || "Not added"} />
            <Detail icon="mail" label="Email" value={selected?.email || "Not added"} />
            <Detail icon="calendar" label="DOB" value={selected?.dob || "Not added"} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: keyof typeof Feather.glyphMap }) {
  return <View style={styles.stat}><Feather name={icon} size={14} color="#DCFCE7" /><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function StatCard({ label, value }: { label: string; value: number }) { return <View style={styles.detailStat}><Text style={styles.detailStatValue}>{value}</Text><Text style={styles.detailStatLabel}>{label}</Text></View>; }
function Chip({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) { return <View style={styles.chip}><Feather name={icon} size={10} color="#16A34A" /><Text style={styles.chipText}>{text}</Text></View>; }
function Detail({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) { return <View style={styles.detailRow}><View style={styles.detailIcon}><Feather name={icon} size={15} color="#16A34A" /></View><View style={{ flex: 1 }}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  kicker: { fontSize: 10, color: "#BBF7D0", fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  title: { fontSize: 22, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900", marginTop: 3 },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 3 },
  refreshBtn: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", gap: 9 },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 10, alignItems: "center" },
  statValue: { color: "white", fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  searchBox: { margin: 14, marginBottom: 0, backgroundColor: "white", borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8, elevation: 2, shadowColor: "#166534", shadowOpacity: 0.06, shadowRadius: 8 },
  searchInput: { flex: 1, color: "#0F172A", fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 18, padding: 14, marginBottom: 10, elevation: 2, shadowColor: "#166534", shadowOpacity: 0.05, shadowRadius: 8 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#166534", fontSize: 15, fontFamily: "Inter_700Bold" },
  memberName: { color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold" },
  memberMeta: { color: "#64748B", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F0FDF4", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: "#15803D", fontSize: 10, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingTop: 70 },
  emptyTitle: { marginTop: 10, fontSize: 16, color: "#475569", fontFamily: "Inter_700Bold" },
  emptySub: { marginTop: 4, fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20 },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avatarLarge: { width: 66, height: 66, borderRadius: 24, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  avatarTextLarge: { color: "#166534", fontSize: 22, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  detailName: { marginTop: 14, fontSize: 21, color: "#0F172A", fontFamily: "Inter_700Bold" },
  detailSub: { marginTop: 3, fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular" },
  detailStats: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 12 },
  detailStat: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, alignItems: "center" },
  detailStatValue: { fontSize: 20, color: "#16A34A", fontFamily: "Inter_700Bold" },
  detailStatLabel: { fontSize: 10, color: "#64748B", fontFamily: "Inter_600SemiBold" },
  detailRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  detailIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  detailLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  detailValue: { color: "#0F172A", fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
});
