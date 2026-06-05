import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "@/constants/api";

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
      const res = await fetch(buildApiUrl("/api/super-admin/access-codes"));
      const data = await readJson(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to load access codes");
      }

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
    const res = await fetch(buildApiUrl("/api/super-admin/access-codes"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const data = await readJson(res);

    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || "Failed to create access code");
    }

    await fetchAccessCodes();

    return normalizeAccess(data.access);
  };

  const deleteAccessCode = async (id: string) => {
    const res = await fetch(buildApiUrl(`/api/super-admin/access-codes/${id}`), {
      method: "DELETE",
    });

    const data = await readJson(res);

    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || "Failed to delete access ID");
    }

    await fetchAccessCodes();
    return data;
  };

  const updateAccessStatus = async (
    id: string,
    status: "active" | "revoked",
  ) => {
    const res = await fetch(buildApiUrl(`/api/super-admin/access-codes/${id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await readJson(res);

    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || "Failed to update access");
    }

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
