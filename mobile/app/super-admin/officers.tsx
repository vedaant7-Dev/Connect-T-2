import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOfficers } from "@/hooks/useOfficers";
import { useComplaints } from "@/context/ComplaintContext";

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 10, marginTop: 6 }}>
      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{title}</Text>
      {sub && <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{sub}</Text>}
    </View>
  );
}

export default function OfficersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { complaints } = useComplaints();
  const [search, setSearch] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"officers" | "wards">("officers");

  const { officers: allOfficers, loading: officersLoading, approveOfficer, refetch } = useOfficers();
  const [activeStatus, setActiveStatus] = useState<"approved" | "pending" | "rejected">("approved");

  const officers = allOfficers.filter((o) => o.approvalStatus === activeStatus);
  const filteredOfficers = officers.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.ward.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
  );

  const wardOfficers = officers.filter((o) => o.wardCode);
  const nominatedOfficers = officers.filter((o) => !o.wardCode);
  const pendingCount = allOfficers.filter((o) => o.approvalStatus === "pending").length;

  const handleApprove = async (id: string, status: "approved" | "rejected") => {
    await approveOfficer(id, status);
    refetch();
  };

  function getOfficerStats(officer: any) {
    const wardComplaints = officer.wardCode
      ? complaints.filter((c) => c.ward === officer.ward)
      : [];
    return {
      total: wardComplaints.length,
      pending: wardComplaints.filter((c) => c.status === "submitted").length,
      resolved: wardComplaints.filter((c) => c.status === "resolved").length,
      active: wardComplaints.filter(
        (c) => c.status === "in_progress" || c.status === "assigned"
      ).length,
    };
  }

  const wardRows = wardOfficers.map((o) => ({
    officer: o,
    stats: getOfficerStats(o),
  }));

  const topPerformers = [...wardRows]
    .sort((a, b) => b.stats.resolved - a.stats.resolved)
    .slice(0, 5);

  const busyWards = [...wardRows]
    .sort((a, b) => b.stats.pending - a.stats.pending)
    .slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <LinearGradient
        colors={["#052E16", "#166534", "#16A34A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 6 }}>
              <Feather name="users" size={10} color="#6EE7B7" />
              <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: "#6EE7B7", marginLeft: 4, letterSpacing: 1.5 }}>OFFICER & WARD MANAGEMENT</Text>
            </View>
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "white" }}>Nagar Sevaks</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
              {officers.length} officers · {wardOfficers.filter((o) => o.wardCode).length} wards covered
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 }}>
          {[
            { label: "Total Officers", value: officers.length, color: "#93C5FD" },
            { label: "Ward Officers", value: wardOfficers.length, color: "#6EE7B7" },
            { label: "Nominated", value: nominatedOfficers.length, color: "#FDE68A" },
            { label: "Wards", value: wardOfficers.filter((o) => o.wardCode).length, color: "#C4B5FD" },
          ].map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 2, textAlign: "center" }}>{s.label}</Text>
              {i < 3 && <View style={{ position: "absolute", right: 0, top: "10%", height: "80%", width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />}
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ flexDirection: "row", backgroundColor: "#1E293B", paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
        {(["officers", "wards"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: activeTab === tab ? "#16A34A" : "transparent",
              alignItems: "center",
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: activeTab === tab ? "white" : "#64748B", textTransform: "capitalize" }}>
              {tab === "officers" ? "Officers" : "Ward Overview"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "officers" && (
        <View style={{ flexDirection: "row", backgroundColor: "#F0F4F8", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 }}>
          {(["approved", "pending", "rejected"] as const).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveStatus(s)}
              style={{
                flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: "center",
                backgroundColor: activeStatus === s
                  ? (s === "approved" ? "#16A34A" : s === "pending" ? "#D97706" : "#DC2626")
                  : "white",
                borderWidth: s === "pending" && pendingCount > 0 && activeStatus !== "pending" ? 1.5 : 0,
                borderColor: "#D97706",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: activeStatus === s ? "white" : "#64748B", textTransform: "capitalize" }}>
                {s === "approved" ? "Approved" : s === "pending" ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` : "Rejected"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={{ flex: 1, backgroundColor: "#F0F4F8" }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {activeTab === "officers" ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
              <Feather name="search" size={16} color="#94A3B8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search officers, wards..."
                placeholderTextColor="#CBD5E1"
                style={{ flex: 1, marginLeft: 10, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0F172A", outlineWidth: 0 } as any}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Feather name="x" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <SectionHeader title="Top Performers" sub="Officers with most resolved complaints" />
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {topPerformers.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 13 }}>No data yet</Text>
              ) : (
                topPerformers.map(({ officer, stats }, idx) => (
                  <View key={officer.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: idx < topPerformers.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: idx === 0 ? "#FEF3C7" : "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: idx === 0 ? "#D97706" : "#64748B" }}>#{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }} numberOfLines={1}>{officer.name}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{officer.ward}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#059669" }}>{stats.resolved}</Text>
                      <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>resolved</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <SectionHeader title={`All Officers (${filteredOfficers.length})`} sub="Tap to view officer details" />
            {filteredOfficers.map((officer, idx) => {
              const stats = getOfficerStats(officer);
              return (
                <TouchableOpacity
                  key={officer.id}
                  onPress={() => setSelectedOfficer(officer)}
                  style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#16A34A" }}>
                        {officer.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0F172A" }} numberOfLines={1}>{officer.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                        <Feather name="map-pin" size={10} color="#94A3B8" />
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B", marginLeft: 4 }}>{officer.ward}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#CBD5E1", marginHorizontal: 6 }}>·</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>{officer.id}</Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={16} color="#CBD5E1" />
                  </View>
                  {officer.wardCode && activeStatus === "approved" && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      {[
                        { label: "Total", value: stats.total, color: "#3B82F6", bg: "#DBEAFE" },
                        { label: "Pending", value: stats.pending, color: "#D97706", bg: "#FEF3C7" },
                        { label: "Active", value: stats.active, color: "#7C3AED", bg: "#EDE9FE" },
                        { label: "Resolved", value: stats.resolved, color: "#059669", bg: "#D1FAE5" },
                      ].map((s) => (
                        <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 8, padding: 6, alignItems: "center" }}>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
                          <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color + "AA" }}>{s.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {activeStatus === "pending" && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => handleApprove(officer.id, "approved")}
                        style={{ flex: 1, backgroundColor: "#D1FAE5", borderRadius: 10, paddingVertical: 9, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                        activeOpacity={0.8}
                      >
                        <Feather name="check" size={14} color="#059669" />
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#059669" }}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleApprove(officer.id, "rejected")}
                        style={{ flex: 1, backgroundColor: "#FEE2E2", borderRadius: 10, paddingVertical: 9, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                        activeOpacity={0.8}
                      >
                        <Feather name="x" size={14} color="#DC2626" />
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#DC2626" }}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <>
            <SectionHeader title="Most Active Wards" sub="Wards with highest pending complaints" />
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {busyWards.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 13 }}>No data yet</Text>
              ) : (
                busyWards.map(({ officer, stats }, idx) => (
                  <View key={officer.id} style={{ paddingVertical: 11, borderBottomWidth: idx < busyWards.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#D97706" }}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>{officer.ward}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{officer.name}</Text>
                      </View>
                      <View style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#DC2626" }}>{stats.pending} pending</Text>
                      </View>
                    </View>
                    <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, marginLeft: 38 }}>
                      <View style={{ height: 6, width: stats.total > 0 ? `${(stats.pending / Math.max(...busyWards.map((w) => w.stats.pending), 1)) * 100}%` : "0%", backgroundColor: "#F59E0B", borderRadius: 3 }} />
                    </View>
                  </View>
                ))
              )}
            </View>

            <SectionHeader title="All Wards Overview" sub={`${wardOfficers.filter((o) => o.wardCode).length} wards · Officer mapping`} />
            {wardOfficers.filter((o) => o.wardCode).map((officer, idx) => {
              const stats = getOfficerStats(officer);
              const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
              return (
                <View key={officer.id} style={{ backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <Feather name="map-pin" size={15} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{officer.ward}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{officer.name} · {officer.id}</Text>
                    </View>
                    <View style={{ backgroundColor: resolutionRate >= 60 ? "#D1FAE5" : resolutionRate >= 30 ? "#FEF3C7" : "#FEE2E2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: resolutionRate >= 60 ? "#059669" : resolutionRate >= 30 ? "#D97706" : "#DC2626" }}>
                        {resolutionRate}%
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[
                      { label: "Total", value: stats.total, color: "#3B82F6", bg: "#DBEAFE" },
                      { label: "Pending", value: stats.pending, color: "#D97706", bg: "#FEF3C7" },
                      { label: "Active", value: stats.active, color: "#7C3AED", bg: "#EDE9FE" },
                      { label: "Resolved", value: stats.resolved, color: "#059669", bg: "#D1FAE5" },
                    ].map((s) => (
                      <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 8, padding: 6, alignItems: "center" }}>
                        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
                        <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color + "BB" }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <Modal visible={!!selectedOfficer} transparent animationType="slide" onRequestClose={() => setSelectedOfficer(null)}>
        {selectedOfficer && (() => {
          const stats = getOfficerStats(selectedOfficer);
          const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
          return (
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <View style={{ backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, maxHeight: "88%" }}>
                <View style={{ width: 36, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                    <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#16A34A" }}>{selectedOfficer.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{selectedOfficer.name}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{selectedOfficer.ward} · {selectedOfficer.id}</Text>
                  </View>
                </View>
                {[
                  { label: "Mobile", value: selectedOfficer.mobile ? "+91 " + selectedOfficer.mobile : "Not added", icon: "phone" },
                  { label: "DOB", value: selectedOfficer.dob || "Not added", icon: "calendar" },
                  { label: "Ward", value: selectedOfficer.ward || "Not added", icon: "map-pin" },
                  { label: "Ward Code", value: selectedOfficer.wardCode || "Not added", icon: "hash" },
                  { label: "Nagarsevak ID", value: selectedOfficer.id || "Not added", icon: "credit-card" },
                  { label: "Role", value: selectedOfficer.role === "super_admin" ? "Super Admin" : "Nagarsevak", icon: "briefcase" },
                  { label: "Contact Person", value: selectedOfficer.contactName || selectedOfficer.name || "Not added", icon: "user-check" },
                  { label: "Contact Number", value: selectedOfficer.contactNumber ? "+91 " + selectedOfficer.contactNumber : "Not added", icon: "phone-call" },
                  { label: "Office Address", value: selectedOfficer.officeAddress || "Not added", icon: "map" },
                  { label: "Residence Address", value: selectedOfficer.residenceAddress || selectedOfficer.address || "Not added", icon: "home" },
                  { label: "Office Timings", value: selectedOfficer.officeTimings || "Not added", icon: "clock" },
                  { label: "Verification", value: selectedOfficer.approvalStatus || "pending", icon: "shield" },
                  { label: "Registered On", value: selectedOfficer.createdAt ? new Date(selectedOfficer.createdAt).toLocaleDateString() : "Not added", icon: "calendar" },
                ].map((item, idx, arr) => (
                  <View key={item.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <Feather name={item.icon as any} size={14} color="#64748B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>{item.label}</Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A", lineHeight: 18 }}>{item.value}</Text>
                    </View>
                  </View>
                ))}
                {selectedOfficer.wardCode && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#94A3B8", letterSpacing: 1, marginBottom: 10 }}>PERFORMANCE STATS</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {[
                        { label: "Total", value: stats.total, color: "#3B82F6", bg: "#DBEAFE" },
                        { label: "Pending", value: stats.pending, color: "#D97706", bg: "#FEF3C7" },
                        { label: "Active", value: stats.active, color: "#7C3AED", bg: "#EDE9FE" },
                        { label: "Resolved", value: stats.resolved, color: "#059669", bg: "#D1FAE5" },
                      ].map((s) => (
                        <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 10, padding: 10, alignItems: "center" }}>
                          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
                          <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color }}>{s.label}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ marginTop: 12, backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center" }}>
                      <Feather name="trending-up" size={16} color="#16A34A" />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A", marginLeft: 8 }}>
                        Resolution Rate: <Text style={{ color: resolutionRate >= 60 ? "#059669" : resolutionRate >= 30 ? "#D97706" : "#DC2626" }}>{resolutionRate}%</Text>
                      </Text>
                    </View>
                  </View>
                )}
                <TouchableOpacity onPress={() => setSelectedOfficer(null)} style={{ marginTop: 20, paddingVertical: 14, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center" }} activeOpacity={0.8}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#64748B" }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}
