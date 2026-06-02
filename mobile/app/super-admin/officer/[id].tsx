import React, { useMemo } from "react";
import { Image, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useComplaints } from "@/context/ComplaintContext";
import { Officer, useOfficers } from "@/hooks/useOfficers";

const GREEN = "#16A34A";
const DARK_GREEN = "#166534";
const BG = "#F0F4F8";

function textValue(value?: string | null, fallback = "Not added") {
  const text = String(value || "").trim();
  return text.length ? text : fallback;
}

function mobileValue(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "").slice(-10);
  return digits ? `+91 ${digits}` : "Not added";
}

function initials(name?: string | null) {
  return String(name || "CT").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function dateValue(value?: string | null) {
  if (!value) return "Not added";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function statusTheme(status?: Officer["approvalStatus"]) {
  if (status === "approved") return { color: GREEN, bg: "#DCFCE7", label: "Approved", icon: "check-circle" as const };
  if (status === "rejected") return { color: "#DC2626", bg: "#FEE2E2", label: "Rejected", icon: "x-circle" as const };
  return { color: "#D97706", bg: "#FEF3C7", label: "Pending", icon: "clock" as const };
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string | null }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={16} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: "#94A3B8", fontFamily: "Inter_600SemiBold" }}>{label}</Text>
        <Text style={{ fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold", marginTop: 2 }}>{textValue(value)}</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 14, paddingVertical: 12, alignItems: "center" }}>
      <Text style={{ fontSize: 20, color, fontFamily: "Inter_700Bold" }}>{value}</Text>
      <Text style={{ fontSize: 10, color, fontFamily: "Inter_600SemiBold", marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function OfficerDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 54 : insets.top;
  const params = useLocalSearchParams<{ id?: string }>();
  const officerId = String(params.id || "");

  const { officers, loading } = useOfficers();
  const { complaints } = useComplaints();

  const officer = useMemo(() => officers.find((item) => String(item.id) === officerId), [officers, officerId]);

  const wardComplaints = useMemo(() => {
    if (!officer) return [];
    return complaints.filter((complaint) => {
      const complaintWardCode = String(complaint.wardCode || "").trim().toLowerCase();
      const officerWardCode = String(officer.wardCode || "").trim().toLowerCase();
      if (officerWardCode && complaintWardCode) return complaintWardCode === officerWardCode;
      return String(complaint.ward || "").trim().toLowerCase() === String(officer.ward || "").trim().toLowerCase();
    });
  }, [complaints, officer]);

  const total = wardComplaints.length;
  const pending = wardComplaints.filter((item) => item.status === "submitted").length;
  const active = wardComplaints.filter((item) => item.status === "assigned" || item.status === "in_progress").length;
  const resolved = wardComplaints.filter((item) => item.status === "resolved").length;
  const rejected = wardComplaints.filter((item) => item.status === "rejected").length;
  const theme = statusTheme(officer?.approvalStatus);

  if (!loading && !officer) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <LinearGradient colors={["#052E16", DARK_GREEN, GREEN]} style={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather name="chevron-left" size={22} color="white" />
            <Text style={{ color: "white", fontSize: 14, fontFamily: "Inter_700Bold" }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: "white", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 24 }}>Officer not found</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 6 }}>This officer record could not be loaded.</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LinearGradient colors={["#052E16", DARK_GREEN, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} activeOpacity={0.85}>
            <Feather name="chevron-left" size={22} color="white" />
            <Text style={{ color: "white", fontSize: 14, fontFamily: "Inter_700Bold" }}>Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: theme.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Feather name={theme.icon} size={12} color={theme.color} />
            <Text style={{ color: theme.color, fontSize: 11, fontFamily: "Inter_700Bold" }}>{theme.label}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 22 }}>
          {officer?.profilePhoto ? (
            <Image source={{ uri: officer.profilePhoto }} style={{ width: 74, height: 74, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.18)" }} />
          ) : (
            <View style={{ width: 74, height: 74, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)" }}>
              <Text style={{ color: "white", fontSize: 26, fontFamily: "Inter_700Bold" }}>{initials(officer?.name)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "rgba(255,255,255,0.64)", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.4 }}>OFFICER FULL DETAILS</Text>
            <Text style={{ color: "white", fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 4 }} numberOfLines={1}>{officer?.name || "Loading..."}</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 }}>{textValue(officer?.ward, "Ward not assigned")} · {textValue(officer?.id, "ID not added")}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
          <StatCard label="Total" value={total} color="#2563EB" bg="#DBEAFE" />
          <StatCard label="Pending" value={pending} color="#D97706" bg="#FEF3C7" />
          <StatCard label="Active" value={active} color="#7C3AED" bg="#EDE9FE" />
          <StatCard label="Resolved" value={resolved} color="#059669" bg="#D1FAE5" />
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) + 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: "white", borderRadius: 18, paddingHorizontal: 16, paddingTop: 4, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 }}>
          <DetailRow icon="award" label="Officer ID" value={officer?.id} />
          <DetailRow icon="user" label="Full Name" value={officer?.name} />
          <DetailRow icon="briefcase" label="Role / Designation" value={officer?.role || "Nagarsevak"} />
          <DetailRow icon="map-pin" label="Ward" value={officer?.ward} />
          <DetailRow icon="hash" label="Ward Code" value={officer?.wardCode || "Not assigned"} />
          <DetailRow icon="calendar" label="Date of Birth" value={dateValue(officer?.dob)} />
        </View>

        <View style={{ backgroundColor: "white", borderRadius: 18, paddingHorizontal: 16, paddingTop: 4, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 }}>
          <DetailRow icon="phone" label="Mobile Number" value={mobileValue(officer?.mobile)} />
          <DetailRow icon="user-check" label="Contact Person" value={officer?.contactName || officer?.name} />
          <DetailRow icon="phone-call" label="Contact Number" value={mobileValue(officer?.contactNumber || officer?.mobile)} />
          <DetailRow icon="clock" label="Office Timings" value={officer?.officeTimings} />
        </View>

        <View style={{ backgroundColor: "white", borderRadius: 18, paddingHorizontal: 16, paddingTop: 4, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 }}>
          <DetailRow icon="home" label="Address" value={officer?.address} />
          <DetailRow icon="briefcase" label="Office Address" value={officer?.officeAddress} />
          <DetailRow icon="map" label="Residence Address" value={officer?.residenceAddress} />
          <DetailRow icon="calendar" label="Registered On" value={dateValue(officer?.createdAt)} />
        </View>

        <Text style={{ fontSize: 15, color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 8 }}>Ward Complaint Activity</Text>
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatCard label="Rejected" value={rejected} color="#DC2626" bg="#FEE2E2" />
            <StatCard label="Open" value={pending + active} color="#EA580C" bg="#FFEDD5" />
            <StatCard label="Closed" value={resolved + rejected} color="#166534" bg="#DCFCE7" />
          </View>
        </View>

        {wardComplaints.slice(0, 8).map((complaint) => (
          <TouchableOpacity key={complaint.id} onPress={() => router.push({ pathname: "/complaint/[id]" as any, params: { id: complaint.id } })} activeOpacity={0.9} style={{ backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 10, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" }}>
              <Feather name="file-text" size={16} color={GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold" }} numberOfLines={1}>{complaint.title}</Text>
              <Text style={{ fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 }} numberOfLines={1}>{complaint.status.replace("_", " ")} · {complaint.location}</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        {!loading && wardComplaints.length === 0 && (
          <View style={{ alignItems: "center", backgroundColor: "white", borderRadius: 18, padding: 24 }}>
            <Feather name="file-text" size={36} color="#CBD5E1" />
            <Text style={{ marginTop: 10, fontSize: 15, color: "#475569", fontFamily: "Inter_700Bold" }}>No complaints yet</Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", textAlign: "center" }}>Complaints assigned to this officer's ward will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
