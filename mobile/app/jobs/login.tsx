import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { JobsUserRole, randomColor, useJobsAuth } from "@/context/JobsAuthContext";

type Tab = "login" | "register";
const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

function cleanPhone(v: string) { return v.replace(/\D/g, "").slice(-10); }
function validName(v: string) { return /^[A-Za-z .'-]{3,80}$/.test(v.trim()); }

export default function JobPortalLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { registerJobs, loginJobs } = useJobsAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [role, setRole] = useState<JobsUserRole>("seeker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [location, setLocation] = useState("");
  const phone10 = useMemo(() => cleanPhone(phone), [phone]);

  const goBack = () => {
    if (router.canGoBack?.()) router.back();
    else router.replace("/portal-select" as any);
  };

  const validate = () => {
    if (phone10.length !== 10) return "Enter a valid 10 digit mobile number.";
    if (tab === "login") return "";
    if (role === "seeker") {
      if (!validName(name)) return "Enter your full name.";
      if (location.trim().length < 3) return "Enter your area or location.";
      return "";
    }
    if (company.trim().length < 3) return "Enter company or shop name.";
    if (!validName(contactPerson)) return "Enter contact person name.";
    if (location.trim().length < 3) return "Enter business area or location.";
    return "";
  };

  const submit = async () => {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setLoading(true); setError("");
    try {
      if (tab === "login") {
        const ok = await loginJobs(phone10, role);
        if (!ok) { setError("Account not found. Please register first."); return; }
      } else if (role === "seeker") {
        await registerJobs({ role: "seeker", name: name.trim(), phone: phone10, avatarColor: randomColor(), location: location.trim(), currentStatus: "unemployed" });
      } else {
        await registerJobs({ role: "employer", name: contactPerson.trim(), phone: phone10, avatarColor: randomColor(), company: company.trim(), contactPerson: contactPerson.trim(), whatsapp: phone10, location: location.trim(), address: location.trim() });
      }
      router.replace("/jobs/(tabs)" as any);
    } catch (e: any) {
      setError(e?.message || "Action failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TopShade height={120} /><DecorativeCircles />
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.84}><Feather name="arrow-left" size={18} color="white" /></TouchableOpacity>
        <View style={s.headCenter}>
          <View style={s.headIcon}><Feather name="briefcase" size={22} color={ORANGE} /></View>
          <View style={s.pill}><Feather name="shield" size={10} color="rgba(255,255,255,0.85)" /><Text style={s.pillText}>CONNECT T JOB PORTAL</Text></View>
          <Text style={s.title}>{tab === "login" ? "Job Login" : "Job Register"}</Text>
          <Text style={s.sub}>Local work and hiring for Ambernath citizens</Text>
        </View>
      </LinearGradient>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <View style={s.segment}>{(["seeker", "employer"] as JobsUserRole[]).map((r) => <TouchableOpacity key={r} style={[s.segmentBtn, role === r && s.segmentActive]} onPress={() => { setRole(r); setError(""); }} activeOpacity={0.9}><Feather name={r === "seeker" ? "user" : "briefcase"} size={14} color={role === r ? "white" : ORANGE} /><Text style={[s.segmentText, role === r && s.segmentTextActive]}>{r === "seeker" ? "Job Seeker" : "Employer"}</Text></TouchableOpacity>)}</View>
            <View style={s.tabWrap}>{(["login", "register"] as Tab[]).map((t) => <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => { setTab(t); setError(""); }} activeOpacity={0.9}><Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === "login" ? "Login" : "Register"}</Text></TouchableOpacity>)}</View>
            <Section title={tab === "login" ? "Mobile Login" : role === "seeker" ? "Basic Job Seeker Details" : "Basic Employer Details"} />
            {tab === "register" && role === "seeker" && <Input label="Full Name *" value={name} onChangeText={setName} placeholder="Your full name" />}
            {tab === "register" && role === "employer" && <><Input label="Company / Shop Name *" value={company} onChangeText={setCompany} placeholder="Company / shop name" /><Input label="Contact Person *" value={contactPerson} onChangeText={setContactPerson} placeholder="Owner / HR / manager" /></>}
            <View style={s.inputGroup}><Text style={s.label}>Mobile Number *</Text><View style={s.phoneRow}><View style={s.countryBox}><Text style={s.countryText}>+91</Text></View><TextInput value={phone} onChangeText={(v) => setPhone(cleanPhone(v))} placeholder="10 digit mobile number" keyboardType="phone-pad" maxLength={10} style={s.phoneInput} placeholderTextColor="#94A3B8" /></View></View>
            {tab === "register" && <Input label={role === "seeker" ? "Area / Location *" : "Business Area / Location *"} value={location} onChangeText={setLocation} placeholder="Ambernath East / West" />}
            {tab === "register" && <View style={s.infoBox}><Feather name="info" size={15} color={ORANGE} /><Text style={s.infoText}>Complete photo, DOB, skills, company details and resume from Profile after login.</Text></View>}
            {!!error && <View style={s.errorBox}><Feather name="alert-circle" size={16} color="#DC2626" /><Text style={s.errorText}>{error}</Text></View>}
            <TouchableOpacity style={[s.primaryBtn, loading && s.primaryBtnDisabled]} disabled={loading} onPress={submit} activeOpacity={0.9}><Text style={s.primaryText}>{loading ? "Please wait..." : tab === "login" ? "Continue" : "Create Account"}</Text><Feather name="arrow-right" size={18} color="white" /></TouchableOpacity>
            <Text style={s.note}>{tab === "login" ? "Use your registered mobile number." : "Only basic details now. Full profile can be completed later."}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Section({ title }: { title: string }) { return <View style={s.sectionRow}><View style={s.sectionDot} /><Text style={s.sectionTitle}>{title}</Text></View>; }
function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, style, ...rest } = props; return <View style={s.inputGroup}><Text style={s.label}>{label}</Text><TextInput {...rest} style={[s.input, style]} placeholderTextColor="#94A3B8" /></View>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  headCenter: { alignItems: "center" },
  headIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6, marginBottom: 12 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 },
  pillText: { color: "white", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  title: { fontSize: 24, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900", letterSpacing: -0.4, marginBottom: 4 },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.78)", textAlign: "center", fontFamily: "Inter_400Regular" },
  content: { padding: 16 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 14, shadowColor: DARK, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, borderWidth: 1, borderColor: "rgba(255,237,213,0.8)" },
  segment: { flexDirection: "row", backgroundColor: "#FFF7ED", padding: 4, borderRadius: 16, borderWidth: 1, borderColor: "#FED7AA", marginBottom: 10 },
  segmentBtn: { flex: 1, borderRadius: 12, paddingVertical: 9, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 },
  segmentActive: { backgroundColor: ORANGE },
  segmentText: { fontSize: 12, color: ORANGE, fontFamily: "Inter_700Bold" },
  segmentTextActive: { color: "white" },
  tabWrap: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 16, padding: 4, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 12 }, tabActive: { backgroundColor: "white", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_700Bold" }, tabTextActive: { color: ORANGE },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4, marginBottom: 10 }, sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE }, sectionTitle: { fontSize: 13, color: "#0F172A", fontFamily: "Inter_700Bold" },
  inputGroup: { marginBottom: 11 }, label: { fontSize: 11, color: "#334155", fontFamily: "Inter_700Bold", marginBottom: 6 },
  input: { height: 48, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 13, color: "#0F172A", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  phoneRow: { flexDirection: "row", gap: 9 }, countryBox: { width: 68, height: 48, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", alignItems: "center", justifyContent: "center" }, countryText: { fontSize: 13, color: DARK, fontFamily: "Inter_700Bold" },
  phoneInput: { flex: 1, height: 48, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 13, color: "#0F172A", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", padding: 10, borderRadius: 14, marginBottom: 11 }, infoText: { flex: 1, fontSize: 11, color: "#9A3412", fontFamily: "Inter_500Medium", lineHeight: 15 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", padding: 10, borderRadius: 14, marginBottom: 11 }, errorText: { flex: 1, fontSize: 12, color: "#DC2626", fontFamily: "Inter_600SemiBold" },
  primaryBtn: { height: 52, backgroundColor: ORANGE, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, shadowColor: DARK, shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, primaryBtnDisabled: { opacity: 0.6 }, primaryText: { fontSize: 14, color: "white", fontFamily: "Inter_700Bold" },
  note: { fontSize: 11, color: "#64748B", textAlign: "center", marginTop: 11, fontFamily: "Inter_500Medium" },
});
