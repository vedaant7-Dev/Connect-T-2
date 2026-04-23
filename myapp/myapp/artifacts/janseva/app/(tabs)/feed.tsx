import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Image, Share, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useFeed, FeedPost, PostType } from "@/context/FeedContext";
import { AppAlert, useAlerts, wardKey } from "@/context/AlertContext";
import { ambernathWards } from "@/data/mumbaiServices";
import { useAuth } from "@/context/AuthContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";

type FeedTab = "community";

const postTypeConfig: Record<PostType, { color: string; bg: string; icon: string }> = {
  announcement: { color: "#DC2626", bg: "#FEE2E2", icon: "alert-circle" },
  update: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  complaint: { color: "#D97706", bg: "#FEF3C7", icon: "alert-triangle" },
  general: { color: "#EA580C", bg: "#FFEDD5", icon: "message-circle" },
};

const roleBadgeColor: Record<string, { bg: string; text: string }> = {
  citizen: { bg: "#FFF7ED", text: "#EA580C" },
  nagarsevak: { bg: "#ECFDF5", text: "#059669" },
  Nagarsevak: { bg: "#ECFDF5", text: "#059669" },
  Citizen: { bg: "#FFF7ED", text: "#EA580C" },
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

function Avatar({ name, color, size = 40, photoUri }: { name: string; color: string; size?: number; photoUri?: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  if (photoUri) {
    return <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

function InlineVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return (
    <VideoView
      style={styles.postVideo}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
      contentFit="cover"
    />
  );
}

function PostCard({ post, userId }: { post: FeedPost; userId: string }) {
  const { toggleLike } = useFeed();
  const liked = post.likes.includes(userId);
  const tc = postTypeConfig[post.type];
  const roleInfo = roleBadgeColor[post.authorRole] || roleBadgeColor.citizen;

  return (
    <View style={[styles.card, post.pinned && styles.cardPinned]}>
      {post.pinned && (
        <View style={styles.pinnedBar}>
          <Feather name="bookmark" size={10} color="#7C3AED" />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      <View style={styles.cardMeta}>
        <Avatar name={post.authorName} color={post.avatarColor} size={30} />
        <Text style={styles.cardAuthor} numberOfLines={1}>{post.authorName}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
          <Text style={[styles.roleBadgeText, { color: roleInfo.text }]}>{post.authorRole}</Text>
        </View>
        <Text style={styles.cardTime}>· {timeAgo(post.createdAt)}</Text>
      </View>
      <View style={[styles.typePill, { backgroundColor: tc.bg, marginBottom: 8 }]}>
        <Feather name={tc.icon as any} size={9} color={tc.color} />
        <Text style={[styles.typePillText, { color: tc.color }]}>{post.type}</Text>
      </View>
      <Text style={styles.cardContent}>{post.content}</Text>
      {post.imageUri ? (
        <Image source={{ uri: post.imageUri }} style={styles.postImage} resizeMode="cover" />
      ) : null}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.action} onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          toggleLike(post.id, userId);
        }} activeOpacity={0.8}>
          <Feather name="heart" size={15} color={liked ? "#DC2626" : "#94A3B8"} />
          <Text style={[styles.actionText, liked && { color: "#DC2626" }]}>{post.likes.length > 0 ? post.likes.length : ""}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} activeOpacity={0.8}>
          <Feather name="message-circle" size={15} color="#94A3B8" />
          <Text style={styles.actionText}>{post.commentsCount > 0 ? post.commentsCount : ""}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} activeOpacity={0.8}>
          <Feather name="share" size={15} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

async function shareNews(item: AppAlert) {
  try {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    const lines = [
      `📰 ${item.title}`,
      "",
      item.body,
      item.location ? `\n📍 ${item.location}` : "",
      item.validUntil ? `🕒 Valid until ${item.validUntil}` : "",
      `\n— Posted by ${item.postedBy || "Nagarsevak"} on JanSeva Ambernath`,
    ].filter(Boolean).join("\n");
    if (Platform.OS === "web" && (navigator as any)?.share) {
      await (navigator as any).share({ title: item.title, text: lines });
    } else {
      await Share.share({ title: item.title, message: lines });
    }
  } catch {}
}

function NewsAlertCard({ item }: { item: AppAlert }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardMeta}>
        <Avatar name={item.postedBy || "Nagarsevak"} color="#16A34A" size={30} />
        <Text style={styles.cardAuthor} numberOfLines={1}>{item.postedBy || "Nagarsevak"}</Text>
        <View style={[styles.roleBadge, { backgroundColor: "#ECFDF5" }]}>
          <Text style={[styles.roleBadgeText, { color: "#059669" }]}>Nagarsevak</Text>
        </View>
        <Text style={styles.cardTime}>· {timeAgo(item.createdAt)}</Text>
      </View>
      <View style={[styles.typePill, { backgroundColor: "#FFEDD5", marginBottom: 8 }]}>
        <Feather name="radio" size={9} color="#EA580C" />
        <Text style={[styles.typePillText, { color: "#EA580C" }]}>news</Text>
      </View>
      <Text style={styles.newsTitle}>{item.title}</Text>
      <Text style={styles.cardContent}>{item.body}</Text>
      {item.media?.type === "image" ? (
        <Image source={{ uri: item.media.uri }} style={styles.postImage} resizeMode="cover" />
      ) : item.media?.type === "video" ? (
        <InlineVideo uri={item.media.uri} />
      ) : null}
      <View style={styles.newsInfoRow}>
        {!!item.location && (
          <View style={styles.newsInfoChip}>
            <Feather name="map-pin" size={11} color="#64748B" />
            <Text style={styles.newsInfoText}>{item.location}</Text>
          </View>
        )}
        {!!item.validUntil && (
          <View style={styles.newsInfoChip}>
            <Feather name="clock" size={11} color="#64748B" />
            <Text style={styles.newsInfoText}>Valid until {item.validUntil}</Text>
          </View>
        )}
      </View>
      <View style={styles.newsActions}>
        <TouchableOpacity style={styles.newsShareBtn} onPress={() => shareNews(item)} activeOpacity={0.85}>
          <Feather name="share-2" size={13} color="#059669" />
          <Text style={styles.newsShareText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const TAB_H = Platform.OS === "web" ? 72 : 56 + Math.max(insets.bottom, 8);
  const { posts, toggleLike } = useFeed();
  const { alerts: allAlerts } = useAlerts();
  const { user } = useAuth();
  const { handleScroll } = useTabBarVisibility();

  const userId = user?.id || "guest";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const rawQuery = searchQuery.trim();
  const query = rawQuery.toLowerCase();
  const wardMatch = rawQuery.match(/^(?:ward\s*|w\.?\s*)?(\d{1,3})$/i);
  const isNumericQuery = !!wardMatch;
  const wardDigits = wardMatch ? wardMatch[1] : "";
  const isTitleSearch = rawQuery.length > 0 && !isNumericQuery;
  const isSearching = rawQuery.length > 0 || !!selectedWard;

  const wardScopedAlerts = allAlerts.filter((a) => !a.ward || (!!user?.ward && wardKey(a.ward) === wardKey(user.ward)));
  const allNews = allAlerts.filter((item) => item.type === "news");
  const wardNews = wardScopedAlerts.filter((item) => item.type === "news");

  const wardSuggestions = isNumericQuery
    ? ambernathWards.filter((w) => wardKey(w).startsWith(wardDigits))
    : [];

  const [activeTab] = useState<FeedTab>("community");

  let newsItems: Array<{ kind: "news"; createdAt: string; item: AppAlert } | { kind: "post"; createdAt: string; item: any }> = [];
  if (selectedWard) {
    const wKey = wardKey(selectedWard);
    newsItems = allNews
      .filter((n) => {
        if (n.ward && wardKey(n.ward) === wKey) return true;
        if (n.location) {
          const locDigits = n.location.match(/\d+/);
          if (locDigits && locDigits[0] === wKey) return true;
        }
        return false;
      })
      .map((item) => ({ kind: "news" as const, createdAt: item.createdAt, item }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (isTitleSearch) {
    newsItems = allNews
      .filter((n) => n.title.toLowerCase().includes(query))
      .map((item) => ({ kind: "news" as const, createdAt: item.createdAt, item }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (!isNumericQuery) {
    newsItems = [
      ...wardNews.map((item) => ({ kind: "news" as const, createdAt: item.createdAt, item })),
      ...posts.map((item) => ({ kind: "post" as const, createdAt: item.createdAt, item })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedWard(null);
  };

  const pickWard = (w: string) => {
    setSelectedWard(w);
    setSearchQuery("");
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#C2410C", "#EA580C", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12, overflow: "hidden" }]}>
        <TopShade height={100} />
        <DecorativeCircles />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>News Feed</Text>
            <Text style={styles.headerSub}>Ambernath · BJP Ward Network</Text>
          </View>
        </View>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#94A3B8" />
          {selectedWard ? (
            <View style={styles.activeWardChip}>
              <Feather name="map-pin" size={12} color="#EA580C" />
              <Text style={styles.activeWardChipText}>{selectedWard}</Text>
              <TouchableOpacity onPress={clearSearch} hitSlop={10}>
                <Feather name="x" size={13} color="#EA580C" />
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search title or type ward number..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
            />
          )}
          {!selectedWard && rawQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={10}>
              <Feather name="x-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        {isNumericQuery && (
          <View style={styles.wardSuggestRow}>
            {wardSuggestions.length === 0 ? (
              <Text style={styles.searchHint}>No matching ward</Text>
            ) : (
              wardSuggestions.slice(0, 8).map((w) => (
                <TouchableOpacity key={w} style={styles.wardSuggestChip} onPress={() => pickWard(w)} activeOpacity={0.85}>
                  <Feather name="map-pin" size={11} color="#C2410C" />
                  <Text style={styles.wardSuggestText}>{w}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
        {(isTitleSearch || selectedWard) && (
          <Text style={styles.searchHint}>
            {selectedWard
              ? `News from ${selectedWard} · ${newsItems.length} ${newsItems.length === 1 ? "post" : "posts"}`
              : `${newsItems.length} ${newsItems.length === 1 ? "match" : "matches"} for "${rawQuery}"`}
          </Text>
        )}
      </LinearGradient>

      {activeTab === "community" && (
        <FlatList
          data={newsItems}
          keyExtractor={(p) => p.item.id}
          renderItem={({ item }) => item.kind === "news" ? <NewsAlertCard item={item.item} /> : <PostCard post={item.item} userId={userId} />}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 8) + 20 + TAB_H }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="inbox" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No news yet</Text>
            </View>
          }
        />
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  header: { paddingHorizontal: 16, paddingBottom: 6, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    minHeight: 48,
    marginTop: 4,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular", padding: 0, outlineWidth: 0 } as any,
  searchHint: { fontSize: 11, color: "rgba(255,255,255,0.9)", fontFamily: "Inter_600SemiBold", marginBottom: 8, marginLeft: 2 },
  wardSuggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  wardSuggestChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "white", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  wardSuggestText: { fontSize: 12, fontWeight: "700", color: "#C2410C", fontFamily: "Inter_700Bold" },
  activeWardChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFEDD5", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  activeWardChipText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#C2410C", fontFamily: "Inter_700Bold" },
  newPostBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  newPostBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  backBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  blockedBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(220,38,38,0.3)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  blockedBannerText: { fontSize: 11, color: "#FDE68A", fontFamily: "Inter_400Regular", flex: 1 },
  tabScroll: { flexGrow: 0 },
  tabRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 0,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  tabActive: {
    backgroundColor: "white",
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.65)", fontFamily: "Inter_600SemiBold" },
  tabTextActive: { color: "#C2410C", fontFamily: "Inter_700Bold" },
  tabBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  tabBadgeActive: { backgroundColor: "#EA580C" },
  tabBadgeText: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.9)", fontFamily: "Inter_700Bold" },
  tabBadgeTextActive: { color: "white" },
  list: { paddingTop: 8 },
  separator: { height: 1, backgroundColor: "#E2E8F0" },

  card: { backgroundColor: "white", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, width: "100%" },
  cardPinned: { borderLeftWidth: 3, borderLeftColor: "#7C3AED" },
  pinnedBar: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  pinnedText: { fontSize: 10, fontWeight: "700", color: "#7C3AED", fontFamily: "Inter_600SemiBold" },
  cardBody: { flexDirection: "row", gap: 12 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  cardAuthor: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", flex: 1 },
  cardTime: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", flexShrink: 0 },
  roleBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 10 },
  roleBadgeText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
  typePillText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  cardContent: { fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 8 },
  newsTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 6 },
  postImage: { width: "100%", height: 180, borderRadius: 12, marginBottom: 10, resizeMode: "cover" },
  postVideo: { width: "100%", height: 190, borderRadius: 12, marginBottom: 10, backgroundColor: "#0F172A" },
  newsVideoBox: { height: 150, borderRadius: 12, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 },
  newsVideoText: { fontSize: 12, fontWeight: "800", color: "#EA580C", fontFamily: "Inter_700Bold" },
  newsInfoRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  newsInfoChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  newsInfoText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  newsActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  newsShareBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFDF5", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  newsShareText: { fontSize: 12, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  cardActions: { flexDirection: "row", marginTop: 4, marginBottom: 10, justifyContent: "space-between" },
  action: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 4 },
  actionText: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },

  cmpAvatar: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cmpPhotoPlaceholder: { width: "100%", height: 100, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  resolvedNote: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#D1FAE5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 8 },
  resolvedNoteText: { fontSize: 11, color: "#059669", fontFamily: "Inter_400Regular", flex: 1 },

  chatList: { paddingTop: 16, paddingHorizontal: 12 },
  bubble: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "flex-end" },
  bubbleMe: { flexDirection: "row-reverse" },
  bubbleContent: { maxWidth: "78%", backgroundColor: "white", borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleContentMe: { backgroundColor: "#EA580C", borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleName: { fontSize: 12, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  bubbleText: { fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 20 },
  bubbleTextMe: { color: "white" },
  bubbleTime: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 4 },
  chatWarningBanner: { backgroundColor: "#FEF2F2", borderTopWidth: 1, borderTopColor: "#FECACA", paddingHorizontal: 14, paddingVertical: 8 },
  chatWarningText: { fontSize: 12, color: "#DC2626", fontFamily: "Inter_400Regular", lineHeight: 18 },
  chatInputBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  chatInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chatCameraWrap: { borderRadius: 22, overflow: "hidden", flexShrink: 0 },
  chatCameraGrad: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  chatCameraBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFEDD5", alignItems: "center", justifyContent: "center" },
  chatInputPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chatInputCard: { flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: 4, paddingRight: 6, paddingVertical: 6, minHeight: 42, maxHeight: 110 },
  chatInput: { flex: 1, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular", lineHeight: 20, padding: 0, margin: 0, outlineWidth: 0, caretColor: "#EA580C" } as any,
  chatEmojiBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  chatSendBtn: { borderRadius: 22, overflow: "hidden", flexShrink: 0 },
  chatSendGrad: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  chatMicBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  chatIdleIcons: { flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 0 },
  chatIconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  chatIdleActions: { flexDirection: "row", alignItems: "center" },
  chatIdleBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },

  blockedScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  blockedScreenTitle: { fontSize: 20, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_700Bold", textAlign: "center" },
  blockedScreenSub: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },

  actionOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  actionSheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 32 },
  actionHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 10 },
  actionPreview: { marginHorizontal: 8, marginBottom: 6, padding: 12, backgroundColor: "#F8FAFC", borderRadius: 14 },
  actionPreviewText: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 20 },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  actionItemText: { fontSize: 16, color: "#0F172A", fontFamily: "Inter_400Regular" },
  actionDivider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 8 },

  editModalTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  editModalInput: { marginHorizontal: 12, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular", minHeight: 80, marginBottom: 14, outlineWidth: 0 } as any,
  editModalSave: { marginHorizontal: 12, borderRadius: 14, overflow: "hidden" },
  editModalSaveGrad: { paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  editModalSaveText: { fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#94A3B8", fontFamily: "Inter_700Bold" },

  composeBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingHorizontal: 12, paddingTop: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  composeInner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F8FAFC", borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  composePlaceholder: { flex: 1, fontSize: 14, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  composeImgBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  composeSendWrap: { borderRadius: 16, overflow: "hidden" },
  composeSendGrad: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 32, gap: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 4 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  label: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeBtnText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  textInput: { backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", minHeight: 100, outlineWidth: 0 } as any,
  charCount: { fontSize: 10, color: "#CBD5E1", alignSelf: "flex-end", fontFamily: "Inter_400Regular" },
  removeImg: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  imgBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  imgBtnText: { fontSize: 13, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_600SemiBold" },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#F1F5F9" },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  postBtnWrap: { borderRadius: 12, overflow: "hidden" },
  postBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 18 },
  postBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});

