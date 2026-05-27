import React, { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";

export default function SelectServiceRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user?.role === "super_admin" || user?.isSuperAdmin) {
      router.replace("/super-admin" as any);
      return;
    }

    if (user?.role === "nagarsevak") {
      router.replace("/(tabs)/admin" as any);
      return;
    }

    if (user) {
      router.replace("/(tabs)" as any);
      return;
    }

    router.replace("/portal-select" as any);
  }, [user, loading, router]);

  return <View style={{ flex: 1, backgroundColor: "#F8FAFC" }} />;
}
