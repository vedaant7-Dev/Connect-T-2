import { useCallback, useEffect, useState } from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export interface SuperAdminAccessCode {
  id: string;
  accessCode: string;
  name: string;
  mobile: string;
  status: "active" | "revoked";
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeAccess(item: any): SuperAdminAccessCode {
  return {
    id: String(item.id || ""),
    accessCode: String(item.accessCode || item.access_code || ""),
    name: String(item.name || ""),
    mobile: String(item.mobile || ""),
    status: item.status === "revoked" ? "revoked" : "active",
    createdBy: item.createdBy || item.created_by || null,
    createdAt: item.createdAt || item.created_at,
    updatedAt: item.updatedAt || item.updated_at,
  };
}

export function useSuperAdminAccess() {
  const [accessCodes, setAccessCodes] = useState<SuperAdminAccessCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAccessCodes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiGet<any>("/api/super-admin/access-codes");
      setAccessCodes((data.accessCodes || []).map(normalizeAccess));
    } catch (e: any) {
      setError(e?.message || "Failed to load access codes");
      setAccessCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccessCode = async (input: {
    name: string;
    mobile: string;
    createdBy?: string;
  }) => {
    const data = await apiPost<any>("/api/super-admin/access-codes", input);
    await fetchAccessCodes();
    return normalizeAccess(data.access);
  };

  const deleteAccessCode = async (id: string) => {
    const data = await apiDelete<any>(`/api/super-admin/access-codes/${id}`);
    await fetchAccessCodes();
    return data;
  };

  const updateAccessStatus = async (
    id: string,
    status: "active" | "revoked",
  ) => {
    const data = await apiPatch<any>(`/api/super-admin/access-codes/${id}`, { status });
    await fetchAccessCodes();
    return data;
  };

  useEffect(() => {
    void fetchAccessCodes();
  }, [fetchAccessCodes]);

  return {
    accessCodes,
    loading,
    error,
    refetch: fetchAccessCodes,
    createAccessCode,
    updateAccessStatus,
    deleteAccessCode,
  };
}
