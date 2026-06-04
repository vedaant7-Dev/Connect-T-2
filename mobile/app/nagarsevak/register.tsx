import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { NAGARSEVAK_WARDS } from "@/data/wards";
import { getApiUrl } from "@/utils/apiUrl";

type Step = "form" | "otp";
const DEMO_OTP = "1234";

function cleanMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function formatDob(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function isValidDob(value: string) {
  return /^\d{2}-\d{2}-\d{4}$/.test(value.trim());
}

export default function NagarsevakRegisterScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone?: string }>();
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [mobile, setMobile] = useState(cleanMobile(String(params.phone || "")));
  const [ward, setWard] = useState("");
  const [address, setAddress] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [wardModal, setWardModal] = useState(false);
  const [wardSearch, setWardSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [wardAvailable, setWardAvailable] = useState<boolean | null>(null);
  const [checkingWard, setCheckingWard] = useState(false);
  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  useEffect(() => {
    if (mobile && !contactNumber) setContactNumber(mobile);
  }, []);

  const checkWardAvailability = async (selectedWard: string) => {
    setCheckingWard(true);
    setWardAvailable(null);
    try {
      const res = await fetch(getApiUrl(`/api/auth/ward-check?ward=${encodeURIComponent(selectedWard)}`));
      const data = await res.json().catch(() => ({}));
      setWardAvailable(data.available !== false);
    } catch {
      setWardAvailable(true);
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

  const filteredWards = NAGARSEVAK_WARDS.filter((w) => w.toLowerCase().includes(wardSearch.toLowerCase()));

  const sendOtp = async () => {
    setError("");
    const cleaned = cleanMobile(mobile);
    const contact = cleanMobile(contactNumber || cleaned);
    if (name.trim().length < 2) return setError("Enter your full name");
    if (!isValidDob(dob)) return setError("Enter DOB as DD-MM-YYYY");
    if (cleaned.length !== 10) return setError("Enter a valid 10-digit mobile number");
    if (!ward) return setError("Select your ward");
    if (wardAvailable === false) return setError("This ward is already assigned to an approved Nagarsevak");
    if (contact.length !== 10) return setError("Enter a valid 10-digit contact number");
    setOtpSending(true);
    setTimeout(() => {
      setMobile(cleaned);
      setContactNumber(contact);
      setOtpDigits(["", "", "", ""]);
      setStep("otp");
      setOtpSending(false);
    }, 250);
  };

  const verifyAndRegister = async () => {
    const otp = otpDigits.join("");
    if (otp !== DEMO_OTP) return setError(`Enter demo OTP ${DEMO_OTP}`);
    setLoading(true);
    setError("");
    try {
      const regRes = await fetch(getApiUrl("/api/auth/nagarsevak-register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dob,
          mobile: cleanMobile(mobile),
          ward,
          wardCode: ward,
          address,
          officeAddress,
          residenceAddress: address,
          contactName: name.trim(),
          contactNumber: cleanMobile(contactNumber || mobile),
        }),
      });
      const regData = await regRes.json();
      if (regData.success || regData.message === "ALREADY_PENDING" || regData.message === "Officer already registered") {
        router.replace({ pathname: "/nagarsevak/status" as any, params: { phone: cleanMobile(mobile), from: "register" } });
      } else if (regData.message === "WARD_TAKEN") {
        setStep("form");
        setWardAvailable(false);
        setError("This ward is already assigned to an approved Nagarsevak.");
      } else {
        throw new Error(regData.message || "Registration failed");
      }
    } catch (e: any) {
      setError(e?.message || "Registration failed. Try again.");
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
        <TouchableOpacity onPress={() => router.replace("/nagarsevak/login" as any)} style={styles.backBtn} activeOpacity={0.8}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity>
        <View style={styles.topBadge}><Feather name="user-plus" size={13} color="white" /><Text style={styles.topBadgeText}>Nagarsevak Registration</Text></View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {step === "form" && <>
              <View style={styles.cardHeader}><View style={styles.headerIcon}><Feather name="clipboard" size={27} color="#EA580C" /></View><Text style={styles.cardTitle}>Register as Nagarsevak</Text><Text style={styles.cardSub}>Submit once. Super Admin approval is required before login.</Text></View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Field label="FULL NAME *"><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="As per official records" placeholderTextColor="#CBD5E1" autoCapitalize="words" /></Field>
              <Field label="DATE OF BIRTH *"><TextInput style={styles.input} value={dob} onChangeText={(v) => setDob(formatDob(v))} placeholder="DD-MM-YYYY" placeholderTextColor="#CBD5E1" keyboardType="number-pad" maxLength={10} /></Field>
              <Field label="MOBILE NUMBER *"><View style={styles.phoneRow}><View style={styles.countryCode}><Text style={styles.countryCodeText}>+91</Text></View><TextInput style={[styles.input, { flex: 1, borderWidth: 0, borderRadius: 0 }]} value={mobile} onChangeText={setMobile} placeholder="10-digit mobile" placeholderTextColor="#CBD5E1" keyboardType="phone-pad" maxLength={10} /></View></Field>
              <Field label="WARD *"><TouchableOpacity style={[styles.input, styles.wardPicker]} onPress={() => setWardModal(true)} activeOpacity={0.8}><Text style={[styles.wardPickerText, !ward && { color: "#CBD5E1" }]}>{ward || "Select your ward"}</Text>{checkingWard ? <ActivityIndicator size="small" color="#EA580C" /> : ward ? <View style={[styles.wardBadge, { backgroundColor: wardAvailable === false ? "#FEE2E2" : "#D1FAE5" }]}><Feather name={wardAvailable === false ? "x" : "check"} size={11} color={wardAvailable === false ? "#DC2626" : "#059669"} /><Text style={[styles.wardBadgeText, { color: wardAvailable === false ? "#DC2626" : "#059669" }]}>{wardAvailable === false ? "Taken" : "Available"}</Text></View> : <Feather name="chevron-down" size={16} color="#94A3B8" />}</TouchableOpacity>{ward && wardAvailable === false && <Text style={styles.wardTakenMsg}>Only approved Nagarsevak can reserve a ward. Try another ward.</Text>}</Field>
              <Field label="CONTACT NUMBER *"><TextInput style={styles.input} value={contactNumber} onChangeText={setContactNumber} placeholder="Public contact number" placeholderTextColor="#CBD5E1" keyboardType="phone-pad" maxLength={10} /></Field>
              <Field label="OFFICE ADDRESS"><TextInput style={[styles.input, styles.textarea]} value={officeAddress} onChangeText={setOfficeAddress} placeholder="Ward office address" placeholderTextColor="#CBD5E1" multiline textAlignVertical="top" /></Field>
              <Field label="RESIDENCE ADDRESS"><TextInput style={[styles.input, styles.textarea]} value={address} onChangeText={setAddress} placeholder="Your residence address" placeholderTextColor="#CBD5E1" multiline textAlignVertical="top" /></Field>
              <View style={styles.noticeCard}><Feather name="info" size={14} color="#D97706" /><Text style={styles.noticeText}>If this mobile already has a pending request, the app will show pending verification and will not submit again.</Text></View>
              <TouchableOpacity style={[styles.primaryBtn, otpSending && { opacity: 0.7 }]} onPress={sendOtp} disabled={otpSending} activeOpacity={0.85}><LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.btnGrad}>{otpSending ? <ActivityIndicator color="white" /> : <><Feather name="send" size={17} color="white" /><Text style={styles.btnText}>Verify Mobile & Submit</Text></>}</LinearGradient></TouchableOpacity>
              <Text style={styles.demoText}>Demo OTP: {DEMO_OTP}</Text>
            </>}
            {step === "otp" && <>
              <View style={styles.cardHeader}><View style={styles.headerIcon}><Feather name="lock" size={27} color="#EA580C" /></View><Text style={styles.cardTitle}>Verify Mobile</Text><Text style={styles.cardSub}>Use 4 digit demo OTP {DEMO_OTP} for +91 {mobile}</Text></View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.otpRow}>{otpDigits.map((digit, idx) => <TextInput key={idx} ref={otpRefs[idx]} style={[styles.otpBox, digit && styles.otpBoxFilled]} value={digit} onChangeText={(v) => setDigit(idx, v)} keyboardType="number-pad" maxLength={1} textAlign="center" />)}</View>
              <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={verifyAndRegister} disabled={loading} activeOpacity={0.85}><LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.btnGrad}>{loading ? <ActivityIndicator color="white" /> : <><Feather name="check" size={17} color="white" /><Text style={styles.btnText}>Submit for Approval</Text></>}</LinearGradient></TouchableOpacity>
              <TouchableOpacity onPress={() => setStep("form")} style={styles.changeBtn}><Text style={styles.changeBtnText}>← Edit details</Text></TouchableOpacity>
            </>}
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={wardModal} transparent animationType="slide" onRequestClose={() => setWardModal(false)}><View style={styles.modalOverlay}><View style={styles.modalSheet}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Select Ward</Text><TouchableOpacity onPress={() => setWardModal(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><TextInput style={styles.searchInput} value={wardSearch} onChangeText={setWardSearch} placeholder="Search ward" placeholderTextColor="#94A3B8" /><FlatList data={filteredWards} keyExtractor={(item) => item} renderItem={({ item }) => <TouchableOpacity style={styles.wardRow} onPress={() => selectWard(item)} activeOpacity={0.8}><Text style={styles.wardRowText}>{item}</Text>{ward === item && <Feather name="check" size={16} color="#EA580C" />}</TouchableOpacity>} /></View></View></Modal>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>;
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
  headerIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  cardTitle: { fontSize: 21, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 6 },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", lineHeight: 18 },
  errorText: { backgroundColor: "#FEE2E2", color: "#991B1B", fontSize: 12, fontFamily: "Inter_400Regular", padding: 10, borderRadius: 10, marginBottom: 14, textAlign: "center" },
  field: { marginBottom: 14 },
  label: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 7 },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", backgroundColor: "#fff" },
  textarea: { minHeight: 72 },
  phoneRow: { flexDirection: "row", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, overflow: "hidden" },
  countryCode: { backgroundColor: "#F8FAFC", paddingHorizontal: 14, justifyContent: "center", borderRightWidth: 1, borderRightColor: "#E2E8F0" },
  countryCodeText: { fontSize: 15, color: "#475569", fontFamily: "Inter_600SemiBold" },
  wardPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wardPickerText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_500Medium" },
  wardBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  wardBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  wardTakenMsg: { marginTop: 6, fontSize: 11, color: "#DC2626", fontFamily: "Inter_400Regular" },
  noticeCard: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 14, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", marginBottom: 14 },
  noticeText: { flex: 1, fontSize: 12, color: "#92400E", fontFamily: "Inter_400Regular", lineHeight: 17 },
  primaryBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnText: { color: "white", fontSize: 15, fontFamily: "Inter_700Bold" },
  demoText: { textAlign: "center", marginTop: 10, color: "#EA580C", fontSize: 12, fontFamily: "Inter_700Bold" },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: 9, marginBottom: 18 },
  otpBox: { width: 48, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", fontSize: 20, fontFamily: "Inter_700Bold", color: "#0F172A" },
  otpBoxFilled: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  changeBtn: { alignItems: "center", marginTop: 14 },
  changeBtnText: { color: "#EA580C", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusWrap: { alignItems: "center", paddingVertical: 18 },
  statusIcon: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  statusTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
  statusMsg: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 18 },
  backToHomeBtn: { backgroundColor: "#EA580C", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  backToHomeBtnText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "78%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { fontSize: 17, color: "#0F172A", fontFamily: "Inter_700Bold" },
  searchInput: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, color: "#0F172A" },
  wardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  wardRowText: { fontSize: 14, color: "#0F172A", fontFamily: "Inter_600SemiBold" },
});
