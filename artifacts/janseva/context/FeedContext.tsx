import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PostType = "announcement" | "update" | "complaint" | "general";

export interface FeedPost {
  id: string;
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

interface FeedContextType {
  posts: FeedPost[];
  addPost: (content: string, type: PostType, authorName: string, authorRole: string, avatarColor: string) => void;
  toggleLike: (postId: string, userId: string) => void;
  loading: boolean;
}

const FeedContext = createContext<FeedContextType | null>(null);
const STORAGE_KEY = "janseva_feed";

function generateId() {
  return "POST" + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();
}

const SEED_POSTS: FeedPost[] = [
  {
    id: "POST001",
    authorName: "ULMC Ulhasnagar",
    authorRole: "Head Admin",
    avatarColor: "#1E40AF",
    type: "announcement",
    content: "🚨 Important: Water supply will be suspended in Camp 4 & Camp 5 on Sunday 6AM-2PM for pipe maintenance. Please store water in advance.",
    likes: [],
    commentsCount: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pinned: true,
  },
  {
    id: "POST002",
    authorName: "Ward Officer Patil",
    authorRole: "Nagarsevak",
    avatarColor: "#059669",
    type: "update",
    content: "✅ Update: The pothole near Camp 1 main road has been repaired. Road stretching 200m has been resurfaced. Thank you for your patience.",
    likes: [],
    commentsCount: 5,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "POST003",
    authorName: "Rajesh Sharma",
    authorRole: "Citizen",
    avatarColor: "#7C3AED",
    type: "general",
    content: "The new streetlights on Station Road are excellent! Finally feel safe walking at night. Great work ULMC 👏",
    likes: [],
    commentsCount: 3,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "POST004",
    authorName: "ULMC Ulhasnagar",
    authorRole: "Head Admin",
    avatarColor: "#1E40AF",
    type: "announcement",
    content: "📋 PM Awas Yojana applications open until April 30. Eligible citizens can apply at ward offices or online at pmaymis.gov.in. Required documents: Aadhar, PAN, income proof.",
    likes: [],
    commentsCount: 18,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "POST005",
    authorName: "Sunita Bai",
    authorRole: "Citizen",
    avatarColor: "#D97706",
    type: "general",
    content: "Garbage has not been collected from our lane for 3 days. Area near Camp 3 Market is smelling badly. Please take action 🙏",
    likes: [],
    commentsCount: 7,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function FeedProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        setPosts(JSON.parse(stored));
      } else {
        setPosts(SEED_POSTS);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_POSTS));
      }
      setLoading(false);
    });
  }, []);

  const save = (updated: FeedPost[]) => {
    setPosts(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addPost = (content: string, type: PostType, authorName: string, authorRole: string, avatarColor: string) => {
    const post: FeedPost = {
      id: generateId(),
      authorName,
      authorRole,
      avatarColor,
      type,
      content,
      likes: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    save([post, ...posts]);
  };

  const toggleLike = (postId: string, userId: string) => {
    const updated = posts.map((p) => {
      if (p.id !== postId) return p;
      const liked = p.likes.includes(userId);
      return { ...p, likes: liked ? p.likes.filter((id) => id !== userId) : [...p.likes, userId] };
    });
    save(updated);
  };

  return (
    <FeedContext.Provider value={{ posts, addPost, toggleLike, loading }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be inside FeedProvider");
  return ctx;
}
