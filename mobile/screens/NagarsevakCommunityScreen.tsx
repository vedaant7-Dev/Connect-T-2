import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, FlatList, Platform, RefreshControl, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import BroadcastMediaPicker from "@/components/BroadcastMediaPicker";
import ComplaintMediaViewer from "@/components/ComplaintMediaViewer";
import type { BroadcastMediaUpload } from "@/context/BroadcastContext";
import { apiDelete, apiGet, apiPatch, apiPost, getUserErrorMessage } from "@/lib/api";
import { uploadCommunityForm } from "@/lib/communityUpload";

const GREEN = "#16A34A";
const TYPES = [
  { id: "message", label: "Message", icon: "message-circle", color: "#2563EB", bg: "#DBEAFE" },
  { id: "update", label: "Update", icon: "refresh-cw", color: "#059669", bg: "#D1FAE5" },
  { id: "notice", label: "Notice", icon: "bell", color: "#D97706", bg: "#FEF3C7" },
  { id: "information", label: "Information", icon: "info", color: "#7C3AED", bg: "#EDE9FE" },
] as const;

type CommunityType = typeof TYPES[number]["id"];
type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "super_admin" | "nagarsevak";
  ward?: string;
  postType: CommunityType;
  title?: string;
  content?: string;
  mediaUri?: string;
  mediaType?: "image" | "video";
  editedAt?: string;
  createdAt: string;
};

function normalize(raw: any): CommunityPost {
  return {
    id: String(raw.id),
    authorId: String(raw.authorId || raw.author_id || ""),
    authorName: String(raw.authorName || raw.author_name || "Nagarsevak"),
    authorRole: (raw.authorRole || raw.author_role) === "super_admin" ? "super_admin" : "nagarsevak",
    ward: raw.ward || undefined,
    postType: TYPES.some((item) => item.id === (raw.postType || raw.post_type)) ? (raw.postType || raw.post_type) : "message",
    title: raw.title || undefined,
    content: raw.content || undefined,
    mediaUri: raw.mediaUri || raw.media_uri || undefined,
    mediaType: (raw.mediaType || raw.media_type) === "video" ? "video" : (raw.mediaType || raw.media_type) === "image" ? "image" : undefined,
    editedAt: raw.editedAt || raw.edited_at || undefined,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

function timeLabel(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export default function NagarsevakCommunityScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || !!user?.isSuperAdmin;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<"all" | CommunityType>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityPost | null>(null);
  const [postType, setPostType] = useState<CommunityType>("message");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<BroadcastMediaUpload | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommunityPost | null>(null);

  const load = useCallback(async (targetPage = page, targetFilter = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "20" });
      if (targetFilter !== "all") params.set("type", targetFilter);
      const result = await apiGet<any>(`/api/nagarsevak-community/posts?${params.toString()}`);
      setPosts((result.posts || []).map(normalize));
      setPage(result.pagination?.page || targetPage);
      setPages(result.pagination?.totalPages || 1);
      setTotal(result.pagination?.total || 0);
      setError("");
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "Nagarsevak Community could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useFocusEffect(useCallback(() => {
    void load(1, filter);
    const timer = setInterval(() => void load(1, filter), 20000);
    return () => clearInterval(timer);
  }, [filter]));

  useEffect(() => { setPage(1); }, [filter]);

  const resetComposer = () => {
    setEditing(null);
    setPostType("message");
    setTitle("");
    setContent("");
    setMedia(null);
    setMediaError("");
    setUploadProgress(null);
  };

  const openCreate = () => { resetComposer(); setComposerOpen(true); };
  const openEdit = (post: CommunityPost) => {
    setEditing(post);
    setPostType(post.postType);
    setTitle(post.title || "");
    setContent(post.content || "");
    setMedia(null);
    setMediaError("");
    setComposerOpen(true);
  };

  const save = async () => {
    if (!content.trim() && !media && !editing?.mediaUri) {
      setMediaError("Enter a message or attach an image/video.");
      return;
    }
    setSaving(true);
    setMediaError("");
    try {
      if (editing) {
        const result = await apiPatch<any>(`/api/nagarsevak-community/posts/${encodeURIComponent(editing.id)}`, {
          postType,
          title: title.trim(),
          content: content.trim(),
        });
        setPosts((current) => current.map((item) => item.id === editing.id ? normalize(result.post) : item));
      } else if (media) {
        const form = new FormData();
        form.append("postType", postType);
        if (title.trim()) form.append("title", title.trim());
        if (content.trim()) form.append("content", content.trim());
        if (Platform.OS === "web" && media.webFile) form.append("media", media.webFile, media.fileName);
        else form.append("media", { uri: media.uri, name: media.fileName, type: media.mimeType } as any);
        const result = await uploadCommunityForm<any>(form, setUploadProgress);
        setPosts((current) => [normalize(result.post), ...current]);
      } else {
        const result = await apiPost<any>("/api/nagarsevak-community/posts", {
          postType,
          title: title.trim(),
          content: content.trim(),
        });
        setPosts((current) => [normalize(result.post), ...current]);
      }
      setComposerOpen(false);
      resetComposer();
      void load(1, filter);
    } catch (requestError) {
      setMediaError(getUserErrorMessage(requestError, "The community post could not be saved."));
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/nagarsevak-community/posts/${encodeURIComponent(deleteTarget.id)}`);
      setPosts((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      void load(page, filter);
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "The community post could not be deleted."));
      setDeleteTarget(null);
    }
  };

  const canManage = useCallback((post: CommunityPost) => isAdmin || String(post.authorId) === String(user?.id || ""), [isAdmin, user?.id]);
  const headerSummary = useMemo(() => isAdmin ? "Administer the official Nagarsevak workspace" : "Connect with all approved Nagarsevaks", [isAdmin]);

  const renderPost = ({ item }: { item: CommunityPost }) => {
    const config = TYPES.find((type) => type.id === item.postType) || TYPES[0];
    return (
      <View style={{ backgroundColor: "white", borderRadius: 17, padding: 14, marginHorizontal: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: item.authorRole === "super_admin" ? "#DCFCE7" : "#E0F2FE", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: item.authorRole === "super_admin" ? "#15803D" : "#0369A1" }}>{item.authorName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_700Bold" }}>{item.authorName}</Text>
            <Text style={{ color: "#64748B", fontSize: 10.5, fontFamily: "Inter_400Regular" }}>{item.authorRole === "super_admin" ? "Community Admin" : item.ward || "Nagarsevak"} · {timeLabel(item.createdAt)}{item.editedAt ? " · Edited" : ""}</Text>
          </View>
          <View style={{ backgroundColor: config.bg, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, flexDirection: "row", alignItems: "center" }}>
            <Feather name={config.icon as any} size={11} color={config.color} />
            <Text style={{ marginLeft: 4, color: config.color, fontFamily: "Inter_700Bold", fontSize: 9 }}>{config.label}</Text>
          </View>
        </View>
        {item.title ? <Text style={{ color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 5 }}>{item.title}</Text> : null}
        {item.content ? <Text style={{ color: "#334155", fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", marginBottom: item.mediaUri ? 10 : 0 }}>{item.content}</Text> : null}
        {item.mediaUri ? <ComplaintMediaViewer uri={item.mediaUri} title={item.title || "Community media"} label={item.mediaType === "video" ? "Community video" : "Community image"} accentColor={GREEN} /> : null}
        {canManage(item) ? (
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
            <TouchableOpacity onPress={() => openEdit(item)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, height: 36, borderRadius: 10, backgroundColor: "#EFF6FF" }}>
              <Feather name="edit-2" size={13} color="#2563EB" /><Text style={{ marginLeft: 5, color: "#2563EB", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteTarget(item)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, height: 36, borderRadius: 10, backgroundColor: "#FEF2F2" }}>
              <Feather name="trash-2" size={13} color="#DC2626" /><Text style={{ marginLeft: 5, color: "#DC2626", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <LinearGradient colors={["#052E16", "#166534", "#16A34A"]} style={{ paddingTop: topPad + 10, paddingHorizontal: 18, paddingBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <View style={{ alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, paddingHorizontal: 9, paddingVertical: 4, flexDirection: "row", alignItems: "center", marginBottom: 7 }}>
              <Feather name="users" size={10} color="#6EE7B7" /><Text style={{ marginLeft: 5, color: "#6EE7B7", fontSize: 9, letterSpacing: 1.2, fontFamily: "Inter_700Bold" }}>INTERNAL COMMUNITY</Text>
            </View>
            <Text style={{ color: "white", fontSize: 21, fontFamily: "Inter_700Bold" }}>Nagarsevak Community</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11.5, marginTop: 3, fontFamily: "Inter_400Regular" }}>{headerSummary}</Text>
          </View>
          <TouchableOpacity onPress={openCreate} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "white", alignItems: "center", justifyContent: "center" }}>
            <Feather name="plus" size={22} color={GREEN} />
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 14, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center" }}>
          <Feather name="shield" size={16} color="#A7F3D0" />
          <Text style={{ flex: 1, marginLeft: 9, color: "rgba(255,255,255,0.82)", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_500Medium" }}>Private workspace for approved Nagarsevaks. Super Admin can moderate every post.</Text>
          <Text style={{ color: "white", fontFamily: "Inter_700Bold", fontSize: 16 }}>{total}</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load(1, filter)} colors={[GREEN]} tintColor={GREEN} />}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[{ id: "all", label: "All", icon: "grid", color: GREEN, bg: "#DCFCE7" }, ...TYPES].map((item: any) => {
                const active = filter === item.id;
                return <TouchableOpacity key={item.id} onPress={() => { setFilter(item.id); void load(1, item.id); }} style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: active ? item.color : "white", flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: active ? item.color : "#E2E8F0" }}><Feather name={item.icon as any} size={13} color={active ? "white" : item.color} /><Text style={{ marginLeft: 5, color: active ? "white" : "#475569", fontSize: 10.5, fontFamily: "Inter_600SemiBold" }}>{item.label}</Text></TouchableOpacity>;
              })}
            </ScrollView>
            {error ? <Text style={{ marginTop: 9, color: "#DC2626", fontSize: 11, fontFamily: "Inter_500Medium" }}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={!loading ? <View style={{ alignItems: "center", paddingVertical: 60 }}><Feather name="message-circle" size={42} color="#CBD5E1" /><Text style={{ color: "#64748B", fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 12 }}>No community posts yet</Text><Text style={{ color: "#94A3B8", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 }}>Start the first professional discussion.</Text></View> : null}
        ListFooterComponent={pages > 1 ? <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 14 }}><TouchableOpacity disabled={page <= 1} onPress={() => void load(page - 1, filter)} style={{ paddingHorizontal: 14, height: 38, borderRadius: 11, justifyContent: "center", backgroundColor: page <= 1 ? "#E2E8F0" : "#DCFCE7" }}><Text style={{ color: page <= 1 ? "#94A3B8" : "#15803D", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Previous</Text></TouchableOpacity><Text style={{ color: "#64748B", fontSize: 11, fontFamily: "Inter_500Medium" }}>Page {page} of {pages}</Text><TouchableOpacity disabled={page >= pages} onPress={() => void load(page + 1, filter)} style={{ paddingHorizontal: 14, height: 38, borderRadius: 11, justifyContent: "center", backgroundColor: page >= pages ? "#E2E8F0" : "#DCFCE7" }}><Text style={{ color: page >= pages ? "#94A3B8" : "#15803D", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Next</Text></TouchableOpacity></View> : null}
      />

      <Modal visible={composerOpen} transparent animationType="slide" onRequestClose={() => setComposerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" }}>
          <View style={{ maxHeight: "88%", backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 8 }}>
            <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 10 }} />
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }}><View style={{ flex: 1 }}><Text style={{ fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold" }}>{editing ? "Edit community post" : "Create community post"}</Text><Text style={{ fontSize: 10.5, color: "#64748B", marginTop: 2, fontFamily: "Inter_400Regular" }}>{editing ? "Attached media remains unchanged while editing." : "Share a message, update, notice, image or video."}</Text></View><TouchableOpacity onPress={() => setComposerOpen(false)} style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: Math.max(insets.bottom, 18) + 12 }} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 10, letterSpacing: 1, color: "#64748B", fontFamily: "Inter_700Bold", marginBottom: 8 }}>POST TYPE</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>{TYPES.map((item) => { const active = postType === item.id; return <TouchableOpacity key={item.id} onPress={() => setPostType(item.id)} style={{ paddingHorizontal: 11, height: 36, borderRadius: 11, flexDirection: "row", alignItems: "center", backgroundColor: active ? item.color : item.bg }}><Feather name={item.icon as any} size={13} color={active ? "white" : item.color} /><Text style={{ marginLeft: 5, color: active ? "white" : item.color, fontSize: 10.5, fontFamily: "Inter_600SemiBold" }}>{item.label}</Text></TouchableOpacity>; })}</View>
              <TextInput value={title} onChangeText={setTitle} placeholder="Title (optional)" maxLength={255} style={{ minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 13, color: "#0F172A", fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 10 }} />
              <TextInput value={content} onChangeText={setContent} placeholder="Write the complete message here" multiline maxLength={5000} textAlignVertical="top" style={{ minHeight: 130, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", padding: 13, color: "#0F172A", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 12 }} />
              {!editing ? <BroadcastMediaPicker value={media} onChange={setMedia} onError={setMediaError} disabled={saving} /> : editing.mediaUri ? <View style={{ padding: 12, borderRadius: 13, backgroundColor: "#F0FDF4", flexDirection: "row", alignItems: "center" }}><Feather name={editing.mediaType === "video" ? "video" : "image"} size={17} color={GREEN} /><Text style={{ marginLeft: 8, color: "#166534", fontFamily: "Inter_500Medium", fontSize: 11 }}>Existing {editing.mediaType || "media"} will be preserved.</Text></View> : null}
              {mediaError ? <Text style={{ color: "#DC2626", fontSize: 11, marginTop: 9, fontFamily: "Inter_500Medium" }}>{mediaError}</Text> : null}
              {uploadProgress !== null ? <Text style={{ color: GREEN, fontSize: 11, marginTop: 9, fontFamily: "Inter_600SemiBold" }}>Uploading media… {uploadProgress}%</Text> : null}
              <TouchableOpacity onPress={save} disabled={saving} style={{ height: 52, borderRadius: 15, backgroundColor: saving ? "#86EFAC" : GREEN, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 16 }}><Feather name={editing ? "save" : "send"} size={17} color="white" /><Text style={{ marginLeft: 8, color: "white", fontSize: 13, fontFamily: "Inter_700Bold" }}>{saving ? "Saving…" : editing ? "Save changes" : "Publish to community"}</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.55)", alignItems: "center", justifyContent: "center", padding: 24 }}><View style={{ width: "100%", maxWidth: 380, backgroundColor: "white", borderRadius: 22, padding: 20 }}><View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", alignSelf: "center" }}><Feather name="trash-2" size={23} color="#DC2626" /></View><Text style={{ textAlign: "center", color: "#0F172A", fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 12 }}>Delete community post?</Text><Text style={{ textAlign: "center", color: "#64748B", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 6 }}>This removes the message and attached media for everyone.</Text><View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}><TouchableOpacity onPress={() => setDeleteTarget(null)} style={{ flex: 1, height: 46, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#475569", fontFamily: "Inter_600SemiBold" }}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={remove} style={{ flex: 1, height: 46, borderRadius: 13, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "white", fontFamily: "Inter_700Bold" }}>Delete</Text></TouchableOpacity></View></View></View>
      </Modal>
    </View>
  );
}
