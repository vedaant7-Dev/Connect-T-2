import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { apiDelete, apiGet, apiPost, getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const ORANGE = "#EA580C";

type FeedComment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  avatarColor: string;
  content: string;
  createdAt: string;
};

function normalizeComment(raw: any): FeedComment {
  return {
    id: String(raw.id || ""),
    postId: String(raw.postId || raw.post_id || ""),
    authorId: String(raw.authorId || raw.author_id || ""),
    authorName: String(raw.authorName || raw.author_name || "User"),
    authorRole: String(raw.authorRole || raw.author_role || "citizen"),
    avatarColor: String(raw.avatarColor || raw.avatar_color || ORANGE),
    content: String(raw.content || ""),
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
  };
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function FeedCommentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; title?: string | string[] }>();
  const postId = Array.isArray(params.id) ? params.id[0] : params.id;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const { user } = useAuth();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!postId) {
      setError("Post information is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await apiGet<{ comments?: any[] }>(`/api/feed/posts/${encodeURIComponent(postId)}/comments`);
      setComments((result.comments || []).map(normalizeComment));
      setError("");
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "Comments could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    const content = draft.trim();
    if (!postId || !content || sending) return;
    if (content.length > 1000) {
      setError("Comment must be 1,000 characters or fewer.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const result = await apiPost<{ comment?: any }>(`/api/feed/posts/${encodeURIComponent(postId)}/comments`, { content });
      if (result.comment) setComments((current) => [...current, normalizeComment(result.comment)]);
      else await load();
      setDraft("");
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "The comment could not be posted."));
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment: FeedComment) => {
    if (!postId || sending) return;
    setSending(true);
    setError("");
    const previous = comments;
    setComments((current) => current.filter((item) => item.id !== comment.id));
    try {
      await apiDelete(`/api/feed/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(comment.id)}`);
    } catch (requestError) {
      setComments(previous);
      setError(getUserErrorMessage(requestError, "The comment could not be deleted."));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <LinearGradient colors={["#C2410C", ORANGE, "#FB923C"]} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 48 : insets.top) + 10 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to community feed">
          <Feather name="arrow-left" size={19} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Comments</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{title || "Community post"}</Text>
        </View>
        <View style={styles.countPill}><Text style={styles.countText}>{comments.length}</Text></View>
      </LinearGradient>

      {error ? (
        <TouchableOpacity style={styles.errorBox} onPress={() => void load()} accessibilityRole="button" accessibilityLabel={`${error}. Tap to retry.`}>
          <Feather name="alert-triangle" size={16} color="#B45309" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}

      {loading && !comments.length ? (
        <View style={styles.center}><ActivityIndicator color={GREEN} /><Text style={styles.loadingText}>Loading comments…</Text></View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, !comments.length && styles.emptyList]}
          keyboardShouldPersistTaps="handled"
          refreshing={loading}
          onRefresh={() => void load()}
          renderItem={({ item }) => {
            const canDelete = String(item.authorId) === String(user?.id) || user?.role === "super_admin" || !!user?.isSuperAdmin;
            return (
              <View style={styles.commentCard}>
                <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}><Text style={styles.avatarText}>{item.authorName.charAt(0).toUpperCase()}</Text></View>
                <View style={styles.commentCopy}>
                  <View style={styles.commentTop}><Text style={styles.author}>{item.authorName}</Text><Text style={styles.role}>{item.authorRole}</Text><Text style={styles.date}>{dateLabel(item.createdAt)}</Text></View>
                  <Text style={styles.content}>{item.content}</Text>
                </View>
                {canDelete ? <TouchableOpacity style={styles.deleteButton} onPress={() => void remove(item)} disabled={sending} accessibilityRole="button" accessibilityLabel={`Delete comment by ${item.authorName}`}><Feather name="trash-2" size={15} color="#DC2626" /></TouchableOpacity> : null}
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Feather name="message-circle" size={34} color="#CBD5E1" /><Text style={styles.emptyTitle}>No comments yet</Text><Text style={styles.emptyText}>Start a respectful conversation about this post.</Text></View>}
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a comment…"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          multiline
          textAlignVertical="top"
          maxLength={1000}
          editable={!sending}
          accessibilityLabel="Comment text"
        />
        <TouchableOpacity style={[styles.sendButton, (!draft.trim() || sending) && styles.disabled]} onPress={() => void send()} disabled={!draft.trim() || sending} accessibilityRole="button" accessibilityLabel="Post comment" accessibilityState={{ disabled: !draft.trim() || sending }}>
          {sending ? <ActivityIndicator color="white" /> : <Feather name="send" size={18} color="white" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  header: { minHeight: 106, paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: "white", fontSize: 20, fontFamily: "Inter_700Bold" },
  headerSub: { marginTop: 2, color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_400Regular" },
  countPill: { minWidth: 36, height: 36, borderRadius: 13, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  countText: { color: ORANGE, fontSize: 14, fontFamily: "Inter_700Bold" },
  errorBox: { margin: 12, marginBottom: 0, borderRadius: 13, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB", padding: 10, flexDirection: "row", alignItems: "center", gap: 7 },
  errorText: { flex: 1, color: "#92400E", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_500Medium" },
  retryText: { color: "#B45309", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 8, color: "#64748B", fontSize: 11, fontFamily: "Inter_500Medium" },
  list: { padding: 12, gap: 9, paddingBottom: 22 },
  emptyList: { flexGrow: 1 },
  commentCard: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderRadius: 17, backgroundColor: "white", padding: 11, borderWidth: 1, borderColor: "#E2E8F0" },
  avatar: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  commentCopy: { flex: 1, minWidth: 0 },
  commentTop: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  author: { color: "#0F172A", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  role: { color: GREEN, fontSize: 8.5, textTransform: "capitalize", fontFamily: "Inter_600SemiBold" },
  date: { marginLeft: "auto", color: "#94A3B8", fontSize: 8.5, fontFamily: "Inter_400Regular" },
  content: { marginTop: 5, color: "#475569", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  deleteButton: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#FEF2F2" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyTitle: { marginTop: 10, color: "#334155", fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyText: { marginTop: 4, color: "#64748B", fontSize: 11, textAlign: "center", lineHeight: 16, fontFamily: "Inter_400Regular" },
  composer: { paddingHorizontal: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: "#E2E8F0", backgroundColor: "white", flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 15, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 11, color: "#0F172A", fontSize: 12.5, lineHeight: 18, fontFamily: "Inter_400Regular" },
  sendButton: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: GREEN },
  disabled: { opacity: 0.5 },
});
