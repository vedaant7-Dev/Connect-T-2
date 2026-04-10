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

const STORAGE_KEY = "janseva_feed";
const CHAT_KEY = "janseva_chat";
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

const SEED_POSTS: FeedPost[] = [
  {
    id: "POST001",
    authorId: "SYSTEM",
    authorName: "AMC Ambernath",
    authorRole: "Nagarsevak",
    avatarColor: "#059669",
    type: "announcement",
    content: "🚨 Important: Water supply will be suspended in Station Area East & Vithalwadi on Sunday 6AM–2PM for pipe maintenance at Barvi Dam distribution line. Please store water in advance. Tanker service: 0251-2604155.",
    likes: [],
    commentsCount: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pinned: true,
  },
  {
    id: "POST002",
    authorId: "SYSTEM",
    authorName: "Ward Officer Deshmukh",
    authorRole: "Nagarsevak",
    avatarColor: "#059669",
    type: "update",
    content: "✅ Update: The pothole near Shivaji Chowk main road has been repaired. Road stretching 300m has been resurfaced under Smart City Mission. Thank you for your patience.",
    likes: [],
    commentsCount: 5,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "POST003",
    authorId: "U001",
    authorName: "Rajesh Patil",
    authorRole: "Citizen",
    avatarColor: "#7C3AED",
    type: "general",
    content: "The new streetlights near Ambernath Railway Station are excellent! Finally feel safe walking at night. Great work AMC 👏",
    likes: [],
    commentsCount: 3,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "POST004",
    authorId: "SYSTEM",
    authorName: "AMC Ambernath",
    authorRole: "Nagarsevak",
    avatarColor: "#059669",
    type: "announcement",
    content: "📋 PM Awas Yojana applications open until April 30. Eligible Ambernath citizens can apply at Ward Office, Shivaji Chowk or online at pmaymis.gov.in. Required: Aadhaar, PAN, income proof.",
    likes: [],
    commentsCount: 18,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "POST005",
    authorId: "U002",
    authorName: "Sunita Bai",
    authorRole: "Citizen",
    avatarColor: "#D97706",
    type: "general",
    content: "Garbage has not been collected from our lane in MIDC Area for 3 days. Area near Old Ambernath Market is smelling badly. Please take action 🙏",
    likes: [],
    commentsCount: 7,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const SEED_CHAT: ChatMessage[] = [
  {
    id: "CHAT001",
    authorId: "SYSTEM",
    authorName: "AMC Ambernath",
    authorRole: "Nagarsevak",
    avatarColor: "#059669",
    text: "Welcome to Connect T Community Chat! Share updates, ask questions and stay connected with your ward. Please be respectful 🙏",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "CHAT002",
    authorId: "U001",
    authorName: "Rajesh Patil",
    authorRole: "Citizen",
    avatarColor: "#7C3AED",
    text: "Anyone knows when the Shivaji Chowk road widening work will be complete?",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "CHAT003",
    authorId: "SYSTEM",
    authorName: "Ward Officer Deshmukh",
    authorRole: "Nagarsevak",
    avatarColor: "#059669",
    text: "Road widening expected to complete by end of April. Thank you for patience!",
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

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
      setPosts(storedPosts ? JSON.parse(storedPosts) : SEED_POSTS);
      setChatMessages(storedChat ? JSON.parse(storedChat) : SEED_CHAT);
      setSubscriptions(storedSubs ? JSON.parse(storedSubs) : {});
      setBlocked(storedBlocked ? JSON.parse(storedBlocked) : {});
      if (!storedPosts) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_POSTS));
      if (!storedChat) AsyncStorage.setItem(CHAT_KEY, JSON.stringify(SEED_CHAT));
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
