import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopShade from "@/components/TopShade";
import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage, languageOptions } from "@/context/LanguageContext";
import { ambernathWards } from "@/data/mumbaiServices";

type AuthTab = "register" | "login";
type RegisterStep = "form" | "otp" | "notifications" | "success";
type LoginStep = "form" | "otp";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const GREEN = "#059669";
const OTP_LENGTH = 6;

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function formatDobInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}-${month}`;
  return `${day}-${month}-${year}`;
}

function isValidDob(value: string) {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) return false;
  const [dayRaw, monthRaw, yearRaw] = value.split("-");
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const currentYear = new Date().getFullYear();
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > currentYear) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

async function readApi(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { success: false, error: text };
  }
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const { register, loginWithPhone } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const params = useLocalSearchParams<{ mode?: string; admin?: string }>();
  const { height: windowHeight } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<AuthTab>("register");
  const [regStep, setRegStep] = useState<RegisterStep>("form");
  const [loginStep, setLoginStep] = useState<LoginStep>("form");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [error, setError] = useState("");
  const [wardModal, setWardModal] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [countdown, setCountdown] = useState(0);
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
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (params.mode === "login") switchTab("login");
  }, [params.mode]);

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetOtp = () => setOtpDigits(Array(OTP_LENGTH).fill(""));

  const startCountdown = () => {
    setCountdown(30);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtpToPhone = async (phone: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: cleanPhone(phone), purpose: activeTab }),
    });
    const result = await readApi(response);
    if (!response.ok || !result.success) throw new Error(result.error || result.message || "Failed to send OTP");
    return String(result.sessionToken || "");
  };

  const verifyOtpToken = async (otp: string, token: string, phone: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: cleanPhone(phone), otp, sessionToken: token }),
    });
    const result = await readApi(response);
    if (!response.ok || !result.success) throw new Error(result.error || result.message || "OTP verification failed");
  };

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setError("");
    setRegStep("form");
    setLoginStep("form");
    resetOtp();
    setSessionToken("");
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

  const setOtpDigit = (index: number, value: string) => {
    const next = [...otpDigits];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setOtpDigits(next);
    if (next[index] && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const requestOtp = async (phone: string, afterSend: () => void) => {
    setError("");
    setOtpSending(true);
    resetOtp();
    try {
      const token = await sendOtpToPhone(phone);
      setSessionToken(token);
      afterSend();
      startCountdown();
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please try again.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleRegisterSubmit = async () => {
    const phone = cleanPhone(regPhone);
    setError("");
    if (regName.trim().length < 2) return setError(t("enterFullName"));
    if (!isValidDob(regDob.trim())) return setError("Please enter date of birth as DD-MM-YYYY");
    if (!regAddress.trim()) return setError(t("enterAddress"));
    if (phone.length !== 10) return setError(t("enterValidPhone"));
    if (!regWard) return setError(t("selectWardError"));
    await requestOtp(phone, () => setRegStep("otp"));
  };

  const handleRegisterOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== OTP_LENGTH) return setError(`Enter ${OTP_LENGTH}-digit OTP`);
    setLoading(true);
    setError("");
    try {
      await verifyOtpToken(otp, sessionToken, regPhone);
      setRegStep("notifications");
      resetOtp();
    } catch (err: any) {
      setError(err?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFinish = async () => {
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
      setRegStep("success");
      Animated.spring(successAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
      setTimeout(() => router.replace("/select-service" as any), 900);
    } catch (err: any) {
      setError(err?.message || t("registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async () => {
    const phone = cleanPhone(loginPhone);
    if (phone.length !== 10) return setError(t("enterValidPhone"));
    await requestOtp(phone, () => setLoginStep("otp"));
  };

  const handleLoginOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== OTP_LENGTH) return setError(`Enter ${OTP_LENGTH}-digit OTP`);
    setLoading(true);
    setError("");
    try {
      await verifyOtpToken(otp, sessionToken, loginPhone);
      const user = await loginWithPhone(cleanPhone(loginPhone));
      if (!user) {
        setError(t("accountNotFound"));
        setLoginStep("form");
        resetOtp();
        return;
      }
      router.replace(user.role === "super_admin" || user.isSuperAdmin ? ("/super-admin" as any) : user.role === "nagarsevak" ? ("/(tabs)/admin" as any) : ("/portal-select" as any));
    } catch (err: any) {
      setError(err?.message || "OTP verification failed.");
      resetOtp();
    } finally {
      setLoading(false);
    }
  };

  const renderOtpInput = () => {
    const phone = activeTab === "register" ? regPhone : loginPhone;
    return (
      <View style={s.otpSection}>
        <View style={s.otpIconWrap}><Feather name="smartphone" size={28} color={ORANGE} /></View>
        <Text style={s.otpTitle}>{t("otpVerification")}</Text>
        <Text style={s.otpSub}>{OTP_LENGTH}-digit OTP sent to +91 {phone}</Text>
        <View style={s.otpRow}>
          {otpDigits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { otpRefs.current[i] = ref; }}
              style={[s.otpBox, digit ? s.otpBoxFilled : null]}
              value={digit}
              onChangeText={(v) => setOtpDigit(i, v)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === "Backspace" && !digit && i > 0) otpRefs.current[i - 1]?.focus(); }}
            />
          ))}
        </View>
        <Text style={s.otpHint}>Enter OTP received on your mobile · valid 5 min</Text>
        {countdown > 0 ? <Text style={s.resendCountdown}>Resend OTP in {countdown}s</Text> : (
          <TouchableOpacity disabled={otpSending} onPress={() => requestOtp(phone, () => undefined)} activeOpacity={0.75}>
            <Text style={s.resendLink}>{otpSending ? "Sending…" : "Resend OTP"}</Text>
          </TouchableOpacity>
        )}
        {error ? <Text style={s.errorText}>{error}</Text> : null}
        <TouchableOpacity style={s.primaryBtn} onPress={activeTab === "register" ? handleRegisterOtp : handleLoginOtp} activeOpacity={0.85} disabled={loading}>
          <LinearGradient colors={[GREEN, "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
            {loading ? <><ActivityIndicator color="white" size="small" /><Text style={s.primaryBtnText}>Verifying…</Text></> : <><Text style={s.primaryBtnText}>{t("verifyOtp")}</Text><Feather name="check" size={18} color="white" /></>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRegisterForm = () => (
    <View style={s.formCard}>
      <Field label={`${t("fullName")} *`} value={regName} onChangeText={setRegName} placeholder={t("enterFullName")} />
      <Field label="Email Address (optional)" value={regEmail} onChangeText={setRegEmail} placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" />
      <Field label="Date of Birth" value={regDob} onChangeText={(v) => setRegDob(formatDobInput(v))} placeholder="DD-MM-YYYY" keyboardType="number-pad" maxLength={10} />
      <Field label={`${t("currentAddress")} *`} value={regAddress} onChangeText={setRegAddress} placeholder={t("enterAddress")} multiline />
      <Text style={s.fieldLabel}>{t("phoneNumber")} *</Text>
      <View style={s.phoneRow}><View style={s.countryCode}><Text style={s.countryCodeText}>IN +91</Text></View><TextInput style={[s.input, s.phoneInput]} placeholder="10-digit mobile number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} value={regPhone} onChangeText={setRegPhone} /></View>
      <Text style={s.fieldLabel}>{t("wardLocation")} *</Text>
      <TouchableOpacity style={[s.input, s.pickerInput]} onPress={() => setWardModal(true)} activeOpacity={0.8}><Feather name="map-pin" size={14} color={regWard ? ORANGE : "#94A3B8"} /><Text style={[s.pickerText, !regWard && { color: "#94A3B8" }]}>{regWard || t("selectWard")}</Text><Feather name="chevron-down" size={14} color="#94A3B8" /></TouchableOpacity>
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      <PrimaryButton loading={otpSending} label={otpSending ? "Sending OTP…" : t("continue")} icon="arrow-right" onPress={handleRegisterSubmit} />
    </View>
  );

  const renderLoginForm = () => (
    <View style={s.formCard}>
      <Text style={s.fieldLabel}>{t("phoneNumber")}</Text>
      <View style={s.phoneRow}><View style={s.countryCode}><Text style={s.countryCodeText}>IN +91</Text></View><TextInput style={[s.input, s.phoneInput]} placeholder={t("enterPhoneNumber")} placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} value={loginPhone} onChangeText={setLoginPhone} /></View>
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      <PrimaryButton loading={otpSending} label={otpSending ? "Sending OTP…" : t("continue")} icon="arrow-right" onPress={handleLoginSubmit} />
    </View>
  );

  const renderNotifications = () => (
    <View style={s.formCard}>
      <View style={s.otpIconWrap}><Feather name="check-circle" size={28} color={GREEN} /></View>
      <Text style={s.otpTitle}>{t("phoneVerified")}</Text>
      <Text style={s.otpSub}>{t("allowNotifications")}</Text>
      <CheckRow checked={notifyEmail} onPress={() => setNotifyEmail(!notifyEmail)} title={t("emailNotifications")} sub={t("emailNotifDesc")} />
      <CheckRow checked={notifyWhatsapp} onPress={() => setNotifyWhatsapp(!notifyWhatsapp)} title={t("whatsappNotifications")} sub={t("whatsappNotifDesc")} />
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      <PrimaryButton loading={loading} label={t("registerBtn")} icon="user-plus" onPress={handleRegisterFinish} />
    </View>
  );

  const renderSuccess = () => (
    <Animated.View style={[s.successCard, { opacity: successAnim, transform: [{ scale: successAnim }] }]}>
      <View style={s.successIconWrap}><Feather name="check-circle" size={48} color={GREEN} /></View>
      <Text style={s.successTitle}>{t("registrationSuccess")}</Text>
      <Text style={s.successSub}>{t("redirectingHome")}</Text>
      <ActivityIndicator color={ORANGE} style={{ marginTop: 16 }} />
    </Animated.View>
  );

  return (
    <LinearGradient colors={["#9A3412", DARK, ORANGE, "#F97316", "#FB923C"]} locations={[0, 0.2, 0.45, 0.75, 1]} style={[s.root, { paddingTop: topPad, overflow: "hidden" }]}> 
      <TopShade height={220} />
      <View style={[ld.blob, ld.b1]} /><View style={[ld.blob, ld.b2]} /><View style={[ld.ring, ld.r1]} /><View style={[ld.ring, ld.r2]} /><View style={[ld.ring, ld.r3]} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={topPad + 20}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 40, minHeight: windowHeight }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          <TouchableOpacity activeOpacity={1} onPress={handleSecretTap}><Text style={s.connectTitle}>Connect T</Text></TouchableOpacity>
          <View style={s.langRow}>{languageOptions.map((opt) => <TouchableOpacity key={opt.code} style={[s.langPill, language === opt.code && s.langPillActive]} onPress={() => setLanguage(opt.code)} activeOpacity={0.8}><Text style={[s.langPillText, language === opt.code && s.langPillTextActive]}>{opt.nativeLabel}</Text></TouchableOpacity>)}</View>
          <View style={s.tabBar}><TabButton label={t("registerBtn")} icon="user-plus" active={activeTab === "register"} onPress={() => switchTab("register")} /><TabButton label={t("loginBtn")} icon="log-in" active={activeTab === "login"} onPress={() => switchTab("login")} /></View>
          {activeTab === "register" && regStep === "form" && renderRegisterForm()}
          {activeTab === "register" && regStep === "otp" && renderOtpInput()}
          {activeTab === "register" && regStep === "notifications" && renderNotifications()}
          {activeTab === "register" && regStep === "success" && renderSuccess()}
          {activeTab === "login" && loginStep === "form" && renderLoginForm()}
          {activeTab === "login" && loginStep === "otp" && renderOtpInput()}
          {showAdminAccess && <View style={s.adminBox}><Text style={s.adminTitle}>Officer Access</Text><TouchableOpacity onPress={() => router.push("/nagarsevak/login" as any)} style={s.adminBtn}><Text style={s.adminBtnText}>Nagarsevak Login</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push("/login?mode=login&admin=1" as any)} style={[s.adminBtn, { backgroundColor: "#22C55E" }]}><Text style={s.adminBtnText}>Super Admin Login</Text></TouchableOpacity></View>}
          <TouchableOpacity style={s.backPill} onPress={() => router.replace("/portal-select" as any)} activeOpacity={0.8}><Feather name="arrow-left" size={14} color={ORANGE} /><Text style={s.backPillText}>Back</Text></TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={wardModal} transparent animationType="slide" onRequestClose={() => setWardModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setWardModal(false)}>
          <TouchableOpacity style={s.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>{t("selectWard")}</Text><TouchableOpacity onPress={() => setWardModal(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
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
  langRow: { flexDirection: "row", gap: 8, marginBottom: 20, alignSelf: "center" },
  langPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  langPillActive: { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.5)" },
  langPillText: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_600SemiBold", fontWeight: "700" },
  langPillTextActive: { color: "white" },
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
  otpRow: { flexDirection: "row", gap: 7, marginBottom: 12 },
  otpBox: { width: 42, height: 52, borderRadius: 13, borderWidth: 2, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", fontSize: 20, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", textAlign: "center", textAlignVertical: "center", outlineWidth: 0 } as any,
  otpBoxFilled: { borderColor: ORANGE, backgroundColor: "#FFF7ED" },
  otpHint: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 4, textAlign: "center" },
  resendCountdown: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 6, marginBottom: 2 },
  resendLink: { fontSize: 13, fontWeight: "700", color: ORANGE, fontFamily: "Inter_600SemiBold", marginTop: 6, marginBottom: 2, textDecorationLine: "underline" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", marginTop: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  checkLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  checkSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
  successCard: { width: "100%", backgroundColor: "white", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  successIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginBottom: 16 },
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

const { width: SW } = Dimensions.get("window");
const ld = StyleSheet.create({
  blob: { position: "absolute", borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.20)" },
  ring: { position: "absolute", borderRadius: 9999, borderColor: "rgba(255,255,255,0.20)", borderWidth: 1.5 },
  b1: { width: SW * 0.5, height: SW * 0.5, top: -SW * 0.16, right: -SW * 0.14 },
  b2: { width: SW * 0.28, height: SW * 0.28, bottom: SW * 0.12, left: -SW * 0.08 },
  r1: { width: SW * 0.88, height: SW * 0.88, top: -SW * 0.32, right: -SW * 0.32 },
  r2: { width: SW * 0.58, height: SW * 0.58, bottom: SW * 0.1, left: -SW * 0.24 },
  r3: { width: SW * 0.32, height: SW * 0.32, top: SW * 0.34, left: SW * 0.08 },
});
