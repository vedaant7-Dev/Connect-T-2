import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

import { AppScrollView } from "@/components/AppScrollView";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { CurrentStatus, JobsUserRole, useJobsAuth } from "@/context/JobsAuthContext";
import { jobsCopy, JobsCopyKey } from "@/i18n/jobsCopy";
import { apiPost, getUserErrorMessage } from "@/lib/api";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#EBEFFC";

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
};

function Field({ label, value, onChangeText, placeholder, multiline = false }: FieldProps) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[s.input, multiline && s.textArea]}
        returnKeyType={multiline ? "default" : "next"}
        blurOnSubmit={!multiline}
      />
    </View>
  );
}

function RoleCard({ role, selected, title, subtitle, onPress }: {
  role: JobsUserRole;
  selected: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.roleCard, selected && s.roleCardSelected]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ selected }}
    >
      <View style={[s.roleIcon, selected && s.roleIconSelected]}>
        <Feather name={role === "employer" ? "briefcase" : "user"} size={22} color={selected ? "white" : ORANGE} />
      </View>
      <Text style={[s.roleTitle, selected && s.roleTitleSelected]}>{title}</Text>
      <Text style={s.roleSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function LocalizedJobProfileSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activateJobs } = useJobsAuth();
  const { language } = useLanguage();
  const c = (key: JobsCopyKey) => jobsCopy(language, key);

  const [role, setRole] = useState<JobsUserRole | null>(null);
  const [pendingRole, setPendingRole] = useState<JobsUserRole | null>(null);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [location, setLocation] = useState(user?.address || "");
  const [qualification, setQualification] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [preferredCategory, setPreferredCategory] = useState("");
  const [languages, setLanguages] = useState("");
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>("fresher");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [hiringCategories, setHiringCategories] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const statusOptions = useMemo<Array<{ value: CurrentStatus; label: string }>>(() => [
    { value: "fresher", label: c("fresher") },
    { value: "student", label: c("student") },
    { value: "unemployed", label: c("unemployed") },
    { value: "employed", label: c("employed") },
  ], [language]);

  useEffect(() => {
    if (!user) {
      router.replace("/login" as any);
      return;
    }
    setName((value) => value || user.name || "");
    setLocation((value) => value || user.address || "");
  }, [user?.id, router]);

  const roleLabel = (value: JobsUserRole | null) => value === "employer" ? c("employer") : c("jobSeeker");

  const chooseRole = (nextRole: JobsUserRole) => {
    setPendingRole(nextRole);
    setShowConfirm(true);
    setError("");
  };

  const confirmRole = () => {
    if (!pendingRole) return;
    setRole(pendingRole);
    setRoleConfirmed(true);
    setShowConfirm(false);
  };

  const resetRole = () => {
    setRole(null);
    setPendingRole(null);
    setRoleConfirmed(false);
    setError("");
  };

  const validate = () => {
    if (!roleConfirmed || !role) return c("validationRole");
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) return c("validationName");
    if (location.trim().length < 3) return role === "employer" ? c("validationEmployerLocation") : c("validationSeekerLocation");
    if (role === "seeker") {
      if (qualification.trim().length < 2) return c("validationQualification");
      if (skills.trim().length < 2) return c("validationSkills");
      if (preferredCategory.trim().length < 2) return c("validationCategory");
    } else {
      if (company.trim().length < 2) return c("validationCompany");
      if (industry.trim().length < 2) return c("validationIndustry");
      if (hiringCategories.trim().length < 2) return c("validationHiring");
      if (companyDescription.trim().length < 10) return c("validationDescription");
    }
    return "";
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!role || loading) return;

    setLoading(true);
    setError("");
    try {
      const common = {
        role,
        name: name.trim(),
        location: location.trim(),
        address: location.trim(),
      };
      await apiPost("/api/job-portal/onboarding", role === "seeker" ? {
        ...common,
        qualification: qualification.trim(),
        skills: skills.trim(),
        experience: currentStatus === "fresher" ? undefined : experience.trim() || undefined,
        about: preferredCategory.trim(),
        languages: languages.trim() || undefined,
        currentStatus,
      } : {
        ...common,
        company: company.trim(),
        contactPerson: name.trim(),
        industry: industry.trim(),
        about: hiringCategories.trim(),
        companyDescription: companyDescription.trim(),
        whatsapp: user?.mobile,
      });
      await activateJobs(role);
      router.replace("/jobs/(tabs)" as any);
    } catch (err) {
      setError(getUserErrorMessage(err, c("setupFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#FB923C"]} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TopShade height={130} />
        <DecorativeCircles />
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.replace("/portal-select" as any)}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel={c("goBack")}
        >
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <View style={s.headCenter}>
          <View style={s.headIcon}><Feather name="briefcase" size={23} color={ORANGE} /></View>
          <Text style={s.title}>{c("setupTitle")}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <AppScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <View style={s.notice}>
            <View style={s.noticeIcon}><Feather name="shield" size={16} color={ORANGE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.noticeTitle}>{c("oneRoleTitle")}</Text>
              <Text style={s.noticeText}>{c("oneRoleBody")}</Text>
            </View>
          </View>

          <View style={s.card}>
            {!roleConfirmed ? (
              <>
                <Text style={s.sectionTitle}>{c("usageQuestion")}</Text>
                <Text style={s.sectionHelp}>{c("chooseCarefully")}</Text>
                <View style={s.roleRow}>
                  <RoleCard role="seeker" selected={pendingRole === "seeker"} title={c("jobSeeker")} subtitle={c("seekerSub")} onPress={() => chooseRole("seeker")} />
                  <RoleCard role="employer" selected={pendingRole === "employer"} title={c("employer")} subtitle={c("employerSub")} onPress={() => chooseRole("employer")} />
                </View>
              </>
            ) : (
              <View style={s.lockedRoleBox}>
                <View style={s.lockedRoleIcon}><Feather name="lock" size={20} color={ORANGE} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.lockedRoleLabel}>{c("confirmedRole").toUpperCase()}</Text>
                  <Text style={s.lockedRoleTitle}>{roleLabel(role)}</Text>
                  <Text style={s.lockedRoleText}>{c("activeRoleAfterSave")}</Text>
                </View>
                <TouchableOpacity onPress={resetRole} style={s.changeBtn} accessibilityRole="button"><Text style={s.changeBtnText}>{c("change")}</Text></TouchableOpacity>
              </View>
            )}

            {roleConfirmed && role ? (
              <>
                <Text style={s.formHeading}>{role === "seeker" ? c("seekerDetails") : c("employerDetails")}</Text>
                <Field label={`${c("fullName")} *`} value={name} onChangeText={setName} placeholder={c("fullNamePlaceholder")} />
                <View style={s.inputGroup}>
                  <Text style={s.label}>{c("verifiedMobile")}</Text>
                  <View style={s.readonlyField}><Feather name="lock" size={14} color="#94A3B8" /><Text style={s.readonlyText}>+91 {user?.mobile || ""}</Text></View>
                  <Text style={s.help}>{c("managedByCivic")}</Text>
                </View>

                {role === "seeker" ? (
                  <>
                    <Field label={`${c("qualification")} *`} value={qualification} onChangeText={setQualification} placeholder={c("qualificationPlaceholder")} />
                    <Field label={`${c("skills")} *`} value={skills} onChangeText={setSkills} placeholder={c("skillsPlaceholder")} multiline />
                    <Field label={`${c("preferredCategory")} *`} value={preferredCategory} onChangeText={setPreferredCategory} placeholder={c("preferredCategoryPlaceholder")} />
                    <View style={s.inputGroup}>
                      <Text style={s.label}>{c("currentStatus")} *</Text>
                      <View style={s.chipWrap}>{statusOptions.map((option) => {
                        const active = currentStatus === option.value;
                        return <TouchableOpacity key={option.value} onPress={() => setCurrentStatus(option.value)} style={[s.chip, active && s.chipActive]} accessibilityState={{ selected: active }}><Text style={[s.chipText, active && s.chipTextActive]}>{option.label}</Text></TouchableOpacity>;
                      })}</View>
                    </View>
                    {currentStatus !== "fresher" ? <Field label={c("workExperience")} value={experience} onChangeText={setExperience} placeholder={c("workExperiencePlaceholder")} multiline /> : null}
                    <Field label={c("languagesKnown")} value={languages} onChangeText={setLanguages} placeholder={c("languagesPlaceholder")} />
                    <Field label={`${c("preferredLocation")} *`} value={location} onChangeText={setLocation} placeholder={c("preferredLocationPlaceholder")} />
                  </>
                ) : (
                  <>
                    <Field label={`${c("companyName")} *`} value={company} onChangeText={setCompany} placeholder={c("businessNamePlaceholder")} />
                    <Field label={`${c("industry")} *`} value={industry} onChangeText={setIndustry} placeholder={c("industryPlaceholder")} />
                    <Field label={`${c("hiringCategories")} *`} value={hiringCategories} onChangeText={setHiringCategories} placeholder={c("hiringCategoriesPlaceholder")} multiline />
                    <Field label={`${c("businessDescription")} *`} value={companyDescription} onChangeText={setCompanyDescription} placeholder={c("businessDescriptionPlaceholder")} multiline />
                    <Field label={`${c("businessLocation")} *`} value={location} onChangeText={setLocation} placeholder={c("businessLocationPlaceholder")} multiline />
                  </>
                )}

                {error ? <View style={s.errorBox} accessibilityLiveRegion="assertive"><Feather name="alert-circle" size={16} color="#DC2626" /><Text style={s.errorText}>{error}</Text></View> : null}
                <TouchableOpacity onPress={submit} disabled={loading} style={[s.primaryBtn, loading && { opacity: 0.65 }]} activeOpacity={0.88} accessibilityRole="button">
                  <LinearGradient colors={[DARK, ORANGE]} style={s.primaryGrad}>
                    {loading ? <ActivityIndicator color="white" /> : <><Text style={s.primaryText}>{c("saveContinue")}</Text><Feather name="arrow-right" size={18} color="white" /></>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </AppScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={s.modalOverlay} accessibilityViewIsModal>
          <View style={s.modalCard}>
            <View style={s.modalIcon}><Feather name="alert-triangle" size={26} color={ORANGE} /></View>
            <Text style={s.modalTitle}>{c("confirmPrefix")} {roleLabel(pendingRole)}</Text>
            <Text style={s.modalText}>{c("roleLockWarning")}</Text>
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setShowConfirm(false)} style={s.cancelBtn}><Text style={s.cancelText}>{c("goBack")}</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmRole} style={s.confirmBtn}><Text style={s.confirmText}>{c("confirmRole")}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  headCenter: { alignItems: "center", marginTop: -30, paddingHorizontal: 36 },
  headIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: "white", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  title: { fontSize: 21, color: "white", fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 28 },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.76)", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 5, lineHeight: 18 },
  content: { padding: 16 },
  notice: { flexDirection: "row", gap: 12, backgroundColor: "#FFF7ED", borderRadius: 16, borderWidth: 1, borderColor: "#FED7AA", padding: 14, marginBottom: 14 },
  noticeIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  noticeTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#9A3412", lineHeight: 18 },
  noticeText: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: "#9A3412", marginTop: 3, lineHeight: 18 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 16, shadowColor: "#B45309", shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  sectionTitle: { fontSize: 17, lineHeight: 23, fontFamily: "Inter_700Bold", color: "#0F172A" },
  sectionHelp: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 3, marginBottom: 12 },
  roleRow: { flexDirection: "row", gap: 10 },
  roleCard: { flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", padding: 12, alignItems: "center", minHeight: 150 },
  roleCardSelected: { borderColor: ORANGE, backgroundColor: "#FFF7ED" },
  roleIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 9 },
  roleIconSelected: { backgroundColor: ORANGE },
  roleTitle: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_700Bold", color: "#0F172A", textAlign: "center" },
  roleTitleSelected: { color: "#9A3412" },
  roleSub: { fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", marginTop: 4, lineHeight: 16 },
  lockedRoleBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF7ED", borderRadius: 16, borderWidth: 1, borderColor: "#FED7AA", padding: 14 },
  lockedRoleIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  lockedRoleLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#C2410C", letterSpacing: 0.8 },
  lockedRoleTitle: { fontSize: 17, lineHeight: 23, fontFamily: "Inter_700Bold", color: "#9A3412", marginTop: 1 },
  lockedRoleText: { fontSize: 10.5, lineHeight: 16, fontFamily: "Inter_400Regular", color: "#9A3412", marginTop: 2 },
  changeBtn: { minHeight: 40, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  changeBtnText: { fontSize: 11, fontFamily: "Inter_700Bold", color: ORANGE },
  formHeading: { fontSize: 15, lineHeight: 21, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 20, marginBottom: 12 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_600SemiBold", color: "#475569", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", borderRadius: 13, paddingHorizontal: 13, minHeight: 48, color: "#0F172A", fontFamily: "Inter_400Regular", fontSize: 14 },
  textArea: { minHeight: 92, paddingTop: 12, paddingBottom: 12 },
  readonlyField: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 13, paddingHorizontal: 13, minHeight: 48 },
  readonlyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#475569" },
  help: { fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 5 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 11, borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", justifyContent: "center" },
  chipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#64748B" },
  chipTextActive: { color: "white" },
  errorBox: { flexDirection: "row", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#B91C1C", lineHeight: 18 },
  primaryBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  primaryGrad: { minHeight: 52, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  primaryText: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontFamily: "Inter_700Bold", color: "white", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.58)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "white", borderRadius: 22, padding: 22, alignItems: "center" },
  modalIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, lineHeight: 24, fontFamily: "Inter_700Bold", color: "#0F172A", textAlign: "center" },
  modalText: { fontSize: 12.5, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", lineHeight: 20, marginTop: 8 },
  modalActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },
  cancelBtn: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  cancelText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#64748B", textAlign: "center" },
  confirmBtn: { flex: 1.2, minHeight: 48, borderRadius: 13, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  confirmText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "white", textAlign: "center" },
});
