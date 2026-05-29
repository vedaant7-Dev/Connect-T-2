import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { useJobsAuth, JobsUserRole, randomColor } from "@/context/JobsAuthContext";

type Tab = "login" | "register";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function validName(value: string) {
  return /^[A-Za-z .'-]{3,80}$/.test(value.trim());
}

function toIsoDob(day: string, month: string, year: string) {
  const dd = day.padStart(2, "0");
  const mm = month.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function isValidDob(day: string, month: string, year: string) {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const nowYear = new Date().getFullYear();

  if (!d || !m || !y) return false;
  if (y < 1940 || y > nowYear - 14) return false;
  if (m < 1 || m > 12) return false;

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

  const [name, setName] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [email, setEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>();
  const [location, setLocation] = useState("");
  const [qualification, setQualification] = useState("");
  const [skills, setSkills] = useState("");

  const [company, setCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [industry, setIndustry] = useState("");
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

    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const goDashboard = () => {
    router.replace("/jobs/(tabs)" as any);
  };

  const validateLogin = () => {
    if (phone10.length !== 10) return "Enter a valid 10 digit mobile number.";
    return "";
  };

  const validateSeeker = () => {
    if (!validName(name)) return "Enter a valid full name.";
    if (!isValidDob(dobDay, dobMonth, dobYear)) return "Select a valid Date of Birth. Minimum age is 14 years.";
    if (phone10.length !== 10) return "Enter a valid 10 digit contact number.";
    if (email.trim() && !EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
    if (location.trim().length < 3) return "Enter your location.";
    return "";
  };

  const validateEmployer = () => {
    if (company.trim().length < 3) return "Enter a valid company name.";
    if (!validName(contactPerson)) return "Enter a valid contact person name.";
    if (phone10.length !== 10) return "Enter a valid 10 digit contact number.";
    if (companyEmail.trim() && !EMAIL_RE.test(companyEmail.trim())) return "Enter a valid email address.";
    if (address.trim().length < 8) return "Enter a proper company address.";
    if (companyDescription.trim() && (wordCount(companyDescription) < 5 || wordCount(companyDescription) > 100)) {
      return "Company description must be minimum 5 words and maximum 100 words.";
    }
    return "";
  };

  const handleLogin = async () => {
    const message = validateLogin();

    if (message) {
      setError(message);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const ok = await loginJobs(phone10, role);

      if (!ok) {
        setError("Account not found. Please register first.");
        return;
      }

      goDashboard();
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const message = role === "seeker" ? validateSeeker() : validateEmployer();

    if (message) {
      setError(message);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (role === "seeker") {
        await registerJobs({
          role: "seeker",
          name: name.trim(),
          dob: toIsoDob(dobDay, dobMonth, dobYear),
          phone: phone10,
          email: email.trim() || undefined,
          avatarColor: randomColor(),
          profilePhoto,
          location: location.trim(),
          qualification: qualification.trim() || undefined,
          skills: skills.trim() || undefined,
          currentStatus: "unemployed",
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
          address: address.trim(),
          pincode: pincode.trim() || undefined,
          companyDescription: companyDescription.trim() || undefined,
        });
      }

      goDashboard();
    } catch (e: any) {
      setError(e?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submit = tab === "login" ? handleLogin : handleRegister;

  return (
    <LinearGradient colors={["#C2410C", "#F97316", "#FB923C"]} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#C2410C" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logo}>
              <Feather name="briefcase" size={24} color="#FFF7ED" />
            </View>
            <Text style={styles.title}>Connect T Jobs</Text>
            <Text style={styles.subtitle}>Trusted local jobs for Ambernath</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.segment}>
              {(["seeker", "employer"] as JobsUserRole[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.segmentBtn, role === item && styles.segmentBtnActive]}
                  onPress={() => setRole(item)}
                >
                  <Feather
                    name={item === "seeker" ? "user" : "briefcase"}
                    size={15}
                    color={role === item ? "#FFFFFF" : "#C2410C"}
                  />
                  <Text style={[styles.segmentText, role === item && styles.segmentTextActive]}>
                    {item === "seeker" ? "Job Seeker" : "Employer"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tabWrap}>
              {(["login", "register"] as Tab[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.tab, tab === item && styles.tabActive]}
                  onPress={() => {
                    setTab(item);
                    setError("");
                  }}
                >
                  <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                    {item === "login" ? "Login" : "Register"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === "register" && (
              <TouchableOpacity style={styles.photoRow} onPress={pickPhoto}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.photo} />
                ) : (
                  <View style={styles.photoEmpty}>
                    <Feather name="camera" size={18} color="#EA580C" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.photoTitle}>
                    {role === "employer" ? "Upload company logo" : "Upload profile photo"}
                  </Text>
                  <Text style={styles.photoSub}>Recommended for professional profile</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {tab === "register" && role === "seeker" && (
              <>
                <SectionTitle title="Job Seeker Details" />
                <Input label="Full Name *" value={name} onChangeText={setName} placeholder="Your full name" />
                <DobInput
                  day={dobDay}
                  month={dobMonth}
                  year={dobYear}
                  setDay={setDobDay}
                  setMonth={setDobMonth}
                  setYear={setDobYear}
                />
              </>
            )}

            {tab === "register" && role === "employer" && (
              <>
                <SectionTitle title="Employer Registration" />
                <Input label="Company Name *" value={company} onChangeText={setCompany} placeholder="Company / Shop / Business name" />
                <Input label="Contact Person *" value={contactPerson} onChangeText={setContactPerson} placeholder="Owner / HR / Manager name" />
              </>
            )}

            <SectionTitle title={tab === "login" ? "Login Details" : "Contact Details"} />
            <View style={styles.phoneRow}>
              <View style={styles.countryBox}>
                <Text style={styles.countryText}>IN +91</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={(v) => setPhone(cleanPhone(v))}
                placeholder="10 digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.phoneInput}
                placeholderTextColor="#94A3B8"
              />
            </View>

            {tab === "register" && role === "seeker" && (
              <>
                <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
                <Input label="Location *" value={location} onChangeText={setLocation} placeholder="Ambernath East / West" />
                <Input label="Qualification" value={qualification} onChangeText={setQualification} placeholder="10th, 12th, ITI, Graduate..." />
                <Input label="Skills" value={skills} onChangeText={setSkills} placeholder="Computer, Sales, Driving, Welding..." />
              </>
            )}

            {tab === "register" && role === "employer" && (
              <>
                <Input label="Email Address" value={companyEmail} onChangeText={setCompanyEmail} placeholder="company@email.com" keyboardType="email-address" autoCapitalize="none" />
                <Input label="WhatsApp Number" value={whatsapp} onChangeText={(v) => setWhatsapp(cleanPhone(v))} placeholder="WhatsApp contact" keyboardType="phone-pad" maxLength={10} />
                <Input label="Industry" value={industry} onChangeText={setIndustry} placeholder="Manufacturing, Retail, IT..." />
                <Input label="Full Address *" value={address} onChangeText={setAddress} placeholder="Company full address" multiline />
                <Input label="Pincode" value={pincode} onChangeText={setPincode} placeholder="421501" keyboardType="number-pad" maxLength={6} />
                <Input
                  label="Company Description"
                  value={companyDescription}
                  onChangeText={setCompanyDescription}
                  placeholder="Minimum 5 words, maximum 100 words"
                  multiline
                />
                <Text style={styles.helperText}>
                  {wordCount(companyDescription)} / 100 words
                </Text>
              </>
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              disabled={loading}
              onPress={submit}
            >
              <Text style={styles.primaryText}>
                {loading ? "Please wait..." : tab === "login" ? "Continue" : "Create Account"}
              </Text>
              <Feather name="arrow-right" size={19} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.note}>
              {tab === "login"
                ? "Login with your registered mobile number."
                : "Your data will be saved securely in Connect T MySQL database."}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionDot} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, style, ...rest } = props;

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        style={[styles.input, multiline && styles.textArea, style]}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

function DobInput({
  day,
  month,
  year,
  setDay,
  setMonth,
  setYear,
}: {
  day: string;
  month: string;
  year: string;
  setDay: (v: string) => void;
  setMonth: (v: string) => void;
  setYear: (v: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Date of Birth *</Text>
      <View style={styles.dobRow}>
        <TextInput
          value={day}
          onChangeText={(v) => setDay(v.replace(/\D/g, "").slice(0, 2))}
          placeholder="DD"
          keyboardType="number-pad"
          maxLength={2}
          style={styles.dobInput}
          placeholderTextColor="#94A3B8"
        />
        <TextInput
          value={month}
          onChangeText={(v) => setMonth(v.replace(/\D/g, "").slice(0, 2))}
          placeholder="MM"
          keyboardType="number-pad"
          maxLength={2}
          style={styles.dobInput}
          placeholderTextColor="#94A3B8"
        />
        <TextInput
          value={year}
          onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))}
          placeholder="YYYY"
          keyboardType="number-pad"
          maxLength={4}
          style={[styles.dobInput, { flex: 1.35 }]}
          placeholderTextColor="#94A3B8"
        />
      </View>
      <Text style={styles.helperText}>Same DOB format as citizen registration: DD / MM / YYYY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18 },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginBottom: 18,
  },
  backText: {
    fontSize: 13,
    color: "#C2410C",
    fontFamily: "Inter_700Bold",
  },
  header: { alignItems: "center", marginBottom: 18 },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    color: "#FFFFFF",
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 13,
    color: "#FFEDD5",
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 16,
    shadowColor: "#7C2D12",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    padding: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  segmentBtnActive: { backgroundColor: "#EA580C" },
  segmentText: {
    color: "#C2410C",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  segmentTextActive: { color: "#FFFFFF" },
  tabWrap: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 5,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Inter_700Bold",
  },
  tabTextActive: { color: "#EA580C" },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 7,
    marginBottom: 10,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  sectionTitle: {
    fontSize: 14,
    color: "#0F172A",
    fontFamily: "Inter_800ExtraBold",
  },
  inputGroup: { marginBottom: 12 },
  label: {
    fontSize: 13,
    color: "#334155",
    fontFamily: "Inter_700Bold",
    marginBottom: 7,
  },
  input: {
    minHeight: 54,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    color: "#0F172A",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  textArea: {
    minHeight: 92,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  countryBox: {
    width: 92,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  countryText: {
    fontSize: 14,
    color: "#334155",
    fontFamily: "Inter_800ExtraBold",
  },
  phoneInput: {
    flex: 1,
    height: 54,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    color: "#0F172A",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  dobRow: {
    flexDirection: "row",
    gap: 10,
  },
  dobInput: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    textAlign: "center",
    color: "#0F172A",
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
  },
  helperText: {
    marginTop: 6,
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_500Medium",
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 14,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FED7AA",
  },
  photoEmpty: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  photoTitle: {
    fontSize: 13,
    color: "#0F172A",
    fontFamily: "Inter_800ExtraBold",
  },
  photoSub: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_500Medium",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#B91C1C",
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },
  primaryBtn: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_800ExtraBold",
  },
  note: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 12,
    lineHeight: 16,
  },
});
