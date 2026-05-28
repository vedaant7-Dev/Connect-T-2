import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { NAGARSEVAK_WARDS } from "@/data/wards";
import { apiUrl } from "@/constants/api";

type Step = "form" | "otp" | "success";

export default function NagarsevakRegisterScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone?: string }>();

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState(params.phone || "");
  const [ward, setWard] = useState("");
  const [address, setAddress] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [wardModal, setWardModal] = useState(false);
  const [wardSearch, setWardSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [wardAvailable, setWardAvailable] = useState<boolean | null>(null);
  const [checkingWard, setCheckingWard] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
  ];

  useEffect(() => {
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

  const checkWardAvailability = async (selectedWard: string) => {
    setCheckingWard(true);
    try {
      const res = await fetch(apiUrl(`/api/auth/ward-check?ward=${encodeURIComponent(selectedWard)}`));
      const data = await res.json();
      setWardAvailable(data.available ?? false);
    } catch {
      setWardAvailable(null);
    } finally {
      setCheckingWard(false);
    }
  };

  const selectWard = (w: string) => {
    setWard(w);
    setWardModal(false);
    setWardSearch("");
    checkWardAvailability(w);
  };

  const filteredWards = NAGARSEVAK_WARDS.filter(w =>
    w.toLowerCase().includes(wardSearch.toLowerCase())
  );

  const extractWardCode = (value: string) => {
    const match = value.toUpperCase().match(/(\d{1,2})\s*([ABC])/);
    return match ? `${Number(match[1])}${match[2]}` : value;
  };

  const sendOtp = async () => {
    setError("");
    if (!name.trim() || name.trim().length < 2) { setError("Enter your full name (min 2 chars)"); return; }
    const cleaned = mobile.trim().replace(/\D/g, "");
    if (cleaned.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    if (!ward) { setError("Select your ward"); return; }
    if (wardAvailable === false) { setError("This ward is already taken by another Nagarsevak"); return; }
    if (!contactNumber.trim().replace(/\D/g, "") || contactNumber.trim().replace(/\D/g, "").length !== 10) {
      setError("Enter a valid 10-digit contact number");
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch(apiUrl("/api/auth/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleaned, purpose: "nagarsevak_auth" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to send OTP");
      setMobile(cleaned);
      setSessionToken(data.sessionToken || data.devOtp || "1234");
      setStep("otp");
      startCountdown();
    } catch (e: any) {
      setError(e.message ?? "Failed to send OTP. Try again.");
    } finally {
      setOtpSending(false);
    }
  };

  const verifyAndRegister = async () => {
    const otp = otpDigits.join("");
    if (otp.length < 4) { setError("Enter OTP code"); return; }
    setLoading(true); setError("");
    try {
      const verRes = await fetch(apiUrl("/api/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim().replace(/\D/g, ""), otp: otp.slice(0, 4), sessionToken }),
      });
      const verData = await verRes.json();
      if (!verData.success && !verData.valid) throw new Error(verData.error || verData.message || "Invalid OTP");

      const regRes = await fetch(apiUrl("/api/auth/nagarsevak-register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mobile,
          ward,
          wardCode: extractWardCode(ward),
          address,
          officeAddress,
          contactNumber: contactNumber.trim().replace(/\D/g, ""),
        }),
      });
      const regData = await regRes.json();

      if (regData.success) {
        setStep("success");
      } else if (regData.message === "ALREADY_PENDING") {
        setError("Your registration is already submitted and pending approval.");
        setStep("form");
      } else if (regData.message === "WARD_TAKEN") {
        setError("This ward has already been claimed. Select a different ward.");
        setStep("form");
      } else {
        throw new Error(regData.message ?? "Registration failed");
      }
    } catch (e: any) {
      setError(e.message ?? "Registration failed. Try again.");
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color="white" />
        </TouchableOpacity>
        <View style={styles.topBadge}>
          <Feather name="user-plus" size={13} color="white" />
          <Text style={styles.topBadgeText}>Nagarsevak Registration</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 12}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom, 12) + 150 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {step === "form" && (
              <>
                <View style={styles.cardHeader}>
                  <View style={styles.headerIcon}>
                    <Feather name="clipboard" size={28} color="#EA580C" />
                  </View>
                  <Text style={styles.cardTitle}>Register as Nagarsevak</Text>
                  <Text style={styles.cardSub}>Fill in your details. Your account will be reviewed by the Super Admin.</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Field label="FULL NAME *">
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="As per official records"
                    placeholderTextColor="#CBD5E1"
                    autoCapitalize="words"
                  />
                </Field>

                <Field label="MOBILE NUMBER *">
                  <View style={styles.phoneRow}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { flex: 1, borderWidth: 0, borderRadius: 0 }]}
                      value={mobile}
                      onChangeText={setMobile}
                      placeholder="10-digit mobile"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </Field>

                <Field label="WARD *">
                  <TouchableOpacity
                    style={[styles.input, styles.wardPicker, !ward && { borderColor: "#E2E8F0" }]}
                    onPress={() => setWardModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.wardPickerText, !ward && { color: "#CBD5E1" }]}>
                      {ward || "Select your ward (e.g. Ward 3A)"}
                    </Text>
                    {checkingWard ? (
                      <ActivityIndicator size="small" color="#EA580C" />
                    ) : ward && wardAvailable !== null ? (
                      <View style={[styles.wardBadge, { backgroundColor: wardAvailable ? "#D1FAE5" : "#FEE2E2" }]}>
                        <Feather name={wardAvailable ? "check" : "x"} size={11} color={wardAvailable ? "#059669" : "#DC2626"} />
                        <Text style={[styles.wardBadgeText, { color: wardAvailable ? "#059669" : "#DC2626" }]}>
                          {wardAvailable ? "Available" : "Taken"}
                        </Text>
                      </View>
                    ) : (
                      <Feather name="chevron-down" size={16} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                  {ward && wardAvailable === false && (
                    <Text style={styles.wardTakenMsg}>⚠️ This ward is already assigned. Please select another.</Text>
                  )}
                </Field>

                <Field label="CONTACT NUMBER *">
                  <TextInput
                    style={styles.input}
                    value={contactNumber}
                    onChangeText={setContactNumber}
                    placeholder="Public contact number for citizens"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </Field>

                <Field label="OFFICE ADDRESS">
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={officeAddress}
                    onChangeText={setOfficeAddress}
                    placeholder="Ward office address"
                    placeholderTextColor="#CBD5E1"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </Field>

                <Field label="RESIDENCE ADDRESS">
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Your residence address"
                    placeholderTextColor="#CBD5E1"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </Field>

                <View style={styles.noticeCard}>
                  <Feather name="info" size={14} color="#D97706" />
                  <Text style={styles.noticeText}>
                    After submission, your account will be reviewed and approved by the Super Admin. You will be able to login once approved.
                  </Text>
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
                      : <><Feather name="send" size={17} color="white" /><Text style={styles.btnText}>Verify Mobile & Submit</Text></>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {step === "otp" && (
              <>
                <View style={styles.cardHeader}>
                  <View style={styles.headerIcon}>
                    <Feather name="lock" size={28} color="#EA580C" />
                  </View>
                  <Text style={styles.cardTitle}>Verify Mobile</Text>
                  <Text style={styles.cardSub}>Enter the 6-digit OTP sent to +91 {mobile}</Text>
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
                  onPress={verifyAndRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={["#059669", "#10B981"]} style={styles.btnGrad}>
                    {loading
                      ? <ActivityIndicator color="white" />
                      : <><Feather name="check-circle" size={17} color="white" /><Text style={styles.btnText}>Submit Registration</Text></>
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
              </>
            )}

            {step === "success" && (
              <View style={styles.successWrap}>
                <View style={styles.successIcon}>
                  <Feather name="check-circle" size={48} color="#059669" />
                </View>
                <Text style={styles.successTitle}>Registration Submitted!</Text>
                <Text style={styles.successMsg}>
                  Your Nagarsevak registration for <Text style={{ fontWeight: "700" }}>{ward}</Text> has been submitted successfully.
                  {"\n\n"}
                  The Super Admin will review and approve your account. You'll be able to login once approved.
                </Text>
                <View style={styles.successDetail}>
                  <View style={styles.successDetailRow}>
                    <Feather name="user" size={14} color="#059669" />
                    <Text style={styles.successDetailText}>{name}</Text>
                  </View>
                  <View style={styles.successDetailRow}>
                    <Feather name="map-pin" size={14} color="#059669" />
                    <Text style={styles.successDetailText}>{ward}</Text>
                  </View>
                  <View style={styles.successDetailRow}>
                    <Feather name="phone" size={14} color="#059669" />
                    <Text style={styles.successDetailText}>+91 {mobile}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace("/secret-access" as any)} activeOpacity={0.85}>
                  <LinearGradient colors={["#059669", "#10B981"]} style={styles.btnGrad}>
                    <Feather name="home" size={17} color="white" />
                    <Text style={styles.btnText}>Back to Home</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={wardModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ward</Text>
              <TouchableOpacity onPress={() => { setWardModal(false); setWardSearch(""); }}>
                <Feather name="x" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Feather name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                value={wardSearch}
                onChangeText={setWardSearch}
                placeholder="Search ward..."
                placeholderTextColor="#CBD5E1"
                autoFocus
              />
            </View>
            <FlatList
              data={filteredWards}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.wardItem, item === ward && styles.wardItemSelected]}
                  onPress={() => selectWard(item)}
                  activeOpacity={0.7}
                >
                  <Feather name="map-pin" size={14} color={item === ward ? "#EA580C" : "#94A3B8"} />
                  <Text style={[styles.wardItemText, item === ward && { color: "#EA580C", fontFamily: "Inter_600SemiBold" }]}>
                    {item}
                  </Text>
                  {item === ward && <Feather name="check" size={16} color="#EA580C" />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F1F5F9" }} />}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, justifyContent: "space-between" },
  backBtn: { padding: 8 },
  topBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  topBadgeText: { fontSize: 12, color: "white", fontFamily: "Inter_600SemiBold" },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8 },
  card: { backgroundColor: "white", borderRadius: 24, padding: 22, marginBottom: 28, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  cardHeader: { alignItems: "center", marginBottom: 24 },
  headerIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 6, textAlign: "center" },
  cardSub: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  errorText: { backgroundColor: "#FEE2E2", color: "#991B1B", fontSize: 12, fontFamily: "Inter_400Regular", padding: 10, borderRadius: 10, marginBottom: 14, textAlign: "center" },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular" },
  textarea: { minHeight: 84, textAlignVertical: "top", paddingTop: 12 },
  phoneRow: { flexDirection: "row", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, overflow: "hidden" },
  countryCode: { backgroundColor: "#F8FAFC", paddingHorizontal: 14, justifyContent: "center", borderRightWidth: 1, borderRightColor: "#E2E8F0" },
  countryCodeText: { fontSize: 15, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold" },
  wardPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wardPickerText: { fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular", flex: 1 },
  wardBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  wardBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  wardTakenMsg: { fontSize: 11, color: "#DC2626", fontFamily: "Inter_400Regular", marginTop: 6 },
  noticeCard: { flexDirection: "row", gap: 8, backgroundColor: "#FEF3C7", padding: 14, borderRadius: 12, marginBottom: 20, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 12, color: "#92400E", fontFamily: "Inter_400Regular", lineHeight: 18 },
  primaryBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  doneBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  otpRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 24 },
  otpBox: { width: 44, height: 52, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, fontSize: 20, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", backgroundColor: "#F8FAFC" },
  otpBoxFilled: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  resendBtn: { alignItems: "center", paddingVertical: 8 },
  resendText: { fontSize: 13, color: "#EA580C", fontFamily: "Inter_600SemiBold" },
  successWrap: { alignItems: "center" },
  successIcon: { width: 96, height: 96, borderRadius: 28, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#065F46", fontFamily: "Inter_700Bold", marginBottom: 12 },
  successMsg: { fontSize: 13, color: "#475569", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  successDetail: { width: "100%", backgroundColor: "#F0FDF4", borderRadius: 14, padding: 16, gap: 10, marginBottom: 24 },
  successDetailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  successDetailText: { fontSize: 14, color: "#065F46", fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "75%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular" },
  wardItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 4 },
  wardItemSelected: { backgroundColor: "#FFF7ED" },
  wardItemText: { flex: 1, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular" },
});
