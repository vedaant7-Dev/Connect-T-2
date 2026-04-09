import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { ulhasnagarWards } from "@/data/mumbaiServices";
import { useLanguage, languageOptions } from "@/context/LanguageContext";

type AuthTab = "register" | "login";
type RegisterStep = "form" | "otp" | "notifications" | "success";
type LoginStep = "form" | "otp";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const { register, loginWithPhone, loginWithNagarsevakId } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<AuthTab>("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wardModal, setWardModal] = useState(false);

  const [regStep, setRegStep] = useState<RegisterStep>("form");
  const [loginStep, setLoginStep] = useState<LoginStep>("form");

  const [regName, setRegName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regWard, setRegWard] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);

  const [loginPhone, setLoginPhone] = useState("");
  const [loginId, setLoginId] = useState("");

  const otpRef1 = useRef<TextInput>(null);
  const otpRef2 = useRef<TextInput>(null);
  const otpRef3 = useRef<TextInput>(null);
  const otpRef4 = useRef<TextInput>(null);
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);

  const successAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setError("");
    setRegStep("form");
    setLoginStep("form");
    setOtpDigits(["", "", "", ""]);
  };

  const setOtpDigit = (index: number, value: string, refs: React.RefObject<TextInput | null>[]) => {
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    if (value && index < 3) {
      refs[index + 1]?.current?.focus();
    }
  };

  const handleRegisterSubmit = () => {
    setError("");
    if (!regName.trim() || regName.trim().length < 2) {
      setError(t("enterFullName"));
      return;
    }
    const ageNum = parseInt(regAge, 10);
    if (!regAge || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError(t("enterValidAge"));
      return;
    }
    if (regEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setError(t("enterValidEmail"));
      return;
    }
    if (!regAddress.trim()) {
      setError(t("enterAddress"));
      return;
    }
    const phone = regPhone.trim().replace(/\D/g, "");
    if (phone.length !== 10) {
      setError(t("enterValidPhone"));
      return;
    }
    if (!regWard) {
      setError(t("selectWardError"));
      return;
    }
    setRegStep("otp");
  };

  const handleRegisterOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== 4) {
      setError(t("enterOtp"));
      return;
    }
    setError("");
    setRegStep("notifications");
    setOtpDigits(["", "", "", ""]);
  };

  const handleRegisterFinish = async () => {
    setLoading(true);
    try {
      await register({
        name: regName.trim(),
        mobile: regPhone.trim().replace(/\D/g, ""),
        role: "citizen",
        ward: regWard,
        age: parseInt(regAge, 10),
        email: regEmail.trim() || undefined,
        address: regAddress.trim(),
        notifyEmail,
        notifyWhatsapp,
      });
      setRegStep("success");
      Animated.spring(successAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        router.replace("/(tabs)/");
      }, 2000);
    } catch (e: any) {
      setError(e.message ?? t("registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = () => {
    setError("");
    const phone = loginPhone.trim().replace(/\D/g, "");
    if (phone.length !== 10) {
      setError(t("enterValidPhone"));
      return;
    }
    setLoginStep("otp");
  };

  const handleLoginOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== 4) {
      setError(t("enterOtp"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const phone = loginPhone.trim().replace(/\D/g, "");
      const id = loginId.trim().toUpperCase();

      if (id) {
        const nagarsevak = await loginWithNagarsevakId(phone, id);
        if (nagarsevak) {
          router.replace("/(tabs)/admin" as any);
          return;
        } else {
          setError(t("invalidNagarsevakId"));
          setOtpDigits(["", "", "", ""]);
          return;
        }
      }

      const user = await loginWithPhone(phone);
      if (user) {
        if (user.role === "nagarsevak") {
          router.replace("/(tabs)/admin" as any);
        } else {
          router.replace("/(tabs)/");
        }
      } else {
        setError(t("accountNotFound"));
        setLoginStep("form");
        setOtpDigits(["", "", "", ""]);
      }
    } finally {
      setLoading(false);
    }
  };

  const otpRefs = [otpRef1, otpRef2, otpRef3, otpRef4];

  const renderOtpInput = () => (
    <View style={s.otpSection}>
      <View style={s.otpIconWrap}>
        <Feather name="smartphone" size={28} color="#2563EB" />
      </View>
      <Text style={s.otpTitle}>{t("otpVerification")}</Text>
      <Text style={s.otpSub}>{t("otpSent")} +91 {activeTab === "register" ? regPhone : loginPhone}</Text>
      <View style={s.otpRow}>
        {otpDigits.map((digit, i) => (
          <TextInput
            key={i}
            ref={otpRefs[i]}
            style={[s.otpBox, digit ? s.otpBoxFilled : null]}
            value={digit}
            onChangeText={(v) => setOtpDigit(i, v.slice(-1), otpRefs)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace" && !digit && i > 0) {
                otpRefs[i - 1]?.current?.focus();
              }
            }}
          />
        ))}
      </View>
      <Text style={s.otpHint}>{t("otpHint")}</Text>
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      <TouchableOpacity
        style={s.primaryBtn}
        onPress={activeTab === "register" ? handleRegisterOtp : handleLoginOtp}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <LinearGradient colors={["#1E40AF", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
            <Text style={s.primaryBtnText}>{t("verifyOtp")}</Text>
            <Feather name="check" size={18} color="white" />
          </LinearGradient>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderRegisterForm = () => (
    <View style={s.formCard}>
      <Text style={s.fieldLabel}>
        {t("fullName")} <Text style={s.required}>*</Text>
      </Text>
      <TextInput
        style={s.input}
        placeholder={t("enterFullName")}
        placeholderTextColor="#94A3B8"
        value={regName}
        onChangeText={setRegName}
        autoCapitalize="words"
      />

      <Text style={s.fieldLabel}>{t("age")}</Text>
      <TextInput
        style={s.input}
        placeholder={t("enterAge")}
        placeholderTextColor="#94A3B8"
        keyboardType="number-pad"
        maxLength={3}
        value={regAge}
        onChangeText={setRegAge}
      />

      <Text style={s.fieldLabel}>
        {t("email")} <Text style={s.optional}>({t("optional")})</Text>
      </Text>
      <TextInput
        style={s.input}
        placeholder="yourname@email.com"
        placeholderTextColor="#94A3B8"
        keyboardType="email-address"
        autoCapitalize="none"
        value={regEmail}
        onChangeText={setRegEmail}
      />

      <Text style={s.fieldLabel}>
        {t("currentAddress")} <Text style={s.required}>*</Text>
      </Text>
      <TextInput
        style={[s.input, { minHeight: 60, textAlignVertical: "top" }]}
        placeholder={t("enterAddress")}
        placeholderTextColor="#94A3B8"
        multiline
        numberOfLines={2}
        value={regAddress}
        onChangeText={setRegAddress}
      />

      <Text style={s.fieldLabel}>
        {t("phoneNumber")} <Text style={s.required}>*</Text>
      </Text>
      <View style={s.phoneRow}>
        <View style={s.countryCode}>
          <Text style={s.countryCodeText}>🇮🇳 +91</Text>
        </View>
        <TextInput
          style={[s.input, s.phoneInput]}
          placeholder="10-digit mobile number"
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          maxLength={10}
          value={regPhone}
          onChangeText={setRegPhone}
        />
      </View>

      <Text style={s.fieldLabel}>
        {t("wardLocation")} <Text style={s.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={[s.input, s.pickerInput]}
        onPress={() => setWardModal(true)}
        activeOpacity={0.8}
      >
        <Feather name="map-pin" size={14} color={regWard ? "#2563EB" : "#94A3B8"} />
        <Text style={[s.pickerText, !regWard && { color: "#94A3B8" }]}>
          {regWard || t("selectWard")}
        </Text>
        <Feather name="chevron-down" size={14} color="#94A3B8" />
      </TouchableOpacity>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={s.primaryBtn}
        onPress={handleRegisterSubmit}
        activeOpacity={0.85}
      >
        <LinearGradient colors={["#1E40AF", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
          <Text style={s.primaryBtnText}>{t("continue")}</Text>
          <Feather name="arrow-right" size={18} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderNotifications = () => (
    <View style={s.formCard}>
      <View style={s.otpIconWrap}>
        <Feather name="check-circle" size={28} color="#059669" />
      </View>
      <Text style={s.otpTitle}>{t("phoneVerified")}</Text>
      <Text style={s.otpSub}>{t("allowNotifications")}</Text>

      <View style={s.notifSection}>
        <TouchableOpacity style={s.checkRow} onPress={() => setNotifyEmail(!notifyEmail)} activeOpacity={0.8}>
          <View style={[s.checkbox, notifyEmail && s.checkboxActive]}>
            {notifyEmail && <Feather name="check" size={14} color="white" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.checkLabel}>{t("emailNotifications")}</Text>
            <Text style={s.checkSub}>{t("emailNotifDesc")}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={s.checkRow} onPress={() => setNotifyWhatsapp(!notifyWhatsapp)} activeOpacity={0.8}>
          <View style={[s.checkbox, notifyWhatsapp && s.checkboxActive]}>
            {notifyWhatsapp && <Feather name="check" size={14} color="white" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.checkLabel}>{t("whatsappNotifications")}</Text>
            <Text style={s.checkSub}>{t("whatsappNotifDesc")}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={s.primaryBtn}
        onPress={handleRegisterFinish}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <LinearGradient colors={["#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
            <Text style={s.primaryBtnText}>{t("registerBtn")}</Text>
            <Feather name="user-plus" size={18} color="white" />
          </LinearGradient>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <Animated.View style={[s.successCard, { opacity: successAnim, transform: [{ scale: successAnim }] }]}>
      <View style={s.successIconWrap}>
        <Feather name="check-circle" size={48} color="#059669" />
      </View>
      <Text style={s.successTitle}>{t("registrationSuccess")}</Text>
      <Text style={s.successSub}>{t("redirectingHome")}</Text>
      <ActivityIndicator color="#2563EB" style={{ marginTop: 16 }} />
    </Animated.View>
  );

  const renderLoginForm = () => (
    <View style={s.formCard}>
      <Text style={s.fieldLabel}>{t("phoneNumber")}</Text>
      <View style={s.phoneRow}>
        <View style={s.countryCode}>
          <Text style={s.countryCodeText}>🇮🇳 +91</Text>
        </View>
        <TextInput
          style={[s.input, s.phoneInput]}
          placeholder={t("enterPhoneNumber")}
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          maxLength={10}
          value={loginPhone}
          onChangeText={setLoginPhone}
        />
      </View>

      <Text style={s.fieldLabel}>
        {t("nagarsevakIdLabel")} <Text style={s.optional}>({t("optional")})</Text>
      </Text>
      <TextInput
        style={s.input}
        placeholder={t("nagarsevakIdPlaceholder")}
        placeholderTextColor="#94A3B8"
        autoCapitalize="characters"
        value={loginId}
        onChangeText={setLoginId}
      />
      <Text style={s.helperText}>{t("nagarsevakIdHelp")}</Text>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={s.primaryBtn}
        onPress={handleLoginSubmit}
        activeOpacity={0.85}
      >
        <LinearGradient colors={["#1E40AF", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
          <Text style={s.primaryBtnText}>{t("continue")}</Text>
          <Feather name="arrow-right" size={18} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={["#0F1D42", "#1E3A8A", "#2563EB", "#3B82F6"]}
      locations={[0, 0.25, 0.65, 1]}
      style={[s.root, { paddingTop: topPad }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.langRow}>
            {languageOptions.map((opt) => (
              <TouchableOpacity
                key={opt.code}
                style={[s.langPill, language === opt.code && s.langPillActive]}
                onPress={() => setLanguage(opt.code)}
                activeOpacity={0.8}
              >
                <Text style={[s.langPillText, language === opt.code && s.langPillTextActive]}>
                  {opt.nativeLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.logoBox}>
            <Image
              source={require("@/assets/images/logo_transparent.png")}
              style={s.logo}
              contentFit="contain"
            />
          </View>

          <View style={s.tabBar}>
            <TouchableOpacity
              style={[s.tab, activeTab === "register" && s.tabActive]}
              onPress={() => switchTab("register")}
              activeOpacity={0.8}
            >
              <Feather name="user-plus" size={14} color={activeTab === "register" ? "#2563EB" : "#94A3B8"} />
              <Text style={[s.tabText, activeTab === "register" && s.tabTextActive]}>{t("registerBtn")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, activeTab === "login" && s.tabActive]}
              onPress={() => switchTab("login")}
              activeOpacity={0.8}
            >
              <Feather name="log-in" size={14} color={activeTab === "login" ? "#2563EB" : "#94A3B8"} />
              <Text style={[s.tabText, activeTab === "login" && s.tabTextActive]}>{t("loginBtn")}</Text>
            </TouchableOpacity>
          </View>

          {activeTab === "register" && regStep === "form" && renderRegisterForm()}
          {activeTab === "register" && regStep === "otp" && renderOtpInput()}
          {activeTab === "register" && regStep === "notifications" && renderNotifications()}
          {activeTab === "register" && regStep === "success" && renderSuccess()}

          {activeTab === "login" && loginStep === "form" && renderLoginForm()}
          {activeTab === "login" && loginStep === "otp" && renderOtpInput()}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={wardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setWardModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t("selectWard")}</Text>
              <TouchableOpacity onPress={() => setWardModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ulhasnagarWards.map((ward) => (
                <TouchableOpacity
                  key={ward}
                  style={[s.wardRow, regWard === ward && s.wardRowActive]}
                  onPress={() => {
                    setRegWard(ward);
                    setWardModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="map-pin"
                    size={14}
                    color={regWard === ward ? "#2563EB" : "#94A3B8"}
                  />
                  <Text style={[s.wardRowText, regWard === ward && { color: "#2563EB", fontWeight: "700" }]}>
                    {ward}
                  </Text>
                  {regWard === ward && <Feather name="check" size={14} color="#2563EB" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, alignItems: "center" },
  langRow: { flexDirection: "row", gap: 8, marginBottom: 4, alignSelf: "center" },
  langPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  langPillActive: { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.5)" },
  langPillText: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_600SemiBold", fontWeight: "700" },
  langPillTextActive: { color: "white" },
  logoBox: { alignItems: "center", marginBottom: 8, marginTop: 0 },
  logo: { width: 100, height: 100 },

  tabBar: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16, padding: 4, marginBottom: 16, width: "100%",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 12, gap: 6,
  },
  tabActive: { backgroundColor: "white" },
  tabText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.6)", fontFamily: "Inter_700Bold" },
  tabTextActive: { color: "#2563EB" },

  formCard: {
    width: "100%", backgroundColor: "white", borderRadius: 20,
    padding: 20, gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  fieldLabel: {
    fontSize: 12, fontWeight: "700", color: "#475569",
    fontFamily: "Inter_600SemiBold", marginTop: 10, marginBottom: 4, paddingLeft: 2,
  },
  required: { color: "#DC2626" },
  optional: { color: "#94A3B8", fontWeight: "400" },
  input: {
    backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, color: "#0F172A",
    fontFamily: "Inter_400Regular", borderWidth: 1.5, borderColor: "#E2E8F0",
  },
  phoneRow: { flexDirection: "row", gap: 8 },
  countryCode: {
    backgroundColor: "#F1F5F9", borderRadius: 12, paddingHorizontal: 12,
    justifyContent: "center", borderWidth: 1.5, borderColor: "#E2E8F0",
  },
  countryCodeText: { fontSize: 13, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold" },
  phoneInput: { flex: 1 },
  pickerInput: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  pickerText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  helperText: {
    fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular",
    paddingLeft: 2, marginTop: 2,
  },
  errorText: {
    fontSize: 12, color: "#DC2626", fontFamily: "Inter_400Regular",
    textAlign: "center", marginTop: 8,
  },
  primaryBtn: { marginTop: 16, borderRadius: 14, overflow: "hidden", width: "100%" },
  primaryBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, gap: 8,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  otpSection: {
    width: "100%", backgroundColor: "white", borderRadius: 20,
    padding: 24, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  otpIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#EFF6FF",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  otpTitle: {
    fontSize: 18, fontWeight: "800", color: "#0F172A",
    fontFamily: "Inter_700Bold", marginBottom: 6,
  },
  otpSub: {
    fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular",
    textAlign: "center", marginBottom: 20,
  },
  otpRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  otpBox: {
    width: 52, height: 56, borderRadius: 14, borderWidth: 2,
    borderColor: "#E2E8F0", backgroundColor: "#F8FAFC",
    fontSize: 22, fontWeight: "800", color: "#0F172A",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    textAlignVertical: "center",
  },
  otpBoxFilled: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  otpHint: {
    fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },

  notifSection: { width: "100%", gap: 12, marginTop: 16, marginBottom: 8 },
  checkRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: "#F8FAFC", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#E2E8F0",
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  checkSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },

  successCard: {
    width: "100%", backgroundColor: "white", borderRadius: 20,
    padding: 32, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#D1FAE5",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  successTitle: {
    fontSize: 20, fontWeight: "800", color: "#059669",
    fontFamily: "Inter_700Bold", marginBottom: 8,
  },
  successSub: {
    fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold",
  },
  wardRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12,
    marginBottom: 4,
  },
  wardRowActive: { backgroundColor: "#EFF6FF" },
  wardRowText: {
    flex: 1, fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular",
  },
});
