import { useCallback, useEffect, useState } from "react";

import { officialNagarsevakEnglishName } from "@/data/nagarsevakEnglishNames";
import { apiGet, apiPatch, getUserErrorMessage } from "@/lib/api";

export type NagarsevakAccessStatus = "active" | "inactive" | "revoked";

export interface NagarsevakAssignment {
  id: string;
  userId?: string | null;
  name: string;
  originalName?: string | null;
  mobile: string;
  wardOrDesignation: string;
  wardCode?: string | null;
  status: NagarsevakAccessStatus;
  source: string;
  sourceSerial?: number | null;
  lastLoginAt?: string | null;
  hasLoggedIn: boolean;
  createdAt?: string | null;
}

function normalize(item: any): NagarsevakAssignment {
  const designation = String(item.wardOrDesignation || item.ward_or_designation || "Not assigned");
  const sourceSerial = item.sourceSerial ?? item.source_serial ?? null;
  const originalName = String(item.name || item.displayName || item.display_name || "Unknown Officer");
  const englishName = officialNagarsevakEnglishName(sourceSerial);
  return {
    id: String(item.id || ""),
    userId: item.userId || item.user_id || null,
    name: englishName || originalName,
    originalName: englishName && englishName !== originalName ? originalName : null,
    mobile: String(item.mobile || item.normalized_phone || "").replace(/\D/g, "").slice(-10),
    wardOrDesignation: designation,
    wardCode: designation.match(/\d{1,2}/)?.[0] || null,
    status: item.status === "inactive" || item.status === "revoked" ? item.status : "active",
    source: String(item.source || "admin"),
    sourceSerial,
    lastLoginAt: item.lastLoginAt || item.last_login_at || null,
    hasLoggedIn: !!(item.hasLoggedIn ?? item.lastLoginAt ?? item.last_login_at),
    createdAt: item.createdAt || item.created_at || null,
  };
}

function matchesSearch(item: NagarsevakAssignment, rawSearch: string) {
  const search = rawSearch.trim().toLocaleLowerCase("en-IN");
  if (!search) return true;
  return [item.name, item.originalName, item.mobile, item.wardOrDesignation]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase("en-IN").includes(search));
}

export function useNagarsevakAssignments() {
  const [assignments, setAssignments] = useState<NagarsevakAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refetch = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<any>("/api/super-admin/nagarsevaks");
      const normalized = (data.assignments || []).map(normalize);
      setAssignments(normalized.filter((item: NagarsevakAssignment) => matchesSearch(item, search)));
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "Nagarsevak records could not be loaded."));
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (id: string, status: NagarsevakAccessStatus) => {
    await apiPatch(`/api/super-admin/nagarsevaks/${id}`, { status });
    await refetch();
  };

  useEffect(() => { void refetch(); }, [refetch]);

  return { assignments, loading, error, refetch, updateStatus };
}
