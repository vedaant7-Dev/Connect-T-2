import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Image, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { apiGet, getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";

type AppUser = {
  id: string;
  name?: string;
  mobile?: string;
  role?: string;
  ward?: string;
  address?: string;
  email?: string;
  profilePhoto?: string;
  profile_photo?: string;
  createdAt?: string;
  created_at?: string;
};

export default function AppUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 50 : insets.top;
  const [users, setUsers] = useState<AppUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await apiGet<any>(`/api/admin/citizens?page=${nextPage}&limit=10`);
      setUsers(result.citizens || result.users || []);
      setPage(result.pagination?.page || nextPage);
      setTotalPages(Math.max(1, result.pagination?.totalPages || 1));
      setTotal(Number(result.pagination?.total || (result.citizens || result.users || []).length));
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "App users could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(1); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <LinearGradient colors={["#052E16", "#166534", "#16A34A"]} style={{ paddingTop: topPad + 12, paddingHorizontal: 18, paddingBottom: 20 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: 16 }}>
          <Feather name="arrow-left" size={20} color="white" />
          <Text style={{ marginLeft: 7, color: "white", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ color: "white", fontFamily: "Inter_700Bold", fontSize: 22 }}>App Users</Text>
        <Text style={{ marginTop: 4, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", fontSize: 12 }}>
          {total} registered citizens from the production database
        </Text>
      </LinearGradient>

      {error ? <Text style={{ margin: 14, color: "#DC2626", fontFamily: "Inter_500Medium", fontSize: 12 }}>{error}</Text> : null}

      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
        refreshing={loading}
        onRefresh={() => void load(page)}
        ListEmptyComponent={!loading ? (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Feather name="users" size={42} color="#CBD5E1" />
            <Text style={{ marginTop: 12, color: "#64748B", fontFamily: "Inter_600SemiBold" }}>No users found</Text>
          </View>
        ) : null}
        renderItem={({ item, index }) => {
          const photo = item.profilePhoto || item.profile_photo;
          const initial = String(item.name || "U").trim().charAt(0).toUpperCase();
          return (
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 7, elevation: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: "#E2E8F0" }} />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 18, color: GREEN, fontFamily: "Inter_700Bold" }}>{initial}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: "#0F172A", fontFamily: "Inter_700Bold", fontSize: 14 }}>{item.name || "Citizen"}</Text>
                  <Text style={{ marginTop: 2, color: "#64748B", fontFamily: "Inter_400Regular", fontSize: 11 }}>
                    {item.mobile || "No mobile"} · {item.ward || "Ward not assigned"}
                  </Text>
                  {item.address ? <Text numberOfLines={1} style={{ marginTop: 2, color: "#94A3B8", fontFamily: "Inter_400Regular", fontSize: 10 }}>{item.address}</Text> : null}
                </View>
                <View style={{ backgroundColor: "#F0FDF4", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ color: GREEN, fontFamily: "Inter_600SemiBold", fontSize: 9 }}>Citizen</Text>
                </View>
              </View>
              <Text style={{ marginTop: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", fontSize: 9 }}>User {(page - 1) * 10 + index + 1} · ID {item.id}</Text>
            </View>
          );
        }}
      />

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingHorizontal: 14, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity disabled={page <= 1 || loading} onPress={() => void load(page - 1)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: page <= 1 ? "#F1F5F9" : "#ECFDF5", alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
          <Feather name="chevron-left" size={16} color={page <= 1 ? "#94A3B8" : GREEN} />
          <Text style={{ marginLeft: 5, color: page <= 1 ? "#94A3B8" : GREEN, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Previous</Text>
        </TouchableOpacity>
        <Text style={{ minWidth: 66, textAlign: "center", color: "#475569", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>{page} / {totalPages}</Text>
        <TouchableOpacity disabled={page >= totalPages || loading} onPress={() => void load(page + 1)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: page >= totalPages ? "#F1F5F9" : "#ECFDF5", alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
          <Text style={{ marginRight: 5, color: page >= totalPages ? "#94A3B8" : GREEN, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Next</Text>
          <Feather name="chevron-right" size={16} color={page >= totalPages ? "#94A3B8" : GREEN} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
