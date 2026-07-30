import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, Platform, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { apiDelete, apiGet, apiPatch, apiPost, getUserErrorMessage } from "@/lib/api";
import { uploadBroadcastForm } from "@/lib/broadcastUpload";
import BroadcastMediaPicker from "@/components/BroadcastMediaPicker";
import type { BroadcastMediaUpload } from "@/context/BroadcastContext";
import ComplaintMediaViewer from "@/components/ComplaintMediaViewer";

const GREEN = "#16A34A";
const TYPES = [
  { id: "message", label: "Message", icon: "message-circle", color: "#2563EB", bg: "#DBEAFE" },
  { id: "notice", label: "Notice", icon: "file-text", color: "#D97706", bg: "#FEF3C7" },
  { id: "information", label: "Information", icon: "info", color: "#7C3AED", bg: "#EDE9FE" },
  { id: "announcement", label: "Announcement", icon: "radio", color: "#059669", bg: "#D1FAE5" },
];

type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "super_admin" | "nagarsevak";
  ward?: string;
  type: string;
  message?: string;
  mediaUri?: string;
  mediaType?: "image" | "video";
  mediaFileName?: string;
  createdAt: string;
  updatedAt?: string;
};

function timeLabel(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export default function NagarsevakCommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 50 : insets.top;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityPost | null>(null);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("message");
  const [media, setMedia] = useState<BroadcastMediaUpload | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "super_admin" || !!user?.isSuperAdmin;
  const allowed = isAdmin || user?.role === "nagarsevak";

  const loadPosts = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      const result = await apiGet<any>("/api/nagarsevak-community?limit=50");
      setPosts(result.posts || []);
      setError("");
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "Community could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const openCreate = () => {
    setEditing(null);
    setMessage("");
    setType("message");
    setMedia(null);
    setComposerOpen(true);
  };

  const openEdit = (post: CommunityPost) => {
    setEditing(post);
    setMessage(post.message || "");
    setType(post.type || "message");
    setMedia(null);
    setComposerOpen(true);
  };

  const submit = async () => {
    if (!message.trim() && !media) {
      setError("Add a message, image or video.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const result = await apiPatch<any>(`/api/nagarsevak-community/${encodeURIComponent(editing.id)}`, { message: message.trim(), type });
        setPosts((current) => current.map((item) => item.id === editing.id ? result.post : item));
      } else if (media) {
        const form = new FormData();
        form.append("message", message.trim());
        form.append("type", type);
        if (Platform.OS === "web" && media.webFile) form.append("media", media.webFile, media.fileName);
        else form.append("media", { uri: media.uri, name: media.fileName, type: media.mimeType } as any);
        const result = await uploadBroadcastForm<any>("/api/nagarsevak-community", form);
        setPosts((current) => [result.post, ...current]);
      } else {
        const result = await apiPost<any>("/api/nagarsevak-community", { message: message.trim(), type });
        setPosts((current) => [result.post, ...current]);
      }
      setComposerOpen(false);
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "Community post could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const removePost = async (post: CommunityPost) => {
    const run = async () => {
      try {
        await apiDelete(`/api/nagarsevak-community/${encodeURIComponent(post.id)}`);
        setPosts((current) => current.filter((item) => item.id !== post.id));
      } catch (requestError) {
        setError(getUserErrorMessage(requestError, "Community post could not be deleted."));
      }
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Delete this community post?")) await run();
    } else {
      Alert.alert("Delete post", "Delete this community post?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void run() }]);
    }
  };

  const memberLabel = useMemo(() => isAdmin ? "Community Admin" : `Ward ${user?.ward || "Officer"}`, [isAdmin, user?.ward]);

  if (!allowed) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F0F4F8" }}><Feather name="lock" size={42} color="#CBD5E1" /><Text style={{ marginTop: 12, color: "#64748B", fontFamily: "Inter_600SemiBold" }}>Officer community access required</Text></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <LinearGradient colors={["#052E16", "#166534", "#16A34A"]} style={{ paddingTop: topPad + 12, paddingHorizontal: 16, paddingBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}><Feather name="arrow-left" size={20} color="white" /></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: "white", fontSize: 20, fontFamily: "Inter_700Bold" }}>Nagarsevak Community</Text>
            <Text style={{ marginTop: 2, color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular" }}>{memberLabel} · All wards officer network</Text>
          </View>
          <TouchableOpacity onPress={openCreate} style={{ height: 42, paddingHorizontal: 13, borderRadius: 13, backgroundColor: "white", flexDirection: "row", alignItems: "center" }}><Feather name="plus" size={17} color={GREEN} /><Text style={{ marginLeft: 5, color: GREEN, fontFamily: "Inter_700Bold", fontSize: 11 }}>Post</Text></TouchableOpacity>
        </View>
      </LinearGradient>

      {error ? <Text style={{ marginHorizontal: 14, marginTop: 10, color: "#DC2626", fontFamily: "Inter_500Medium", fontSize: 11 }}>{error}</Text> : null}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => void loadPosts()}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        ListHeaderComponent={<View style={{ backgroundColor: "#ECFDF5", borderRadius: 14, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center" }}><Feather name="shield" size={18} color={GREEN} /><Text style={{ flex: 1, marginLeft: 9, color: "#166534", fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 16 }}>Official internal community for coordination, notices, ward updates and shared information.</Text></View>}
        ListEmptyComponent={!loading ? <View style={{ alignItems: "center", paddingVertical: 60 }}><Feather name="message-circle" size={42} color="#CBD5E1" /><Text style={{ marginTop: 12, color: "#64748B", fontFamily: "Inter_600SemiBold" }}>No community posts yet</Text></View> : null}
        renderItem={({ item }) => {
          const config = TYPES.find((entry) => entry.id === item.type) || TYPES[0];
          const canManage = isAdmin || String(item.authorId) === String(user?.id);
          return (
            <View style={{ backgroundColor: "white", borderRadius: 17, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: item.authorRole === "super_admin" ? "#DCFCE7" : "#E0F2FE", alignItems: "center", justifyContent: "center" }}><Text style={{ color: item.authorRole === "super_admin" ? GREEN : "#0284C7", fontFamily: "Inter_700Bold", fontSize: 15 }}>{String(item.authorName || "O").charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1, marginLeft: 10 }}><Text style={{ color: "#0F172A", fontFamily: "Inter_700Bold", fontSize: 13 }}>{item.authorName}</Text><Text style={{ marginTop: 1, color: "#64748B", fontFamily: "Inter_400Regular", fontSize: 10 }}>{item.authorRole === "super_admin" ? "Super Admin" : item.ward || "Nagarsevak"} · {timeLabel(item.createdAt)}</Text></View>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: config.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 }}><Feather name={config.icon as any} size={12} color={config.color} /><Text style={{ marginLeft: 4, color: config.color, fontFamily: "Inter_600SemiBold", fontSize: 9 }}>{config.label}</Text></View>
              </View>
              {item.message ? <Text style={{ color: "#334155", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, marginBottom: item.mediaUri ? 10 : 0 }}>{item.message}</Text> : null}
              {item.mediaUri ? <ComplaintMediaViewer uri={item.mediaUri} title={item.authorName} label={item.mediaType === "video" ? "Community video" : "Community image"} accentColor={GREEN} /> : null}
              {canManage ? <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "flex-end", gap: 8 }}><TouchableOpacity onPress={() => openEdit(item)} style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#EFF6FF", flexDirection: "row", alignItems: "center" }}><Feather name="edit-3" size={13} color="#2563EB" /><Text style={{ marginLeft: 5, color: "#2563EB", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={() => void removePost(item)} style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#FEF2F2", flexDirection: "row", alignItems: "center" }}><Feather name="trash-2" size={13} color="#DC2626" /><Text style={{ marginLeft: 5, color: "#DC2626", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>Delete</Text></TouchableOpacity></View> : null}
            </View>
          );
        }}
      />

      <Modal visible={composerOpen} transparent animationType="slide" onRequestClose={() => setComposerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.48)", justifyContent: "flex-end" }}>
          <View style={{ maxHeight: "88%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: Math.max(insets.bottom, 18) }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}><View style={{ flex: 1 }}><Text style={{ color: "#0F172A", fontFamily: "Inter_700Bold", fontSize: 18 }}>{editing ? "Edit community post" : "Create community post"}</Text><Text style={{ marginTop: 2, color: "#64748B", fontFamily: "Inter_400Regular", fontSize: 11 }}>Visible to all approved Nagarsevaks and Super Admin</Text></View><TouchableOpacity onPress={() => setComposerOpen(false)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
            <View style={{ flexDirection: "row", gap: 7, marginBottom: 12 }}>{TYPES.map((entry) => <TouchableOpacity key={entry.id} onPress={() => setType(entry.id)} style={{ flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: type === entry.id ? entry.bg : "#F8FAFC", borderWidth: 1, borderColor: type === entry.id ? entry.color + "55" : "#E2E8F0", alignItems: "center", justifyContent: "center" }}><Feather name={entry.icon as any} size={14} color={type === entry.id ? entry.color : "#94A3B8"} /><Text style={{ marginTop: 3, color: type === entry.id ? entry.color : "#64748B", fontFamily: "Inter_600SemiBold", fontSize: 8 }}>{entry.label}</Text></TouchableOpacity>)}</View>
            <TextInput value={message} onChangeText={setMessage} placeholder="Write update, message, notice or information..." placeholderTextColor="#94A3B8" multiline textAlignVertical="top" style={{ minHeight: 120, borderRadius: 15, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", padding: 13, color: "#0F172A", fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 12 }} />
            {!editing ? <BroadcastMediaPicker value={media} onChange={setMedia} onError={setError} disabled={saving} /> : <Text style={{ color: "#94A3B8", fontFamily: "Inter_400Regular", fontSize: 10, marginBottom: 10 }}>Existing media remains attached while editing text or post type.</Text>}
            <TouchableOpacity onPress={() => void submit()} disabled={saving} style={{ height: 50, borderRadius: 14, backgroundColor: GREEN, alignItems: "center", justifyContent: "center", marginTop: 14, opacity: saving ? 0.6 : 1 }}><Text style={{ color: "white", fontFamily: "Inter_700Bold", fontSize: 13 }}>{saving ? "Saving..." : editing ? "Save changes" : "Post to community"}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
