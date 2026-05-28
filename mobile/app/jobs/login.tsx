import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import {
  JobsUserRole,
  randomColor,
  useJobsAuth,
} from "@/context/JobsAuthContext";

type AuthTab = "login" | "register";
type Step = "form" | "otp" | "success";

const ROLES: {
  id: JobsUserRole;
  icon: string;
  label: string;
  sub: string;
}[] = [
  {
    id: "seeker",
    icon: "user",
    label: "Job Seeker",
    sub: "Find local jobs",
  },
  {
    id: "employer",
    icon: "briefcase",
    label: "Employer",
    sub: "Post & hire",
  },
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

function cleanMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function DropdownPicker({
  label,
  value,
  options,
  placeholder,
  onSelect,
  required,
}: DropdownPickerProps) {
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const insets = useSafeAreaInsets();

  const handleSelect = (opt: string) => {
    if (opt === "Other") {
      setManualMode(true);
      setOpen(false);
      setManualText("");
      return;
    }

    onSelect(opt);
    setOpen(false);
    setManualMode(false);
  };

  const handleManualDone = () => {
    const clean = manualText.trim();

    if (clean) {
      onSelect(clean);
      setManualMode(false);
    }
  };

  return (
    <View style={dd.wrap}>
      <Text style={dd.label}>
        {label}
        {required && <Text style={dd.required}> *</Text>}
      </Text>

      {!manualMode ? (
        <TouchableOpacity
          style={dd.trigger}
          onPress={() => setOpen(true)}
          activeOpacity={0.84}
        >
          <Text style={[dd.triggerText, !value && dd.placeholder]}>
            {value || placeholder || `Select ${label}`}
          </Text>
          <Feather name="chevron-down" size={16} color="#94A3B8" />
        </TouchableOpacity>
      ) : (
        <View style={dd.manualRow}>
          <TextInput
            style={dd.manualInput}
            value={manualText}
            onChangeText={setManualText}
            placeholder={`Type ${label.toLowerCase()}`}
            placeholderTextColor="#CBD5E1"
          />
          <TouchableOpacity style={dd.doneBtn} onPress={handleManualDone}>
            <Feather name="check" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={dd.cancelBtn}
            onPress={() => setManualMode(false)}
          >
            <Feather name="x" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      {value && !manualMode && (
        <TouchableOpacity
          onPress={() => {
            setManualMode(true);
            setManualText(value);
          }}
          style={dd.editLink}
          activeOpacity={0.75}
        >
          <Feather name="edit-2" size={10} color="#EA580C" />
          <Text style={dd.editLinkText}>Type manually instead</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={dd.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={[
              dd.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={dd.sheetHeader}>
              <Text style={dd.sheetTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(o) => o}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item === value;

                return (
                  <TouchableOpacity
                    style={[
                      dd.option,
                      active && dd.optionActive,
                      item === "Other" && dd.optionOther,
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.76}
                  >
                    {item === "Other" ? (
                      <View style={dd.optionRow}>
                        <Feather name="edit-3" size={14} color="#EA580C" />
                        <Text style={[dd.optionText, dd.optionOtherText]}>
                          Other (type manually)
                        </Text>
                      </View>
                    ) : (
                      <View style={dd.optionRowBetween}>
                        <Text
                          style={[
                            dd.optionText,
                            active && dd.optionTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                        {active && (
                          <Feather name="check" size={14} color="#EA580C" />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
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

  const [age, setAge] = useState("");
  const [qualification, setQualification] = useState("");
  const [skills, setSkills] = useState("");

  const [company, setCompany] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [location, setLocation] = useState("");

  const [otpSending, setOtpSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const currentRole = ROLES.find((item) => item.id === role) || ROLES[0];

  useEffect(
    () => () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    },
    [],
  );

  const setOtpDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");

    if (clean.length > 1) {
      const digits = clean.slice(0, 4).split("");
      const next = ["", "", "", ""];
      digits.forEach((digit, i) => {
        next[i] = digit;
      });
      setOtp(next);

      const nextIndex = Math.min(digits.length, 3);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const next = [...otp];
    next[index] = clean.slice(-1);
    setOtp(next);

    if (clean && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
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
    if (phone.length !== 10) return "Enter a valid 10-digit mobile number.";
    return null;
  };

  const startCountdown = () => {
    setCountdown(30);

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

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

  const resetOtp = () => {
    setOtp(["", "", "", ""]);
  };

  const handleSendOtp = async () => {
    setError("");
    resetOtp();

    if (tab === "register") {
      const err = role === "seeker" ? validateSeeker() : validateEmployer();

      if (err) {
        setError(err);
        return;
      }
    } else if (phone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setOtpSending(true);
      startCountdown();
      setStep("otp");

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 300);
    } catch (e: any) {
      setError(e?.message || "Failed to send OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");

    if (code.length !== 4) {
      setError("Enter the 4 digit OTP.");
      return;
    }

    if (code !== "1234") {
      setError("Invalid OTP. Use demo OTP 1234.");
      return;
    }

    setLoading(true);
    setError("");

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
      setTimeout(() => router.replace("/jobs/(tabs)" as any), 900);
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Try again.");
      resetOtp();
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    setStep("form");
    setError("");
    resetOtp();
  };

  const switchRole = (nextRole: JobsUserRole) => {
    setRole(nextRole);
    setStep("form");
    setError("");
    resetOtp();
  };

  const renderHeader = () => (
    <LinearGradient
      colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.header,
        {
          paddingTop: (Platform.OS === "web" ? 44 : insets.top) + 18,
        },
      ]}
    >
      <TopShade height={150} />
      <DecorativeCircles />

      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backCircle}
          onPress={() => router.replace("/portal-select" as any)}
          activeOpacity={0.84}
        >
          <Feather name="chevron-left" size={22} color="white" />
        </TouchableOpacity>

        <View style={styles.headerBadge}>
          <Feather name="briefcase" size={12} color="#FED7AA" />
          <Text style={styles.headerBadgeText}>Job Portal</Text>
        </View>
      </View>

      <View style={styles.heroBlock}>
        <View style={styles.heroIcon}>
          <Feather name="briefcase" size={26} color="#EA580C" />
        </View>

        <Text style={styles.headerTitle}>Connect T Jobs</Text>
        <Text style={styles.headerSub}>
          Local jobs, local talent, trusted opportunities
        </Text>
      </View>
    </LinearGradient>
  );

  const renderRoleSelector = () => (
    <View style={styles.roleRow}>
      {ROLES.map((item) => {
        const active = role === item.id;

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.roleCard, active && styles.roleCardActive]}
            onPress={() => switchRole(item.id)}
            activeOpacity={0.84}
          >
            <View style={[styles.roleIcon, active && styles.roleIconActive]}>
              <Feather
                name={item.icon as any}
                size={20}
                color={active ? "white" : "#EA580C"}
              />
            </View>

            <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
              {item.label}
            </Text>
            <Text style={[styles.roleSub, active && styles.roleSubActive]}>
              {item.sub}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderTabSelector = () => (
    <View style={styles.tabRow}>
      {(["login", "register"] as AuthTab[]).map((item) => {
        const active = tab === item;

        return (
          <TouchableOpacity
            key={item}
            style={[styles.tabItem, active && styles.tabActive]}
            onPress={() => switchTab(item)}
            activeOpacity={0.84}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {item === "login" ? "Login" : "Register"}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderPhoneInput = () => (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>
        Mobile Number <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.phoneRow}>
        <View style={styles.phoneCode}>
          <Text style={styles.phoneCodeText}>+91</Text>
        </View>

        <TextInput
          style={[styles.input, styles.phoneInput]}
          value={phone}
          onChangeText={(value) => setPhone(cleanMobile(value))}
          placeholder="XXXXX XXXXX"
          placeholderTextColor="#CBD5E1"
          keyboardType="phone-pad"
          maxLength={10}
        />
      </View>
    </View>
  );

  const renderLoginForm = () => (
    <>
      <View style={styles.sectionBanner}>
        <Feather name={currentRole.icon as any} size={13} color="#EA580C" />
        <Text style={styles.sectionBannerText}>
          {currentRole.label} Login
        </Text>
      </View>

      {renderPhoneInput()}
    </>
  );

  const renderSeekerForm = () => (
    <>
      <View style={styles.sectionBanner}>
        <Feather name="user" size={13} color="#EA580C" />
        <Text style={styles.sectionBannerText}>Job Seeker Details</Text>
      </View>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>
          Full Name <Text style={styles.required}>*</Text>
        </Text>
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

      {renderPhoneInput()}

      <DropdownPicker
        label="Qualification"
        value={qualification}
        options={QUALIFICATION_OPTIONS}
        placeholder="Select highest qualification"
        onSelect={setQualification}
        required
      />

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>
          Skills <Text style={styles.optional}>(optional)</Text>
        </Text>
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
  );

  const renderEmployerForm = () => (
    <>
      <View style={styles.sectionBanner}>
        <Feather name="briefcase" size={13} color="#EA580C" />
        <Text style={styles.sectionBannerText}>Employer Registration</Text>
      </View>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>
          Full Name <Text style={styles.required}>*</Text>
        </Text>
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
        <Text style={styles.inputLabel}>
          Company Name <Text style={styles.required}>*</Text>
        </Text>
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
        <Text style={styles.inputLabel}>
          GST Number <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={gstNo}
          onChangeText={(value) => setGstNo(value.toUpperCase())}
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

      {renderPhoneInput()}
    </>
  );

  const renderFormStep = () => (
    <>
      <Text style={styles.cardTitle}>
        {tab === "login" ? "Welcome Back" : "Create Job Account"}
      </Text>

      <Text style={styles.cardSubTitle}>
        {tab === "login"
          ? "Login with your mobile number and continue."
          : "Register once and manage your job profile easily."}
      </Text>

      {renderRoleSelector()}
      {renderTabSelector()}

      {tab === "login" && renderLoginForm()}
      {tab === "register" && role === "seeker" && renderSeekerForm()}
      {tab === "register" && role === "employer" && renderEmployerForm()}

      {!!error && (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={15} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, otpSending && styles.btnDisabled]}
        onPress={handleSendOtp}
        activeOpacity={0.86}
        disabled={otpSending}
      >
        <LinearGradient
          colors={["#EA580C", "#F97316"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGrad}
        >
          {otpSending ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.btnText}>
                {tab === "login" ? "Send OTP" : "Verify Mobile"}
              </Text>
              <Feather name="arrow-right" size={18} color="white" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </>
  );

  const renderOtpStep = () => (
    <>
      <View style={styles.otpTopIcon}>
        <Feather name="lock" size={28} color="#EA580C" />
      </View>

      <Text style={styles.cardTitle}>Enter OTP</Text>
      <Text style={styles.otpHint}>OTP sent to +91 {phone}</Text>

      {!!error && (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={15} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              otpRefs.current[index] = ref;
            }}
            style={[styles.otpBox, digit && styles.otpBoxFilled]}
            value={digit}
            onChangeText={(value) => setOtpDigit(index, value)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
          />
        ))}
      </View>

      <Text style={styles.otpDemoNote}>Demo OTP is 1234</Text>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleVerifyOtp}
        activeOpacity={0.86}
        disabled={loading}
      >
        <LinearGradient
          colors={["#047857", "#059669", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGrad}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Feather name="check-circle" size={18} color="white" />
              <Text style={styles.btnText}>Verify & Continue</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSendOtp}
        disabled={countdown > 0 || otpSending}
        activeOpacity={0.72}
      >
        <Text style={[styles.resendLink, countdown > 0 && styles.resendMuted]}>
          {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setStep("form");
          setError("");
          resetOtp();
        }}
        style={styles.changeNumberBtn}
        activeOpacity={0.72}
      >
        <Feather name="arrow-left" size={14} color="#64748B" />
        <Text style={styles.changeNumberText}>Change number</Text>
      </TouchableOpacity>
    </>
  );

  const renderSuccessStep = () => (
    <View style={styles.successWrap}>
      <View style={styles.successCircle}>
        <Feather name="check" size={36} color="white" />
      </View>
      <Text style={styles.successTitle}>Welcome!</Text>
      <Text style={styles.successSub}>Opening your job portal...</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}

        <View style={styles.card}>
          {step === "form" && renderFormStep()}
          {step === "otp" && renderOtpStep()}
          {step === "success" && renderSuccessStep()}
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/portal-select" as any)}
          style={styles.backPill}
          activeOpacity={0.84}
        >
          <Feather name="arrow-left" size={14} color="#EA580C" />
          <Text style={styles.backPillText}>Back to portal selection</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 34,
  },
  header: {
    minHeight: 268,
    paddingHorizontal: 22,
    paddingBottom: 42,
    overflow: "hidden",
  },
  headerTop: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  headerBadgeText: {
    fontSize: 12,
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  heroBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 24,
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: -30,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  cardSubTitle: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 18,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  roleCard: {
    flex: 1,
    minHeight: 112,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCardActive: {
    borderColor: "#EA580C",
    backgroundColor: "#EA580C",
  },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  roleIconActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  roleLabelActive: {
    color: "white",
  },
  roleSub: {
    fontSize: 10,
    color: "#92400E",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
  roleSubActive: {
    color: "rgba(255,255,255,0.78)",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 13,
  },
  tabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Inter_600SemiBold",
  },
  tabTextActive: {
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
  },
  sectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#EA580C",
  },
  sectionBannerText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
  },
  inputWrap: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 7,
  },
  required: {
    color: "#DC2626",
  },
  optional: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
  },
  input: {
    minHeight: 50,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "Inter_400Regular",
  },
  hint: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    marginTop: 5,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  phoneCode: {
    minHeight: 50,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneCodeText: {
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  phoneInput: {
    flex: 1,
  },
  btn: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnGrad: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 15,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#991B1B",
    fontFamily: "Inter_500Medium",
    lineHeight: 17,
  },
  otpTopIcon: {
    alignSelf: "center",
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  otpHint: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 7,
    marginBottom: 18,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  otpBox: {
    width: 58,
    height: 62,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#FED7AA",
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    backgroundColor: "#FFF7ED",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    textAlignVertical: "center",
    paddingVertical: 0,
    includeFontPadding: false,
    lineHeight: 62,
  },
  otpBoxFilled: {
    borderColor: "#EA580C",
    backgroundColor: "white",
  },
  otpDemoNote: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Inter_400Regular",
  },
  resendLink: {
    fontSize: 13,
    fontWeight: "800",
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 14,
  },
  resendMuted: {
    color: "#94A3B8",
  },
  changeNumberBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  changeNumberText: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter_500Medium",
  },
  successWrap: {
    alignItems: "center",
    paddingVertical: 34,
  },
  successCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  successSub: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginTop: 5,
  },
  backPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#FED7AA",
    marginTop: 18,
  },
  backPillText: {
    fontSize: 13,
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
  },
});

const dd = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 7,
  },
  required: {
    color: "#DC2626",
  },
  trigger: {
    minHeight: 50,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  placeholder: {
    color: "#CBD5E1",
  },
  manualRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  manualInput: {
    flex: 1,
    minHeight: 50,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "Inter_400Regular",
  },
  doneBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  editLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  editLinkText: {
    fontSize: 10,
    color: "#EA580C",
    fontFamily: "Inter_500Medium",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: 500,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  optionActive: {
    backgroundColor: "#FFF7ED",
  },
  optionOther: {
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
    marginTop: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: {
    fontSize: 14,
    color: "#334155",
    fontFamily: "Inter_500Medium",
  },
  optionOtherText: {
    color: "#EA580C",
  },
  optionTextActive: {
    color: "#EA580C",
    fontFamily: "Inter_700Bold",
  },
});
