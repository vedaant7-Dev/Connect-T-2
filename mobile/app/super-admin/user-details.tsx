import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiGet, getUserErrorMessage } from "@/lib/api";
import { resolveProfilePhotoUri } from "@/lib/profilePhoto";

const GREEN = "#16A34A";

type UserDetails = Record<string, any>;

function labelRole(role?: string) {
  if (role === "super_admin") return "Super Admin";
  if (role === "nagarsevak") return "Nagarsevak";
  return "Citizen";
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: any }) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return <View style={{ flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}><View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginRight: 11 }}><Feather name={icon as any} size={15} color={GREEN} /></View><View style={{ flex: 1 }}><Text style={{ color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text><Text selectable style={{ color: "#0F172A", fontSize: 12.5, lineHeight: 18, marginTop: 3, fontFamily: "Inter_500Medium" }}>{String(value)}</Text></View></View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ backgroundColor: "white", borderRadius: 18, paddingHorizontal: 15, paddingTop: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}><Text style={{ color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 }}>{title}</Text>{children}</View>;
}

export default function UserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const result = await apiGet<any>(`/api/admin/users/${encodeURIComponent(String(id || ""))}`);
        if (active) { setUser(result.user || null); setError(""); }
      } catch (requestError) {
        if (active) setError(getUserErrorMessage(requestError, "User details could not be loaded."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const photo = useMemo(() => resolveProfilePhotoUri(user?.profile_photo_url || user?.profile_photo), [user]);
  const ward = user?.ward || user?.ward_code || (user?.ward_number ? `Ward ${user.ward_number}` : "Not assigned");

  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F0F4F8" }}><ActivityIndicator color={GREEN} /><Text style={{ color: "#64748B", marginTop: 10, fontFamily: "Inter_500Medium" }}>Loading user profile...</Text></View>;

  return <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
    <LinearGradient colors={["#052E16", "#166534", "#16A34A"]} style={{ paddingTop: topPad + 8, paddingHorizontal: 16, paddingBottom: 24 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}><Feather name="arrow-left" size={20} color="white" /></TouchableOpacity>
      {user ? <View style={{ alignItems: "center", marginTop: 4 }}>
        {photo && !photoFailed ? <Image source={{ uri: photo }} onError={() => setPhotoFailed(true)} style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 3, borderColor: "rgba(255,255,255,0.75)" }} resizeMode="cover" /> : <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: user.avatar_color || "#DCFCE7", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.75)" }}><Text style={{ color: "#166534", fontSize: 31, fontFamily: "Inter_700Bold" }}>{String(user.name || "U").charAt(0).toUpperCase()}</Text></View>}
        <Text style={{ color: "white", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 12, textAlign: "center" }}>{user.name || "Unnamed user"}</Text>
        <View style={{ marginTop: 7, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)" }}><Text style={{ color: "white", fontSize: 10.5, fontFamily: "Inter_700Bold" }}>{labelRole(user.role)}</Text></View>
      </View> : null}
    </LinearGradient>

    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom, 10) + 40 }} showsVerticalScrollIndicator={false}>
      {error ? <View style={{ backgroundColor: "#FEF2F2", borderRadius: 15, padding: 14 }}><Text style={{ color: "#DC2626", fontFamily: "Inter_600SemiBold" }}>{error}</Text></View> : null}
      {user ? <>
        <Section title="Contact Information">
          <DetailRow icon="phone" label="Mobile number" value={user.mobile ? `+91 ${user.mobile}` : null} />
          <DetailRow icon="mail" label="Email" value={user.email} />
          <DetailRow icon="map-pin" label="Address" value={user.address} />
          <DetailRow icon="home" label="Residence address" value={user.residence_address} />
        </Section>
        <Section title="Civic Profile">
          <DetailRow icon="map" label="Ward" value={ward} />
          <DetailRow icon="gift" label="Date of birth" value={user.dob ? new Date(user.dob).toLocaleDateString("en-IN") : null} />
          <DetailRow icon="calendar" label="Age" value={user.age} />
          <DetailRow icon="check-circle" label="Approval status" value={user.approval_status} />
        </Section>
        <Section title="Official Information">
          <DetailRow icon="award" label="Designation" value={user.official_designation} />
          <DetailRow icon="briefcase" label="Office address" value={user.office_address} />
          <DetailRow icon="clock" label="Office timings" value={user.office_timings} />
          <DetailRow icon="user" label="Contact person" value={user.contact_name} />
          <DetailRow icon="phone-call" label="Office contact" value={user.contact_number} />
          <DetailRow icon="hash" label="Nagarsevak ID" value={user.nagarsevak_id} />
        </Section>
        <Section title="Account Information">
          <DetailRow icon="key" label="User ID" value={user.id} />
          <DetailRow icon="calendar" label="Registered" value={user.created_at ? new Date(user.created_at).toLocaleString("en-IN") : null} />
          <DetailRow icon="log-in" label="Last login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString("en-IN") : "Not recorded"} />
        </Section>
      </> : null}
    </ScrollView>
  </View>;
}
