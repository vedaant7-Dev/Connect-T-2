import { useState, useEffect, useCallback } from "react";

export interface Officer {
  id: string;
  name: string;
  mobile: string;
  ward: string;
  wardCode?: string | null;
  role: string;
  isSuperAdmin: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  officeAddress?: string;
  residenceAddress?: string;
  contactNumber?: string;
  profilePhoto?: string;
  createdAt?: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "";

export function useOfficers(statusFilter?: string) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter
        ? `${API_URL}/api/auth/officers?status=${statusFilter}`
        : `${API_URL}/api/auth/officers`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOfficers(data.officers || []);
      } else {
        setError(data.message || "Failed to load officers");
      }
    } catch (e: any) {
      setError("Network error: " + (e.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  const approveOfficer = async (id: string, approvalStatus: "approved" | "rejected") => {
    try {
      const res = await fetch(`${API_URL}/api/auth/officers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approvalStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOfficers((prev) =>
          prev.map((o) => (o.id === id ? { ...o, approvalStatus } : o))
        );
      }
      return data;
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  return { officers, loading, error, refetch: fetchOfficers, approveOfficer };
}
