import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Modal, TextInput, ScrollView, ActivityIndicator,
  Image, Alert, KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useFeed, FeedPost, ChatMessage, PostType, hasBadContent } from "@/context/FeedContext";
import { useAuth } from "@/context/AuthContext";
import { useComplaints, Complaint, ComplaintStatus } from "@/context/ComplaintContext";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";

type FeedTab = "news" | "community" | "chat" | "active" | "resolved";

const postTypeConfig: Record<PostType, { color: string; bg: string; icon: string }> = {
  announcement: { color: "#DC2626", bg: "#FEE2E2", icon: "alert-circle" },
  update: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  complaint: { color: "#D97706", bg: "#FEF3C7", icon: "alert-triangle" },
  general: { color: "#EA580C", bg: "#FFEDD5", icon: "message-circle" },
};

const statusConfig: Record<ComplaintStatus, { color: string; bg: string; icon: string }> = {
  submitted: { color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  assigned: { color: "#EA580C", bg: "#FFEDD5", icon: "user-check" },
  in_progress: { color: "#7C3AED", bg: "#EDE9FE", icon: "tool" },
  resolved: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  rejected: { color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
};

const categoryConfig: Record<string, { icon: string; color: string; bg: string }> = {
  roads: { icon: "truck", color: "#92400E", bg: "#FEF3C7" },
  water: { icon: "droplet", color: "#0369A1", bg: "#BAE6FD" },
  electricity: { icon: "zap", color: "#D97706", bg: "#FEF3C7" },
  garbage: { icon: "trash-2", color: "#059669", bg: "#D1FAE5" },
  drainage: { icon: "git-merge", color: "#0EA5E9", bg: "#FFF7ED" },
  streetlight: { icon: "sun", color: "#7C3AED", bg: "#EDE9FE" },
  encroachment: { icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2" },
  other: { icon: "more-horizontal", color: "#475569", bg: "#F1F5F9" },
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

function PostCard({ post, userId, subscribed }: { post: FeedPost; userId: string; subscribed: boolean }) {
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
      <View style={styles.cardBody}>
        <Avatar name={post.authorName} color={post.avatarColor} size={42} />
        <View style={{ flex: 1 }}>
          <View style={styles.cardMeta}>
            <Text style={styles.cardAuthor} numberOfLines={1}>{post.authorName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
              <Text style={[styles.roleBadgeText, { color: roleInfo.text }]}>{post.authorRole}</Text>
            </View>
            <Text style={styles.cardTime}>· {timeAgo(post.createdAt)}</Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: tc.bg }]}>
            <Feather name={tc.icon as any} size={9} color={tc.color} />
            <Text style={[styles.typePillText, { color: tc.color }]}>{post.type}</Text>
          </View>
          <Text style={styles.cardContent}>{post.content}</Text>
          {post.imageUri ? (
            <Image source={{ uri: post.imageUri }} style={styles.postImage} resizeMode="cover" />
          ) : null}
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.action} onPress={() => {
              if (!subscribed) return;
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
      </View>
    </View>
  );
}

function ComplaintCard({ complaint, onPress }: { complaint: Complaint; onPress: () => void }) {
  const st = statusConfig[complaint.status];
  const cat = categoryConfig[complaint.category] || categoryConfig.other;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.cardBody}>
        <View style={[styles.cmpAvatar, { backgroundColor: cat.bg }]}>
          <Feather name={cat.icon as any} size={18} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardMeta}>
            <Text style={styles.cardAuthor} numberOfLines={1}>{complaint.title}</Text>
            <Text style={styles.cardTime}>· {timeAgo(complaint.createdAt)}</Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: st.bg, alignSelf: "flex-start", marginBottom: 6 }]}>
            <Feather name={st.icon as any} size={9} color={st.color} />
            <Text style={[styles.typePillText, { color: st.color }]}>{complaint.status.replace("_", " ")}</Text>
          </View>
          {complaint.photoUri ? (
            <Image source={{ uri: complaint.photoUri }} style={styles.postImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cmpPhotoPlaceholder, { backgroundColor: cat.bg }]}>
              <Feather name={cat.icon as any} size={28} color={cat.color + "60"} />
            </View>
          )}
          <Text style={styles.cardContent} numberOfLines={2}>{complaint.description}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <Feather name="map-pin" size={10} color="#94A3B8" />
            <Text style={{ fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", flex: 1 }} numberOfLines={1}>{complaint.location}</Text>
          </View>
          {complaint.status === "resolved" && complaint.resolvedNote ? (
            <View style={styles.resolvedNote}>
              <Feather name="check-circle" size={11} color="#059669" />
              <Text style={styles.resolvedNoteText} numberOfLines={1}>{complaint.resolvedNote}</Text>
            </View>
          ) : null}
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.action} activeOpacity={0.8}>
              <Feather name="share" size={15} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.action, { marginLeft: "auto" }]} onPress={onPress} activeOpacity={0.8}>
              <Feather name="arrow-right" size={14} color="#EA580C" />
              <Text style={[styles.actionText, { color: "#EA580C" }]}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ChatBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  const roleInfo = roleBadgeColor[msg.authorRole] || roleBadgeColor.citizen;
  return (
    <View style={[styles.bubble, isMe && styles.bubbleMe]}>
      {!isMe && <Avatar name={msg.authorName} color={msg.avatarColor} size={34} />}
      <View style={[styles.bubbleContent, isMe && styles.bubbleContentMe]}>
        {!isMe && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <Text style={styles.bubbleName}>{msg.authorName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
              <Text style={[styles.roleBadgeText, { color: roleInfo.text }]}>{msg.authorRole}</Text>
            </View>
          </View>
        )}
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.text}</Text>
        <Text style={[styles.bubbleTime, isMe && { textAlign: "right" }]}>{timeAgo(msg.createdAt)}</Text>
      </View>
    </View>
  );
}

function NewPostModal({ visible, onClose, onSubmit, canPostAnnouncement }: {
  visible: boolean; onClose: () => void;
  onSubmit: (content: string, type: PostType, imageUri?: string) => void;
  canPostAnnouncement: boolean;
}) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<PostType>("general");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const types: PostType[] = canPostAnnouncement ? ["announcement", "update", "general"] : ["general", "complaint"];

  const pickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission needed", "Please allow photo library access."); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim(), type, imageUri);
    setContent(""); setImageUri(undefined); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
              <Text style={modalStyles.title}>New Post</Text>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.label}>Post Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
              {types.map((pt) => {
                const tc = postTypeConfig[pt];
                const sel = type === pt;
                return (
                  <TouchableOpacity key={pt} style={[modalStyles.typeBtn, { borderColor: tc.color + "40", backgroundColor: sel ? tc.color : tc.bg }]} onPress={() => setType(pt)} activeOpacity={0.8}>
                    <Feather name={tc.icon as any} size={13} color={sel ? "white" : tc.color} />
                    <Text style={[modalStyles.typeBtnText, { color: sel ? "white" : tc.color }]}>{pt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TextInput
              style={modalStyles.textInput}
              value={content}
              onChangeText={setContent}
              placeholder="Share with your community..."
              placeholderTextColor="#CBD5E1"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={modalStyles.charCount}>{content.length}/500</Text>
            {imageUri ? (
              <View style={{ width: "100%", marginBottom: 12 }}>
                <Image source={{ uri: imageUri }} style={{ width: "100%", height: 160, borderRadius: 12 }} resizeMode="cover" />
                <TouchableOpacity onPress={() => setImageUri(undefined)} style={modalStyles.removeImg}>
                  <Feather name="x" size={14} color="white" />
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={modalStyles.btnRow}>
              <TouchableOpacity style={modalStyles.imgBtn} onPress={pickImage} activeOpacity={0.8}>
                <Feather name="image" size={18} color="#EA580C" />
                <Text style={modalStyles.imgBtnText}>Add Photo</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[modalStyles.postBtnWrap, !content.trim() && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!content.trim()} activeOpacity={0.85}>
                  <LinearGradient colors={["#B45309", "#EA580C"]} style={modalStyles.postBtn}>
                    <Feather name="send" size={14} color="white" />
                    <Text style={modalStyles.postBtnText}>Post</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SubscribeModal({ visible, onClose, onSubscribe }: { visible: boolean; onClose: () => void; onSubscribe: () => void }) {
  const features = [
    "Post text & photos to community",
    "Real-time group community chat",
    "Like & engage with posts",
    "Connect with BJP members in your ward",
    "Priority announcements & alerts",
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={subStyles.overlay}>
        <View style={subStyles.sheet}>
          <View style={subStyles.handle} />
          <LinearGradient colors={["#7C2D12", "#C2410C", "#EA580C"]} style={subStyles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Feather name="users" size={32} color="white" />
            <Text style={subStyles.bannerTitle}>Community Premium</Text>
            <Text style={subStyles.bannerSub}>Connect T — BJP Member Network</Text>
          </LinearGradient>
          <View style={subStyles.priceRow}>
            <View>
              <Text style={subStyles.priceCurrency}>₹</Text>
            </View>
            <Text style={subStyles.priceAmt}>199</Text>
            <View style={subStyles.priceBadge}>
              <Text style={subStyles.priceBadgeText}>One Time</Text>
            </View>
          </View>
          <Text style={subStyles.priceNote}>Lifetime access · No renewal · No hidden charges</Text>
          <View style={subStyles.featureList}>
            {features.map((f) => (
              <View key={f} style={subStyles.featureRow}>
                <View style={subStyles.featureCheck}>
                  <Feather name="check" size={12} color="white" />
                </View>
                <Text style={subStyles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={subStyles.subscribeWrap} onPress={onSubscribe} activeOpacity={0.85}>
            <LinearGradient colors={["#B45309", "#EA580C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={subStyles.subscribeBtn}>
              <Feather name="zap" size={18} color="white" />
              <Text style={subStyles.subscribeBtnText}>Subscribe & Pay ₹199</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ marginTop: 6 }}>
            <Text style={subStyles.maybeLater}>Maybe later</Text>
          </TouchableOpacity>
          <Text style={subStyles.terms}>By subscribing you agree to Connect T terms of service. This is a simulated payment.</Text>
        </View>
      </View>
    </Modal>
  );
}

function PremiumTeaser({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.premiumTeaser}>
      <LinearGradient colors={["#7C2D12", "#C2410C", "#EA580C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.premiumTeaserGrad}>
        <View style={styles.premiumTeaserIcon}>
          <Feather name="lock" size={18} color="#EA580C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.premiumTeaserTitle}>Unlock Community</Text>
          <Text style={styles.premiumTeaserSub}>Post, chat & share photos · ₹199 one-time</Text>
        </View>
        <View style={styles.premiumTeaserBtn}>
          <Text style={styles.premiumTeaserBtnText}>Join</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { posts, chatMessages, addPost, addChatMessage, toggleLike, isSubscribed, isBlocked, subscribe, blocked } = useFeed();
  const { user } = useAuth();
  const { complaints } = useComplaints();
  const { t } = useLanguage();
  const { handleScroll } = useTabBarVisibility();

  const userId = user?.id || "guest";
  const subscribed = isSubscribed(userId);
  const userBlocked = isBlocked(userId);
  const blockedUntil = blocked[userId] ? new Date(blocked[userId]).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

  const [activeTab, setActiveTab] = useState<FeedTab>(subscribed ? "community" : "news");
  const [showNewPost, setShowNewPost] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatRef = useRef<FlatList>(null);

  const canPostAnnouncement = user?.role === "nagarsevak";
  const officialPosts = posts.filter((p) => p.authorRole === "Nagarsevak" || p.authorRole === "nagarsevak" || p.type === "announcement" || p.type === "update");
  const activeComplaints = complaints.filter((c) => ["submitted", "assigned", "in_progress"].includes(c.status));
  const resolvedComplaints = complaints.filter((c) => c.status === "resolved" || c.status === "rejected");

  useEffect(() => {
    if (chatRef.current && chatMessages.length > 0) {
      setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages]);

  const handlePost = (content: string, type: PostType, imageUri?: string) => {
    const result = addPost(content, type, user?.name || "Anonymous", user?.role || "citizen", user?.avatarColor || "#EA580C", userId, imageUri);
    if (!result.success && result.reason === "blocked") {
      Alert.alert("Content Violation", "Your post contains inappropriate content. You have been blocked from posting for 24 hours.");
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    if (userBlocked) {
      Alert.alert("Blocked", `You are blocked from posting until ${blockedUntil}.`);
      return;
    }
    const result = addChatMessage(chatInput.trim(), userId, user?.name || "Anonymous", user?.role || "citizen", user?.avatarColor || "#EA580C");
    if (!result.success && result.reason === "blocked") {
      Alert.alert("Content Violation", "Your message contains inappropriate content. You have been blocked from the community for 24 hours.");
    } else {
      setChatInput("");
    }
  };

  const handleSubscribe = async () => {
    await subscribe(userId);
    setShowSubscribe(false);
    setActiveTab("community");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Welcome to Community! 🎉", "You now have full access to Connect T Community features.");
  };

  const tabs: { id: FeedTab; label: string; count?: number; locked?: boolean }[] = subscribed
    ? [
        { id: "community", label: "Community" },
        { id: "chat", label: "Chat" },
        { id: "active", label: "Active", count: activeComplaints.length },
        { id: "resolved", label: "Done", count: resolvedComplaints.length },
      ]
    : [
        { id: "news", label: "News" },
        { id: "active", label: "Active", count: activeComplaints.length },
        { id: "resolved", label: "Done", count: resolvedComplaints.length },
      ];

  const renderEmptyComplaints = (msg: string, icon: string) => (
    <View style={styles.emptyState}>
      <Feather name={icon as any} size={40} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>{msg}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#7C2D12", "#B45309", "#EA580C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Community Feed</Text>
            <Text style={styles.headerSub}>Ambernath · BJP Ward Network</Text>
          </View>
          {subscribed ? (
            <TouchableOpacity style={styles.newPostBtn} onPress={() => userBlocked ? Alert.alert("Blocked", `You are blocked until ${blockedUntil}.`) : setShowNewPost(true)} activeOpacity={0.85}>
              <Feather name="edit-2" size={14} color="white" />
              <Text style={styles.newPostBtnText}>Post</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.newPostBtn, { backgroundColor: "rgba(255,255,255,0.3)" }]} onPress={() => setShowSubscribe(true)} activeOpacity={0.85}>
              <Feather name="zap" size={14} color="white" />
              <Text style={styles.newPostBtnText}>₹199</Text>
            </TouchableOpacity>
          )}
        </View>
        {!subscribed && (
          <View style={styles.premiumBadge}>
            <Feather name="lock" size={10} color="#FDE68A" />
            <Text style={styles.premiumBadgeText}>Subscribe ₹199 to post, chat & share photos</Text>
            <TouchableOpacity onPress={() => setShowSubscribe(true)}>
              <Text style={styles.premiumBadgeLink}>Upgrade →</Text>
            </TouchableOpacity>
          </View>
        )}
        {subscribed && userBlocked && (
          <View style={styles.blockedBanner}>
            <Feather name="alert-triangle" size={12} color="#FDE68A" />
            <Text style={styles.blockedBannerText}>Posting blocked until {blockedUntil} · Community guideline violation</Text>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}{tab.count !== undefined && tab.count > 0 ? ` (${tab.count})` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {activeTab === "news" && (
        <>
          <FlatList
            data={officialPosts}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => <PostCard post={item} userId={userId} subscribed={false} />}
            contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 8) + 70 }]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListHeaderComponent={<PremiumTeaser onPress={() => setShowSubscribe(true)} />}
            ListEmptyComponent={renderEmptyComplaints("No news yet", "inbox")}
          />
        </>
      )}

      {activeTab === "community" && (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} userId={userId} subscribed={subscribed} />}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 8) + 20 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={renderEmptyComplaints("No posts yet", "inbox")}
        />
      )}

      {activeTab === "chat" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={topPad + 60}>
          {userBlocked ? (
            <View style={styles.blockedScreen}>
              <Feather name="shield-off" size={48} color="#FCA5A5" />
              <Text style={styles.blockedScreenTitle}>You're Temporarily Blocked</Text>
              <Text style={styles.blockedScreenSub}>Chat access restricted until {blockedUntil} due to community guideline violation.</Text>
            </View>
          ) : (
            <FlatList
              ref={chatRef}
              data={chatMessages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => <ChatBubble msg={item} isMe={item.authorId === userId} />}
              contentContainerStyle={[styles.chatList, { paddingBottom: Math.max(insets.bottom, 8) + 60 }]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: false })}
            />
          )}
          {!userBlocked && (
            <View style={[styles.chatInputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <Avatar name={user?.name || "U"} color={user?.avatarColor || "#EA580C"} size={34} />
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Message community..."
                placeholderTextColor="#94A3B8"
                returnKeyType="send"
                onSubmitEditing={handleSendChat}
                maxLength={300}
              />
              <TouchableOpacity onPress={handleSendChat} style={[styles.chatSendBtn, !chatInput.trim() && { opacity: 0.4 }]} disabled={!chatInput.trim()} activeOpacity={0.85}>
                <LinearGradient colors={["#B45309", "#EA580C"]} style={styles.chatSendGrad}>
                  <Feather name="send" size={16} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {activeTab === "active" && (
        <FlatList
          data={activeComplaints}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ComplaintCard complaint={item} onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: item.id } })} />}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 8) + 20 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={renderEmptyComplaints("No active complaints", "check-circle")}
        />
      )}

      {activeTab === "resolved" && (
        <FlatList
          data={resolvedComplaints}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ComplaintCard complaint={item} onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: item.id } })} />}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 8) + 20 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={renderEmptyComplaints("No resolved complaints yet", "inbox")}
        />
      )}


      {!subscribed && activeTab === "news" && (
        <View style={[styles.composeBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity style={[styles.composeInner, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]} onPress={() => setShowSubscribe(true)} activeOpacity={0.85}>
            <Feather name="lock" size={18} color="#EA580C" />
            <Text style={[styles.composePlaceholder, { color: "#C2410C", fontFamily: "Inter_600SemiBold" }]}>Subscribe to post & chat — ₹199</Text>
            <View style={{ backgroundColor: "#EA580C", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ color: "white", fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" }}>Join</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <NewPostModal visible={showNewPost} onClose={() => setShowNewPost(false)} onSubmit={handlePost} canPostAnnouncement={canPostAnnouncement} />
      <SubscribeModal visible={showSubscribe} onClose={() => setShowSubscribe(false)} onSubscribe={handleSubscribe} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  header: { paddingHorizontal: 16, paddingBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  newPostBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  newPostBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  premiumBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  premiumBadgeText: { fontSize: 11, color: "#FDE68A", fontFamily: "Inter_400Regular", flex: 1 },
  premiumBadgeLink: { fontSize: 11, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  blockedBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(220,38,38,0.3)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  blockedBannerText: { fontSize: 11, color: "#FDE68A", fontFamily: "Inter_400Regular", flex: 1 },
  tabScroll: { flexGrow: 0 },
  tabRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: "white" },
  tabText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.5)", fontFamily: "Inter_600SemiBold" },
  tabTextActive: { color: "white", fontFamily: "Inter_700Bold" },
  list: { paddingTop: 8 },
  separator: { height: 1, backgroundColor: "#E2E8F0", marginLeft: 70 },

  card: { backgroundColor: "white", paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  cardPinned: { borderLeftWidth: 3, borderLeftColor: "#7C3AED" },
  pinnedBar: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8, marginLeft: 54 },
  pinnedText: { fontSize: 10, fontWeight: "700", color: "#7C3AED", fontFamily: "Inter_600SemiBold" },
  cardBody: { flexDirection: "row", gap: 12 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap", flex: 1 },
  cardAuthor: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", flexShrink: 1 },
  cardTime: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  roleBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 10 },
  roleBadgeText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
  typePillText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  cardContent: { fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 8 },
  postImage: { width: "100%", height: 180, borderRadius: 12, marginBottom: 10, resizeMode: "cover" },
  cardActions: { flexDirection: "row", marginTop: 4, marginBottom: 10, gap: 4 },
  action: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, paddingVertical: 4 },
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
  chatInputBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingHorizontal: 12, paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  chatInput: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: "#E2E8F0", maxHeight: 80 },
  chatSendBtn: { borderRadius: 20, overflow: "hidden" },
  chatSendGrad: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  blockedScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  blockedScreenTitle: { fontSize: 20, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_700Bold", textAlign: "center" },
  blockedScreenSub: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },

  premiumTeaser: { marginHorizontal: 12, marginTop: 10, marginBottom: 4, borderRadius: 18, overflow: "hidden" },
  premiumTeaserGrad: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  premiumTeaserIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  premiumTeaserTitle: { fontSize: 14, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  premiumTeaserSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginTop: 2 },
  premiumTeaserBtn: { backgroundColor: "white", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  premiumTeaserBtnText: { fontSize: 12, fontWeight: "700", color: "#C2410C", fontFamily: "Inter_700Bold" },

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
  textInput: { backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", minHeight: 100 },
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

const subStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 32, alignItems: "center", overflow: "hidden" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", marginTop: 12, marginBottom: 0 },
  banner: { width: "100%", paddingVertical: 28, paddingHorizontal: 24, alignItems: "center", gap: 8, marginBottom: 20 },
  bannerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  bannerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" },
  priceRow: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginBottom: 4 },
  priceCurrency: { fontSize: 20, fontWeight: "700", color: "#C2410C", fontFamily: "Inter_700Bold", marginTop: 6 },
  priceAmt: { fontSize: 56, fontWeight: "900", color: "#C2410C", fontFamily: "Inter_700Bold", lineHeight: 60 },
  priceBadge: { backgroundColor: "#FFF7ED", borderWidth: 1.5, borderColor: "#FED7AA", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "center" },
  priceBadgeText: { fontSize: 12, fontWeight: "700", color: "#C2410C", fontFamily: "Inter_700Bold" },
  priceNote: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 20 },
  featureList: { width: "100%", paddingHorizontal: 24, gap: 10, marginBottom: 24 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  featureText: { fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular", flex: 1 },
  subscribeWrap: { width: "88%", borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  subscribeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  subscribeBtnText: { fontSize: 16, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  maybeLater: { fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  terms: { fontSize: 10, color: "#CBD5E1", fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24, marginTop: 10, lineHeight: 14 },
});
