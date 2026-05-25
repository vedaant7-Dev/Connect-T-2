import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "@/constants/api";

export interface Officer {
  id: string;
  name: string;
  mobile: string;
  ward: string;
  wardCode?: string | null;
  role: string;
  isSuperAdmin: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  officeAddress?: string | null;
  residenceAddress?: string | null;
  officeTimings?: string | null;
  contactName?: string | null;
  contactNumber?: string | null;
  profilePhoto?: string | null;
  createdAt?: string;
}

type ApprovalStatus = "pending" | "approved" | "rejected";

function buildApiUrl(path: string) {
  const cleanBase = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}

async function readJson(res: Response) {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: text,
    };
  }
}

function normalizeOfficer(item: any): Officer {
  return {
    id: String(item.id || ""),
    name: String(item.name || "Unknown Officer"),
    mobile: String(item.mobile || ""),
    ward: String(item.ward || "Not assigned"),
    wardCode: item.wardCode || item.ward_code || null,
    role: item.role || "nagarsevak",
    isSuperAdmin: Boolean(item.isSuperAdmin || item.is_super_admin),
    approvalStatus:
      item.approvalStatus === "approved" ||
      item.approvalStatus === "rejected" ||
      item.approvalStatus === "pending"
        ? item.approvalStatus
        : "pending",
    officeAddress: item.officeAddress || item.office_address || null,
    residenceAddress: item.residenceAddress || item.residence_address || null,
    officeTimings: item.officeTimings || item.office_timings || null,
    contactName: item.contactName || item.contact_name || null,
    contactNumber: item.contactNumber || item.contact_number || item.mobile || null,
    profilePhoto: item.profilePhoto || item.profile_photo || null,
    createdAt: item.createdAt || item.created_at,
  };
}

export function useOfficers(statusFilter?: ApprovalStatus) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await fetch(buildApiUrl(`/api/auth/officers${query}`));
      const data = await readJson(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to load officers");
      }

      setOfficers((data.officers || []).map(normalizeOfficer));
    } catch (e: any) {
      setError(e?.message || "Failed to load officers");
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchOfficers();
  }, [fetchOfficers]);

  const approveOfficer = async (
    id: string,
    approvalStatus: "approved" | "rejected",
  ) => {
    try {
      const res = await fetch(buildApiUrl("/api/auth/officers"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          approvalStatus,
        }),
      });

      const data = await readJson(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to update officer");
      }

      setOfficers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, approvalStatus } : o)),
      );

      return data;
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || "Failed to update officer",
      };
    }
  };

  return {
    officers,
    loading,
    error,
    refetch: fetchOfficers,
    approveOfficer,
  };
}
