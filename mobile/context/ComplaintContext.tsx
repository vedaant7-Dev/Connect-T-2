import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";
import { ApiError, apiGet, apiPatch, apiPost, apiPostForm, isApiError } from "@/lib/api";

export type ComplaintStatus = "submitted" | "assigned" | "in_progress" | "resolved" | "rejected";
export type ComplaintCategory = "roads" | "water" | "electricity" | "garbage" | "drainage" | "streetlight" | "encroachment" | "other";

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
  userDob?: string;
  userProfilePhoto?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
}

export type ComplaintPhotoAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  file?: any;
};

export type NewComplaintData = {
  clientRequestId?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  photoUri?: string;
  photoAsset?: ComplaintPhotoAsset;
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
  userDob?: string;
  userProfilePhoto?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
};

interface ComplaintContextType {
  complaints: Complaint[];
  loading: boolean;
  addComplaint: (data: NewComplaintData) => Promise<Complaint>;
  updateStatus: (id: string, status: ComplaintStatus, note?: string, updatedBy?: string) => Promise<void>;
  getComplaintById: (id: string) => Complaint | undefined;
  refreshComplaints: () => Promise<void>;
}

const ComplaintContext = createContext<ComplaintContextType | null>(null);

function buildTimeline(status: ComplaintStatus, createdAt: string): StatusUpdate[] {
  return [{ status, timestamp: createdAt, note: "Complaint registered successfully", updatedBy: "System" }];
}

function normalizeMobileValue(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeStatus(status: any): ComplaintStatus {
  return ["submitted", "assigned", "in_progress", "resolved", "rejected"].includes(status) ? status : "submitted";
}

function normalizeCategory(category: any): ComplaintCategory {
  return ["roads", "water", "electricity", "garbage", "drainage", "streetlight", "encroachment", "other"].includes(category) ? category : "other";
}

function normalizeComplaint(item: any): Complaint {
  const createdAt = item.created_at || item.createdAt || new Date().toISOString();
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
    assignedOfficerId: item.assigned_officer_id || item.assignedOfficerId || null,
    status,
    createdAt,
    updatedAt,
    timeline: Array.isArray(item.timeline) && item.timeline.length > 0
      ? item.timeline.map((entry: any) => ({
          status: normalizeStatus(entry.status),
          timestamp: entry.created_at || entry.timestamp || createdAt,
          note: entry.note,
          updatedBy: entry.updated_by || entry.updatedBy,
        }))
      : buildTimeline(status, createdAt),
    assignedTo: item.assigned_to || item.assignedTo,
    resolvedNote: item.resolved_note || item.resolvedNote,
    userId: item.user_id || item.userId,
    userName: item.user_name || item.userName,
    userMobile: item.user_mobile || item.userMobile,
    userAddress: item.user_address || item.userAddress,
    userAge: item.user_age !== undefined && item.user_age !== null ? Number(item.user_age) : item.userAge,
    userEmail: item.user_email || item.userEmail,
    userDob: item.user_dob || item.userDob,
    userProfilePhoto: item.user_profile_photo || item.userProfilePhoto,
    latitude: item.latitude === null || item.latitude === undefined ? null : Number(item.latitude),
    longitude: item.longitude === null || item.longitude === undefined ? null : Number(item.longitude),
    locationAccuracy: item.location_accuracy === null || item.location_accuracy === undefined ? null : Number(item.location_accuracy),
  };
}

function buildPath(path: string, params?: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, value);
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function validRequestId(value?: string) {
  return /^[A-Za-z0-9_-]{12,80}$/.test(String(value || ""));
}

async function submitMultipartWithNetworkRecovery(form: FormData) {
  try {
    return await apiPostForm<any>("/api/complaints", form);
  } catch (error) {
    // Only retry transport failures. HTTP validation/authorization errors must be
    // shown immediately and must never be masked by a second request.
    if (!isApiError(error) || error.status !== undefined) throw error;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return apiPostForm<any>("/api/complaints", form);
  }
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
      if (user.role === "citizen") params.user_mobile = user.mobile;
      if (user.role === "nagarsevak") {
        if (user.wardCode) params.ward_code = user.wardCode;
        else if (user.ward) params.ward = user.ward;
      }

      const result = await apiGet<any>(buildPath("/api/complaints", params));
      const normalizedComplaints: Complaint[] = (result.complaints || []).map(normalizeComplaint);
      const safeComplaints = normalizedComplaints.filter((complaint) => {
        if (user.role === "citizen") {
          const userMobile = normalizeMobileValue(user.mobile);
          const complaintMobile = normalizeMobileValue(complaint.userMobile);
          const userId = String(user.id || "");
          const complaintUserId = String(complaint.userId || "");
          return (!!userMobile && complaintMobile === userMobile) || (!!userId && complaintUserId === userId);
        }
        if (user.role === "nagarsevak") {
          if (user.wardCode) return String(complaint.wardCode || "").toLowerCase() === String(user.wardCode).toLowerCase();
          if (user.ward) return String(complaint.ward || "").toLowerCase() === String(user.ward).toLowerCase();
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
    const clientRequestId = validRequestId(data.clientRequestId)
      ? String(data.clientRequestId)
      : `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category || "other",
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
      user_dob: data.userDob || user?.dob || null,
      user_profile_photo: data.userProfilePhoto || user?.profilePhoto || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      location_accuracy: data.locationAccuracy ?? null,
    };

    let result: any;
    let submittedPhoto: string | undefined;
    if (data.photoAsset) {
      const form = new FormData();
      form.append("client_request_id", clientRequestId);
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) form.append(key, String(value));
      });
      if (data.photoAsset.file) {
        form.append("photo", data.photoAsset.file);
      } else {
        form.append("photo", {
          uri: data.photoAsset.uri,
          name: data.photoAsset.fileName || `complaint_${Date.now()}.jpg`,
          type: data.photoAsset.mimeType || "image/jpeg",
        } as any);
      }
      result = await submitMultipartWithNetworkRecovery(form);
      if (!result?.photo_url || !result?.complaintId) {
        throw new ApiError("The complaint image could not be confirmed after upload. Please try again.", {
          code: "COMPLAINT_UPLOAD_INCOMPLETE",
        });
      }
      submittedPhoto = String(result.photo_url);
    } else {
      result = await apiPost<any>("/api/complaints", {
        ...payload,
        id: clientRequestId,
        client_request_id: clientRequestId,
        photo_url: null,
      });
    }

    const created = normalizeComplaint({
      ...payload,
      photo_url: submittedPhoto || result.photo_url || null,
      id: result.complaintId || result.complaint?.id || clientRequestId,
      status: "submitted",
      created_at: now,
      updated_at: now,
      timeline: buildTimeline("submitted", now),
      ward_code: result.ward_code ?? payload.ward_code,
      assigned_officer_id: result.assigned_officer_id ?? payload.assigned_officer_id,
    });

    setComplaints((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
    void refreshComplaints();
    return created;
  };

  const updateStatus = async (id: string, status: ComplaintStatus, note?: string, updatedBy?: string) => {
    await apiPatch(`/api/complaints/${id}/status`, {
      status,
      note,
      updated_by: updatedBy || user?.name || "Officer",
    });
    await refreshComplaints();
  };

  const getComplaintById = (id: string) => complaints.find((complaint) => String(complaint.id) === String(id));

  return (
    <ComplaintContext.Provider value={{ complaints, loading, addComplaint, updateStatus, getComplaintById, refreshComplaints }}>
      {children}
    </ComplaintContext.Provider>
  );
}

export function useComplaints() {
  const context = useContext(ComplaintContext);
  if (!context) throw new Error("useComplaints must be used inside ComplaintProvider");
  return context;
}
