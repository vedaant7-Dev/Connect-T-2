import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export type PostType = "announcement" | "update" | "complaint" | "general";

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  avatarColor: string;
  type: PostType;
  content: string;
  imageUri?: string;
  likes: string[];
  commentsCount: number;
  createdAt: string;
  pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  avatarColor: string;
  text: string;
  createdAt: string;
}

interface FeedContextType {
  posts: FeedPost[];
  chatMessages: ChatMessage[];
  loading: boolean;
  subscriptions: Record<string, boolean>;
  blocked: Record<string, number>;
  subscribe: (userId: string) => Promise<void>;
  isSubscribed: (userId: string) => boolean;
  isBlocked: (userId: string) => boolean;
  blockUser: (userId: string) => Promise<void>;
  addPost: (
    content: string,
    type: PostType,
    authorName: string,
    authorRole: string,
    avatarColor: string,
    authorId: string,
    imageUri?: string
  ) => Promise<{ success: boolean; reason?: string }>;
  addChatMessage: (
    text: string,
    authorId: string,
    authorName: string,
    authorRole: string,
    avatarColor: string
  ) => Promise<{ success: boolean; reason?: string }>;
  deleteChatMessage: (msgId: string) => Promise<void>;
  editChatMessage: (msgId: string, newText: string) => Promise<void>;
  toggleLike: (postId: string, userId: string) => Promise<void>;
  refreshFeed: () => Promise<void>;
}

const FeedContext = createContext<FeedContextType | null>(null);

const BAD_WORDS = [
  "fuck", "f*ck", "fuk", "fucker", "fucking", "fucks",
  "shit", "sh*t", "bullshit",
  "ass", "asshole", "arse",
  "bitch", "b*tch", "bitches",
  "bastard", "cunt", "c*nt",
  "cock", "c*ck", "dick", "d*ck",
  "pussy", "p*ssy",
  "whore", "slut",
  "sex", "sexy", "sexual", "sexting", "s3x",
  "porn", "porno", "p0rn", "pornography",
  "nude", "nudes", "naked",
  "boob", "boobs", "breast", "nipple",
  "rape", "raping", "raped",
  "masturbate", "masturbation",
  "penis", "vagina", "condom",
  "chutiya", "ch*tiya", "chutiye",
  "madarchod", "madarc**d", "mc",
  "bhenchod", "bhenc**d", "bc",
  "gaandu", "gaand", "g**nd",
  "randi", "r**di",
  "harami", "haramzada",
  "bhosdike", "bhosdi",
  "lavda", "l**da", "lund", "l**d",
  "chut", "ch*t",
  "madarjat", "gandu", "kutiya", "randwa",
  "kamina", "saala", "sala", "sali",
];

export function hasBadContent(text: string): boolean {
  const lower = text.toLowerCase().replace(/\s+/g, " ");
  return BAD_WORDS.some((word) => lower.includes(word));
}

function generateId(prefix: string) {
  return prefix + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 3).toUpperCase();
}

function normalizePost(raw: any): FeedPost {
  const likesCsv = String(raw.likes_csv || "");
  const likes = Array.isArray(raw.likes)
    ? raw.likes.map(String)
    : likesCsv
      ? likesCsv.split(",").filter(Boolean)
      : [];

  return {
    id: String(raw.id),
    authorId: String(raw.authorId || raw.author_id || ""),
    authorName: raw.authorName || raw.author_name || "User",
    authorRole: raw.authorRole || raw.author_role || "citizen",
    avatarColor: raw.avatarColor || raw.avatar_color || "#EA580C",
    type: (raw.type || "general") as PostType,
    content: raw.content || "",
    imageUri: raw.imageUri || raw.image_uri || undefined,
    likes,
    commentsCount: Number(raw.commentsCount || raw.comments_count || 0),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    pinned: raw.pinned === true || raw.pinned === 1,
  };
}

function normalizeChat(raw: any): ChatMessage {
  return {
    id: String(raw.id),
    authorId: String(raw.authorId || raw.author_id || ""),
    authorName: raw.authorName || raw.author_name || "User",
    authorRole: raw.authorRole || raw.author_role || "citizen",
    avatarColor: raw.avatarColor || raw.avatar_color || "#EA580C",
    text: raw.text || "",
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

export function FeedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
  const [blocked, setBlocked] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refreshFeed = useCallback(async () => {
    try {
      setLoading(true);

      const [postsRes, chatRes] = await Promise.all([
        apiGet<any>("/api/feed/posts"),
        apiGet<any>("/api/chat/messages"),
      ]);

      setPosts(Array.isArray(postsRes.posts) ? postsRes.posts.map(normalizePost) : []);
      setChatMessages(Array.isArray(chatRes.messages) ? chatRes.messages.map(normalizeChat) : []);

      if (user?.id) {
        const [subsRes, blocksRes] = await Promise.all([
          apiGet<any>(`/api/feed/subscriptions?user_id=${encodeURIComponent(user.id)}`),
          apiGet<any>(`/api/feed/blocks?user_id=${encodeURIComponent(user.id)}`),
        ]);

        const nextSubs: Record<string, boolean> = {};
        for (const item of subsRes.subscriptions || []) {
          nextSubs[String(item.target_user_id)] = true;
        }

        const nextBlocked: Record<string, number> = {};
        for (const item of blocksRes.blocks || []) {
          nextBlocked[String(item.blocked_user_id)] = Number(item.blocked_until);
        }

        setSubscriptions(nextSubs);
        setBlocked(nextBlocked);
      } else {
        setSubscriptions({});
        setBlocked({});
      }
    } catch (error) {
      console.error("Failed to load feed/chat from MySQL", error);
      setPosts([]);
      setChatMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed]);

  const isSubscribed = (userId: string) => !!subscriptions[userId];

  const isBlocked = (userId: string) => {
    const until = blocked[userId];
    if (!until) return false;
    return Date.now() <= until;
  };

  const subscribe = async (targetUserId: string) => {
    if (!user?.id) return;

    await apiPost("/api/feed/subscriptions", {
      subscriber_id: user.id,
      target_user_id: targetUserId,
    });

    await refreshFeed();
  };

  const blockUser = async (blockedUserId: string) => {
    if (!user?.id) return;

    const until = Date.now() + 24 * 60 * 60 * 1000;

    await apiPost("/api/feed/blocks", {
      user_id: user.id,
      blocked_user_id: blockedUserId,
      blocked_until: until,
      reason: "bad_content",
    });

    await refreshFeed();
  };

  const addPost = async (
    content: string,
    type: PostType,
    authorName: string,
    authorRole: string,
    avatarColor: string,
    authorId: string,
    imageUri?: string
  ) => {
    if (hasBadContent(content)) {
      await blockUser(authorId);
      return { success: false, reason: "blocked" };
    }

    await apiPost("/api/feed/posts", {
      id: generateId("P"),
      author_id: authorId,
      author_name: authorName,
      author_role: authorRole,
      avatar_color: avatarColor,
      type,
      content,
      image_uri: imageUri || null,
      pinned: false,
    });

    await refreshFeed();
    return { success: true };
  };

  const addChatMessage = async (
    text: string,
    authorId: string,
    authorName: string,
    authorRole: string,
    avatarColor: string
  ) => {
    if (hasBadContent(text)) {
      await blockUser(authorId);
      return { success: false, reason: "blocked" };
    }

    await apiPost("/api/chat/messages", {
      id: generateId("M"),
      author_id: authorId,
      author_name: authorName,
      author_role: authorRole,
      avatar_color: avatarColor,
      text,
    });

    await refreshFeed();
    return { success: true };
  };

  const deleteChatMessage = async (msgId: string) => {
    await apiDelete(`/api/chat/messages/${encodeURIComponent(msgId)}`);
    await refreshFeed();
  };

  const editChatMessage = async (msgId: string, newText: string) => {
    const clean = newText.trim();
    if (!clean || hasBadContent(clean)) return;

    await apiPatch(`/api/chat/messages/${encodeURIComponent(msgId)}`, {
      text: `${clean} (edited)`,
    });

    await refreshFeed();
  };

  const toggleLike = async (postId: string, userId: string) => {
    const post = posts.find((p) => p.id === postId);
    const liked = !!post?.likes.includes(userId);

    if (liked) {
      await apiDelete(`/api/feed/posts/${encodeURIComponent(postId)}/like?user_id=${encodeURIComponent(userId)}`);
    } else {
      await apiPost(`/api/feed/posts/${encodeURIComponent(postId)}/like`, {
        user_id: userId,
      });
    }

    await refreshFeed();
  };

  return (
    <FeedContext.Provider value={{
      posts,
      chatMessages,
      loading,
      subscriptions,
      blocked,
      subscribe,
      isSubscribed,
      isBlocked,
      blockUser,
      addPost,
      addChatMessage,
      deleteChatMessage,
      editChatMessage,
      toggleLike,
      refreshFeed,
    }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be inside FeedProvider");
  return ctx;
}
