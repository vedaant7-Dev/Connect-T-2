import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/utils/apiUrl";

function cleanMobile(value?: string | string[]) {
  return String(Array.isArray(value) ? value[0] : value || "").replace(/\D/g, "").slice(-10);
}

type StatusState = "submitted" | "reviewing" | "approved" | "rejected" | "not_found";

export default function NagarsevakVerificationStatusScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone?: string; mobile?: string; from?: string }>();
  const { login } = useAuth();
  const phone = cleanMobile(params.phone || params.mobile);
  const [status, setStatus] = useState<StatusState>("submitted");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("Your Nagarsevak registration has been submitted successfully.");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (Platform.OS !== "web") BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, []);

  const checkStatus = async (auto = false) => {
    if (!phone || checking) return;
    setChecking(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/nagarsevak-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phone }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.success && data.user) {
        setStatus("approved");
        setMessage("Your profile is approved. Opening Nagarsevak dashboard...");
        await login(data.user);
        setTimeout(() => router.replace("/(tabs)/admin" as any), 600);
        return;
      }

      if (data.message === "PENDING") {
        setStatus(auto ? "reviewing" : "submitted");
        setMessage("Your request is under review by Super Admin. You will be able to login after approval.");
      } else if (data.message === "REJECTED") {
        setStatus("rejected");
        setMessage("Your registration was rejected. Please contact Super Admin before submitting again.");
      } else if (data.message === "NOT_FOUND" || data.notFound) {
        setStatus("not_found");
        setMessage("No Nagarsevak registration was found for this mobile number. Please register first.");
      } else {
        setStatus("reviewing");
        setMessage("Verification is still under review. Please check again later.");
      }
    } catch {
      setStatus("reviewing");
      setMessage("Could not refresh right now. Your submitted request is still saved for review.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus(true);
    const appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "active") checkStatus(true);
    });
    return () => appStateSub.remove();
  }, [phone]);

  useEffect(() => {
    if (status === "approved" || status === "rejected" || status === "not_found") return;
    timerRef.current = setTimeout(() => checkStatus(true), 12000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, phone, checking]);

  const steps = [
    { key: "submitted", label: "Submitted", icon: "send" },
    { key: "reviewing", label: "Reviewing", icon: "clock" },
    { key: "approved", label: "Approved", icon: "check-circle" },
  ];

  const activeIndex = status === "approved" ? 2 : status === "reviewing" ? 1 : 0;
  const rejected = status === "rejected" || status === "not_found";

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#9A3412", "#C2410C", "#EA580C", "#F97316"]} style={StyleSheet.absoluteFill} />
      <View style={[styles.wrap, { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 28 }]}> 
        <View style={styles.card}>
          <View style={[styles.mainIcon, { backgroundColor: rejected ? "#FEE2E2" : status === "approved" ? "#DCFCE7" : "#FFF7ED" }]}> 
            <Feather name={rejected ? "alert-circle" : status === "approved" ? "check-circle" : "shield"} size={38} color={rejected ? "#DC2626" : status === "approved" ? "#16A34A" : "#EA580C"} />
          </View>
          <Text style={styles.title}>{rejected ? "Verification Status" : "Verification Pending"}</Text>
          <Text style={styles.sub}>{message}</Text>
          {!!phone && <Text style={styles.mobile}>+91 {phone}</Text>}

          <View style={styles.stepsBox}>
            {steps.map((step, index) => {
              const active = index <= activeIndex && !rejected;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={[styles.stepIcon, active && styles.stepIconActive, rejected && index === 0 && styles.stepIconRejected]}>
                    <Feather name={step.icon as any} size={16} color={active ? "white" : rejected && index === 0 ? "white" : "#94A3B8"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{step.label}</Text>
                    <Text style={styles.stepSub}>{index === 0 ? "Request received" : index === 1 ? "Waiting for Super Admin action" : "Dashboard opens automatically"}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={() => checkStatus(false)} disabled={checking} activeOpacity={0.85}>
            {checking ? <ActivityIndicator color="white" /> : <><Feather name="refresh-cw" size={16} color="white" /><Text style={styles.refreshText}>Check Status</Text></>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.exitBtn} onPress={() => Platform.OS === "web" ? router.replace("/secret-access" as any) : BackHandler.exitApp()} activeOpacity={0.82}>
            <Text style={styles.exitText}>{Platform.OS === "web" ? "Back to Admin Access" : "Close App"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: 22 },
  card: { backgroundColor: "white", borderRadius: 26, padding: 24, alignItems: "center", shadowColor: "#7C2D12", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  mainIcon: { width: 86, height: 86, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 23, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" },
  sub: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginTop: 8 },
  mobile: { marginTop: 12, fontSize: 13, color: "#EA580C", fontFamily: "Inter_700Bold" },
  stepsBox: { width: "100%", marginTop: 22, marginBottom: 18, gap: 12 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  stepIconActive: { backgroundColor: "#16A34A" },
  stepIconRejected: { backgroundColor: "#DC2626" },
  stepLabel: { fontSize: 14, color: "#64748B", fontFamily: "Inter_700Bold" },
  stepLabelActive: { color: "#0F172A" },
  stepSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
  refreshBtn: { width: "100%", minHeight: 52, borderRadius: 16, backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  refreshText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
  exitBtn: { marginTop: 14, paddingVertical: 12, paddingHorizontal: 18 },
  exitText: { color: "#64748B", fontSize: 13, fontFamily: "Inter_700Bold" },
});
