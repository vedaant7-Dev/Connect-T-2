import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function getApiUrl(path: string) {
  if (API_BASE) return `${API_BASE}${path}`;
  if (typeof window !== "undefined" && window.location?.origin) return `${window.location.origin}${path}`;
  return path;
}

type Step = "phone" | "otp" | "pending" | "rejected";

export default function NagarsevakLoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [sessionToken, setSessionToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const otpRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
  ];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const startCountdown = () => {
    setCountdown(30);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    const cleaned = phone.trim().replace(/\D/g, "");
    if (cleaned.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    setError(""); setOtpSending(true);
    try {
      const res = await fetch(getApiUrl("/api/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to send OTP");
      setSessionToken(data.sessionToken);
      setStep("otp");
      startCountdown();
    } catch (e: any) {
      setError(e.message ?? "Failed to send OTP. Try again.");
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== 6) { setError("Enter all 6 OTP digits"); return; }
    setLoading(true); setError("");
    try {
      const verRes = await fetch(getApiUrl("/api/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, sessionToken }),
      });
      const verData = await verRes.json();
      if (!verData.valid) throw new Error(verData.error ?? "Invalid OTP");

      const cleaned = phone.trim().replace(/\D/g, "");
      const loginRes = await fetch(getApiUrl("/api/auth/nagarsevak-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleaned }),
      });
      const loginData = await loginRes.json();

      if (loginData.success) {
        await login(loginData.user);
        if (loginData.user.isSuperAdmin) {
          router.replace("/super-admin" as any);
        } else {
          router.replace("/(tabs)/admin" as any);
        }
      } else if (loginData.message === "NOT_FOUND" || loginData.notFound) {
        router.push({ pathname: "/nagarsevak/register" as any, params: { phone: cleaned } });
      } else if (loginData.message === "PENDING") {
        setStep("pending");
      } else if (loginData.message === "REJECTED") {
        setStep("rejected");
      } else {
        setError(loginData.message ?? "Login failed");
      }
    } catch (e: any) {
      setError(e.message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const setDigit = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = cleaned.slice(-1);
    setOtpDigits(newDigits);
    if (cleaned && index < 5) otpRefs[index + 1]?.current?.focus();
    if (!cleaned && index > 0) otpRefs[index - 1]?.current?.focus();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        locations={[0, 0.25, 0.55, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.replace("/" as any)} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color="white" />
        </TouchableOpacity>
        <View style={styles.topBadge}>
          <Feather name="shield" size={13} color="white" />
          <Text style={styles.topBadgeText}>Nagarsevak Portal</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            {step === "phone" && (
              <>
                <View style={styles.cardHeader}>
                  <View style={styles.shieldIcon}>
                    <Feather name="shield" size={28} color="#EA580C" />
                  </View>
                  <Text style={styles.cardTitle}>Nagarsevak Login</Text>
                  <Text style={styles.cardSub}>Enter your registered mobile number to receive an OTP</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                  <View style={styles.phoneRow}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="10-digit mobile"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="phone-pad"
                      maxLength={10}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, otpSending && { opacity: 0.7 }]}
                  onPress={sendOtp}
                  disabled={otpSending}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.btnGrad}>
                    {otpSending
                      ? <ActivityIndicator color="white" />
                      : <><Feather name="send" size={17} color="white" /><Text style={styles.btnText}>Send OTP</Text></>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerLink}
                  onPress={() => router.push("/nagarsevak/register" as any)}
                >
                  <Text style={styles.registerLinkText}>New Nagarsevak? <Text style={styles.registerLinkBold}>Register here</Text></Text>
                </TouchableOpacity>
              </>
            )}

            {step === "otp" && (
              <>
                <View style={styles.cardHeader}>
                  <View style={styles.shieldIcon}>
                    <Feather name="lock" size={28} color="#EA580C" />
                  </View>
                  <Text style={styles.cardTitle}>Enter OTP</Text>
                  <Text style={styles.cardSub}>OTP sent to +91 {phone}</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.otpRow}>
                  {otpDigits.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={otpRefs[idx]}
                      style={[styles.otpBox, digit && styles.otpBoxFilled]}
                      value={digit}
                      onChangeText={v => setDigit(idx, v)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={verifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.btnGrad}>
                    {loading
                      ? <ActivityIndicator color="white" />
                      : <><Feather name="check-circle" size={17} color="white" /><Text style={styles.btnText}>Verify & Login</Text></>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={countdown === 0 ? sendOtp : undefined}
                  activeOpacity={countdown === 0 ? 0.7 : 1}
                >
                  <Text style={[styles.resendText, countdown > 0 && { color: "#94A3B8" }]}>
                    {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep("phone")} style={styles.changeBtn}>
                  <Text style={styles.changeBtnText}>← Change number</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "pending" && (
              <View style={styles.statusWrap}>
                <View style={[styles.statusIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Feather name="clock" size={36} color="#D97706" />
                </View>
                <Text style={[styles.statusTitle, { color: "#92400E" }]}>Approval Pending</Text>
                <Text style={styles.statusMsg}>
                  Your Nagarsevak account has been submitted and is waiting for Super Admin approval.
                  You will be able to login once approved.
                </Text>
                <View style={styles.statusInfo}>
                  <Feather name="info" size={14} color="#D97706" />
                  <Text style={styles.statusInfoText}>Please contact the Super Admin if you've been waiting more than 48 hours.</Text>
                </View>
                <TouchableOpacity style={styles.backToHomeBtn} onPress={() => router.replace("/" as any)} activeOpacity={0.8}>
                  <Text style={styles.backToHomeBtnText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === "rejected" && (
              <View style={styles.statusWrap}>
                <View style={[styles.statusIcon, { backgroundColor: "#FEE2E2" }]}>
                  <Feather name="x-circle" size={36} color="#DC2626" />
                </View>
                <Text style={[styles.statusTitle, { color: "#991B1B" }]}>Account Rejected</Text>
                <Text style={styles.statusMsg}>
                  Your Nagarsevak account registration has been rejected. Please contact the Super Admin for more information.
                </Text>
                <TouchableOpacity style={styles.backToHomeBtn} onPress={() => router.replace("/" as any)} activeOpacity={0.8}>
                  <Text style={styles.backToHomeBtnText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  backBtn: { padding: 8 },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  topBadgeText: { fontSize: 12, color: "white", fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, paddingTop: 8 },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardHeader: { alignItems: "center", marginBottom: 24 },
  shieldIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: "#FFF7ED",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 6 },
  cardSub: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center" },
  errorText: {
    backgroundColor: "#FEE2E2", color: "#991B1B",
    fontSize: 12, fontFamily: "Inter_400Regular",
    padding: 10, borderRadius: 10, marginBottom: 14, textAlign: "center",
  },
  inputWrap: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  phoneRow: { flexDirection: "row", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, overflow: "hidden" },
  countryCode: { backgroundColor: "#F8FAFC", paddingHorizontal: 14, justifyContent: "center", borderRightWidth: 1, borderRightColor: "#E2E8F0" },
  countryCodeText: { fontSize: 15, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold" },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: "#0F172A", fontFamily: "Inter_400Regular" },
  primaryBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 16 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  registerLink: { alignItems: "center", paddingVertical: 8 },
  registerLinkText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular" },
  registerLinkBold: { color: "#EA580C", fontFamily: "Inter_600SemiBold" },
  otpRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 24 },
  otpBox: {
    width: 44, height: 52, borderWidth: 1.5, borderColor: "#E2E8F0",
    borderRadius: 12, fontSize: 20, fontWeight: "700", color: "#0F172A",
    fontFamily: "Inter_700Bold", backgroundColor: "#F8FAFC",
  },
  otpBoxFilled: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  resendBtn: { alignItems: "center", paddingVertical: 8 },
  resendText: { fontSize: 13, color: "#EA580C", fontFamily: "Inter_600SemiBold" },
  changeBtn: { alignItems: "center", paddingVertical: 8, marginTop: 4 },
  changeBtnText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular" },
  statusWrap: { alignItems: "center", paddingVertical: 12 },
  statusIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  statusTitle: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold", marginBottom: 12 },
  statusMsg: { fontSize: 14, color: "#475569", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  statusInfo: { flexDirection: "row", gap: 8, backgroundColor: "#FEF3C7", padding: 12, borderRadius: 12, marginBottom: 20 },
  statusInfoText: { flex: 1, fontSize: 12, color: "#92400E", fontFamily: "Inter_400Regular", lineHeight: 18 },
  backToHomeBtn: { backgroundColor: "#0F172A", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 },
  backToHomeBtnText: { color: "white", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 15 },
});
