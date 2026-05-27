import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";

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
  wardCode?: string | null;
  assignedOfficerId?: string | null;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  timeline: StatusUpdate[];
  assignedTo?: string;
  resolvedNote?: string;
  userId?: string;
  userName?: string;
  userMobile?: string;
  userAddress?: string;
  userAge?: number;
  userEmail?: string;
}

export type NewComplaintData = {
  title: string;
  description: string;
  category: ComplaintCategory;
  photoUri?: string;
  location: string;
  ward: string;
  wardCode?: string | null;
  assignedOfficerId?: string | null;
  userId?: string;
  userName?: string;
  userMobile?: string;
  userAddress?: string;
  userAge?: number;
  userEmail?: string;
};

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

function getApiError(result: any, fallback: string) {
  return result?.message || result?.error || fallback;
}

function normalizeMobileValue(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: text };
  }
}

function normalizeStatus(status: any): ComplaintStatus {
  if (
    status === "submitted" ||
    status === "assigned" ||
    status === "in_progress" ||
    status === "resolved" ||
    status === "rejected"
  ) {
    return status;
  }

  return "submitted";
}

function normalizeCategory(category: any): ComplaintCategory {
  if (
    category === "roads" ||
    category === "water" ||
    category === "electricity" ||
    category === "garbage" ||
    category === "drainage" ||
    category === "streetlight" ||
    category === "encroachment" ||
    category === "other"
  ) {
    return category;
  }

  return "other";
}

function normalizeComplaint(item: any): Complaint {
  const createdAt =
    item.created_at || item.createdAt || new Date().toISOString();

  const updatedAt = item.updated_at || item.updatedAt || createdAt;

  const status = normalizeStatus(item.status);

  return {
    id: String(item.id),

    title: item.title || "",

    description: item.description || "",

    category: normalizeCategory(item.category),

    photoUri: item.photo_url || item.photoUri || "",

    location: item.location || "",

    ward: item.ward || "",

    wardCode: item.ward_code || item.wardCode || null,

    assignedOfficerId:
      item.assigned_officer_id || item.assignedOfficerId || null,

    status,

    createdAt,

    updatedAt,

    timeline:
      Array.isArray(item.timeline) && item.timeline.length > 0
        ? item.timeline.map((t: any) => ({
            status: normalizeStatus(t.status),
            timestamp: t.created_at || t.timestamp || createdAt,
            note: t.note,
            updatedBy: t.updated_by || t.updatedBy,
          }))
        : buildTimeline(status, createdAt),

    assignedTo: item.assigned_to || item.assignedTo,

    resolvedNote: item.resolved_note || item.resolvedNote,

    userId: item.user_id || item.userId,

    userName: item.user_name || item.userName,

    userMobile: item.user_mobile || item.userMobile,

    userAddress: item.user_address || item.userAddress,

    userAge:
      item.user_age !== undefined && item.user_age !== null
        ? Number(item.user_age)
        : item.userAge,

    userEmail: item.user_email || item.userEmail,
  };
}

function buildUrl(path: string, params?: Record<string, string | undefined>) {
  const cleanBase = API_BASE_URL.replace(/\/$/, "");
  const url = new URL(`${cleanBase}${path}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export function ComplaintProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshComplaints = useCallback(async () => {
    if (!user) {
      setComplaints([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params: Record<string, string | undefined> = {};

      if (user.role === "citizen") {
        params.user_mobile = user.mobile;
      }

      if (user.role === "nagarsevak") {
        if (user.wardCode) {
          params.ward_code = user.wardCode;
        } else if (user.ward) {
          params.ward = user.ward;
        }
      }

      const response = await fetch(buildUrl("/api/complaints", params));
      const result = await readJsonResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(getApiError(result, "Failed to load complaints"));
      }

      const normalizedComplaints: Complaint[] = (result.complaints || []).map(normalizeComplaint);

      const safeComplaints = normalizedComplaints.filter((complaint: Complaint) => {
        if (user.role === "citizen") {
          const userMobile = normalizeMobileValue(user.mobile);
          const complaintMobile = normalizeMobileValue(complaint.userMobile);
          const userId = String(user.id || "");
          const complaintUserId = String(complaint.userId || "");

          return (
            (!!userMobile && complaintMobile === userMobile) ||
            (!!userId && complaintUserId === userId)
          );
        }

        if (user.role === "nagarsevak") {
          if (user.wardCode) {
            return String(complaint.wardCode || "").toLowerCase() === String(user.wardCode).toLowerCase();
          }

          if (user.ward) {
            return String(complaint.ward || "").toLowerCase() === String(user.ward).toLowerCase();
          }
        }

        return true;
      });

      setComplaints(safeComplaints);
    } catch (error) {
      console.error("Failed to load complaints", error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshComplaints();
  }, [refreshComplaints]);

  const addComplaint = async (data: NewComplaintData): Promise<Complaint> => {
    const now = new Date().toISOString();

    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category || "other",
      photo_url: data.photoUri || null,
      location: data.location.trim(),
      ward: data.ward?.trim() || "Ward Pending",
      ward_code: data.wardCode || user?.wardCode || null,
      assigned_officer_id: data.assignedOfficerId || null,
      user_id: data.userId || user?.id || null,
      user_name: data.userName || user?.name || null,
      user_mobile: normalizeMobileValue(data.userMobile || user?.mobile) || null,
      user_address: data.userAddress || user?.address || null,
      user_age: data.userAge || user?.age || null,
      user_email: data.userEmail || user?.email || null,
    };

    const response = await fetch(buildUrl("/api/complaints"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await readJsonResponse(response);

    if (!response.ok || !result.success) {
      throw new Error(getApiError(result, "Failed to create complaint"));
    }

    const created = normalizeComplaint({
      ...payload,
      id: result.complaintId || result.complaint?.id || Date.now().toString(),
      status: "submitted",
      created_at: now,
      updated_at: now,
      timeline: buildTimeline("submitted", now),
      ward_code: result.ward_code ?? payload.ward_code,
      assigned_officer_id:
        result.assigned_officer_id ?? payload.assigned_officer_id,
    });

    setComplaints((prev) => [created, ...prev]);

    void refreshComplaints();

    return created;
  };

  const updateStatus = async (
    id: string,
    status: ComplaintStatus,
    note?: string,
    updatedBy?: string,
  ) => {
    const response = await fetch(buildUrl(`/api/complaints/${id}/status`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        note,
        updated_by: updatedBy || user?.name || "Officer",
      }),
    });

    const result = await readJsonResponse(response);

    if (!response.ok || !result.success) {
      throw new Error(getApiError(result, "Failed to update complaint status"));
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
