import { AppScrollView } from "@/components/AppScrollView";
import { getActiveOtpSessionState, getOtpSessionState, sendRealOtp, verifyRealOtp } from "../lib/otpApi";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopShade from "@/components/TopShade";
import DobDatePicker from "@/components/DobDatePicker";
import OtpDigitInput from "@/components/OtpDigitInput";
import { useAuth } from "@/context/AuthContext";
import { ambernathWards } from "@/data/mumbaiServices";
import { getUserErrorMessage } from "@/lib/api";

 type AuthTab = "register" | "login";
 type Step = "form" | "otp" | "notifications" | "success";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const GREEN = "#059669";
const DEFAULT_RESEND_SECONDS = 45;

function cleanPhone(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function isValidDob(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) return false;
  const dt = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && dt <= today;
}

function countdownLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { register, unifiedLogin } = useAuth();
  const [tab, setTab] = useState<AuthTab>("register");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [resendRemaining, setResendRemaining] = useState(0);
  const [wardModal, setWardModal] = useState(false);

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

  const registrationDraft = () => ({
    regName: regName.trim(),
    regEmail: regEmail.trim(),
    regDob: regDob.trim(),
    regAddress: regAddress.trim(),
    regWard,
    notifyEmail,
    notifyWhatsapp,
  });

  const updateCountdown = useCallback(() => {
    setResendRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
  }, [resendAt]);

  useEffect(() => {
    let active = true;
    void getActiveOtpSessionState().then((session) => {
      if (!active || !session) return;
      const restoredTab: AuthTab = session.purpose === "register" ? "register" : "login";
      setTab(restoredTab);
      setResendAt(session.resendAt);
      setOtp("");

      if (restoredTab === "login") {
        setLoginPhone(session.mobile);
        setStep("otp");
        setOtpNotice("Continue with the OTP already sent to your mobile number.");
        return;
      }

      const draft = session.draft || {};
      const restoredName = String(draft.regName || "");
      const restoredDob = String(draft.regDob || "");
      const restoredAddress = String(draft.regAddress || "");
      const restoredWard = String(draft.regWard || "");
      setRegName(restoredName);
      setRegEmail(String(draft.regEmail || ""));
      setRegDob(restoredDob);
      setRegAddress(restoredAddress);
      setRegPhone(session.mobile);
      setRegWard(restoredWard);
      setNotifyEmail(draft.notifyEmail !== false);
      setNotifyWhatsapp(draft.notifyWhatsapp !== false);

      if (restoredName && restoredDob && restoredAddress && restoredWard) {
        setStep("otp");
        setOtpNotice("Your registration details and OTP timer were restored.");
      } else {
        setStep("form");
        setError("Enter your registration details again before continuing with OTP verification.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (step !== "otp" || phone.length !== 10) return;
    let active = true;
    void getOtpSessionState(phone, tab).then((session) => {
      if (active && session?.resendAt) setResendAt(session.resendAt);
    });
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [phone, step, tab, updateCountdown]);

  const applyOtpTiming = (result: any) => {
    const next = Number(result?.data?.resendAt || 0);
    setResendAt(next > Date.now() ? next : Date.now() + DEFAULT_RESEND_SECONDS * 1000);
  };

  const switchTab = (next: AuthTab) => {
    if (loading || resending) return;
    setTab(next);
    setStep("form");
    setError("");
    setOtpNotice("");
    setOtp("");
    setResendAt(0);
  };

  const continueToOtp = async () => {
    if (loading || resending) return;
    setError("");
    setOtpNotice("");
    if (tab === "register") {
      if (regName.trim().split(/\s+/).length < 2) return setError("Enter your full name, including surname");
      if (!isValidDob(regDob.trim())) return setError("Select valid date of birth");
      if (!regAddress.trim()) return setError("Enter address");
      if (cleanPhone(regPhone).length !== 10) return setError("Enter valid 10 digit mobile number");
      if (!regWard) return setError("Select ward/location");
    } else if (cleanPhone(loginPhone).length !== 10) {
      return setError("Enter valid 10 digit mobile number");
    }

    setLoading(true);
    try {
      const otpSend = await sendRealOtp(phone, tab, tab === "register" ? registrationDraft() : undefined);
      if (!otpSend.success) {
        setError(otpSend.error || "Failed to send OTP");
        if (otpSend.retryAfterSeconds) setResendAt(Date.now() + otpSend.retryAfterSeconds * 1000);
        return;
      }
      setOtp("");
      applyOtpTiming(otpSend);
      setStep("otp");
      setOtpNotice("OTP sent successfully.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resending || loading || resendRemaining > 0 || phone.length !== 10) return;
    setResending(true);
    setError("");
    setOtpNotice("");
    try {
      const result = await sendRealOtp(phone, tab, tab === "register" ? registrationDraft() : undefined);
      if (!result.success) {
        setError(result.error || "OTP could not be resent. Please try again.");
        if (result.retryAfterSeconds) setResendAt(Date.now() + result.retryAfterSeconds * 1000);
        return;
      }
      setOtp("");
      applyOtpTiming(result);
      setOtpNotice("A new OTP was sent. The previous OTP is no longer valid.");
    } finally {
      setResending(false);
    }
  };

  const verifyOtp = async () => {
    if (loading || resending) return;
    setLoading(true);
    setError("");
    setOtpNotice("");
    try {
      const otpCheck = await verifyRealOtp(phone, otp, tab);
      if (!otpCheck.success) {
        setError(otpCheck.error || "Invalid OTP");
        if (otpCheck.retryAfterSeconds) setResendAt(Date.now() + otpCheck.retryAfterSeconds * 1000);
        return;
      }
      if (tab === "register") {
        setStep("notifications");
      } else {
        const user = await unifiedLogin(cleanPhone(loginPhone));
        router.replace(user.role === "super_admin" || user.isSuperAdmin ? ("/super-admin" as any) : user.role === "nagarsevak" ? ("/(tabs)/admin" as any) : ("/portal-select" as any));
      }
    } catch (e: any) {
      setError(getUserErrorMessage(e, "Login could not be completed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const finishRegister = async () => {
    if (loading) return;
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
      setTimeout(() => router.replace("/portal-select" as any), 800);
    } catch (e: any) {
      setError(getUserErrorMessage(e, "Registration could not be completed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#9A3412", DARK, ORANGE, "#F97316", "#FB923C"]} locations={[0, 0.2, 0.45, 0.75, 1]} style={[s.root, { paddingTop: Platform.OS === "web" ? 44 : insets.top }]}>
      <TopShade height={220} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <AppScrollView contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          <Text style={s.connectTitle}>Connect T</Text>

          <View style={s.tabBar}>
            <TabButton label="Register" icon="user-plus" active={tab === "register"} onPress={() => switchTab("register")} />
            <TabButton label="Login" icon="log-in" active={tab === "login"} onPress={() => switchTab("login")} />
          </View>

          {step === "form" && tab === "register" && (
            <View style={s.formCard}>
              <Field label="Full Name *" value={regName} onChangeText={setRegName} placeholder="Enter full name" returnKeyType="next" />
              <Field label="Email Address (optional)" value={regEmail} onChangeText={setRegEmail} placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
              <DobDatePicker label="Date of Birth" required value={regDob} onChange={setRegDob} placeholder="Select date of birth" />
              <Field label="Current Address *" value={regAddress} onChangeText={setRegAddress} placeholder="Enter address" multiline />
              <Text style={s.fieldLabel}>Phone Number *</Text>
              <View style={s.phoneRow}><View style={s.countryCode}><Text style={s.countryCodeText}>IN +91</Text></View><TextInput style={[s.input, s.phoneInput]} placeholder="10-digit mobile number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} value={regPhone} onChangeText={setRegPhone} returnKeyType="done" /></View>
              <Text style={s.fieldLabel}>Ward / Location *</Text>
              <TouchableOpacity style={[s.input, s.pickerInput]} onPress={() => setWardModal(true)} activeOpacity={0.8}><Feather name="map-pin" size={14} color={regWard ? ORANGE : "#94A3B8"} /><Text style={[s.pickerText, !regWard && { color: "#94A3B8" }]}>{regWard || "Select ward"}</Text><Feather name="chevron-down" size={14} color="#94A3B8" /></TouchableOpacity>
              {error ? <Text style={s.errorText} accessibilityLiveRegion="polite">{error}</Text> : null}
              <PrimaryButton loading={loading} label="Continue" icon="arrow-right" onPress={continueToOtp} />
            </View>
          )}

          {step === "form" && tab === "login" && (
            <View style={s.formCard}>
              <Text style={s.fieldLabel}>Phone Number</Text>
              <View style={s.phoneRow}><View style={s.countryCode}><Text style={s.countryCodeText}>IN +91</Text></View><TextInput style={[s.input, s.phoneInput]} placeholder="Enter phone number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} value={loginPhone} onChangeText={setLoginPhone} returnKeyType="done" onSubmitEditing={continueToOtp} /></View>
              {error ? <Text style={s.errorText} accessibilityLiveRegion="polite">{error}</Text> : null}
              <PrimaryButton loading={loading} label="Continue" icon="arrow-right" onPress={continueToOtp} />
            </View>
          )}

          {step === "otp" && (
            <View style={s.otpSection}>
              <View style={s.otpIconWrap}><Feather name="smartphone" size={28} color={ORANGE} /></View>
              <Text style={s.otpTitle}>OTP Verification</Text>
              <Text style={s.otpSub}>Enter the 6-digit OTP sent to +91 {phone}</Text>
              <OtpDigitInput value={otp} onChange={setOtp} autoFocus disabled={loading || resending} />
              <Text style={s.otpHint}>Enter or paste the OTP received by SMS.</Text>
              {otpNotice ? <Text style={s.successNotice} accessibilityLiveRegion="polite">{otpNotice}</Text> : null}
              {error ? <Text style={s.errorText} accessibilityLiveRegion="assertive">{error}</Text> : null}
              <PrimaryButton loading={loading} label="Verify OTP" icon="check" onPress={verifyOtp} />
              <TouchableOpacity style={[s.resendButton, resendRemaining > 0 && s.resendButtonDisabled]} onPress={resendOtp} disabled={resending || loading || resendRemaining > 0} accessibilityRole="button" accessibilityState={{ disabled: resending || loading || resendRemaining > 0 }}>
                {resending ? <ActivityIndicator size="small" color={ORANGE} /> : <Feather name="refresh-cw" size={14} color={resendRemaining > 0 ? "#94A3B8" : ORANGE} />}
                <Text style={[s.resendButtonText, resendRemaining > 0 && s.resendButtonTextDisabled]}>{resendRemaining > 0 ? `Resend OTP in ${countdownLabel(resendRemaining)}` : "Resend OTP"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { if (!loading && !resending) { setStep("form"); setError(""); setOtpNotice(""); } }}><Text style={s.resendLink}>← Change details</Text></TouchableOpacity>
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
        </AppScrollView>
      </KeyboardAvoidingView>

      <Modal visible={wardModal} transparent animationType="slide" onRequestClose={() => setWardModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setWardModal(false)}>
          <TouchableOpacity style={s.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Select Ward</Text><TouchableOpacity onPress={() => setWardModal(false)} accessibilityLabel="Close ward selection"><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
            <AppScrollView showsVerticalScrollIndicator={false}>{ambernathWards.map((ward) => <TouchableOpacity key={ward} style={[s.wardRow, regWard === ward && s.wardRowActive]} onPress={() => { setRegWard(ward); setWardModal(false); }} activeOpacity={0.8}><Feather name="map-pin" size={14} color={regWard === ward ? ORANGE : "#94A3B8"} /><Text style={[s.wardRowText, regWard === ward && { color: ORANGE, fontWeight: "700" }]}>{ward}</Text>{regWard === ward && <Feather name="check" size={14} color={ORANGE} />}</TouchableOpacity>)}</AppScrollView>
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
  return <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.72 }]} onPress={onPress} activeOpacity={0.85} disabled={loading} accessibilityRole="button" accessibilityState={{ disabled: loading }}><LinearGradient colors={[GREEN, "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>{loading ? <ActivityIndicator color="white" size="small" /> : <Feather name={icon} size={18} color="white" />}<Text style={s.primaryBtnText}>{label}</Text></LinearGradient></TouchableOpacity>;
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[s.tab, active && s.tabActive]} onPress={onPress} activeOpacity={0.8} accessibilityRole="tab" accessibilityState={{ selected: active }}><Feather name={icon} size={14} color={active ? ORANGE : "#94A3B8"} /><Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text></TouchableOpacity>;
}

function CheckRow({ checked, onPress, title, sub }: { checked: boolean; onPress: () => void; title: string; sub: string }) {
  return <TouchableOpacity style={s.checkRow} onPress={onPress} activeOpacity={0.8} accessibilityRole="checkbox" accessibilityState={{ checked }}><View style={[s.checkbox, checked && s.checkboxActive]}>{checked && <Feather name="check" size={14} color="white" />}</View><View style={{ flex: 1 }}><Text style={s.checkLabel}>{title}</Text><Text style={s.checkSub}>{sub}</Text></View></TouchableOpacity>;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, alignItems: "center", flexGrow: 1 },
  connectTitle: { fontSize: 28, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center", marginBottom: 16 },
  tabBar: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, padding: 4, marginBottom: 16, width: "100%", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, gap: 6, minHeight: 44 },
  tabActive: { backgroundColor: "white" },
  tabText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.6)", fontFamily: "Inter_700Bold" },
  tabTextActive: { color: ORANGE },
  formCard: { width: "100%", backgroundColor: "white", borderRadius: 20, padding: 20, gap: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#475569", fontFamily: "Inter_600SemiBold", marginTop: 10, marginBottom: 4, paddingLeft: 2 },
  input: { backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", borderWidth: 1.5, borderColor: "#E2E8F0", outlineWidth: 0, minHeight: 48 } as any,
  phoneRow: { flexDirection: "row", gap: 8 },
  countryCode: { backgroundColor: "#F1F5F9", borderRadius: 12, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1.5, borderColor: "#E2E8F0" },
  countryCodeText: { fontSize: 13, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold" },
  phoneInput: { flex: 1 },
  pickerInput: { flexDirection: "row", alignItems: "center", gap: 8 },
  pickerText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 12, color: "#DC2626", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  successNotice: { fontSize: 12, color: GREEN, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 6 },
  primaryBtn: { marginTop: 16, borderRadius: 14, overflow: "hidden", width: "100%" },
  primaryBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8, minHeight: 48 },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  otpSection: { width: "100%", backgroundColor: "white", borderRadius: 20, padding: 20, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  otpIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 12, alignSelf: "center" },
  otpTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 6, textAlign: "center" },
  otpSub: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 18 },
  otpHint: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 4, textAlign: "center" },
  resendButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 44, paddingHorizontal: 14, marginTop: 10, borderRadius: 12, backgroundColor: "#FFF7ED" },
  resendButtonDisabled: { backgroundColor: "#F8FAFC" },
  resendButtonText: { fontSize: 12.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  resendButtonTextDisabled: { color: "#94A3B8" },
  resendLink: { fontSize: 13, fontWeight: "700", color: ORANGE, fontFamily: "Inter_600SemiBold", marginTop: 12, textDecorationLine: "underline", paddingVertical: 8 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", marginTop: 10, minHeight: 52 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  checkLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  checkSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
  successCard: { width: "100%", backgroundColor: "white", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  successTitle: { fontSize: 20, fontWeight: "800", color: GREEN, fontFamily: "Inter_700Bold", marginBottom: 8 },
  successSub: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  wardRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, minHeight: 48 },
  wardRowActive: { backgroundColor: "#FFF7ED" },
  wardRowText: { flex: 1, fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular" },
});
