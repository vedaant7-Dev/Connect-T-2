import React, { useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";

import { useAuth, UserRole } from "@/context/AuthContext";
import { ulhasnagarWards } from "@/data/mumbaiServices";

type Step = "phone" | "welcome_back" | "role" | "details";

interface FormData {
  mobile: string;
  name: string;
  age: string;
  email: string;
  ward: string;
  role: UserRole;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const { checkPhone, register, loginWithPhone } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wardModal, setWardModal] = useState(false);

  const [form, setForm] = useState<FormData>({
    mobile: "",
    name: "",
    age: "",
    email: "",
    ward: "",
    role: "citizen",
  });
  const [existingUser, setExistingUser] = useState<any>(null);

  const patch = (key: keyof FormData, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handlePhoneNext = async () => {
    setError("");
    const mobile = form.mobile.trim().replace(/\D/g, "");
    if (mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const found = await checkPhone(mobile);
      if (found) {
        setExistingUser(found);
        setStep("welcome_back");
      } else {
        setStep("role");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeBack = async () => {
    setLoading(true);
    try {
      await loginWithPhone(form.mobile.trim().replace(/\D/g, ""));
      router.replace("/(tabs)/");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    patch("role", role);
    setStep("details");
  };

  const handleRegister = async () => {
    setError("");
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters)");
      return;
    }
    const ageNum = parseInt(form.age, 10);
    if (!form.age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError("Please enter a valid age (1–120)");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address or leave it blank");
      return;
    }
    if (!form.ward) {
      setError("Please select your ward / area in Ulhasnagar");
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        mobile: form.mobile.trim().replace(/\D/g, ""),
        role: form.role,
        ward: form.ward,
        age: ageNum,
        email: form.email.trim() || undefined,
      });
      router.replace("/(tabs)/");
    } catch (e: any) {
      setError(e.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: {
    id: UserRole; label: string; desc: string; icon: string; color: string; bg: string;
  }[] = [
    { id: "citizen", label: "Citizen", desc: "Register complaints, access civic services & community feed", icon: "user", color: "#2563EB", bg: "#EFF6FF" },
    { id: "nagarsevak", label: "Nagarsevak / Ward Officer", desc: "Manage and resolve ward-level complaints", icon: "briefcase", color: "#059669", bg: "#ECFDF5" },
    { id: "head_admin", label: "Head Admin", desc: "Full oversight across all wards and departments", icon: "shield", color: "#7C3AED", bg: "#F5F3FF" },
  ];

  const roleColor = (role: UserRole) =>
    role === "citizen" ? "#2563EB" : role === "nagarsevak" ? "#059669" : "#7C3AED";
  const roleBg = (role: UserRole) =>
    role === "citizen" ? "#EFF6FF" : role === "nagarsevak" ? "#ECFDF5" : "#F5F3FF";
  const roleIcon = (role: UserRole) =>
    role === "citizen" ? "user" : role === "nagarsevak" ? "briefcase" : "shield";
  const roleLabel = (role: UserRole) =>
    role === "citizen" ? "Citizen" : role === "nagarsevak" ? "Nagarsevak / Ward Officer" : "Head Admin";

  return (
    <LinearGradient
      colors={["#0F1D42", "#1E3A8A", "#2563EB", "#3B82F6"]}
      locations={[0, 0.25, 0.65, 1]}
      style={[styles.root, { paddingTop: topPad }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoBox}>
            <Image
              source={require("@/assets/images/logo_transparent.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.brandSub}>Powered by Vikas Bahuddeshiya Aghadi</Text>
          </View>

          {/* ── STEP: Phone ─────────────────────────────────────────────── */}
          {step === "phone" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome</Text>
              <Text style={styles.cardSub}>Enter your mobile number to login or register</Text>

              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.mobile}
                  onChangeText={(v) => patch("mobile", v)}
                  onSubmitEditing={handlePhoneNext}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handlePhoneNext}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Continue</Text>
                    <Feather name="arrow-right" size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                Your number is only used for identification. No OTP needed.
              </Text>
            </View>
          )}

          {/* ── STEP: Welcome Back ──────────────────────────────────────── */}
          {step === "welcome_back" && existingUser && (
            <View style={styles.card}>
              <View style={[styles.avatarCircle, { backgroundColor: existingUser.avatarColor ?? "#2563EB" }]}>
                <Text style={styles.avatarText}>
                  {existingUser.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardTitle}>Welcome back!</Text>
              <Text style={styles.welcomeName}>{existingUser.name}</Text>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={12} color="#2563EB" />
                <Text style={styles.infoText}>{existingUser.ward ?? "Ulhasnagar"}</Text>
              </View>
              <View style={[styles.rolePillWrap, { backgroundColor: roleBg(existingUser.role) }]}>
                <Feather name={roleIcon(existingUser.role) as any} size={11} color={roleColor(existingUser.role)} />
                <Text style={[styles.rolePillText, { color: roleColor(existingUser.role) }]}>
                  {roleLabel(existingUser.role)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleWelcomeBack}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Login</Text>
                    <Feather name="log-in" size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setStep("phone"); setExistingUser(null); }}
                style={styles.backLink}
              >
                <Feather name="chevron-left" size={14} color="#64748B" />
                <Text style={styles.backLinkText}>Use a different number</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP: Role Selection ────────────────────────────────────── */}
          {step === "role" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Select Your Role</Text>
              <Text style={styles.cardSub}>Choose the role that best describes you</Text>

              {roleOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.roleOption, { borderColor: opt.color + "40" }]}
                  onPress={() => handleRoleSelect(opt.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.roleIconBox, { backgroundColor: opt.bg }]}>
                    <Feather name={opt.icon as any} size={22} color={opt.color} />
                  </View>
                  <View style={styles.roleTextBox}>
                    <Text style={styles.roleLabel}>{opt.label}</Text>
                    <Text style={styles.roleDesc}>{opt.desc}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              ))}

              <TouchableOpacity onPress={() => setStep("phone")} style={styles.backLink}>
                <Feather name="chevron-left" size={14} color="#64748B" />
                <Text style={styles.backLinkText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP: Details (Registration) ────────────────────────────── */}
          {step === "details" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Details</Text>
              <Text style={styles.cardSub}>Complete your profile to finish registration</Text>

              {/* Mobile (locked) */}
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={[styles.input, styles.lockedInput]}>
                <Feather name="smartphone" size={14} color="#64748B" />
                <Text style={styles.lockedText}>+91 {form.mobile}</Text>
                <Feather name="lock" size={12} color="#94A3B8" />
              </View>

              {/* Full Name */}
              <Text style={styles.fieldLabel}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#94A3B8"
                value={form.name}
                onChangeText={(v) => patch("name", v)}
                autoCapitalize="words"
              />

              {/* Age */}
              <Text style={styles.fieldLabel}>
                Age <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Your age (e.g. 28)"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={3}
                value={form.age}
                onChangeText={(v) => patch("age", v)}
              />

              {/* Email */}
              <Text style={styles.fieldLabel}>
                Email Address <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="yourname@email.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(v) => patch("email", v)}
              />

              {/* Ward */}
              <Text style={styles.fieldLabel}>
                Ward / Area in Ulhasnagar <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerInput]}
                onPress={() => setWardModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={14} color={form.ward ? "#2563EB" : "#94A3B8"} />
                <Text style={[styles.pickerText, !form.ward && { color: "#94A3B8" }]}>
                  {form.ward || "Select your ward / camp"}
                </Text>
                <Feather name="chevron-down" size={14} color="#94A3B8" />
              </TouchableOpacity>

              {/* Role (changeable) */}
              <Text style={styles.fieldLabel}>Role</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerInput]}
                onPress={() => setStep("role")}
                activeOpacity={0.8}
              >
                <Feather name={roleIcon(form.role) as any} size={14} color="#2563EB" />
                <Text style={[styles.pickerText, { color: "#0F172A" }]}>
                  {roleLabel(form.role)}
                </Text>
                <Text style={styles.changeBtn}>Change</Text>
              </TouchableOpacity>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleRegister}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Create Account</Text>
                    <Feather name="check-circle" size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep("role")} style={styles.backLink}>
                <Feather name="chevron-left" size={14} color="#64748B" />
                <Text style={styles.backLinkText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Ward Picker Modal */}
      <Modal
        visible={wardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setWardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Ward / Area</Text>
              <TouchableOpacity onPress={() => setWardModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ulhasnagarWards.map((ward) => (
                <TouchableOpacity
                  key={ward}
                  style={[
                    styles.wardRow,
                    form.ward === ward && styles.wardRowActive,
                  ]}
                  onPress={() => {
                    patch("ward", ward);
                    setWardModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="map-pin"
                    size={14}
                    color={form.ward === ward ? "#2563EB" : "#94A3B8"}
                  />
                  <Text
                    style={[
                      styles.wardRowText,
                      form.ward === ward && { color: "#2563EB", fontWeight: "700" },
                    ]}
                  >
                    {ward}
                  </Text>
                  {form.ward === ward && (
                    <Feather name="check" size={14} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, alignItems: "center" },
  logoBox: { alignItems: "center", marginBottom: 10, marginTop: 8 },
  logo: { width: 120, height: 120, marginBottom: 6 },
  brandSub: {
    fontSize: 11, color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center",
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: "white", borderRadius: 24, padding: 24,
    width: "100%", maxWidth: 420,
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 30, elevation: 12,
  },
  cardTitle: {
    fontSize: 22, fontWeight: "800", color: "#0F172A",
    fontFamily: "Inter_700Bold", marginBottom: 6,
  },
  cardSub: {
    fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular",
    marginBottom: 20, lineHeight: 18,
  },
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 0 },
  countryCode: {
    backgroundColor: "#F1F5F9", borderRadius: 12,
    paddingHorizontal: 12, justifyContent: "center",
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  countryCodeText: {
    fontSize: 14, fontWeight: "600", color: "#0F172A", fontFamily: "Inter_600SemiBold",
  },
  phoneInput: { flex: 1, marginBottom: 0 },
  input: {
    backgroundColor: "#F8FAFC", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: "#0F172A",
    borderWidth: 1, borderColor: "#E2E8F0",
    fontFamily: "Inter_400Regular", marginBottom: 12,
  },
  lockedInput: { flexDirection: "row", alignItems: "center", gap: 8 },
  lockedText: { flex: 1, fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular" },
  pickerInput: { flexDirection: "row", alignItems: "center", gap: 10 },
  pickerText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  changeBtn: {
    fontSize: 11, color: "#2563EB", fontFamily: "Inter_600SemiBold", fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 12, fontWeight: "700", color: "#374151",
    fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 2,
  },
  required: { color: "#DC2626" },
  optional: { color: "#94A3B8", fontWeight: "400" },
  errorText: {
    color: "#DC2626", fontSize: 12, fontFamily: "Inter_400Regular",
    marginVertical: 8, textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 15,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 16, marginBottom: 4,
  },
  primaryBtnText: { color: "white", fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  disclaimer: {
    fontSize: 10, color: "#94A3B8", textAlign: "center",
    marginTop: 10, lineHeight: 14, fontFamily: "Inter_400Regular",
  },
  backLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, marginTop: 14,
  },
  backLinkText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular" },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  welcomeName: {
    fontSize: 20, fontWeight: "800", color: "#0F172A",
    fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    justifyContent: "center", marginBottom: 10,
  },
  infoText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular" },
  rolePillWrap: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    alignSelf: "center", marginBottom: 20,
  },
  rolePillText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  roleOption: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 12,
  },
  roleIconBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  roleTextBox: { flex: 1 },
  roleLabel: {
    fontSize: 15, fontWeight: "700", color: "#0F172A",
    fontFamily: "Inter_700Bold", marginBottom: 2,
  },
  roleDesc: {
    fontSize: 11, color: "#64748B",
    fontFamily: "Inter_400Regular", lineHeight: 15,
  },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "white", borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 20, maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold",
  },
  wardRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  wardRowActive: {
    backgroundColor: "#EFF6FF", borderRadius: 10, paddingHorizontal: 10,
  },
  wardRowText: {
    flex: 1, fontSize: 14, color: "#374151", fontFamily: "Inter_400Regular",
  },
});
