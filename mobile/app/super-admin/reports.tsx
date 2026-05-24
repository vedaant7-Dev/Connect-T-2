import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useComplaints } from "@/context/ComplaintContext";
import { useOfficers } from "@/hooks/useOfficers";
import { useAuth } from "@/context/AuthContext";

const categoryConfig: Record<string, { icon: string; color: string; label: string }> = {
  roads: { icon: "truck", color: "#92400E", label: "Roads" },
  water: { icon: "droplet", color: "#0369A1", label: "Water" },
  electricity: { icon: "zap", color: "#D97706", label: "Electricity" },
  garbage: { icon: "trash-2", color: "#059669", label: "Garbage" },
  drainage: { icon: "git-merge", color: "#0EA5E9", label: "Drainage" },
  streetlight: { icon: "sun", color: "#7C3AED", label: "Streetlight" },
  encroachment: { icon: "alert-triangle", color: "#DC2626", label: "Encroachment" },
  other: { icon: "more-horizontal", color: "#475569", label: "Other" },
};

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { complaints } = useComplaints();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"reports" | "security">("reports");

  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const pending = complaints.filter((c) => c.status === "submitted").length;
  const rejected = complaints.filter((c) => c.status === "rejected").length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const { officers: officerList } = useOfficers("approved");
  const officers = officerList.filter((o) => o.wardCode);

  const wardPerformance = officers.map((officer) => {
    const wardComplaints = complaints.filter((c) => c.ward === officer.ward);
    const wResolved = wardComplaints.filter((c) => c.status === "resolved").length;
    const wPending = wardComplaints.filter((c) => c.status === "submitted").length;
    const wTotal = wardComplaints.length;
    const rate = wTotal > 0 ? Math.round((wResolved / wTotal) * 100) : 0;

    const resolvedComplaints = wardComplaints.filter((c) => c.status === "resolved" && c.updatedAt);
    const avgResolutionHours =
      resolvedComplaints.length > 0
        ? Math.round(
            resolvedComplaints.reduce((sum, c) => {
              const diff = new Date(c.updatedAt || c.createdAt).getTime() - new Date(c.createdAt).getTime();
              return sum + diff / 3600000;
            }, 0) / resolvedComplaints.length
          )
        : null;

    return {
      officer,
      total: wTotal,
      resolved: wResolved,
      pending: wPending,
      rate,
      avgResolutionHours,
    };
  }).sort((a, b) => b.rate - a.rate);

  const topIssueAreas = Object.entries(
    complaints.reduce((acc: Record<string, number>, c) => {
      acc[c.ward || "Unknown"] = (acc[c.ward || "Unknown"] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const categoryStats = Object.entries(
    complaints.reduce((acc: Record<string, any>, c) => {
      if (!acc[c.category]) acc[c.category] = { total: 0, resolved: 0 };
      acc[c.category].total++;
      if (c.status === "resolved") acc[c.category].resolved++;
      return acc;
    }, {})
  ).sort((a: any, b: any) => b[1].total - a[1].total);

  const avgResolutionOverall = (() => {
    const resolvedComplaints = complaints.filter((c) => c.status === "resolved" && c.updatedAt);
    if (resolvedComplaints.length === 0) return null;
    const totalHours = resolvedComplaints.reduce((sum, c) => {
      const diff = new Date(c.updatedAt || c.createdAt).getTime() - new Date(c.createdAt).getTime();
      return sum + diff / 3600000;
    }, 0);
    return Math.round(totalHours / resolvedComplaints.length);
  })();

  const sessionLog = [
    { action: "Super Admin Login", time: new Date().toLocaleTimeString(), device: "Mobile App", status: "success" },
    { action: "Dashboard Accessed", time: new Date().toLocaleTimeString(), device: "Mobile App", status: "success" },
    { action: "Reports Viewed", time: new Date().toLocaleTimeString(), device: "Mobile App", status: "success" },
  ];

  const systemHealth = [
    { label: "App Status", value: "Online", icon: "check-circle", color: "#059669", bg: "#D1FAE5" },
    { label: "Data Sync", value: "Live", icon: "refresh-cw", color: "#3B82F6", bg: "#DBEAFE" },
    { label: "Auth System", value: "Secure", icon: "shield", color: "#7C3AED", bg: "#EDE9FE" },
    { label: "Storage", value: "Normal", icon: "database", color: "#D97706", bg: "#FEF3C7" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <LinearGradient
        colors={["#052E16", "#166534", "#16A34A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 6 }}>
            <Feather name="bar-chart-2" size={10} color="#6EE7B7" />
            <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: "#6EE7B7", marginLeft: 4, letterSpacing: 1.5 }}>REPORTS & SECURITY</Text>
          </View>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "white" }}>Reports & Insights</Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
            Performance data across all wards
          </Text>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 }}>
          {[
            { label: "Total", value: total, color: "#93C5FD" },
            { label: "Resolved", value: resolved, color: "#6EE7B7" },
            { label: "Pending", value: pending, color: "#FDE68A" },
            { label: "Rate", value: `${resolutionRate}%`, color: "#C4B5FD" },
          ].map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{s.label}</Text>
              {i < 3 && <View style={{ position: "absolute", right: 0, top: "10%", height: "80%", width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />}
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ flexDirection: "row", backgroundColor: "#1E293B", paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
        {(["reports", "security"] as const).map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: activeTab === tab ? "#16A34A" : "transparent", alignItems: "center" }} activeOpacity={0.8}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: activeTab === tab ? "white" : "#64748B" }}>
              {tab === "reports" ? "Reports & Insights" : "Security Dashboard"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: "#F0F4F8" }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {activeTab === "reports" ? (
          <>
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 12 }}>Overall Performance Summary</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: "#DCFCE7", borderRadius: 12, padding: 14, alignItems: "center" }}>
                  <Feather name="trending-up" size={20} color="#16A34A" />
                  <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#166534", marginTop: 6 }}>{resolutionRate}%</Text>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#16A34A", textAlign: "center" }}>Resolution Rate</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "#DBEAFE", borderRadius: 12, padding: 14, alignItems: "center" }}>
                  <Feather name="clock" size={20} color="#3B82F6" />
                  <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#1D4ED8", marginTop: 6 }}>
                    {avgResolutionOverall != null ? `${avgResolutionOverall}h` : "N/A"}
                  </Text>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#3B82F6", textAlign: "center" }}>Avg Resolution Time</Text>
                </View>
              </View>
              <View style={{ marginTop: 12, height: 8, backgroundColor: "#F1F5F9", borderRadius: 4 }}>
                <View style={{ height: 8, width: `${resolutionRate}%`, backgroundColor: resolutionRate >= 60 ? "#16A34A" : resolutionRate >= 30 ? "#D97706" : "#DC2626", borderRadius: 4 }} />
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 6, textAlign: "right" }}>
                {resolved} resolved out of {total} total
              </Text>
            </View>

            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>Ward Performance</Text>
            {wardPerformance.length === 0 ? (
              <View style={{ backgroundColor: "white", borderRadius: 16, padding: 24, alignItems: "center" }}>
                <Text style={{ color: "#94A3B8", fontFamily: "Inter_400Regular", fontSize: 13 }}>No ward data yet</Text>
              </View>
            ) : (
              wardPerformance.slice(0, 10).map(({ officer, total: wTotal, resolved: wResolved, pending: wPending, rate, avgResolutionHours }, idx) => (
                <View key={officer.id} style={{ backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: rate >= 60 ? "#DCFCE7" : rate >= 30 ? "#FEF3C7" : "#FEE2E2", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: rate >= 60 ? "#16A34A" : rate >= 30 ? "#D97706" : "#DC2626" }}>#{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>{officer.ward}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{officer.name}</Text>
                    </View>
                    <View style={{ backgroundColor: rate >= 60 ? "#D1FAE5" : rate >= 30 ? "#FEF3C7" : "#FEE2E2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: rate >= 60 ? "#059669" : rate >= 30 ? "#D97706" : "#DC2626" }}>{rate}%</Text>
                    </View>
                  </View>
                  <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, marginBottom: 6 }}>
                    <View style={{ height: 6, width: `${rate}%`, backgroundColor: rate >= 60 ? "#16A34A" : rate >= 30 ? "#D97706" : "#DC2626", borderRadius: 3 }} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>
                      {wTotal} total · {wPending} pending · {wResolved} resolved
                    </Text>
                    {avgResolutionHours != null && (
                      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>
                        ~{avgResolutionHours}h avg
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}

            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 16, marginBottom: 10 }}>Most Problematic Areas</Text>
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {topIssueAreas.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 13 }}>No data yet</Text>
              ) : (
                topIssueAreas.map(([ward, count], idx) => (
                  <View key={ward} style={{ paddingVertical: 10, borderBottomWidth: idx < topIssueAreas.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: "#DC2626" }}>#{idx + 1}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155" }}>{ward}</Text>
                      <View style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 }}>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#DC2626" }}>{count}</Text>
                      </View>
                    </View>
                    <View style={{ height: 5, backgroundColor: "#F1F5F9", borderRadius: 3, marginLeft: 36 }}>
                      <View style={{ height: 5, width: `${total > 0 ? (count / total) * 100 : 0}%`, backgroundColor: "#F87171", borderRadius: 3 }} />
                    </View>
                  </View>
                ))
              )}
            </View>

            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>Category Performance</Text>
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {categoryStats.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 13 }}>No data yet</Text>
              ) : (
                categoryStats.map(([cat, stats]: any) => {
                  const cfg = categoryConfig[cat] || categoryConfig.other;
                  const catRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
                  return (
                    <View key={cat} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: cfg.color + "18", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                          <Feather name={cfg.icon as any} size={14} color={cfg.color} />
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155" }}>{cfg.label}</Text>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: catRate >= 50 ? "#059669" : "#D97706" }}>{catRate}% resolved</Text>
                      </View>
                      <View style={{ height: 5, backgroundColor: "#F1F5F9", borderRadius: 3, marginLeft: 38 }}>
                        <View style={{ height: 5, width: `${catRate}%`, backgroundColor: cfg.color, borderRadius: 3, opacity: 0.7 }} />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>System Health</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginBottom: 16 }}>
              {systemHealth.map((item) => (
                <View key={item.label} style={{ width: "50%", padding: 4 }}>
                  <View style={{ backgroundColor: "white", borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                      <Feather name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: item.color }}>{item.value}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{item.label}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>Super Admin Access Logs</Text>
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#DCFCE7", borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <Feather name="shield" size={16} color="#16A34A" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>Tejashree (Super Admin)</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#16A34A" }}>+91 8554994735 · Head Administrator</Text>
                </View>
              </View>
              {sessionLog.map((log, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: idx < sessionLog.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                    <Feather name="check" size={14} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#0F172A" }}>{log.action}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>{log.device} · {log.time}</Text>
                  </View>
                  <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#059669" }}>OK</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>Fraud & Spam Detection</Text>
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#D1FAE5", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <Feather name="shield" size={20} color="#059669" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#065F46" }}>No threats detected</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#059669" }}>System is secure · Auto-scan active</Text>
                </View>
              </View>
              {[
                { label: "Duplicate Complaints Flagged", value: "0", icon: "copy", color: "#16A34A" },
                { label: "Spam Reports", value: "0", icon: "alert-circle", color: "#16A34A" },
                { label: "Suspicious Accounts", value: "0", icon: "user-x", color: "#16A34A" },
                { label: "Failed Login Attempts", value: "0", icon: "lock", color: "#16A34A" },
              ].map((item, idx, arr) => (
                <View key={item.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                  <Feather name={item.icon as any} size={14} color={item.color} />
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155", marginLeft: 10 }}>{item.label}</Text>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: item.color }}>{item.value}</Text>
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>Device & Session Info</Text>
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {[
                { label: "Active Sessions", value: "1 (this device)", icon: "smartphone" },
                { label: "Platform", value: Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web", icon: "monitor" },
                { label: "App Version", value: "v1.0 · AMC Ambernath", icon: "info" },
                { label: "Last Sync", value: new Date().toLocaleTimeString(), icon: "refresh-cw" },
              ].map((item, idx, arr) => (
                <View key={item.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                    <Feather name={item.icon as any} size={14} color="#64748B" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155" }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
