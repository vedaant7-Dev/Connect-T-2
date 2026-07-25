import { useCallback, useEffect, useState } from "react";

import { apiDelete, apiGet, apiPatch, apiPost, getUserErrorMessage } from "@/lib/api";

export type AccessStatus = "active" | "inactive" | "revoked";

export interface SuperAdminAssignment {
  id: string;
  userId?: string | null;
  name: string;
  mobile: string;
  status: AccessStatus;
  source: string;
  isPrimary: boolean;
  addedBy?: string | null;
  addedByName?: string | null;
  lastLoginAt?: string | null;
  hasLoggedIn: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function normalizeAssignment(item: any): SuperAdminAssignment {
  const status: AccessStatus = item.status === "inactive" || item.status === "revoked" ? item.status : "active";
  return {
    id: String(item.id || ""),
    userId: item.userId || item.user_id || null,
    name: String(item.name || item.displayName || item.display_name || "Super Admin"),
    mobile: String(item.mobile || item.normalizedPhone || item.normalized_phone || "").replace(/\D/g, "").slice(-10),
    status,
    source: String(item.source || "admin"),
    isPrimary: !!(item.isPrimary ?? item.is_primary),
    addedBy: item.addedBy || item.added_by || null,
    addedByName: item.addedByName || item.added_by_name || null,
    lastLoginAt: item.lastLoginAt || item.last_login_at || null,
    hasLoggedIn: !!(item.hasLoggedIn ?? item.lastLoginAt ?? item.last_login_at),
    createdAt: item.createdAt || item.created_at || null,
    updatedAt: item.updatedAt || item.updated_at || null,
  };
}

function visibleAssignments(items: any[]): SuperAdminAssignment[] {
  return items
    .map(normalizeAssignment)
    .filter((item) => item.status !== "revoked");
}

export function useSuperAdminAccess() {
  const [assignments, setAssignments] = useState<SuperAdminAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAssignments = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const suffix = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const data = await apiGet<any>(`/api/super-admin/access-management${suffix}`);
      setAssignments(visibleAssignments(data.assignments || []));
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "Admin access records could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  const addAssignment = async (input: { name: string; mobile: string }) => {
    const data = await apiPost<any>("/api/super-admin/access-management", input);
    await fetchAssignments();
    return normalizeAssignment(data.assignment);
  };

  const setAssignmentStatus = async (id: string, status: "active" | "inactive") => {
    const data = await apiPatch<any>(`/api/super-admin/access-management/${id}`, { status });
    await fetchAssignments();
    return data;
  };

  const removeAssignment = async (id: string) => {
    const data = await apiDelete<any>(`/api/super-admin/access-management/${id}`);
    setAssignments((current) => current.filter((item) => item.id !== id));
    await fetchAssignments();
    return data;
  };

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,
    addAssignment,
    setAssignmentStatus,
    removeAssignment,
  };
}
