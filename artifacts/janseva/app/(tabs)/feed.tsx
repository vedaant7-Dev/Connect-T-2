import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Modal, TextInput, ScrollView, ActivityIndicator, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useFeed, FeedPost, PostType } from "@/context/FeedContext";
import { useAuth } from "@/context/AuthContext";
import { useComplaints, Complaint, ComplaintStatus } from "@/context/ComplaintContext";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";

type FeedTab = "posts" | "active" | "resolved";

const postTypeLabelKeys: Record<PostType, string> = {
  announcement: "announcement",
  update: "update",
  complaint: "issue",
  general: "general",
};

const postTypeConfig: Record<PostType, { color: string; bg: string; icon: string }> = {
  announcement: { color: "#DC2626", bg: "#FEE2E2", icon: "alert-circle" },
  update: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  complaint: { color: "#D97706", bg: "#FEF3C7", icon: "alert-triangle" },
  general: { color: "#2563EB", bg: "#DBEAFE", icon: "message-circle" },
};

const statusLabelKeys: Record<ComplaintStatus, string> = {
  submitted: "submitted",
  assigned: "assigned",
  in_progress: "inProgress",
  resolved: "resolved",
  rejected: "rejected",
};

const statusConfig: Record<ComplaintStatus, { color: string; bg: string; icon: string }> = {
  submitted: { color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  assigned: { color: "#2563EB", bg: "#DBEAFE", icon: "user-check" },
  in_progress: { color: "#7C3AED", bg: "#EDE9FE", icon: "tool" },
  resolved: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  rejected: { color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
};

const categoryConfig: Record<string, { icon: string; color: string; bg: string }> = {
  roads: { icon: "truck", color: "#92400E", bg: "#FEF3C7" },
  water: { icon: "droplet", color: "#0369A1", bg: "#BAE6FD" },
  electricity: { icon: "zap", color: "#D97706", bg: "#FEF3C7" },
  garbage: { icon: "trash-2", color: "#059669", bg: "#D1FAE5" },
  drainage: { icon: "git-merge", color: "#0EA5E9", bg: "#EFF6FF" },
  streetlight: { icon: "sun", color: "#7C3AED", bg: "#EDE9FE" },
  encroachment: { icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2" },
  other: { icon: "more-horizontal", color: "#475569", bg: "#F1F5F9" },
};

const roleLabelKeys: Record<string, string> = {
  citizen: "citizen",
  nagarsevak: "nagarsevak",
  head_admin: "headAdmin",
};

const roleBadgeColor: Record<string, { bg: string; text: string }> = {
  citizen: { bg: "#EFF6FF", text: "#2563EB" },
  nagarsevak: { bg: "#ECFDF5", text: "#059669" },
  head_admin: { bg: "#F5F3FF", text: "#7C3AED" },
  "Head Admin": { bg: "#F5F3FF", text: "#7C3AED" },
  "Nagarsevak": { bg: "#ECFDF5", text: "#059669" },
  "Citizen": { bg: "#EFF6FF", text: "#2563EB" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return "now";
}

function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── POST CARD (Twitter style) ────────────────────────────────────────────────
function PostCard({ post, userId }: { post: FeedPost; userId: string }) {
  const { toggleLike } = useFeed();
  const { t } = useLanguage();
  const tc = postTypeConfig[post.type];
  const liked = post.likes.includes(userId);
  const roleInfo = roleBadgeColor[post.authorRole] || roleBadgeColor.citizen;

  return (
    <View style={[styles.tweetCard, post.pinned && styles.tweetCardPinned]}>
      {post.pinned && (
        <View style={styles.pinnedBar}>
          <Feather name="bookmark" size={10} color="#7C3AED" />
          <Text style={styles.pinnedText}>{t("pinnedPost")}</Text>
        </View>
      )}
      <View style={styles.tweetBody}>
        <Avatar name={post.authorName} color={post.avatarColor} size={42} />
        <View style={{ flex: 1 }}>
          <View style={styles.tweetMeta}>
            <Text style={styles.tweetAuthor}>{post.authorName}</Text>
            <View style={[styles.miniRoleBadge, { backgroundColor: roleInfo.bg }]}>
              <Text style={[styles.miniRoleText, { color: roleInfo.text }]}>{post.authorRole}</Text>
            </View>
            <Text style={styles.tweetTime}>· {timeAgo(post.createdAt)}</Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: tc.bg }]}>
            <Feather name={tc.icon as any} size={9} color={tc.color} />
            <Text style={[styles.typePillText, { color: tc.color }]}>{t(postTypeLabelKeys[post.type])}</Text>
          </View>
          <Text style={styles.tweetContent}>{post.content}</Text>
          <View style={styles.tweetActions}>
            <TouchableOpacity style={styles.tweetAction} onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleLike(post.id, userId); }} activeOpacity={0.8}>
              <Feather name="heart" size={15} color={liked ? "#DC2626" : "#94A3B8"} />
              <Text style={[styles.tweetActionText, liked && { color: "#DC2626" }]}>
                {post.likes.length > 0 ? post.likes.length : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tweetAction} activeOpacity={0.8}>
              <Feather name="message-circle" size={15} color="#94A3B8" />
              <Text style={styles.tweetActionText}>{post.commentsCount > 0 ? post.commentsCount : ""}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tweetAction} activeOpacity={0.8}>
              <Feather name="repeat" size={15} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tweetAction} activeOpacity={0.8}>
              <Feather name="share" size={15} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── COMPLAINT CARD (Twitter style with photo) ────────────────────────────────
function ComplaintCard({ complaint, onPress }: { complaint: Complaint; onPress: () => void }) {
  const { t } = useLanguage();
  const st = statusConfig[complaint.status];
  const cat = categoryConfig[complaint.category] || categoryConfig.other;

  return (
    <TouchableOpacity style={styles.tweetCard} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.tweetBody}>
        <View style={[styles.cmpAvatar, { backgroundColor: cat.bg }]}>
          <Feather name={cat.icon as any} size={18} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.tweetMeta}>
            <Text style={styles.tweetAuthor} numberOfLines={1}>{complaint.title}</Text>
            <Text style={styles.tweetTime}>· {timeAgo(complaint.createdAt)}</Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: st.bg, alignSelf: "flex-start", marginBottom: 6 }]}>
            <Feather name={st.icon as any} size={9} color={st.color} />
            <Text style={[styles.typePillText, { color: st.color }]}>{t(statusLabelKeys[complaint.status])}</Text>
          </View>

          {complaint.photoUri ? (
            <Image
              source={{ uri: complaint.photoUri }}
              style={styles.cmpPhoto}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cmpPhotoPlaceholder, { backgroundColor: cat.bg }]}>
              <Feather name={cat.icon as any} size={28} color={cat.color + "60"} />
              <Text style={[styles.cmpPhotoPlaceholderText, { color: cat.color + "80" }]}>{complaint.category}</Text>
            </View>
          )}

          <Text style={styles.tweetContent} numberOfLines={2}>{complaint.description}</Text>

          <View style={styles.cmpMeta}>
            <Feather name="map-pin" size={10} color="#94A3B8" />
            <Text style={styles.cmpMetaText} numberOfLines={1}>{complaint.location}</Text>
            <Text style={styles.cmpId}>#{complaint.id}</Text>
          </View>

          {complaint.status === "resolved" && complaint.resolvedNote && (
            <View style={styles.resolvedNote}>
              <Feather name="check-circle" size={11} color="#059669" />
              <Text style={styles.resolvedNoteText} numberOfLines={1}>{complaint.resolvedNote}</Text>
            </View>
          )}

          <View style={styles.tweetActions}>
            <TouchableOpacity style={styles.tweetAction} activeOpacity={0.8}>
              <Feather name="heart" size={15} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tweetAction} activeOpacity={0.8}>
              <Feather name="message-circle" size={15} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tweetAction} activeOpacity={0.8}>
              <Feather name="share" size={15} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tweetAction} onPress={onPress} activeOpacity={0.8}>
              <Feather name="arrow-right" size={15} color="#2563EB" />
              <Text style={[styles.tweetActionText, { color: "#2563EB", fontSize: 11 }]}>{t("details")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── NEW POST MODAL ───────────────────────────────────────────────────────────
function NewPostModal({ visible, onClose, onSubmit, canPostAnnouncement }: { visible: boolean; onClose: () => void; onSubmit: (content: string, type: PostType) => void; canPostAnnouncement: boolean }) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<PostType>("general");
  const { t } = useLanguage();
  const types: PostType[] = canPostAnnouncement ? ["announcement", "update", "general"] : ["general", "complaint"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>{t("newPost")}</Text>
          <Text style={modalStyles.label}>{t("postType")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            {types.map((pt) => {
              const tc = postTypeConfig[pt];
              const sel = type === pt;
              return (
                <TouchableOpacity key={pt} style={[modalStyles.typeBtn, { borderColor: tc.color + "40", backgroundColor: sel ? tc.color : tc.bg }]} onPress={() => setType(pt)} activeOpacity={0.8}>
                  <Feather name={tc.icon as any} size={13} color={sel ? "white" : tc.color} />
                  <Text style={[modalStyles.typeBtnText, { color: sel ? "white" : tc.color }]}>{t(postTypeLabelKeys[pt])}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={modalStyles.label}>{t("content")}</Text>
          <TextInput style={modalStyles.textInput} value={content} onChangeText={setContent} placeholder={t("shareWithCommunity")} placeholderTextColor="#CBD5E1" multiline numberOfLines={5} textAlignVertical="top" maxLength={500} />
          <Text style={modalStyles.charCount}>{content.length}/500</Text>
          <View style={modalStyles.btnRow}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={modalStyles.cancelBtnText}>{t("cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.postBtn, !content.trim() && { opacity: 0.5 }]} onPress={() => { if (content.trim()) { onSubmit(content.trim(), type); onClose(); setContent(""); } }} disabled={!content.trim()} activeOpacity={0.85}>
              <LinearGradient colors={["#1E40AF", "#2563EB"]} style={modalStyles.postBtnGrad}>
                <Feather name="send" size={14} color="white" />
                <Text style={modalStyles.postBtnText}>{t("post")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const router = useRouter();
  const { posts, addPost, loading } = useFeed();
  const { user } = useAuth();
  const { complaints } = useComplaints();
  const { t } = useLanguage();
  const { handleScroll } = useTabBarVisibility();
  const [activeTab, setActiveTab] = useState<FeedTab>("posts");
  const [showNewPost, setShowNewPost] = useState(false);

  const userId = user?.id || "guest";
  const canPostAnnouncement = user?.role === "head_admin" || user?.role === "nagarsevak";

  const activeComplaints = complaints.filter((c) => ["submitted", "assigned", "in_progress"].includes(c.status));
  const resolvedComplaints = complaints.filter((c) => c.status === "resolved" || c.status === "rejected");

  const handlePost = (content: string, type: PostType) => {
    addPost(content, type, user?.name || "Anonymous", t(roleLabelKeys[user?.role || "citizen"]), user?.avatarColor || "#2563EB");
  };

  const tabs: { id: FeedTab; label: string; count?: number }[] = [
    { id: "posts", label: t("updates") },
    { id: "active", label: t("active"), count: activeComplaints.length },
    { id: "resolved", label: t("resolved"), count: resolvedComplaints.length },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#1E3A8A", "#1E40AF", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>{t("communityFeed")}</Text>
            <Text style={styles.headerSub}>{t("wardUpdatesAlerts")}</Text>
          </View>
          <TouchableOpacity style={styles.newPostBtn} onPress={() => setShowNewPost(true)} activeOpacity={0.85}>
            <Feather name="edit-2" size={14} color="white" />
            <Text style={styles.newPostBtnText}>{t("post")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? ` (${tab.count})` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      ) : activeTab === "posts" ? (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} userId={userId} />}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 160 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : activeTab === "active" ? (
        <FlatList
          data={activeComplaints}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ComplaintCard
              complaint={item}
              onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: item.id } })}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 160 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="check-circle" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{t("noActiveComplaints")}</Text>
              <Text style={styles.emptySub}>{t("allResolved")}</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={resolvedComplaints}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ComplaintCard
              complaint={item}
              onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: item.id } })}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 160 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="inbox" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{t("noResolvedComplaints")}</Text>
              <Text style={styles.emptySub}>{t("resolvedAppearHere")}</Text>
            </View>
          }
        />
      )}

      <View style={[styles.bottomComposeBar, { paddingBottom: bottomPad + 90 }]}>
        <TouchableOpacity style={styles.composeBarInner} onPress={() => setShowNewPost(true)} activeOpacity={0.85}>
          {user && <Avatar name={user.name} color={user.avatarColor || "#2563EB"} size={36} />}
          <Text style={styles.composePlaceholder}>{t("shareWithWard")}</Text>
          <View style={styles.composeActions}>
            <TouchableOpacity style={styles.composeIconBtn} onPress={() => setShowNewPost(true)} activeOpacity={0.8}>
              <Feather name="image" size={18} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.composeSendBtn} onPress={() => setShowNewPost(true)} activeOpacity={0.85}>
              <LinearGradient colors={["#1E40AF", "#2563EB"]} style={styles.composeSendGrad}>
                <Feather name="send" size={14} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>

      <NewPostModal visible={showNewPost} onClose={() => setShowNewPost(false)} onSubmit={handlePost} canPostAnnouncement={canPostAnnouncement} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  header: { paddingHorizontal: 16, paddingBottom: 0, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  newPostBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  newPostBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: "white" },
  tabText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.5)", fontFamily: "Inter_600SemiBold" },
  tabTextActive: { color: "white", fontFamily: "Inter_700Bold" },
  list: { paddingTop: 8, paddingHorizontal: 0 },
  separator: { height: 1, backgroundColor: "#E2E8F0", marginLeft: 74 },
  bottomComposeBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingHorizontal: 12, paddingTop: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  composeBarInner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F8FAFC", borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  composePlaceholder: { flex: 1, fontSize: 14, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  composeActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  composeIconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  composeSendBtn: { borderRadius: 16, overflow: "hidden" },
  composeSendGrad: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },

  tweetCard: { backgroundColor: "white", paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  tweetCardPinned: { borderLeftWidth: 3, borderLeftColor: "#7C3AED" },
  pinnedBar: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8, marginLeft: 54 },
  pinnedText: { fontSize: 10, fontWeight: "700", color: "#7C3AED", fontFamily: "Inter_600SemiBold" },
  tweetBody: { flexDirection: "row", gap: 12 },
  tweetMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap", flex: 1 },
  tweetAuthor: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", flexShrink: 1 },
  tweetTime: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  miniRoleBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 10 },
  miniRoleText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
  typePillText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  tweetContent: { fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 10 },
  tweetActions: { flexDirection: "row", marginTop: 4, marginBottom: 10, gap: 4 },
  tweetAction: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, paddingVertical: 4 },
  tweetActionText: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },

  cmpAvatar: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cmpPhoto: { width: "100%", height: 180, borderRadius: 14, marginBottom: 10 },
  cmpPhotoPlaceholder: { width: "100%", height: 100, borderRadius: 14, marginBottom: 10, alignItems: "center", justifyContent: "center", gap: 6 },
  cmpPhotoPlaceholderText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  cmpMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  cmpMetaText: { flex: 1, fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  cmpId: { fontSize: 10, color: "#CBD5E1", fontFamily: "Inter_400Regular" },
  resolvedNote: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ECFDF5", borderRadius: 8, padding: 8, marginBottom: 8 },
  resolvedNoteText: { flex: 1, fontSize: 11, color: "#065F46", fontFamily: "Inter_400Regular" },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#475569", fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 14 },
  label: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  typeBtnText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  textInput: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", height: 120, marginBottom: 4 },
  charCount: { fontSize: 10, color: "#CBD5E1", textAlign: "right", marginBottom: 14, fontFamily: "Inter_400Regular" },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9" },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  postBtn: { flex: 2, borderRadius: 14, overflow: "hidden" },
  postBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  postBtnText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
