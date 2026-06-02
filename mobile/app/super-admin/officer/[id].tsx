import React, { useMemo, useState } from "react";
import { Image, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/constants/api";
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

function DetailRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string | null }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={15} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10.5, color: "#94A3B8", fontFamily: "Inter_600SemiBold" }}>{label}</Text>
        <Text style={{ fontSize: 13.5, color: "#0F172A", fontFamily: "Inter_700Bold", marginTop: 2 }}>{textValue(value)}</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 13, paddingVertical: 9, alignItems: "center" }}>
      <Text style={{ fontSize: 18, color, fontFamily: "Inter_700Bold" }}>{value}</Text>
      <Text style={{ fontSize: 9.5, color, fontFamily: "Inter_600SemiBold", marginTop: 1 }}>{label}</Text>
    </View>
  );
}

export default function OfficerDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 54 : insets.top;
  const params = useLocalSearchParams<{ id?: string }>();
  const officerId = String(params.id || "");

  const { officers, loading, approveOfficer, refetch } = useOfficers();
  const { complaints } = useComplaints();
  const [menuVisible, setMenuVisible] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

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

  const suspendOfficer = async () => {
    if (!officer) return;
    setActionMsg("");
    const result = await approveOfficer(officer.id, "rejected");
    if (result?.success === false) {
      setActionMsg(result.message || "Suspend failed.");
      return;
    }
    await refetch();
    setMenuVisible(false);
  };

  const deleteOfficer = async () => {
    if (!officer) return;
    setActionMsg("");
    try {
      const base = API_BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/auth/officers/${encodeURIComponent(officer.id)}`, { method: "DELETE" });
      if (!res.ok) {
        setActionMsg("Delete API is not enabled on backend yet.");
        return;
      }
      await refetch();
      setMenuVisible(false);
      router.back();
    } catch {
      setActionMsg("Delete API is not enabled on backend yet.");
    }
  };

  if (!loading && !officer) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <LinearGradient colors={["#052E16", DARK_GREEN, GREEN]} style={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 22 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather name="chevron-left" size={22} color="white" />
            <Text style={{ color: "white", fontSize: 14, fontFamily: "Inter_700Bold" }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: "white", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 24 }}>Officer not found</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LinearGradient
        colors={["#052E16", DARK_GREEN, GREEN]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad + 10, paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} activeOpacity={0.85}>
            <Feather name="chevron-left" size={22} color="white" />
            <Text style={{ color: "white", fontSize: 14, fontFamily: "Inter_700Bold" }}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMenuVisible(true)} activeOpacity={0.85} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
            <Feather name="menu" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 }}>
          {officer?.profilePhoto ? (
            <Image source={{ uri: officer.profilePhoto }} style={{ width: 60, height: 60, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)" }} />
          ) : (
            <View style={{ width: 60, height: 60, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)" }}>
              <Text style={{ color: "white", fontSize: 22, fontFamily: "Inter_700Bold" }}>{initials(officer?.name)}</Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ color: "rgba(255,255,255,0.64)", fontSize: 9.5, fontFamily: "Inter_700Bold", letterSpacing: 1.3 }}>OFFICER FULL DETAILS</Text>
            <Text style={{ color: "white", fontSize: 21, fontFamily: "Inter_700Bold", marginTop: 3 }} numberOfLines={1}>
              {officer?.name || "Loading..."}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 2 }}>
              {textValue(officer?.ward, "Ward not assigned")} · {textValue(officer?.id, "ID not added")}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 7, marginTop: 16 }}>
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
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom, 12) + 18 }}>
            <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold" }}>Officer Actions</Text>
            <Text style={{ fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 3, marginBottom: 14 }}>
              {officer?.name} · {officer?.id}
            </Text>

            {!!actionMsg && <Text style={{ fontSize: 12, color: "#DC2626", fontFamily: "Inter_600SemiBold", marginBottom: 10 }}>{actionMsg}</Text>}

            <TouchableOpacity onPress={suspendOfficer} activeOpacity={0.85} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FEF3C7", borderRadius: 14, padding: 15, marginBottom: 10 }}>
              <Feather name="pause-circle" size={20} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: "#92400E", fontFamily: "Inter_700Bold" }}>Suspend ID</Text>
                <Text style={{ fontSize: 11, color: "#B45309", fontFamily: "Inter_400Regular", marginTop: 2 }}>Move officer to rejected/suspended status</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={deleteOfficer} activeOpacity={0.85} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FEE2E2", borderRadius: 14, padding: 15, marginBottom: 10 }}>
              <Feather name="trash-2" size={20} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: "#991B1B", fontFamily: "Inter_700Bold" }}>Delete Officer</Text>
                <Text style={{ fontSize: 11, color: "#B91C1C", fontFamily: "Inter_400Regular", marginTop: 2 }}>Requires DELETE API on backend</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMenuVisible(false)} activeOpacity={0.85} style={{ alignItems: "center", paddingVertical: 14 }}>
              <Text style={{ fontSize: 14, color: "#64748B", fontFamily: "Inter_700Bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
