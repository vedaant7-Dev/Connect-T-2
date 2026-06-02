import React, { useMemo, useState } from "react";
import { FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppAlert, AlertPriority, AlertType, useAlerts } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";

const GREEN = "#16A34A";
const ORANGE = "#EA580C";
const BG = "#ebeffc";

type Mode = "create" | "edit";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "now";
}

export default function NagarsevakNewsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 54 : insets.top;
  const { user } = useAuth();
  const { alerts, addAlert, removeAlert } = useAlerts();
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<AlertType>("news");
  const [priority, setPriority] = useState<AlertPriority>("normal");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState(user?.ward || "");
  const [error, setError] = useState("");

  const myPosts = useMemo(() => {
    return alerts
      .filter((a) => (a.postedById && user?.id ? a.postedById === user.id : a.postedBy === user?.name))
      .filter((a) => a.type === "news" || a.type === "alert")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [alerts, user?.id, user?.name]);

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setType("news");
    setPriority("normal");
    setTitle("");
    setBody("");
    setLocation(user?.ward || "");
    setError("");
    setModal(true);
  };

  const openEdit = (item: AppAlert) => {
    setMode("edit");
    setEditingId(item.id);
    setType(item.type === "alert" ? "alert" : "news");
    setPriority(item.priority || "normal");
    setTitle(item.title);
    setBody(item.body);
    setLocation(item.location || user?.ward || "");
    setError("");
    setModal(true);
  };

  const submit = () => {
    if (title.trim().length < 3) return setError("Enter a clear title.");
    if (body.trim().length < 8) return setError("Enter a detailed message.");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (mode === "edit" && editingId) removeAlert(editingId);
    addAlert({ title: title.trim(), body: body.trim(), type, priority, category: "Ward", location: location.trim() || user?.ward, targetAudience: "Ward residents" }, user?.name || "Nagarsevak", user?.id, user?.ward);
    setModal(false);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#166534", GREEN, "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}> 
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>NEWS & ALERTS</Text>
            <Text style={styles.title}>Ward Broadcasts</Text>
            <Text style={styles.sub}>Post, edit and delete your own news/alerts</Text>
          </View>
          <TouchableOpacity style={styles.postBtn} onPress={openCreate} activeOpacity={0.86}>
            <Feather name="plus" size={18} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.statRow}>
          <Stat label="Posts" value={myPosts.length} />
          <Stat label="News" value={myPosts.filter((p) => p.type === "news").length} />
          <Stat label="Alerts" value={myPosts.filter((p) => p.type === "alert").length} />
        </View>
      </LinearGradient>

      <FlatList
        data={myPosts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom, 8) + 92 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <PostCard item={item} onEdit={() => openEdit(item)} onDelete={() => removeAlert(item.id)} />}
        ListEmptyComponent={<View style={styles.empty}><Feather name="radio" size={40} color="#CBD5E1" /><Text style={styles.emptyTitle}>No news or alerts yet</Text><Text style={styles.emptySub}>Tap + to post your first ward broadcast.</Text><TouchableOpacity style={styles.emptyBtn} onPress={openCreate}><Text style={styles.emptyBtnText}>Post News / Alert</Text></TouchableOpacity></View>}
      />

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}> 
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{mode === "edit" ? "Edit Post" : "Post News / Alert"}</Text>
              <TouchableOpacity onPress={() => setModal(false)} style={styles.closeBtn}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity>
            </View>
            <View style={styles.segmentRow}>{(["news", "alert"] as AlertType[]).map((item) => <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.segment, type === item && styles.segmentActive]}><Feather name={item === "alert" ? "alert-triangle" : "radio"} size={14} color={type === item ? "white" : GREEN} /><Text style={[styles.segmentText, type === item && styles.segmentTextActive]}>{item === "alert" ? "Alert" : "News"}</Text></TouchableOpacity>)}</View>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.chipRow}>{(["normal", "important", "urgent"] as AlertPriority[]).map((item) => <TouchableOpacity key={item} onPress={() => setPriority(item)} style={[styles.chipBtn, priority === item && styles.chipActive]}><Text style={[styles.chipBtnText, priority === item && styles.chipActiveText]}>{item}</Text></TouchableOpacity>)}</View>
            <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Water supply update" />
            <Input label="Message" value={body} onChangeText={setBody} placeholder="Write full details for citizens" multiline />
            <Input label="Area / Ward" value={location} onChangeText={setLocation} placeholder="Ward or location" />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.saveBtn} onPress={submit} activeOpacity={0.88}><LinearGradient colors={["#166534", GREEN]} style={styles.saveGrad}><Feather name="send" size={16} color="white" /><Text style={styles.saveText}>{mode === "edit" ? "Save Changes" : "Broadcast"}</Text></LinearGradient></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PostCard({ item, onEdit, onDelete }: { item: AppAlert; onEdit: () => void; onDelete: () => void }) {
  const color = item.type === "alert" ? "#DC2626" : ORANGE;
  const bg = item.type === "alert" ? "#FEE2E2" : "#FFF7ED";
  return <View style={styles.card}><View style={styles.cardTop}><View style={[styles.typePill, { backgroundColor: bg }]}><Feather name={item.type === "alert" ? "alert-triangle" : "radio"} size={11} color={color} /><Text style={[styles.typePillText, { color }]}>{item.type}</Text></View><Text style={styles.time}>{timeAgo(item.createdAt)}</Text></View><Text style={styles.postTitle}>{item.title}</Text><Text style={styles.postBody}>{item.body}</Text><View style={styles.infoRow}><Feather name="map-pin" size={12} color="#64748B" /><Text style={styles.infoText}>{item.location || item.ward || "Ward"}</Text></View><View style={styles.actionRow}><TouchableOpacity style={styles.editBtn} onPress={onEdit}><Feather name="edit-2" size={13} color="#166534" /><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.deleteBtn} onPress={onDelete}><Feather name="trash-2" size={13} color="#DC2626" /><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View></View>;
}
function Stat({ label, value }: { label: string; value: number }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, multiline, style, ...rest } = props; return <View style={styles.inputBlock}><Text style={styles.label}>{label}</Text><TextInput {...rest} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} style={[styles.input, multiline && styles.textArea, style]} placeholderTextColor="#94A3B8" /></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  kicker: { fontSize: 10, color: "#BBF7D0", fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  title: { fontSize: 22, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900", marginTop: 3 },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 3 },
  postBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", gap: 9 },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 10, alignItems: "center" },
  statValue: { color: "white", fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 14, marginBottom: 11, elevation: 2, shadowColor: "#166534", shadowOpacity: 0.06, shadowRadius: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  typePill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  typePillText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  time: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_600SemiBold" },
  postTitle: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_700Bold" },
  postBody: { marginTop: 6, fontSize: 13, lineHeight: 19, color: "#475569", fontFamily: "Inter_400Regular" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
  infoText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  editBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F0FDF4", borderRadius: 12, paddingVertical: 10 },
  editText: { color: "#166534", fontSize: 12, fontFamily: "Inter_700Bold" },
  deleteBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FEF2F2", borderRadius: 12, paddingVertical: 10 },
  deleteText: { color: "#DC2626", fontSize: 12, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingTop: 70, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 10, fontSize: 16, color: "#475569", fontFamily: "Inter_700Bold" },
  emptySub: { marginTop: 4, fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { marginTop: 14, backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11 },
  emptyBtnText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18 },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 14 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold" },
  closeBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  segmentActive: { backgroundColor: GREEN, borderColor: GREEN },
  segmentText: { color: GREEN, fontSize: 13, fontFamily: "Inter_700Bold" },
  segmentTextActive: { color: "white" },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  chipBtn: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  chipBtnText: { color: "#64748B", fontSize: 11, fontFamily: "Inter_700Bold" },
  chipActiveText: { color: "#166534" },
  inputBlock: { marginBottom: 11 },
  label: { fontSize: 11, color: "#334155", fontFamily: "Inter_700Bold", marginBottom: 6 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", color: "#0F172A", paddingHorizontal: 13, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  textArea: { minHeight: 92, paddingTop: 12 },
  error: { color: "#DC2626", fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
  saveBtn: { borderRadius: 16, overflow: "hidden" },
  saveGrad: { minHeight: 52, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  saveText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
});
