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
}

interface ComplaintContextType {
  complaints: Complaint[];
  addComplaint: (data: Omit<Complaint, "id" | "createdAt" | "updatedAt" | "timeline" | "status">) => Complaint;
  updateStatus: (id: string, status: ComplaintStatus, note?: string, updatedBy?: string) => void;
  getComplaintById: (id: string) => Complaint | undefined;
  loading: boolean;
}

const ComplaintContext = createContext<ComplaintContextType | null>(null);

const STORAGE_KEY = "janseva_complaints";

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
        // Seed with demo complaints
        const demos = getDemoComplaints();
        setComplaints(demos);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(demos));
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

function getDemoComplaints(): Complaint[] {
  const now = Date.now();
  return [
    {
      id: "CMP001AB",
      title: "Pothole on Main Road",
      description: "Large pothole near Camp 1 main road causing accidents",
      category: "roads",
      location: "Near Camp 1 Main Road, Ulhasnagar",
      ward: "Camp 1 — Ulhasnagar",
      status: "in_progress",
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      timeline: [
        { status: "submitted", timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), note: "Complaint registered", updatedBy: "System" },
        { status: "assigned", timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), note: "Assigned to road maintenance team", updatedBy: "Ward Officer Patil" },
        { status: "in_progress", timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), note: "Team is working on repair", updatedBy: "Ward Officer Patil" },
      ],
      assignedTo: "Road Maintenance Team",
    },
    {
      id: "CMP002CD",
      title: "No Water Supply for 2 Days",
      description: "Water supply completely stopped in our building",
      category: "water",
      location: "Building 12, Camp 3 Ulhasnagar",
      ward: "Camp 3 — Ulhasnagar",
      status: "resolved",
      createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
      timeline: [
        { status: "submitted", timestamp: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), note: "Complaint registered", updatedBy: "System" },
        { status: "assigned", timestamp: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(), note: "Assigned to ULMC water dept", updatedBy: "Admin" },
        { status: "in_progress", timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), note: "Pipeline repair started", updatedBy: "ULMC Team" },
        { status: "resolved", timestamp: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(), note: "Water supply restored", updatedBy: "ULMC Team" },
      ],
      resolvedNote: "Water supply restored. Pipe replaced.",
    },
    {
      id: "CMP003EF",
      title: "Street Light Not Working",
      description: "5 street lights not working near school causing safety issues at night",
      category: "streetlight",
      location: "School Road, Camp 5 Ulhasnagar",
      ward: "Camp 5 — Ulhasnagar",
      status: "submitted",
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      timeline: [
        { status: "submitted", timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), note: "Complaint registered", updatedBy: "System" },
      ],
    },
  ];
}
