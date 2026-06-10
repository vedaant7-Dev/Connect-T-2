import { verifyRealOtp } from "../lib/otpApi";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopShade from "@/components/TopShade";
import OtpDigitInput from "@/components/OtpDigitInput";
import { useAuth } from "@/context/AuthContext";
import { ambernathWards } from "@/data/mumbaiServices";

type AuthTab = "register" | "login";
type Step = "form" | "otp" | "notifications" | "success";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const GREEN = "#059669";
const DEMO_OTP = "1234";

function cleanPhone(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function formatDobInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function isValidDob(value: string) {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) return false;
  const [d, m, y] = value.split("-").map(Number);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { register, loginWithPhone } = useAuth();
  const [tab, setTab] = useState<AuthTab>("register");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wardModal, setWardModal] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [showAdminAccess, setShowAdminAccess] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regWard, setRegWard] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [loginPhone, setLoginPhone] = useState("");
  const [otp, setOtp] = useState("");

  const phone = tab === "register" ? cleanPhone(regPhone) : cleanPhone(loginPhone);

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setStep("form");
    setError("");
    setOtp("");
  };

  const handleSecretTap = () => {
    const next = logoTapCount + 1;
    if (next >= 7) {
      setLogoTapCount(0);
      setShowAdminAccess(true);
      return;
    }
    setLogoTapCount(next);
  };

  const continueToOtp = () => {
    setError("");
    if (tab === "register") {
      if (regName.trim().length < 2) return setError("Enter full name");
      if (!isValidDob(regDob.trim())) return setError("Enter DOB as DD-MM-YYYY");
      if (!regAddress.trim()) return setError("Enter address");
      if (cleanPhone(regPhone).length !== 10) return setError("Enter valid 10 digit mobile number");
      if (!regWard) return setError("Select ward/location");
    } else if (cleanPhone(loginPhone).length !== 10) {
      return setError("Enter valid 10 digit mobile number");
    }
    setOtp("");
    setStep("otp");
  };

  const verifyOtp = async () => {
    const otpCheck = await verifyRealOtp(phone, otp, "login");
    if (!otpCheck.success) { setError(otpCheck.error || "Invalid OTP"); return; }
    setLoading(true);
    setError("");
    try {
      if (tab === "register") {
        setStep("notifications");
      } else {
        const user = await loginWithPhone(cleanPhone(loginPhone));
        if (!user) {
          setError("Account not found. Please register first.");
          setStep("form");
          return;
        }
        router.replace(user.role === "super_admin" || user.isSuperAdmin ? ("/super-admin" as any) : user.role === "nagarsevak" ? ("/(tabs)/admin" as any) : ("/(tabs)" as any));
      }
    } catch (e: any) {
      setError(e?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const finishRegister = async () => {
    setLoading(true);
    setError("");
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        mobile: cleanPhone(regPhone),
        role: "citizen",
        ward: regWard,
        dob: regDob.trim(),
        address: regAddress.trim(),
        notifyEmail,
        notifyWhatsapp,
      } as any);
      setStep("success");
      setTimeout(() => router.replace("/(tabs)" as any), 800);
    } catch (e: any) {
      setError(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#9A3412", DARK, ORANGE, "#F97316", "#FB923C"]} locations={[0, 0.2, 0.45, 0.75, 1]} style={[s.root, { paddingTop: Platform.OS === "web" ? 44 : insets.top }]}> 
      <TopShade height={220} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          <TouchableOpacity activeOpacity={1} onPress={handleSecretTap}><Text style={s.connectTitle}>Connect T</Text></TouchableOpacity>

          <View style={s.tabBar}>
            <TabButton label="Register" icon="user-plus" active={tab === "register"} onPress={() => switchTab("register")} />
            <TabButton label="Login" icon="log-in" active={tab === "login"} onPress={() => switchTab("login")} />
          </View>

          {step === "form" && tab === "register" && (
            <View style={s.formCard}>
              <Field label="Full Name *" value={regName} onChangeText={setRegName} placeholder="Enter full name" />
              <Field label="Email Address (optional)" value={regEmail} onChangeText={setRegEmail} placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" />
              <Field label="Date of Birth *" value={regDob} onChangeText={(v) => setRegDob(formatDobInput(v))} placeholder="DD-MM-YYYY" keyboardType="number-pad" maxLength={10} />
              <Field label="Current Address *" value={regAddress} onChangeText={setRegAddress} placeholder="Enter address" multiline />
              <Text style={s.fieldLabel}>Phone Number *</Text>
              <View style={s.phoneRow}><View style={s.countryCode}><Text style={s.countryCodeText}>IN +91</Text></View><TextInput style={[s.input, s.phoneInput]} placeholder="10-digit mobile number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} value={regPhone} onChangeText={setRegPhone} /></View>
              <Text style={s.fieldLabel}>Ward / Location *</Text>
              <TouchableOpacity style={[s.input, s.pickerInput]} onPress={() => setWardModal(true)} activeOpacity={0.8}><Feather name="map-pin" size={14} color={regWard ? ORANGE : "#94A3B8"} /><Text style={[s.pickerText, !regWard && { color: "#94A3B8" }]}>{regWard || "Select ward"}</Text><Feather name="chevron-down" size={14} color="#94A3B8" /></TouchableOpacity>
              {error ? <Text style={s.errorText}>{error}</Text> : null}
              <PrimaryButton loading={loading} label="Continue" icon="arrow-right" onPress={continueToOtp} />
            </View>
          )}

          {step === "form" && tab === "login" && (
            <View style={s.formCard}>
              <Text style={s.fieldLabel}>Phone Number</Text>
              <View style={s.phoneRow}><View style={s.countryCode}><Text style={s.countryCodeText}>IN +91</Text></View><TextInput style={[s.input, s.phoneInput]} placeholder="Enter phone number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} value={loginPhone} onChangeText={setLoginPhone} /></View>
              {error ? <Text style={s.errorText}>{error}</Text> : null}
              <PrimaryButton loading={loading} label="Continue" icon="arrow-right" onPress={continueToOtp} />
            </View>
          )}

          {step === "otp" && (
            <View style={s.otpSection}>
              <View style={s.otpIconWrap}><Feather name="smartphone" size={28} color={ORANGE} /></View>
              <Text style={s.otpTitle}>OTP Verification</Text>
              <Text style={s.otpSub}>Enter the 6-digit OTP sent to +91 {phone}</Text>
              <OtpDigitInput value={otp} onChange={setOtp} autoFocus />
              <Text style={s.otpHint}>Enter the OTP received by SMS.</Text>
              {error ? <Text style={s.errorText}>{error}</Text> : null}
              <PrimaryButton loading={loading} label="Verify OTP" icon="check" onPress={verifyOtp} />
              <TouchableOpacity onPress={() => setStep("form")}><Text style={s.resendLink}>← Change details</Text></TouchableOpacity>
            </View>
          )}

          {step === "notifications" && (
            <View style={s.formCard}>
              <View style={s.otpIconWrap}><Feather name="check-circle" size={28} color={GREEN} /></View>
              <Text style={s.otpTitle}>Phone Verified</Text>
              <Text style={s.otpSub}>Choose notification preferences.</Text>
              <CheckRow checked={notifyEmail} onPress={() => setNotifyEmail(!notifyEmail)} title="Email Notifications" sub="Receive complaint updates by email." />
              <CheckRow checked={notifyWhatsapp} onPress={() => setNotifyWhatsapp(!notifyWhatsapp)} title="WhatsApp Notifications" sub="Receive important updates on WhatsApp." />
              {error ? <Text style={s.errorText}>{error}</Text> : null}
              <PrimaryButton loading={loading} label="Register" icon="user-plus" onPress={finishRegister} />
            </View>
          )}

          {step === "success" && <View style={s.successCard}><Feather name="check-circle" size={48} color={GREEN} /><Text style={s.successTitle}>Registration Successful</Text><Text style={s.successSub}>Redirecting...</Text></View>}

          {showAdminAccess && <View style={s.adminBox}><Text style={s.adminTitle}>Officer Access</Text><TouchableOpacity onPress={() => router.push("/nagarsevak/login" as any)} style={s.adminBtn}><Text style={s.adminBtnText}>Nagarsevak Login</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push("/super-admin-login" as any)} style={[s.adminBtn, { backgroundColor: "#22C55E" }]}><Text style={s.adminBtnText}>Super Admin Login</Text></TouchableOpacity></View>}
          <TouchableOpacity style={s.backPill} onPress={() => router.replace("/portal-select" as any)} activeOpacity={0.8}><Feather name="arrow-left" size={14} color={ORANGE} /><Text style={s.backPillText}>Back</Text></TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={wardModal} transparent animationType="slide" onRequestClose={() => setWardModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setWardModal(false)}>
          <TouchableOpacity style={s.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Select Ward</Text><TouchableOpacity onPress={() => setWardModal(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false}>{ambernathWards.map((ward) => <TouchableOpacity key={ward} style={[s.wardRow, regWard === ward && s.wardRowActive]} onPress={() => { setRegWard(ward); setWardModal(false); }} activeOpacity={0.8}><Feather name="map-pin" size={14} color={regWard === ward ? ORANGE : "#94A3B8"} /><Text style={[s.wardRowText, regWard === ward && { color: ORANGE, fontWeight: "700" }]}>{ward}</Text>{regWard === ward && <Feather name="check" size={14} color={ORANGE} />}</TouchableOpacity>)}</ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, style, ...rest } = props;
  return <><Text style={s.fieldLabel}>{label}</Text><TextInput {...rest} multiline={multiline} numberOfLines={multiline ? 2 : 1} style={[s.input, multiline && { minHeight: 64, textAlignVertical: "top" }, style]} placeholderTextColor="#94A3B8" /></>;
}

function PrimaryButton({ loading, label, icon, onPress }: { loading: boolean; label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  return <TouchableOpacity style={s.primaryBtn} onPress={onPress} activeOpacity={0.85} disabled={loading}><LinearGradient colors={[GREEN, "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>{loading ? <ActivityIndicator color="white" size="small" /> : <Feather name={icon} size={18} color="white" />}<Text style={s.primaryBtnText}>{label}</Text></LinearGradient></TouchableOpacity>;
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[s.tab, active && s.tabActive]} onPress={onPress} activeOpacity={0.8}><Feather name={icon} size={14} color={active ? ORANGE : "#94A3B8"} /><Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text></TouchableOpacity>;
}

function CheckRow({ checked, onPress, title, sub }: { checked: boolean; onPress: () => void; title: string; sub: string }) {
  return <TouchableOpacity style={s.checkRow} onPress={onPress} activeOpacity={0.8}><View style={[s.checkbox, checked && s.checkboxActive]}>{checked && <Feather name="check" size={14} color="white" />}</View><View style={{ flex: 1 }}><Text style={s.checkLabel}>{title}</Text><Text style={s.checkSub}>{sub}</Text></View></TouchableOpacity>;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, alignItems: "center", flexGrow: 1 },
  connectTitle: { fontSize: 28, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center", marginBottom: 16 },
  tabBar: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, padding: 4, marginBottom: 16, width: "100%", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, gap: 6 },
  tabActive: { backgroundColor: "white" },
  tabText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.6)", fontFamily: "Inter_700Bold" },
  tabTextActive: { color: ORANGE },
  formCard: { width: "100%", backgroundColor: "white", borderRadius: 20, padding: 20, gap: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#475569", fontFamily: "Inter_600SemiBold", marginTop: 10, marginBottom: 4, paddingLeft: 2 },
  input: { backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", borderWidth: 1.5, borderColor: "#E2E8F0", outlineWidth: 0 } as any,
  phoneRow: { flexDirection: "row", gap: 8 },
  countryCode: { backgroundColor: "#F1F5F9", borderRadius: 12, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1.5, borderColor: "#E2E8F0" },
  countryCodeText: { fontSize: 13, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold" },
  phoneInput: { flex: 1 },
  pickerInput: { flexDirection: "row", alignItems: "center", gap: 8 },
  pickerText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 12, color: "#DC2626", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  primaryBtn: { marginTop: 16, borderRadius: 14, overflow: "hidden", width: "100%" },
  primaryBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  otpSection: { width: "100%", backgroundColor: "white", borderRadius: 20, padding: 20, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  otpIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 12, alignSelf: "center" },
  otpTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 6, textAlign: "center" },
  otpSub: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 18 },
  otpInput: { width: 150, height: 58, backgroundColor: "#FFF7ED", borderRadius: 16, borderWidth: 1.5, borderColor: "#FED7AA", color: DARK, fontSize: 24, letterSpacing: 8, fontFamily: "Inter_700Bold", marginBottom: 12 },
  otpHint: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 4, textAlign: "center" },
  resendLink: { fontSize: 13, fontWeight: "700", color: ORANGE, fontFamily: "Inter_600SemiBold", marginTop: 12, textDecorationLine: "underline" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", marginTop: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  checkLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  checkSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
  successCard: { width: "100%", backgroundColor: "white", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  successTitle: { fontSize: 20, fontWeight: "800", color: GREEN, fontFamily: "Inter_700Bold", marginBottom: 8 },
  successSub: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center" },
  adminBox: { marginTop: 18, backgroundColor: "#166534", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", width: "100%" },
  adminTitle: { color: "white", fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 14, textAlign: "center" },
  adminBtn: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  adminBtnText: { color: "white", fontFamily: "Inter_700Bold" },
  backPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "white", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#FED7AA", alignSelf: "center", marginTop: 20, marginBottom: 8 },
  backPillText: { fontSize: 13, color: ORANGE, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  wardRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  wardRowActive: { backgroundColor: "#FFF7ED" },
  wardRowText: { flex: 1, fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular" },
});
