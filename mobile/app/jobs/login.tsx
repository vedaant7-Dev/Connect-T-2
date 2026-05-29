import React, { useMemo, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { CurrentStatus, JobsUserRole, randomColor, useJobsAuth } from "@/context/JobsAuthContext";

type Tab = "login" | "register";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function validName(value: string) {
  return /^[A-Za-z .'-]{3,80}$/.test(value.trim());
}

function isoDob(day: string, month: string, year: string) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function validDob(day: string, month: string, year: string) {
  const d = Number(day), m = Number(month), y = Number(year);
  const maxYear = new Date().getFullYear() - 14;
  if (!d || !m || !y || y < 1940 || y > maxYear || m < 1 || m > 12) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export default function JobPortalLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { registerJobs, loginJobs } = useJobsAuth();

  const [tab, setTab] = useState<Tab>("login");
  const [role, setRole] = useState<JobsUserRole>("seeker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>();

  const [name, setName] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [qualification, setQualification] = useState("");
  const [skills, setSkills] = useState("");
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>("unemployed");
  const [experience, setExperience] = useState("");
  const [languages, setLanguages] = useState("");
  const [about, setAbout] = useState("");

  const [company, setCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [industry, setIndustry] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  const phone10 = useMemo(() => cleanPhone(phone), [phone]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow gallery access to upload profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      base64: false,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setProfilePhoto(result.assets[0].uri);
  };

  const validate = () => {
    if (phone10.length !== 10) return "Enter a valid 10 digit mobile number.";
    if (tab === "login") return "";
    if (role === "seeker") {
      if (!validName(name)) return "Enter a valid full name.";
      if (!validDob(dobDay, dobMonth, dobYear)) return "Select a valid DOB. Minimum age is 14 years.";
      if (email.trim() && !EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
      if (location.trim().length < 3) return "Enter your location.";
      if (about.trim() && (words(about) < 5 || words(about) > 80)) return "About must be 5 to 80 words.";
      return "";
    }
    if (company.trim().length < 3) return "Enter a valid company name.";
    if (!validName(contactPerson)) return "Enter a valid contact person name.";
    if (companyEmail.trim() && !EMAIL_RE.test(companyEmail.trim())) return "Enter a valid email address.";
    if (address.trim().length < 8) return "Enter a proper company address.";
    if (companyDescription.trim() && (words(companyDescription) < 5 || words(companyDescription) > 100)) return "Company description must be 5 to 100 words.";
    return "";
  };

  const submit = async () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (tab === "login") {
        const ok = await loginJobs(phone10, role);
        if (!ok) {
          setError("Account not found. Please register first.");
          return;
        }
      } else if (role === "seeker") {
        await registerJobs({
          role: "seeker",
          name: name.trim(),
          dob: isoDob(dobDay, dobMonth, dobYear),
          phone: phone10,
          email: email.trim() || undefined,
          avatarColor: randomColor(),
          profilePhoto,
          location: location.trim(),
          qualification: qualification.trim() || undefined,
          skills: skills.trim() || undefined,
          currentStatus,
          experience: experience.trim() || undefined,
          languages: languages.trim() || undefined,
          about: about.trim() || undefined,
        });
      } else {
        await registerJobs({
          role: "employer",
          name: contactPerson.trim(),
          phone: phone10,
          email: companyEmail.trim() || undefined,
          avatarColor: randomColor(),
          profilePhoto,
          company: company.trim(),
          contactPerson: contactPerson.trim(),
          whatsapp: cleanPhone(whatsapp || phone),
          industry: industry.trim() || undefined,
          gstNo: gstNo.trim() || undefined,
          address: address.trim(),
          pincode: pincode.trim() || undefined,
          companyDescription: companyDescription.trim() || undefined,
        });
      }
      router.replace("/jobs/(tabs)" as any);
    } catch (e: any) {
      setError(e?.message || "Action failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#064E3B", "#047857", "#059669", "#10B981"]} style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Feather name="arrow-left" size={18} color="#047857" />
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>

          <View style={s.header}>
            <View style={s.logo}><Feather name="briefcase" size={24} color="#ECFDF5" /></View>
            <View style={s.headerPill}><Text style={s.headerPillText}>CONNECT T JOB PORTAL</Text></View>
            <Text style={s.title}>Local Jobs</Text>
            <Text style={s.subtitle}>Trusted work opportunities for Ambernath citizens</Text>
          </View>

          <View style={s.card}>
            <View style={s.segment}>
              {(["seeker", "employer"] as JobsUserRole[]).map((item) => (
                <TouchableOpacity key={item} style={[s.segmentBtn, role === item && s.segmentBtnActive]} onPress={() => setRole(item)} activeOpacity={0.9}>
                  <Feather name={item === "seeker" ? "user" : "briefcase"} size={15} color={role === item ? "#FFFFFF" : "#047857"} />
                  <Text style={[s.segmentText, role === item && s.segmentTextActive]}>{item === "seeker" ? "Job Seeker" : "Employer"}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.tabWrap}>
              {(["login", "register"] as Tab[]).map((item) => (
                <TouchableOpacity key={item} style={[s.tab, tab === item && s.tabActive]} onPress={() => { setTab(item); setError(""); }} activeOpacity={0.9}>
                  <Text style={[s.tabText, tab === item && s.tabTextActive]}>{item === "login" ? "Login" : "Register"}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === "register" && <PhotoPicker uri={profilePhoto} role={role} onPress={pickPhoto} />}

            {tab === "register" && role === "seeker" && (
              <>
                <Section title="Job Seeker Details" />
                <Input label="Full Name *" value={name} onChangeText={setName} placeholder="Your full name" />
                <DobInput day={dobDay} month={dobMonth} year={dobYear} setDay={setDobDay} setMonth={setDobMonth} setYear={setDobYear} />
              </>
            )}

            {tab === "register" && role === "employer" && (
              <>
                <Section title="Employer Registration" />
                <Input label="Company Name *" value={company} onChangeText={setCompany} placeholder="Company / Shop / Business name" />
                <Input label="Contact Person *" value={contactPerson} onChangeText={setContactPerson} placeholder="Owner / HR / Manager name" />
              </>
            )}

            <Section title={tab === "login" ? "Login Details" : "Contact Details"} />
            <View style={s.phoneRow}>
              <View style={s.countryBox}><Text style={s.countryText}>IN +91</Text></View>
              <TextInput value={phone} onChangeText={(v) => setPhone(cleanPhone(v))} placeholder="10 digit mobile number" keyboardType="phone-pad" maxLength={10} style={s.phoneInput} placeholderTextColor="#94A3B8" />
            </View>

            {tab === "register" && role === "seeker" && (
              <>
                <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
                <Input label="Location *" value={location} onChangeText={setLocation} placeholder="Ambernath East / West" />
                <Input label="Qualification" value={qualification} onChangeText={setQualification} placeholder="10th, 12th, ITI, Graduate..." />
                <Input label="Skills" value={skills} onChangeText={setSkills} placeholder="Computer, Sales, Driving, Welding..." />
                <Text style={s.label}>Current Status</Text>
                <View style={s.statusGrid}>{(["unemployed", "employed", "student", "fresher"] as CurrentStatus[]).map((item) => <TouchableOpacity key={item} style={[s.statusChip, currentStatus === item && s.statusChipActive]} onPress={() => setCurrentStatus(item)}><Text style={[s.statusChipText, currentStatus === item && s.statusChipTextActive]}>{item}</Text></TouchableOpacity>)}</View>
                <Input label="Experience" value={experience} onChangeText={setExperience} placeholder="Fresher / 1 year / 3 years..." />
                <Input label="Languages Known" value={languages} onChangeText={setLanguages} placeholder="Marathi, Hindi, English..." />
                <Input label="About / Objective" value={about} onChangeText={setAbout} placeholder="Brief career objective" multiline />
                <Text style={s.helperText}>{words(about)} / 80 words</Text>
              </>
            )}

            {tab === "register" && role === "employer" && (
              <>
                <Input label="Email Address" value={companyEmail} onChangeText={setCompanyEmail} placeholder="company@email.com" keyboardType="email-address" autoCapitalize="none" />
                <Input label="WhatsApp Number" value={whatsapp} onChangeText={(v) => setWhatsapp(cleanPhone(v))} placeholder="WhatsApp contact" keyboardType="phone-pad" maxLength={10} />
                <Input label="Industry" value={industry} onChangeText={setIndustry} placeholder="Manufacturing, Retail, IT..." />
                <Input label="GST Number" value={gstNo} onChangeText={setGstNo} placeholder="Optional GST / business registration" autoCapitalize="characters" />
                <Input label="Full Address *" value={address} onChangeText={setAddress} placeholder="Company full address" multiline />
                <Input label="Pincode" value={pincode} onChangeText={setPincode} placeholder="421501" keyboardType="number-pad" maxLength={6} />
                <Input label="Company Description" value={companyDescription} onChangeText={setCompanyDescription} placeholder="Minimum 5 words, maximum 100 words" multiline />
                <Text style={s.helperText}>{words(companyDescription)} / 100 words</Text>
              </>
            )}

            {!!error && <View style={s.errorBox}><Feather name="alert-circle" size={16} color="#DC2626" /><Text style={s.errorText}>{error}</Text></View>}
            <TouchableOpacity style={[s.primaryBtn, loading && s.primaryBtnDisabled]} disabled={loading} onPress={submit} activeOpacity={0.9}>
              <Text style={s.primaryText}>{loading ? "Please wait..." : tab === "login" ? "Continue" : "Create Account"}</Text>
              <Feather name="arrow-right" size={19} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={s.note}>{tab === "login" ? "Login with your registered mobile number." : "Your Job Portal data is saved in Connect T MySQL database."}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Section({ title }: { title: string }) {
  return <View style={s.sectionRow}><View style={s.sectionDot} /><Text style={s.sectionTitle}>{title}</Text></View>;
}

function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, style, ...rest } = props;
  return <View style={s.inputGroup}><Text style={s.label}>{label}</Text><TextInput {...rest} multiline={multiline} style={[s.input, multiline && s.textArea, style]} placeholderTextColor="#94A3B8" /></View>;
}

function PhotoPicker({ uri, role, onPress }: { uri?: string; role: JobsUserRole; onPress: () => void }) {
  return <TouchableOpacity style={s.photoRow} onPress={onPress} activeOpacity={0.88}>{uri ? <Image source={{ uri }} style={s.photo} /> : <View style={s.photoEmpty}><Feather name="camera" size={18} color="#047857" /></View>}<View style={{ flex: 1 }}><Text style={s.photoTitle}>{role === "employer" ? "Upload company logo" : "Upload profile photo"}</Text><Text style={s.photoSub}>Recommended for a trusted professional profile</Text></View><Feather name="chevron-right" size={18} color="#94A3B8" /></TouchableOpacity>;
}

function DobInput({ day, month, year, setDay, setMonth, setYear }: { day: string; month: string; year: string; setDay: (v: string) => void; setMonth: (v: string) => void; setYear: (v: string) => void }) {
  return <View style={s.inputGroup}><Text style={s.label}>Date of Birth *</Text><View style={s.dobRow}><TextInput value={day} onChangeText={(v) => setDay(v.replace(/\D/g, "").slice(0, 2))} placeholder="DD" keyboardType="number-pad" maxLength={2} style={s.dobInput} placeholderTextColor="#94A3B8" /><TextInput value={month} onChangeText={(v) => setMonth(v.replace(/\D/g, "").slice(0, 2))} placeholder="MM" keyboardType="number-pad" maxLength={2} style={s.dobInput} placeholderTextColor="#94A3B8" /><TextInput value={year} onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))} placeholder="YYYY" keyboardType="number-pad" maxLength={4} style={[s.dobInput, { flex: 1.35 }]} placeholderTextColor="#94A3B8" /></View><Text style={s.helperText}>Same DOB format as citizen registration: DD / MM / YYYY</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1 }, content: { paddingHorizontal: 18 },
  backBtn: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, marginBottom: 18 },
  backText: { fontSize: 13, color: "#047857", fontFamily: "Inter_700Bold" }, header: { alignItems: "center", marginBottom: 18 },
  logo: { width: 62, height: 62, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", marginBottom: 12 },
  headerPill: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", paddingHorizontal: 12, paddingVertical: 6, marginBottom: 9 },
  headerPillText: { color: "white", fontSize: 10, letterSpacing: 1, fontFamily: "Inter_800ExtraBold" }, title: { fontSize: 32, color: "#FFFFFF", fontFamily: "Inter_800ExtraBold", letterSpacing: -0.8 }, subtitle: { marginTop: 5, fontSize: 13, color: "#D1FAE5", fontFamily: "Inter_600SemiBold", textAlign: "center" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 28, padding: 16, shadowColor: "#064E3B", shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  segment: { flexDirection: "row", backgroundColor: "#ECFDF5", padding: 5, borderRadius: 18, borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 12 }, segmentBtn: { flex: 1, borderRadius: 14, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, segmentBtnActive: { backgroundColor: "#047857" }, segmentText: { color: "#047857", fontSize: 13, fontFamily: "Inter_700Bold" }, segmentTextActive: { color: "#FFFFFF" },
  tabWrap: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 18, padding: 5, marginBottom: 14 }, tab: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 14 }, tabActive: { backgroundColor: "#FFFFFF", shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }, tabText: { fontSize: 14, color: "#64748B", fontFamily: "Inter_700Bold" }, tabTextActive: { color: "#047857" },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7, marginBottom: 10 }, sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" }, sectionTitle: { fontSize: 14, color: "#0F172A", fontFamily: "Inter_800ExtraBold" }, inputGroup: { marginBottom: 12 }, label: { fontSize: 13, color: "#334155", fontFamily: "Inter_700Bold", marginBottom: 7 },
  input: { minHeight: 54, backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, color: "#0F172A", fontSize: 15, fontFamily: "Inter_600SemiBold" }, textArea: { minHeight: 92, paddingTop: 14, textAlignVertical: "top" },
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 12 }, countryBox: { width: 92, height: 54, borderRadius: 16, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" }, countryText: { fontSize: 14, color: "#334155", fontFamily: "Inter_800ExtraBold" }, phoneInput: { flex: 1, height: 54, backgroundColor: "#F8FAFC", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, color: "#0F172A", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dobRow: { flexDirection: "row", gap: 10 }, dobInput: { flex: 1, height: 54, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", textAlign: "center", color: "#0F172A", fontSize: 15, fontFamily: "Inter_800ExtraBold" }, helperText: { marginTop: 6, marginBottom: 10, fontSize: 11, color: "#64748B", fontFamily: "Inter_500Medium" },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }, statusChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" }, statusChipActive: { backgroundColor: "#ECFDF5", borderColor: "#10B981" }, statusChipText: { fontSize: 12, color: "#64748B", fontFamily: "Inter_700Bold", textTransform: "capitalize" }, statusChipTextActive: { color: "#047857" },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 14 }, photo: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#D1FAE5" }, photoEmpty: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#A7F3D0" }, photoTitle: { fontSize: 13, color: "#0F172A", fontFamily: "Inter_800ExtraBold" }, photoSub: { marginTop: 2, fontSize: 11, color: "#64748B", fontFamily: "Inter_500Medium" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", padding: 12, borderRadius: 16, marginTop: 4, marginBottom: 12 }, errorText: { flex: 1, fontSize: 12, color: "#B91C1C", fontFamily: "Inter_700Bold", lineHeight: 18 }, primaryBtn: { height: 58, borderRadius: 18, backgroundColor: "#047857", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 4 }, primaryBtnDisabled: { opacity: 0.65 }, primaryText: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_800ExtraBold" }, note: { textAlign: "center", color: "#64748B", fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 12, lineHeight: 16 },
});