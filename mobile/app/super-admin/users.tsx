import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, Platform, RefreshControl, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { apiGet, getUserErrorMessage } from "@/lib/api";
import { resolveProfilePhotoUri } from "@/lib/profilePhoto";

const GREEN = "#16A34A";
const ROLE_FILTERS = [
  { id: "all", label: "All Users" },
  { id: "citizen", label: "Citizens" },
  { id: "nagarsevak", label: "Nagarsevaks" },
  { id: "super_admin", label: "Super Admin" },
];

type AppUser = {
  id: string;
  name?: string;
  mobile?: string;
  role?: string;
  ward?: string;
  ward_code?: string;
  ward_number?: number;
  email?: string;
  address?: string;
  approval_status?: string;
  avatar_color?: string;
  profile_photo?: string;
  profile_photo_url?: string;
  created_at?: string;
  last_login_at?: string;
};

function roleLabel(role?: string) {
  if (role === "super_admin") return "Super Admin";
  if (role === "nagarsevak") return "Nagarsevak";
  return "Citizen";
}

function roleStyle(role?: string) {
  if (role === "super_admin") return { color: "#7C3AED", bg: "#EDE9FE", icon: "shield" };
  if (role === "nagarsevak") return { color: "#059669", bg: "#D1FAE5", icon: "user-check" };
  return { color: "#2563EB", bg: "#DBEAFE", icon: "user" };
}

function UserAvatar({ user, style }: { user: AppUser; style: { color: string; bg: string; icon: string } }) {
  const [failed, setFailed] = useState(false);
  const uri = resolveProfilePhotoUri(user.profile_photo_url || user.profile_photo);
  if (uri && !failed) {
    return <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: style.bg, marginRight: 11 }} resizeMode="cover" />;
  }
  return <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: user.avatar_color || style.bg, alignItems: "center", justifyContent: "center", marginRight: 11 }}><Text style={{ color: style.color, fontSize: 17, fontFamily: "Inter_700Bold" }}>{String(user.name || "U").charAt(0).toUpperCase()}</Text></View>;
}

export default function AppUsersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState("all");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (targetPage = page, targetRole = role, targetQuery = appliedQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "10", role: targetRole });
      if (targetQuery.trim()) params.set("q", targetQuery.trim());
      const result = await apiGet<any>(`/api/admin/users?${params.toString()}`);
      setUsers(result.users || []);
      setPage(result.pagination?.page || targetPage);
      setPages(result.pagination?.totalPages || 1);
      setTotal(result.pagination?.total || 0);
      setError("");
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "App users could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, role]);

  useEffect(() => { void load(1, role, appliedQuery); }, [role, appliedQuery]);

  const search = () => {
    setAppliedQuery(query.trim());
    setPage(1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <LinearGradient colors={["#052E16", "#166534", "#16A34A"]} style={{ paddingTop: topPad + 8, paddingHorizontal: 16, paddingBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", marginRight: 12 }}><Feather name="arrow-left" size={20} color="white" /></TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={{ color: "white", fontSize: 21, fontFamily: "Inter_700Bold" }}>App Users</Text><Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11.5, marginTop: 2, fontFamily: "Inter_400Regular" }}>Live profiles from the Connect-T database</Text></View>
          <View style={{ minWidth: 54, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }}><Text style={{ color: "white", fontSize: 17, fontFamily: "Inter_700Bold" }}>{total}</Text><Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 8.5, fontFamily: "Inter_500Medium" }}>Users</Text></View>
        </View>
      </LinearGradient>

      <View style={{ padding: 14, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 15, borderWidth: 1, borderColor: "#E2E8F0", paddingLeft: 12, height: 50 }}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} placeholder="Search name, mobile, email or ward" returnKeyType="search" style={{ flex: 1, paddingHorizontal: 10, color: "#0F172A", fontSize: 12.5, fontFamily: "Inter_400Regular" }} />
          <TouchableOpacity onPress={search} style={{ height: 40, paddingHorizontal: 15, borderRadius: 12, marginRight: 5, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "white", fontSize: 11, fontFamily: "Inter_700Bold" }}>Search</Text></TouchableOpacity>
        </View>
        <FlatList horizontal data={ROLE_FILTERS} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }} renderItem={({ item }) => { const active = role === item.id; return <TouchableOpacity onPress={() => { setRole(item.id); setPage(1); }} style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: active ? GREEN : "white", borderWidth: 1, borderColor: active ? GREEN : "#E2E8F0", alignItems: "center", justifyContent: "center" }}><Text style={{ color: active ? "white" : "#475569", fontSize: 10.5, fontFamily: "Inter_600SemiBold" }}>{item.label}</Text></TouchableOpacity>; }} />
        {error ? <Text style={{ color: "#DC2626", fontSize: 11, marginTop: 9, fontFamily: "Inter_500Medium" }}>{error}</Text> : null}
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load(page, role, appliedQuery)} colors={[GREEN]} tintColor={GREEN} />}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 30 }}
        renderItem={({ item, index }) => {
          const style = roleStyle(item.role);
          const ward = item.ward || item.ward_code || (item.ward_number ? `Ward ${item.ward_number}` : "No ward assigned");
          return (
            <TouchableOpacity onPress={() => router.push({ pathname: "/super-admin/user-details", params: { id: item.id } } as any)} activeOpacity={0.86} accessibilityRole="button" accessibilityLabel={`Open ${item.name || "user"} profile`} style={{ backgroundColor: "white", borderRadius: 17, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <UserAvatar user={item} style={style} />
                <View style={{ flex: 1 }}><Text style={{ color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" }}>{item.name || "Unnamed user"}</Text><Text style={{ color: "#64748B", fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" }}>+91 {item.mobile || "Not available"} · {ward}</Text></View>
                <View style={{ alignItems: "flex-end", gap: 7 }}><View style={{ backgroundColor: style.bg, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, flexDirection: "row", alignItems: "center" }}><Feather name={style.icon as any} size={11} color={style.color} /><Text style={{ color: style.color, fontSize: 8.5, marginLeft: 4, fontFamily: "Inter_700Bold" }}>{roleLabel(item.role)}</Text></View><Feather name="chevron-right" size={16} color="#94A3B8" /></View>
              </View>
              <View style={{ marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: "#F1F5F9", gap: 6 }}>
                {item.email ? <View style={{ flexDirection: "row", alignItems: "center" }}><Feather name="mail" size={13} color="#94A3B8" /><Text numberOfLines={1} style={{ flex: 1, marginLeft: 7, color: "#475569", fontSize: 10.5, fontFamily: "Inter_400Regular" }}>{item.email}</Text></View> : null}
                {item.address ? <View style={{ flexDirection: "row", alignItems: "center" }}><Feather name="map-pin" size={13} color="#94A3B8" /><Text numberOfLines={2} style={{ flex: 1, marginLeft: 7, color: "#475569", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" }}>{item.address}</Text></View> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" }}>Registered {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</Text><Text style={{ color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_500Medium" }}>#{(page - 1) * 10 + index + 1}</Text></View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!loading ? <View style={{ alignItems: "center", paddingVertical: 70 }}><Feather name="users" size={42} color="#CBD5E1" /><Text style={{ color: "#64748B", fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 12 }}>No users found</Text><Text style={{ color: "#94A3B8", fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 4 }}>Try another role or search term.</Text></View> : null}
        ListFooterComponent={<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 }}><TouchableOpacity disabled={page <= 1 || loading} onPress={() => void load(page - 1, role, appliedQuery)} style={{ height: 40, paddingHorizontal: 16, borderRadius: 11, backgroundColor: page <= 1 ? "#E2E8F0" : "#DCFCE7", justifyContent: "center" }}><Text style={{ color: page <= 1 ? "#94A3B8" : "#15803D", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Previous</Text></TouchableOpacity><Text style={{ color: "#64748B", fontSize: 11, fontFamily: "Inter_500Medium" }}>Page {page} of {pages}</Text><TouchableOpacity disabled={page >= pages || loading} onPress={() => void load(page + 1, role, appliedQuery)} style={{ height: 40, paddingHorizontal: 16, borderRadius: 11, backgroundColor: page >= pages ? "#E2E8F0" : "#DCFCE7", justifyContent: "center" }}><Text style={{ color: page >= pages ? "#94A3B8" : "#15803D", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Next</Text></TouchableOpacity></View>}
      />
    </View>
  );
}
