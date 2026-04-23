import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useJobsAuth, JobsUserRole, randomColor } from "@/context/JobsAuthContext";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";

type AuthTab = "login" | "register";
type Step = "form" | "otp" | "success";

const ROLES: { id: JobsUserRole; icon: string; label: string; sub: string }[] = [
  { id: "seeker", icon: "user", label: "Job Seeker", sub: "Find jobs in Ambernath" },
  { id: "employer", icon: "briefcase", label: "Employer", sub: "Post jobs & hire talent" },
];

const AGE_OPTIONS = Array.from({ length: 43 }, (_, i) => String(i + 18));

const QUALIFICATION_OPTIONS = [
  "Below 10th",
  "10th Pass (SSC)",
  "12th Pass (HSC)",
  "ITI Certificate",
  "Diploma",
  "B.A (Arts)",
  "B.Com (Commerce)",
  "B.Sc (Science)",
  "B.E / B.Tech (Engineering)",
  "BBA",
  "BCA",
  "M.A / M.Com / M.Sc",
  "M.E / M.Tech",
  "MBA",
  "MCA",
  "PhD",
  "Other",
];

const LOCATION_OPTIONS = [
  "Ambernath East",
  "Ambernath West",
  "MIDC Ambernath",
  "Shivaji Chowk",
  "Station Area East",
  "Station Area West",
  "Old Ambernath",
  "New Ambernath",
  "Vithalwadi",
  "Shelar Colony",
  "Gupte Colony",
  "Udayanagar",
  "Vallabhwadi",
  "Sahakar Nagar",
  "Gopini",
  "Chikhloli",
  "Badlapur",
  "Ulhasnagar",
  "Other",
];

interface DropdownPickerProps {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onSelect: (val: string) => void;
  required?: boolean;
}

function DropdownPicker({ label, value, options, placeholder, onSelect, required }: DropdownPickerProps) {
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const insets = useSafeAreaInsets();

  const handleSelect = (opt: string) => {
    if (opt === "Other") {
      setManualMode(true);
      setOpen(false);
    } else {
      onSelect(opt);
      setOpen(false);
      setManualMode(false);
    }
  };

  const handleManualDone = () => {
    if (manualText.trim()) {
      onSelect(manualText.trim());
      setManualMode(false);
    }
  };

  return (
    <View style={dd.wrap}>
      <Text style={dd.label}>{label}{required && <Text style={{ color: "#DC2626" }}> *</Text>}</Text>

      {!manualMode ? (
        <TouchableOpacity style={dd.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
          <Text style={[dd.triggerText, !value && dd.placeholder]}>
            {value || placeholder || `Select ${label}`}
          </Text>
          <Feather name="chevron-down" size={16} color="#94A3B8" />
        </TouchableOpacity>
      ) : (
        <View style={dd.manualRow}>
          <TextInput
            style={[dd.trigger, { flex: 1 }]}
            value={manualText}
            onChangeText={setManualText}
            placeholder={`Type ${label.toLowerCase()}…`}
            placeholderTextColor="#CBD5E1"
          />
          <TouchableOpacity style={dd.doneBtn} onPress={handleManualDone}>
            <Feather name="check" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={dd.cancelBtn} onPress={() => setManualMode(false)}>
            <Feather name="x" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      {value && !manualMode && (
        <TouchableOpacity onPress={() => { setManualMode(true); setManualText(value); }} style={dd.editLink}>
          <Feather name="edit-2" size={10} color="#EA580C" />
          <Text style={dd.editLinkText}>Type manually instead</Text>
        </TouchableOpacity>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={dd.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[dd.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={dd.sheetHeader}>
              <Text style={dd.sheetTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(o) => o}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[dd.option, item === value && dd.optionActive, item === "Other" && dd.optionOther]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  {item === "Other" ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Feather name="edit-3" size={14} color="#EA580C" />
                      <Text style={[dd.optionText, { color: "#EA580C" }]}>Other (type manually)</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={[dd.optionText, item === value && dd.optionTextActive]}>{item}</Text>
                      {item === value && <Feather name="check" size={14} color="#EA580C" />}
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function JobsLoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { registerJobs, loginJobs } = useJobsAuth();

  const [tab, setTab] = useState<AuthTab>("login");
  const [role, setRole] = useState<JobsUserRole>("seeker");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  // Seeker-specific
  const [age, setAge] = useState("");
  const [qualification, setQualification] = useState("");
  const [skills, setSkills] = useState("");

  // Employer-specific
  const [company, setCompany] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");

  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const setOtpDigit = (i: number, val: string) => {
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 3) otpRefs[i + 1]?.current?.focus();
  };

  const validateSeeker = () => {
    if (!name.trim()) return "Full name is required.";
    if (!age) return "Please select your age.";
    if (phone.length !== 10) return "Enter a valid 10-digit mobile number.";
    if (!qualification) return "Please select your qualification.";
    return null;
  };

  const validateEmployer = () => {
    if (!name.trim()) return "Full name is required.";
    if (!company.trim()) return "Company name is required.";
    if (!location) return "Please select your location.";
    if (!email.trim() || !email.includes("@")) return "Enter a valid email address.";
    if (phone.length !== 10) return "Enter a valid 10-digit mobile number.";
    return null;
  };

  const handleSendOtp = () => {
    setError("");
    if (tab === "register") {
      const err = role === "seeker" ? validateSeeker() : validateEmployer();
      if (err) { setError(err); return; }
    } else {
      if (phone.length !== 10) { setError("Enter a valid 10-digit mobile number."); return; }
    }
    setStep("otp");
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 4) { setError("Enter the 4-digit OTP."); return; }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 800));
    try {
      if (tab === "register") {
        await registerJobs({
          name: name.trim(),
          phone,
          role,
          age: age || undefined,
          qualification: qualification || undefined,
          skills: skills.trim() || undefined,
          company: company.trim() || undefined,
          gstNo: gstNo.trim() || undefined,
          email: email.trim() || undefined,
          location: location || undefined,
          avatarColor: randomColor(),
        });
      } else {
        const ok = await loginJobs(phone, role);
        if (!ok) {
          setError("No account found. Please register first.");
          setStep("form");
          setTab("register");
          setLoading(false);
          return;
        }
      }
      setStep("success");
      setTimeout(() => router.replace("/jobs/(tabs)" as any), 1200);
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const switchTab = (t: AuthTab) => {
    setTab(t); setStep("form"); setError(""); setOtp(["", "", "", ""]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFF7ED" }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: (Platform.OS === "web" ? 44 : insets.top) + 20, overflow: "hidden" }]}
        >
          <TopShade height={120} />
          <DecorativeCircles />
          <Text style={styles.headerTitle}>Connect T Jobs</Text>
          <Text style={styles.headerSub}>Ambernath's #1 Local Job Portal</Text>
        </LinearGradient>

        <View style={styles.card}>
          {step === "success" ? (
            <View style={styles.successWrap}>
              <View style={styles.successCircle}>
                <Feather name="check" size={36} color="white" />
              </View>
              <Text style={styles.successTitle}>Welcome!</Text>
              <Text style={styles.successSub}>Taking you to the job portal…</Text>
            </View>
          ) : (
            <>
              <Text style={styles.cardTitle}>{tab === "login" ? "Welcome Back" : "Create Account"}</Text>

              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.roleCard, role === r.id && styles.roleCardActive]}
                    onPress={() => setRole(r.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.roleIcon, role === r.id && styles.roleIconActive]}>
                      <Feather name={r.icon as any} size={20} color={role === r.id ? "white" : "#EA580C"} />
                    </View>
                    <Text style={[styles.roleLabel, role === r.id && styles.roleLabelActive]}>{r.label}</Text>
                    <Text style={[styles.roleSub, role === r.id && { color: "rgba(255,255,255,0.75)" }]}>{r.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tabRow}>
                {(["login", "register"] as AuthTab[]).map((t) => (
                  <TouchableOpacity key={t} style={[styles.tabItem, tab === t && styles.tabActive]} onPress={() => switchTab(t)}>
                    <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                      {t === "login" ? "Login" : "Register"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {step === "form" && (
                <>
                  {tab === "register" && role === "seeker" && (
                    <>
                      <View style={styles.sectionBanner}>
                        <Feather name="user" size={13} color="#EA580C" />
                        <Text style={styles.sectionBannerText}>Job Seeker Details</Text>
                      </View>

                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Full Name <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <TextInput
                          style={styles.input}
                          value={name}
                          onChangeText={setName}
                          placeholder="e.g. Ramesh Patil"
                          placeholderTextColor="#CBD5E1"
                          autoCapitalize="words"
                        />
                      </View>

                      <DropdownPicker
                        label="Age"
                        value={age}
                        options={AGE_OPTIONS}
                        placeholder="Select your age"
                        onSelect={setAge}
                        required
                      />

                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Mobile Number <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <View style={styles.phoneRow}>
                          <View style={styles.phoneCode}><Text style={styles.phoneCodeText}>+91</Text></View>
                          <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={phone}
                            onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                            placeholder="XXXXX XXXXX"
                            placeholderTextColor="#CBD5E1"
                            keyboardType="phone-pad"
                            maxLength={10}
                          />
                        </View>
                      </View>

                      <DropdownPicker
                        label="Qualification"
                        value={qualification}
                        options={QUALIFICATION_OPTIONS}
                        placeholder="Select highest qualification"
                        onSelect={setQualification}
                        required
                      />

                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Skills <Text style={styles.optional}>(optional)</Text></Text>
                        <TextInput
                          style={styles.input}
                          value={skills}
                          onChangeText={setSkills}
                          placeholder="e.g. Welding, MS Office, Driving"
                          placeholderTextColor="#CBD5E1"
                        />
                        <Text style={styles.hint}>Separate multiple skills with commas</Text>
                      </View>
                    </>
                  )}

                  {tab === "register" && role === "employer" && (
                    <>
                      <View style={styles.sectionBanner}>
                        <Feather name="briefcase" size={13} color="#EA580C" />
                        <Text style={styles.sectionBannerText}>Employer Registration</Text>
                      </View>

                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Full Name <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <TextInput
                          style={styles.input}
                          value={name}
                          onChangeText={setName}
                          placeholder="Contact person full name"
                          placeholderTextColor="#CBD5E1"
                          autoCapitalize="words"
                        />
                      </View>

                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Company Name <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <TextInput
                          style={styles.input}
                          value={company}
                          onChangeText={setCompany}
                          placeholder="e.g. XYZ Manufacturing Pvt Ltd"
                          placeholderTextColor="#CBD5E1"
                          autoCapitalize="words"
                        />
                      </View>

                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>GST Number <Text style={styles.optional}>(optional)</Text></Text>
                        <TextInput
                          style={styles.input}
                          value={gstNo}
                          onChangeText={(t) => setGstNo(t.toUpperCase())}
                          placeholder="e.g. 27AABCU9603R1ZN"
                          placeholderTextColor="#CBD5E1"
                          autoCapitalize="characters"
                          maxLength={15}
                        />
                        <Text style={styles.hint}>15-digit GST Identification Number</Text>
                      </View>

                      <DropdownPicker
                        label="Business Location"
                        value={location}
                        options={LOCATION_OPTIONS}
                        placeholder="Select your area"
                        onSelect={setLocation}
                        required
                      />

                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Email Address <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <TextInput
                          style={styles.input}
                          value={email}
                          onChangeText={setEmail}
                          placeholder="company@email.com"
                          placeholderTextColor="#CBD5E1"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>

                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Mobile Number <Text style={{ color: "#DC2626" }}>*</Text></Text>
                        <View style={styles.phoneRow}>
                          <View style={styles.phoneCode}><Text style={styles.phoneCodeText}>+91</Text></View>
                          <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={phone}
                            onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                            placeholder="XXXXX XXXXX"
                            placeholderTextColor="#CBD5E1"
                            keyboardType="phone-pad"
                            maxLength={10}
                          />
                        </View>
                      </View>
                    </>
                  )}

                  {tab === "login" && (
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputLabel}>Mobile Number <Text style={{ color: "#DC2626" }}>*</Text></Text>
                      <View style={styles.phoneRow}>
                        <View style={styles.phoneCode}><Text style={styles.phoneCodeText}>+91</Text></View>
                        <TextInput
                          style={[styles.input, { flex: 1, marginBottom: 0 }]}
                          value={phone}
                          onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                          placeholder="XXXXX XXXXX"
                          placeholderTextColor="#CBD5E1"
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </View>
                    </View>
                  )}

                  {!!error && <Text style={styles.error}>{error}</Text>}

                  <TouchableOpacity style={styles.btn} onPress={handleSendOtp} activeOpacity={0.85}>
                    <LinearGradient colors={["#047857", "#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                      <Text style={styles.btnText}>Send OTP</Text>
                      <Feather name="arrow-right" size={18} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {step === "otp" && (
                <>
                  <Text style={styles.otpHint}>Enter the 4-digit OTP sent to +91 {phone}</Text>
                  <View style={styles.otpRow}>
                    {otp.map((d, i) => (
                      <TextInput
                        key={i}
                        ref={otpRefs[i]}
                        style={[styles.otpBox, d && styles.otpBoxFilled]}
                        value={d}
                        onChangeText={(v) => setOtpDigit(i, v.replace(/\D/g, "").slice(-1))}
                        keyboardType="number-pad"
                        maxLength={1}
                      />
                    ))}
                  </View>
                  <Text style={styles.otpDemoNote}>Demo: any 4 digits work</Text>

                  {!!error && <Text style={styles.error}>{error}</Text>}

                  <TouchableOpacity style={styles.btn} onPress={handleVerifyOtp} activeOpacity={0.85} disabled={loading}>
                    <LinearGradient colors={["#047857", "#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                      {loading ? <ActivityIndicator color="white" /> : (
                        <>
                          <Text style={styles.btnText}>Verify & Continue</Text>
                          <Feather name="check" size={18} color="white" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => { setStep("form"); setOtp(["", "", "", ""]); setError(""); }}
                    style={{ alignSelf: "center", marginTop: 10 }}
                  >
                    <Text style={styles.backLink}>← Change number</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        <View style={styles.backBtn}>
          <TouchableOpacity onPress={() => router.replace("/portal-select" as any)} style={styles.backPill}>
            <Feather name="arrow-left" size={14} color="#EA580C" />
            <Text style={styles.backPillText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 32 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 4 },

  card: { backgroundColor: "white", borderRadius: 28, margin: 16, marginTop: -20, padding: 24, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 18, textAlign: "center" },

  roleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  roleCard: { flex: 1, borderRadius: 14, borderWidth: 2, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", padding: 12, alignItems: "center", gap: 6 },
  roleCardActive: { borderColor: "#EA580C", backgroundColor: "#EA580C" },
  roleIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFEDD5", alignItems: "center", justifyContent: "center" },
  roleIconActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  roleLabel: { fontSize: 13, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_700Bold" },
  roleLabelActive: { color: "white" },
  roleSub: { fontSize: 10, color: "#92400E", fontFamily: "Inter_400Regular", textAlign: "center" },

  tabRow: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3, marginBottom: 20 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: "white", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabText: { fontSize: 14, color: "#64748B", fontFamily: "Inter_500Medium" },
  tabTextActive: { color: "#EA580C", fontFamily: "Inter_700Bold" },

  sectionBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#FFF7ED", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: "#EA580C" },
  sectionBannerText: { fontSize: 13, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_700Bold" },

  inputWrap: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  optional: { fontSize: 11, color: "#94A3B8", fontWeight: "400", fontFamily: "Inter_400Regular" },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular" },
  hint: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 4 },
  phoneRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  phoneCode: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  phoneCodeText: { fontSize: 15, color: "#0F172A", fontFamily: "Inter_600SemiBold" },

  btn: { borderRadius: 14, overflow: "hidden", marginTop: 6 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 8 },
  btnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  otpHint: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 16 },
  otpRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 8 },
  otpBox: { width: 56, height: 60, borderRadius: 14, borderWidth: 2, borderColor: "#E2E8F0", fontSize: 24, fontWeight: "700", color: "#0F172A", backgroundColor: "#F8FAFC", fontFamily: "Inter_700Bold", textAlign: "center", textAlignVertical: "center", paddingVertical: 0, includeFontPadding: false, lineHeight: 60 },
  otpBoxFilled: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  otpDemoNote: { fontSize: 11, color: "#94A3B8", textAlign: "center", marginBottom: 14, fontFamily: "Inter_400Regular" },

  error: { fontSize: 13, color: "#DC2626", fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 10, backgroundColor: "#FEE2E2", padding: 10, borderRadius: 8 },
  backLink: { fontSize: 13, color: "#EA580C", fontFamily: "Inter_400Regular" },

  successWrap: { alignItems: "center", paddingVertical: 32, gap: 12 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular" },

  backBtn: { alignItems: "center", paddingBottom: 32 },
  backPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#FED7AA" },
  backPillText: { fontSize: 13, color: "#EA580C", fontFamily: "Inter_600SemiBold" },
});

const dd = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  trigger: {
    backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
  },
  triggerText: { fontSize: 15, color: "#0F172A", fontFamily: "Inter_400Regular", flex: 1 },
  placeholder: { color: "#CBD5E1" },
  manualRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  doneBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center" },
  cancelBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  editLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  editLinkText: { fontSize: 10, color: "#EA580C", fontFamily: "Inter_400Regular" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: 480 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  option: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  optionActive: { backgroundColor: "#FFF7ED" },
  optionOther: { borderTopWidth: 1, borderTopColor: "#FED7AA", marginTop: 4 },
  optionText: { fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular" },
  optionTextActive: { color: "#EA580C", fontFamily: "Inter_700Bold" },
});
