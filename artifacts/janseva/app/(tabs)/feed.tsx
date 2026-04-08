import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Modal, TextInput, ScrollView, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useFeed, FeedPost, PostType } from "@/context/FeedContext";
import { useAuth } from "@/context/AuthContext";

const postTypeConfig: Record<PostType, { label: string; color: string; bg: string; icon: string }> = {
  announcement: { label: "Announcement", color: "#DC2626", bg: "#FEE2E2", icon: "alert-circle" },
  update: { label: "Update", color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  complaint: { label: "Issue", color: "#D97706", bg: "#FEF3C7", icon: "alert-triangle" },
  general: { label: "General", color: "#2563EB", bg: "#DBEAFE", icon: "message-circle" },
};

const roleLabel: Record<string, string> = {
  citizen: "Citizen",
  nagarsevak: "Nagarsevak",
  head_admin: "Head Admin",
};

const roleBadgeColor: Record<string, { bg: string; text: string }> = {
  citizen: { bg: "#EFF6FF", text: "#2563EB" },
  nagarsevak: { bg: "#ECFDF5", text: "#059669" },
  head_admin: { bg: "#F5F3FF", text: "#7C3AED" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

function PostCard({ post, userId }: { post: FeedPost; userId: string }) {
  const { toggleLike } = useFeed();
  const tc = postTypeConfig[post.type];
  const liked = post.likes.includes(userId);
  const roleInfo = roleBadgeColor[post.authorRole.toLowerCase().replace(" ", "_")] || roleBadgeColor.citizen;

  const handleLike = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike(post.id, userId);
  };

  return (
    <View style={[styles.postCard, post.pinned && styles.postCardPinned]}>
      {post.pinned && (
        <View style={styles.pinnedBadge}>
          <Feather name="pin" size={10} color="#7C3AED" />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      <View style={styles.postHeader}>
        <Avatar name={post.authorName} color={post.avatarColor} />
        <View style={styles.postAuthorInfo}>
          <View style={styles.postAuthorRow}>
            <Text style={styles.postAuthorName}>{post.authorName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
              <Text style={[styles.roleBadgeText, { color: roleInfo.text }]}>
                {post.authorRole}
              </Text>
            </View>
          </View>
          <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
        </View>
        <View style={[styles.postTypeBadge, { backgroundColor: tc.bg }]}>
          <Feather name={tc.icon as any} size={10} color={tc.color} />
          <Text style={[styles.postTypeText, { color: tc.color }]}>{tc.label}</Text>
        </View>
      </View>

      <Text style={styles.postContent}>{post.content}</Text>

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.8}>
          <Feather name="heart" size={16} color={liked ? "#DC2626" : "#94A3B8"} />
          <Text style={[styles.actionText, liked && { color: "#DC2626" }]}>
            {post.likes.length > 0 ? post.likes.length : "Like"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <Feather name="message-circle" size={16} color="#94A3B8" />
          <Text style={styles.actionText}>
            {post.commentsCount > 0 ? post.commentsCount : "Comment"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <Feather name="share-2" size={16} color="#94A3B8" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface NewPostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, type: PostType) => void;
  canPostAnnouncement: boolean;
}

function NewPostModal({ visible, onClose, onSubmit, canPostAnnouncement }: NewPostModalProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<PostType>("general");

  const types: PostType[] = canPostAnnouncement
    ? ["announcement", "update", "general"]
    : ["general", "complaint"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>New Post</Text>

          <Text style={modalStyles.label}>POST TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            {types.map((t) => {
              const tc = postTypeConfig[t];
              const isSelected = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[modalStyles.typeBtn, { borderColor: tc.color + "40", backgroundColor: isSelected ? tc.color : tc.bg }]}
                  onPress={() => setType(t)}
                  activeOpacity={0.8}
                >
                  <Feather name={tc.icon as any} size={13} color={isSelected ? "white" : tc.color} />
                  <Text style={[modalStyles.typeBtnText, { color: isSelected ? "white" : tc.color }]}>{tc.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={modalStyles.label}>CONTENT</Text>
          <TextInput
            style={modalStyles.textInput}
            value={content}
            onChangeText={setContent}
            placeholder="What would you like to share with the community?"
            placeholderTextColor="#CBD5E1"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={modalStyles.charCount}>{content.length}/500</Text>

          <View style={modalStyles.btnRow}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={modalStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.postBtn, !content.trim() && { opacity: 0.5 }]}
              onPress={() => { if (content.trim()) { onSubmit(content.trim(), type); onClose(); setContent(""); } }}
              disabled={!content.trim()}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#1E40AF", "#2563EB"]} style={modalStyles.postBtnGrad}>
                <Feather name="send" size={14} color="white" />
                <Text style={modalStyles.postBtnText}>Post</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const { posts, addPost, loading } = useFeed();
  const { user } = useAuth();
  const [showNewPost, setShowNewPost] = useState(false);

  const userId = user?.id || "guest";
  const canPostAnnouncement = user?.role === "head_admin" || user?.role === "nagarsevak";

  const handlePost = (content: string, type: PostType) => {
    addPost(
      content,
      type,
      user?.name || "Anonymous",
      roleLabel[user?.role || "citizen"],
      user?.avatarColor || "#2563EB"
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1E3A8A", "#1E40AF", "#2563EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Community Feed</Text>
            <Text style={styles.headerSub}>Ward updates, alerts & discussions</Text>
          </View>
          <TouchableOpacity
            style={styles.newPostBtn}
            onPress={() => setShowNewPost(true)}
            activeOpacity={0.85}
          >
            <Feather name="edit-2" size={14} color="white" />
            <Text style={styles.newPostBtnText}>Post</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} userId={userId} />}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 90 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.quickPostBar}
              onPress={() => setShowNewPost(true)}
              activeOpacity={0.85}
            >
              {user && <Avatar name={user.name} color={user.avatarColor || "#2563EB"} size={36} />}
              <Text style={styles.quickPostPlaceholder}>Share something with your ward...</Text>
              <View style={styles.quickPostSend}>
                <Feather name="send" size={14} color="#2563EB" />
              </View>
            </TouchableOpacity>
          }
        />
      )}

      <NewPostModal
        visible={showNewPost}
        onClose={() => setShowNewPost(false)}
        onSubmit={handlePost}
        canPostAnnouncement={canPostAnnouncement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  newPostBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  newPostBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  list: { padding: 12, gap: 10 },
  quickPostBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "white", borderRadius: 16, padding: 12, marginBottom: 8,
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  quickPostPlaceholder: { flex: 1, fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  quickPostSend: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: "#EFF6FF",
    alignItems: "center", justifyContent: "center",
  },
  avatar: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { color: "white", fontWeight: "800", fontFamily: "Inter_700Bold" },
  postCard: {
    backgroundColor: "white", borderRadius: 18,
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  postCardPinned: { borderWidth: 1.5, borderColor: "#C4B5FD" },
  pinnedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F5F3FF", paddingHorizontal: 12, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: "#EDE9FE",
  },
  pinnedText: { fontSize: 10, fontWeight: "700", color: "#7C3AED", fontFamily: "Inter_600SemiBold" },
  postHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, paddingBottom: 10 },
  postAuthorInfo: { flex: 1 },
  postAuthorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  postAuthorName: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
  roleBadgeText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  postTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  postTypeBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  postTypeText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  postContent: {
    fontSize: 13, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 20,
    paddingHorizontal: 14, paddingBottom: 12,
  },
  postActions: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F1F5F9",
    paddingHorizontal: 10, paddingVertical: 6,
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 6,
  },
  actionText: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_500Medium" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 14 },
  label: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  typeBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  typeBtnText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  textInput: {
    borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: "#0F172A", fontFamily: "Inter_400Regular", height: 120, marginBottom: 4,
  },
  charCount: { fontSize: 10, color: "#CBD5E1", textAlign: "right", marginBottom: 14, fontFamily: "Inter_400Regular" },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9" },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  postBtn: { flex: 2, borderRadius: 14, overflow: "hidden" },
  postBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  postBtnText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
