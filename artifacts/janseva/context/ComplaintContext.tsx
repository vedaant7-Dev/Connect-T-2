import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { API_BASE_URL } from "@/constants/api";

export type ComplaintStatus =
  | "submitted"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "rejected";

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

type NewComplaintData = Omit<
  Complaint,
  "id" | "createdAt" | "updatedAt" | "timeline" | "status"
>;

interface ComplaintContextType {
  complaints: Complaint[];
  loading: boolean;
  addComplaint: (data: NewComplaintData) => Promise<Complaint>;
  updateStatus: (
    id: string,
    status: ComplaintStatus,
    note?: string,
    updatedBy?: string,
  ) => Promise<void>;
  getComplaintById: (id: string) => Complaint | undefined;
  refreshComplaints: () => Promise<void>;
}

const ComplaintContext = createContext<ComplaintContextType | null>(null);

function buildTimeline(
  status: ComplaintStatus,
  createdAt: string,
): StatusUpdate[] {
  return [
    {
      status,
      timestamp: createdAt,
      note: "Complaint registered successfully",
      updatedBy: "System",
    },
  ];
}

function normalizeComplaint(item: any): Complaint {
  const createdAt =
    item.created_at || item.createdAt || new Date().toISOString();
  const updatedAt = item.updated_at || item.updatedAt || createdAt;
  const status: ComplaintStatus = item.status || "submitted";

  return {
    id: String(item.id),
    title: item.title || "",
    description: item.description || "",
    category: item.category || "other",
    photoUri: item.photo_url || item.photoUri || "",
    location: item.location || "",
    ward: item.ward || "",
    status,
    createdAt,
    updatedAt,
    timeline:
      Array.isArray(item.timeline) && item.timeline.length > 0
        ? item.timeline
        : buildTimeline(status, createdAt),
    assignedTo: item.assigned_to || item.assignedTo,
    resolvedNote: item.resolved_note || item.resolvedNote,
    userName: item.user_name || item.userName,
    userMobile: item.user_mobile || item.userMobile,
    userAddress: item.user_address || item.userAddress,
    userAge: item.user_age || item.userAge,
    userEmail: item.user_email || item.userEmail,
  };
}

export function ComplaintProvider({ children }: { children: ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshComplaints = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/complaints`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load complaints");
      }

      setComplaints((data.complaints || []).map(normalizeComplaint));
    } catch (error) {
      console.error("Failed to load complaints", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshComplaints();
  }, []);

  const addComplaint = async (data: NewComplaintData): Promise<Complaint> => {
    const response = await fetch(`${API_BASE_URL}/api/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to create complaint");
    }

    const now = new Date().toISOString();

    const complaint: Complaint = normalizeComplaint({
      ...data,
      id: result.complaintId || result.complaint?.id,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });

    setComplaints((prev) => [complaint, ...prev]);
    await refreshComplaints();

    return complaint;
  };

  const updateStatus = async (
    id: string,
    status: ComplaintStatus,
    note?: string,
    updatedBy?: string,
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/api/complaints/${id}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          note,
          updatedBy,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to update complaint status");
    }

    await refreshComplaints();
  };

  const getComplaintById = (id: string) => {
    return complaints.find((c) => String(c.id) === String(id));
  };

  return (
    <ComplaintContext.Provider
      value={{
        complaints,
        loading,
        addComplaint,
        updateStatus,
        getComplaintById,
        refreshComplaints,
      }}
    >
      {children}
    </ComplaintContext.Provider>
  );
}

export function useComplaints() {
  const ctx = useContext(ComplaintContext);

  if (!ctx) {
    throw new Error("useComplaints must be used inside ComplaintProvider");
  }

  return ctx;
}
