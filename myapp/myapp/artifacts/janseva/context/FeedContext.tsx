import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  ) => { success: boolean; reason?: string };
  addChatMessage: (
    text: string,
    authorId: string,
    authorName: string,
    authorRole: string,
    avatarColor: string
  ) => { success: boolean; reason?: string };
  deleteChatMessage: (msgId: string) => void;
  editChatMessage: (msgId: string, newText: string) => void;
  toggleLike: (postId: string, userId: string) => void;
}

const FeedContext = createContext<FeedContextType | null>(null);

const STORAGE_KEY = "janseva_feed_v3";
const CHAT_KEY = "janseva_chat_v3";
const SUBSCRIPTIONS_KEY = "janseva_subscriptions";
const BLOCKED_KEY = "janseva_blocked";

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

function generateId() {
  return "P" + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 3).toUpperCase();
}


export function FeedProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
  const [blocked, setBlocked] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(CHAT_KEY),
      AsyncStorage.getItem(SUBSCRIPTIONS_KEY),
      AsyncStorage.getItem(BLOCKED_KEY),
    ]).then(([storedPosts, storedChat, storedSubs, storedBlocked]) => {
      setPosts(storedPosts ? JSON.parse(storedPosts) : []);
      setChatMessages(storedChat ? JSON.parse(storedChat) : []);
      setSubscriptions(storedSubs ? JSON.parse(storedSubs) : {});
      setBlocked(storedBlocked ? JSON.parse(storedBlocked) : {});
      if (!storedPosts) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      if (!storedChat) AsyncStorage.setItem(CHAT_KEY, JSON.stringify([]));
      setLoading(false);
    });
  }, []);

  const savePosts = (updated: FeedPost[]) => {
    setPosts(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const saveChat = (updated: ChatMessage[]) => {
    setChatMessages(updated);
    AsyncStorage.setItem(CHAT_KEY, JSON.stringify(updated));
  };

  const isSubscribed = (userId: string) => !!subscriptions[userId];

  const isBlocked = (userId: string) => {
    const until = blocked[userId];
    if (!until) return false;
    if (Date.now() > until) {
      const next = { ...blocked };
      delete next[userId];
      setBlocked(next);
      AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(next));
      return false;
    }
    return true;
  };

  const subscribe = async (userId: string) => {
    const next = { ...subscriptions, [userId]: true };
    setSubscriptions(next);
    await AsyncStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(next));
  };

  const blockUser = async (userId: string) => {
    const until = Date.now() + 24 * 60 * 60 * 1000;
    const next = { ...blocked, [userId]: until };
    setBlocked(next);
    await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(next));
  };

  const addPost = (
    content: string,
    type: PostType,
    authorName: string,
    authorRole: string,
    avatarColor: string,
    authorId: string,
    imageUri?: string
  ): { success: boolean; reason?: string } => {
    if (hasBadContent(content)) {
      blockUser(authorId);
      return { success: false, reason: "blocked" };
    }
    const post: FeedPost = {
      id: generateId(),
      authorId,
      authorName,
      authorRole,
      avatarColor,
      type,
      content,
      imageUri,
      likes: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    savePosts([post, ...posts]);
    return { success: true };
  };

  const addChatMessage = (
    text: string,
    authorId: string,
    authorName: string,
    authorRole: string,
    avatarColor: string
  ): { success: boolean; reason?: string } => {
    if (hasBadContent(text)) {
      blockUser(authorId);
      return { success: false, reason: "blocked" };
    }
    const msg: ChatMessage = {
      id: generateId(),
      authorId,
      authorName,
      authorRole,
      avatarColor,
      text,
      createdAt: new Date().toISOString(),
    };
    saveChat([...chatMessages, msg]);
    return { success: true };
  };

  const deleteChatMessage = (msgId: string) => {
    saveChat(chatMessages.filter((m) => m.id !== msgId));
  };

  const editChatMessage = (msgId: string, newText: string) => {
    if (!newText.trim() || hasBadContent(newText)) return;
    saveChat(chatMessages.map((m) => m.id === msgId ? { ...m, text: newText.trim() + " (edited)" } : m));
  };

  const toggleLike = (postId: string, userId: string) => {
    const updated = posts.map((p) => {
      if (p.id !== postId) return p;
      const liked = p.likes.includes(userId);
      return { ...p, likes: liked ? p.likes.filter((id) => id !== userId) : [...p.likes, userId] };
    });
    savePosts(updated);
  };

  return (
    <FeedContext.Provider value={{
      posts, chatMessages, loading,
      subscriptions, blocked,
      subscribe, isSubscribed, isBlocked, blockUser,
      addPost, addChatMessage, deleteChatMessage, editChatMessage, toggleLike,
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
