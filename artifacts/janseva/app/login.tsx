import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth, UserRole } from "@/context/AuthContext";

const WARDS = [
  "Ward 1 — Colaba", "Ward 2 — Mazagaon", "Ward 3 — Byculla",
  "Ward 4 — Parel", "Ward 5 — Dharavi", "Ward 6 — Sion",
  "Ward 7 — Mahim", "Ward 8 — Dadar", "Ward 9 — Worli",
  "Ward 10 — Lower Parel", "Ward 11 — Kurla", "Ward 12 — Ghatkopar",
  "Ward 13 — Andheri", "Ward 14 — Borivali", "Ward 15 — Kandivali",
];

const roleCards = [
  {
    role: "citizen" as UserRole,
    title: "Citizen",
    subtitle: "नागरिक",
    desc: "Submit complaints, access services & track status",
    icon: "user",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    role: "nagarsevak" as UserRole,
    title: "Nagarsevak",
    subtitle: "नगरसेवक",
    desc: "Ward officer — manage & resolve ward complaints",
    icon: "briefcase",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
  {
    role: "head_admin" as UserRole,
    title: "Head Admin",
    subtitle: "मुख्य प्रशासक",
    desc: "Full control — all wards, services & users",
    icon: "shield",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#C4B5FD",
  },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedWard, setSelectedWard] = useState(WARDS[7]);
  const [showWardPicker, setShowWardPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"role" | "details">("role");

  const handleSelectRole = (role: UserRole) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
    setStep("details");
  };

  const handleLogin = async () => {
    if (!name.trim() || !mobile.trim() || !selectedRole) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    setTimeout(async () => {
      await login({
        id: "",
        name: name.trim(),
        mobile: mobile.trim(),
        role: selectedRole,
        ward: selectedRole === "nagarsevak" ? selectedWard : "Ward 8 — Dadar",
        wardNumber: selectedRole === "nagarsevak" ? selectedWard.split(" ")[1] : "8",
      });
      setLoading(false);
      router.replace("/(tabs)");
    }, 800);
  };

  const selectedRoleCard = roleCards.find((r) => r.role === selectedRole);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient
        colors={["#0F172A", "#1E3A8A", "#1E40AF"]}
        style={[styles.headerBg, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 30 }]}
      >
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Feather name="shield" size={28} color="#3B82F6" />
          </View>
          <View>
            <Text style={styles.logoTitle}>JanSeva</Text>
            <Text style={styles.logoSub}>Citizen Services Platform</Text>
          </View>
        </View>
        <Text style={styles.headerTagline}>नागरिकों की सेवा में</Text>
      </LinearGradient>

      <View style={styles.card}>
        {step === "role" ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            <View style={{ gap: 4, marginBottom: 4 }}>
              <Text style={styles.stepTitle}>Select Your Role</Text>
              <Text style={styles.stepSub}>Who are you logging in as?</Text>
            </View>
            {roleCards.map((rc) => (
              <TouchableOpacity
                key={rc.role}
                style={[styles.roleCard, { borderColor: rc.border, backgroundColor: rc.bg }]}
                onPress={() => handleSelectRole(rc.role)}
                activeOpacity={0.85}
              >
                <View style={[styles.roleCardIcon, { backgroundColor: rc.color + "22" }]}>
                  <Feather name={rc.icon as any} size={24} color={rc.color} />
                </View>
                <View style={styles.roleCardText}>
                  <View style={styles.roleCardTitleRow}>
                    <Text style={[styles.roleCardTitle, { color: rc.color }]}>{rc.title}</Text>
                    <Text style={styles.roleCardSub}>{rc.subtitle}</Text>
                  </View>
                  <Text style={styles.roleCardDesc}>{rc.desc}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={rc.color} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            <View style={styles.backRow}>
              <TouchableOpacity onPress={() => setStep("role")} style={styles.backBtn} activeOpacity={0.7}>
                <Feather name="arrow-left" size={16} color="#475569" />
              </TouchableOpacity>
              {selectedRoleCard && (
                <View style={[styles.rolePill, { backgroundColor: selectedRoleCard.bg, borderColor: selectedRoleCard.border }]}>
                  <Feather name={selectedRoleCard.icon as any} size={12} color={selectedRoleCard.color} />
                  <Text style={[styles.rolePillText, { color: selectedRoleCard.color }]}>{selectedRoleCard.title}</Text>
                </View>
              )}
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.stepTitle}>Your Details</Text>
              <Text style={styles.stepSub}>Enter your name and mobile number</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputIcon}>
                  <Feather name="user" size={16} color="#2563EB" />
                </View>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#CBD5E1"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={styles.inputRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {selectedRole === "nagarsevak" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ASSIGNED WARD</Text>
                <TouchableOpacity
                  style={styles.wardPicker}
                  onPress={() => setShowWardPicker(!showWardPicker)}
                  activeOpacity={0.8}
                >
                  <Feather name="map-pin" size={16} color="#2563EB" />
                  <Text style={styles.wardPickerText}>{selectedWard}</Text>
                  <Feather name={showWardPicker ? "chevron-up" : "chevron-down"} size={16} color="#64748B" />
                </TouchableOpacity>
                {showWardPicker && (
                  <View style={styles.wardDropdown}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {WARDS.map((w) => (
                        <TouchableOpacity
                          key={w}
                          style={[styles.wardOption, w === selectedWard && styles.wardOptionSelected]}
                          onPress={() => { setSelectedWard(w); setShowWardPicker(false); }}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.wardOptionText, w === selectedWard && { color: "#2563EB", fontFamily: "Inter_700Bold" }]}>
                            {w}
                          </Text>
                          {w === selectedWard && <Feather name="check" size={14} color="#2563EB" />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            <View style={styles.otpNote}>
              <Feather name="lock" size={13} color="#059669" />
              <Text style={styles.otpNoteText}>OTP verification will be sent to your mobile number</Text>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, (!name.trim() || !mobile.trim()) && { opacity: 0.5 }]}
              onPress={handleLogin}
              disabled={!name.trim() || !mobile.trim() || loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#1E40AF", "#2563EB", "#3B82F6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtnGrad}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Feather name="log-in" size={18} color="white" />
                    <Text style={styles.loginBtnText}>Continue</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerBg: { paddingHorizontal: 24, paddingBottom: 48 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  logoIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(59,130,246,0.3)",
  },
  logoTitle: { fontSize: 28, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  logoSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", marginTop: 2 },
  headerTagline: { fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  stepSub: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  roleCardIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  roleCardText: { flex: 1 },
  roleCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  roleCardTitle: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  roleCardSub: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  roleCardDesc: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 17 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  rolePillText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  inputGroup: { gap: 8 },
  label: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, overflow: "hidden",
    backgroundColor: "white",
  },
  inputIcon: {
    width: 46, height: 48, alignItems: "center", justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  countryCode: {
    paddingHorizontal: 14, height: 48, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F8FAFC", borderRightWidth: 1, borderRightColor: "#E2E8F0",
  },
  countryCodeText: { fontSize: 14, fontWeight: "700", color: "#1E40AF", fontFamily: "Inter_700Bold" },
  input: {
    flex: 1, height: 48, paddingHorizontal: 14,
    fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular",
  },
  wardPicker: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "white",
  },
  wardPickerText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  wardDropdown: {
    borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14,
    backgroundColor: "white", overflow: "hidden", marginTop: -4,
  },
  wardOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: "#F8FAFC",
  },
  wardOptionSelected: { backgroundColor: "#EFF6FF" },
  wardOptionText: { fontSize: 13, color: "#334155", fontFamily: "Inter_400Regular" },
  otpNote: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#ECFDF5", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  otpNoteText: { fontSize: 12, color: "#065F46", fontFamily: "Inter_400Regular" },
  loginBtn: { borderRadius: 16, overflow: "hidden", shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  loginBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  loginBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  termsText: { fontSize: 11, color: "#94A3B8", textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 16 },
});
