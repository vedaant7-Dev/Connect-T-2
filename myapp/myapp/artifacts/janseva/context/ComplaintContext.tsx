import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ComplaintStatus = "submitted" | "assigned" | "in_progress" | "resolved" | "rejected";

export type ComplaintCategory =
  | "roads"
  | "water"
  | "electricity"
  | "garbage"
  | "drainage"
  | "streetlight"
  | "encroachment"
  | "other";

export interface StatusUpdate {
  status: ComplaintStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  photoUri?: string;
  location: string;
  ward: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  timeline: StatusUpdate[];
  assignedTo?: string;
  resolvedNote?: string;
  userName?: string;
  userMobile?: string;
  userAddress?: string;
  userAge?: number;
  userEmail?: string;
}

interface ComplaintContextType {
  complaints: Complaint[];
  addComplaint: (data: Omit<Complaint, "id" | "createdAt" | "updatedAt" | "timeline" | "status">) => Complaint;
  updateStatus: (id: string, status: ComplaintStatus, note?: string, updatedBy?: string) => void;
  getComplaintById: (id: string) => Complaint | undefined;
  loading: boolean;
}

const ComplaintContext = createContext<ComplaintContextType | null>(null);

const STORAGE_KEY = "janseva_complaints_v3";

function generateId(): string {
  return "CMP" + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 4).toUpperCase();
}

export function ComplaintProvider({ children }: { children: ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setComplaints(JSON.parse(stored));
      } else {
        setComplaints([]);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      }
    } catch (e) {
      console.error("Failed to load complaints", e);
    } finally {
      setLoading(false);
    }
  };

  const saveComplaints = async (updated: Complaint[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save complaints", e);
    }
  };

  const addComplaint = (data: Omit<Complaint, "id" | "createdAt" | "updatedAt" | "timeline" | "status">): Complaint => {
    const now = new Date().toISOString();
    const newComplaint: Complaint = {
      ...data,
      id: generateId(),
      status: "submitted",
      createdAt: now,
      updatedAt: now,
      timeline: [
        {
          status: "submitted",
          timestamp: now,
          note: "Complaint registered successfully",
          updatedBy: "System",
        },
      ],
    };
    const updated = [newComplaint, ...complaints];
    setComplaints(updated);
    saveComplaints(updated);
    return newComplaint;
  };

  const updateStatus = (id: string, status: ComplaintStatus, note?: string, updatedBy?: string) => {
    const now = new Date().toISOString();
    const updated = complaints.map((c) => {
      if (c.id !== id) return c;
      const newEntry: StatusUpdate = {
        status,
        timestamp: now,
        note: note || getDefaultNote(status),
        updatedBy: updatedBy || "Ward Officer",
      };
      return {
        ...c,
        status,
        updatedAt: now,
        timeline: [...c.timeline, newEntry],
        resolvedNote: status === "resolved" ? note : c.resolvedNote,
      };
    });
    setComplaints(updated);
    saveComplaints(updated);
  };

  const getComplaintById = (id: string) => complaints.find((c) => c.id === id);

  return (
    <ComplaintContext.Provider value={{ complaints, addComplaint, updateStatus, getComplaintById, loading }}>
      {children}
    </ComplaintContext.Provider>
  );
}

export function useComplaints() {
  const ctx = useContext(ComplaintContext);
  if (!ctx) throw new Error("useComplaints must be used inside ComplaintProvider");
  return ctx;
}

function getDefaultNote(status: ComplaintStatus): string {
  switch (status) {
    case "assigned": return "Complaint assigned to ward team";
    case "in_progress": return "Work has begun on this complaint";
    case "resolved": return "Issue has been resolved";
    case "rejected": return "Complaint could not be processed";
    default: return "";
  }
}

