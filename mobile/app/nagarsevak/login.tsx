import { verifyRealOtp } from "../../lib/otpApi";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

import { apiPost } from "@/lib/api";

type Step = "phone" | "otp" | "pending" | "rejected";
const DEMO_OTP = "1234";

function cleanMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export default function NagarsevakLoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [error, setError] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const sendOtp = async () => {
    const cleaned = cleanMobile(phone);
    if (cleaned.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setOtpSending(true);
    setTimeout(() => {
      setPhone(cleaned);
      setOtpDigits(["", "", "", ""]);
      setStep("otp");
      setOtpSending(false);
    }, 250);
  };

  const verifyOtp = async () => {
    const cleaned = cleanMobile(phone);
    const otp = otpDigits.join("");

    const otpCheck = await verifyRealOtp(phone, otp, "login");
    if (!otpCheck.success) { setError(otpCheck.error || "Invalid OTP"); return; }

    setLoading(true);
    setError("");

    try {
      const response = await apiPost<any>("/api/auth/nagarsevak-login", {
        mobile: cleaned,
      });

      if (!response.success) {
        if (response.message === "PENDING") {
          router.replace({ pathname: "/nagarsevak/status" as any, params: { phone: cleaned, from: "login" } });
          return;
        }

        if (response.message === "REJECTED") {
          setStep("rejected");
          return;
        }

        if (response.message === "NOT_FOUND" || response.notFound) {
          setError("Account not found. Please register first.");
          setStep("phone");
          return;
        }

        throw new Error(response.message || "Login failed");
      }

      const officer = response.user || {};

      await login({
        id: officer.id || `NS${cleaned}`,
        name: officer.name || "Nagarsevak",
        mobile: cleanMobile(officer.mobile || cleaned),
        role: officer.role === "super_admin" ? "super_admin" : "nagarsevak",
        ward: officer.ward || "Ward Pending",
        wardCode: officer.wardCode || null,
        wardNumber: officer.wardNumber || officer.wardCode || undefined,
        isSuperAdmin: !!officer.isSuperAdmin,
        nagarsevakId: officer.nagarsevakId || officer.id || `NS${cleaned}`,
        avatarColor: officer.avatarColor || "#16A34A",
        profilePhoto: officer.profilePhoto,
        address: officer.address,
        officeAddress: officer.officeAddress,
        residenceAddress: officer.residenceAddress,
        officeTimings: officer.officeTimings,
        contactName: officer.contactName,
        contactNumber: officer.contactNumber,
        createdAt: officer.createdAt || new Date().toISOString(),
      } as any);

      router.replace((officer.role === "super_admin" || officer.isSuperAdmin) ? "/super-admin" as any : "/(tabs)/admin" as any);
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const setDigit = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const next = [...otpDigits];
    next[index] = cleaned.slice(-1);
    setOtpDigits(next);
    if (cleaned && index < 3) otpRefs[index + 1]?.current?.focus();
    if (!cleaned && index > 0) otpRefs[index - 1]?.current?.focus();
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]} locations={[0, 0.25, 0.55, 0.8, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}> 
        <TouchableOpacity onPress={() => router.replace("/secret-access" as any)} style={styles.backBtn} activeOpacity={0.8}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity>
        <View style={styles.topBadge}><Feather name="shield" size={13} color="white" /><Text style={styles.topBadgeText}>Nagarsevak Portal</Text></View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}> 
            {step === "phone" && <>
              <View style={styles.cardHeader}><View style={styles.shieldIcon}><Feather name="shield" size={27} color="#EA580C" /></View><Text style={styles.cardTitle}>Nagarsevak Login</Text><Text style={styles.cardSub}>Enter mobile number. Demo OTP is used for now.</Text></View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.inputWrap}><Text style={styles.inputLabel}>MOBILE NUMBER</Text><View style={styles.phoneRow}><View style={styles.countryCode}><Text style={styles.countryCodeText}>+91</Text></View><TextInput style={styles.phoneInput} value={phone} onChangeText={setPhone} placeholder="10-digit mobile" placeholderTextColor="#CBD5E1" keyboardType="phone-pad" maxLength={10} autoFocus /></View></View>
              <TouchableOpacity style={[styles.primaryBtn, otpSending && { opacity: 0.7 }]} onPress={sendOtp} disabled={otpSending} activeOpacity={0.85}><LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.btnGrad}>{otpSending ? <ActivityIndicator color="white" /> : <><Feather name="send" size={17} color="white" /><Text style={styles.btnText}>Continue</Text></>}</LinearGradient></TouchableOpacity>
              <Text style={styles.demoText}>Demo OTP: {DEMO_OTP}</Text>
              <TouchableOpacity style={styles.registerLink} onPress={() => router.push("/nagarsevak/register" as any)}><Text style={styles.registerLinkText}>New Nagarsevak? <Text style={styles.registerLinkBold}>Register here</Text></Text></TouchableOpacity>
            </>}
            {step === "otp" && <>
              <View style={styles.cardHeader}><View style={styles.shieldIcon}><Feather name="lock" size={27} color="#EA580C" /></View><Text style={styles.cardTitle}>Enter OTP</Text><Text style={styles.cardSub}>Enter the 6-digit OTP sent to +91 {phone}</Text></View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.otpRow}>{otpDigits.map((digit, idx) => <TextInput key={idx} ref={otpRefs[idx]} style={[styles.otpBox, digit && styles.otpBoxFilled]} value={digit} onChangeText={(v) => setDigit(idx, v)} keyboardType="number-pad" maxLength={1} textAlign="center" />)}</View>
              <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={verifyOtp} disabled={loading} activeOpacity={0.85}><LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.btnGrad}>{loading ? <ActivityIndicator color="white" /> : <><Feather name="check-circle" size={17} color="white" /><Text style={styles.btnText}>Verify & Login</Text></>}</LinearGradient></TouchableOpacity>
              <TouchableOpacity onPress={() => setStep("phone")} style={styles.changeBtn}><Text style={styles.changeBtnText}>← Change number</Text></TouchableOpacity>
            </>}
            {step === "pending" && <Status icon="clock" color="#D97706" bg="#FEF3C7" title="Approval Pending" msg="Your Nagarsevak account is waiting for Super Admin approval. Once approved, login again with OTP received by SMS." />}
            {step === "rejected" && <Status icon="x-circle" color="#DC2626" bg="#FEE2E2" title="Account Rejected" msg="Your registration was rejected. Please contact Super Admin." />}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Status({ icon, color, bg, title, msg }: { icon: keyof typeof Feather.glyphMap; color: string; bg: string; title: string; msg: string }) {
  return <View style={styles.statusWrap}><View style={[styles.statusIcon, { backgroundColor: bg }]}><Feather name={icon} size={34} color={color} /></View><Text style={[styles.statusTitle, { color }]}>{title}</Text><Text style={styles.statusMsg}>{msg}</Text><TouchableOpacity style={styles.backToHomeBtn} onPress={() => router.replace("/secret-access" as any)} activeOpacity={0.8}><Text style={styles.backToHomeBtnText}>Back to Home</Text></TouchableOpacity></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, justifyContent: "space-between" },
  backBtn: { padding: 8 },
  topBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  topBadgeText: { fontSize: 12, color: "white", fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, paddingTop: 8 },
  card: { backgroundColor: "white", borderRadius: 24, padding: 22, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  cardHeader: { alignItems: "center", marginBottom: 22 },
  shieldIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  cardTitle: { fontSize: 21, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 6 },
  cardSub: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  errorText: { backgroundColor: "#FEE2E2", color: "#991B1B", fontSize: 12, fontFamily: "Inter_400Regular", padding: 10, borderRadius: 10, marginBottom: 14, textAlign: "center" },
  inputWrap: { marginBottom: 18 },
  inputLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  phoneRow: { flexDirection: "row", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, overflow: "hidden" },
  countryCode: { backgroundColor: "#F8FAFC", paddingHorizontal: 14, justifyContent: "center", borderRightWidth: 1, borderRightColor: "#E2E8F0" },
  countryCodeText: { fontSize: 15, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold" },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  primaryBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnText: { color: "white", fontSize: 15, fontWeight: "800", fontFamily: "Inter_700Bold" },
  demoText: { textAlign: "center", marginTop: 10, color: "#EA580C", fontSize: 12, fontFamily: "Inter_700Bold" },
  registerLink: { marginTop: 18, alignItems: "center" },
  registerLinkText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular" },
  registerLinkBold: { color: "#EA580C", fontFamily: "Inter_700Bold" },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: 9, marginBottom: 18 },
  otpBox: { width: 48, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", fontSize: 20, fontFamily: "Inter_700Bold", color: "#0F172A" },
  otpBoxFilled: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  changeBtn: { alignItems: "center", marginTop: 14 },
  changeBtnText: { color: "#EA580C", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusWrap: { alignItems: "center", paddingVertical: 18 },
  statusIcon: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  statusTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
  statusMsg: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 18 },
  backToHomeBtn: { backgroundColor: "#EA580C", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  backToHomeBtnText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
});
