import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import DobDatePicker from "@/components/DobDatePicker";
import { CurrentStatus, JobsUser, useJobsAuth } from "@/context/JobsAuthContext";
import { languageOptions, useLanguage } from "@/context/LanguageContext";
import { useAccountActions } from "@/hooks/useAccountActions";
import { jobsCopy, JobsCopyKey } from "@/i18n/jobsCopy";
import { profileCopy } from "@/i18n/profileCopy";
import { apiGet, apiPost, getUserErrorMessage } from "@/lib/api";

const ORANGE = "#EA580C";
const GREEN = "#059669";
const BG = "#EEF2F7";
const MAX_PROFILE_PHOTO_BYTES = 8 * 1024 * 1024;

type RoleRequest = {
  id: string;
  currentRole: "seeker" | "employer";
  targetRole: "seeker" | "employer";
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
};

type ProfileForm = {
  name: string;
  email: string;
  dob: string;
  location: string;
  profilePhoto?: string | null;
  qualification: string;
  skills: string;
  experience: string;
  languages: string;
  about: string;
  currentStatus: CurrentStatus;
  currentCompany: string;
  currentRole: string;
  previousCompany: string;
  previousRole: string;
  collegeName: string;
  fieldOfStudy: string;
  company: string;
  contactPerson: string;
  industry: string;
  companyType: string;
  companySize: string;
  companyDescription: string;
  address: string;
  pincode: string;
  whatsapp: string;
  website: string;
  gstNo: string;
  yearEstablished: string;
};

function cleanMobile(value?: string | null) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function initials(name?: string) {
  return String(name || "CT")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isValidEmail(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidDob(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

function formFromUser(user: JobsUser): ProfileForm {
  return {
    name: user.name || "",
    email: user.email || "",
    dob: user.dob || "",
    location: user.location || user.address || "",
    profilePhoto: user.profilePhoto ?? null,
    qualification: user.qualification || "",
    skills: user.skills || "",
    experience: user.experience || "",
    languages: user.languages || "",
    about: user.about || "",
    currentStatus: user.currentStatus || "unemployed",
    currentCompany: user.currentCompany || "",
    currentRole: user.currentRole || "",
    previousCompany: user.previousCompany || "",
    previousRole: user.previousRole || "",
    collegeName: user.collegeName || "",
    fieldOfStudy: user.fieldOfStudy || "",
    company: user.company || "",
    contactPerson: user.contactPerson || user.name || "",
    industry: user.industry || "",
    companyType: user.companyType || "",
    companySize: user.companySize || "",
    companyDescription: user.companyDescription || "",
    address: user.address || user.location || "",
    pincode: user.pincode || "",
    whatsapp: user.whatsapp || user.phone || "",
    website: user.website || "",
    gstNo: user.gstNo || "",
    yearEstablished: user.yearEstablished || "",
  };
}

function DetailRow({
  icon,
  label,
  value,
  verified,
  verifiedText,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string | null;
  verified?: boolean;
  verifiedText: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}><Feather name={icon} size={16} color={ORANGE} /></View>
      <View style={styles.detailText}>
        <View style={styles.detailLabelRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          {verified ? <View style={styles.verifiedPill}><Feather name="check-circle" size={10} color={GREEN} /><Text style={styles.verifiedText}>{verifiedText}</Text></View> : null}
        </View>
        <Text style={styles.detailValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.card}>{children}</View></View>;
}

function InputField({ label, multiline, style, help, ...props }: React.ComponentProps<typeof TextInput> & { label: string; help?: string }) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        returnKeyType={multiline ? "default" : "next"}
        blurOnSubmit={!multiline}
        placeholderTextColor="#94A3B8"
        style={[styles.input, multiline && styles.multilineInput, style]}
      />
      {help ? <Text style={styles.helpText}>{help}</Text> : null}
    </View>
  );
}

function ActionRow({ icon, title, subtitle, onPress, disabled }: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.actionRow, disabled && styles.disabled]} onPress={onPress} disabled={disabled} accessibilityRole="button">
      <View style={styles.actionIcon}><Feather name={icon} size={18} color={ORANGE} /></View>
      <View style={styles.actionText}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionSub}>{subtitle}</Text></View>
      <Feather name={disabled ? "lock" : "chevron-right"} size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

export default function LocalizedJobPortalProfileScreen() {
  const insets = useSafeAreaInsets();
  const { jobsUser, updateJobsUser } = useJobsAuth();
  const { language, setLanguage } = useLanguage();
  const accountActions = useAccountActions();
  const c = (key: JobsCopyKey) => jobsCopy(language, key);
  const p = (key: Parameters<typeof profileCopy>[1]) => profileCopy(language, key);

  const [editVisible, setEditVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [roleRequestVisible, setRoleRequestVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<ProfileForm | null>(jobsUser ? formFromUser(jobsUser) : null);

  const isEmployer = jobsUser?.role === "employer";
  const roleLabel = isEmployer ? c("employer") : c("jobSeeker");
  const targetRoleLabel = isEmployer ? c("jobSeeker") : c("employer");

  useEffect(() => {
    if (!jobsUser) return;
    if (!editVisible) setForm(formFromUser(jobsUser));
    void apiGet<{ request: RoleRequest | null }>("/api/job-portal/role-change-requests/me")
      .then((result) => setRoleRequest(result.request || null))
      .catch(() => undefined);
  }, [editVisible, jobsUser?.id]);

  const statusLabels = useMemo<Record<CurrentStatus, string>>(() => ({
    fresher: c("fresher"),
    student: c("student"),
    unemployed: c("unemployed"),
    employed: c("employed"),
  }), [language]);

  const professionalRows = useMemo(() => {
    if (!jobsUser) return [];
    return isEmployer ? [
      { icon: "briefcase" as const, label: c("companyName"), value: jobsUser.company },
      { icon: "user-check" as const, label: c("contactPerson"), value: jobsUser.contactPerson },
      { icon: "activity" as const, label: c("industry"), value: jobsUser.industry },
      { icon: "layers" as const, label: c("companyType"), value: jobsUser.companyType },
      { icon: "users" as const, label: c("companySize"), value: jobsUser.companySize },
      { icon: "file-text" as const, label: c("businessDescription"), value: jobsUser.companyDescription },
      { icon: "map-pin" as const, label: c("completeBusinessAddress"), value: jobsUser.address || jobsUser.location },
      { icon: "hash" as const, label: c("pinCode"), value: jobsUser.pincode },
      { icon: "message-circle" as const, label: c("whatsapp"), value: jobsUser.whatsapp ? `+91 ${cleanMobile(jobsUser.whatsapp)}` : undefined },
      { icon: "globe" as const, label: c("website"), value: jobsUser.website },
      { icon: "shield" as const, label: c("gstRegistration"), value: jobsUser.gstNo },
      { icon: "calendar" as const, label: c("yearEstablished"), value: jobsUser.yearEstablished },
    ] : [
      { icon: "award" as const, label: c("qualification"), value: jobsUser.qualification },
      { icon: "tool" as const, label: c("skills"), value: jobsUser.skills },
      { icon: "activity" as const, label: c("currentStatus"), value: jobsUser.currentStatus ? statusLabels[jobsUser.currentStatus] : undefined },
      ...(jobsUser.currentStatus === "employed" ? [
        { icon: "briefcase" as const, label: c("currentCompany"), value: jobsUser.currentCompany },
        { icon: "user-check" as const, label: c("currentRole"), value: jobsUser.currentRole },
      ] : []),
      ...(jobsUser.currentStatus === "student" ? [
        { icon: "book-open" as const, label: c("collegeName"), value: jobsUser.collegeName },
        { icon: "bookmark" as const, label: c("fieldOfStudy"), value: jobsUser.fieldOfStudy },
      ] : []),
      { icon: "clock" as const, label: c("workExperience"), value: jobsUser.experience },
      { icon: "archive" as const, label: c("previousCompany"), value: jobsUser.previousCompany },
      { icon: "clipboard" as const, label: c("previousRole"), value: jobsUser.previousRole },
      { icon: "target" as const, label: c("objective"), value: jobsUser.about },
      { icon: "message-square" as const, label: c("languagesKnown"), value: jobsUser.languages },
      { icon: "map-pin" as const, label: c("preferredLocation"), value: jobsUser.location },
    ];
  }, [isEmployer, jobsUser, language, statusLabels]);

  if (!jobsUser || !form) {
    return <View style={styles.emptyRoot}><ActivityIndicator color={ORANGE} /><Text style={styles.emptyTitle}>{c("loadingProfile")}</Text></View>;
  }

  const setField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((current) => current ? { ...current, [key]: value } : current);

  const openEditor = () => {
    setForm(formFromUser(jobsUser));
    setFormError("");
    setSuccessMessage("");
    setPageError("");
    setEditVisible(true);
  };

  const pickPhoto = async () => {
    setFormError("");
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError(c("photoPermissionBody"));
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const mime = String(asset.mimeType || "").toLowerCase();
    if (mime && !["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      setFormError(c("unsupportedImageBody"));
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_PROFILE_PHOTO_BYTES) {
      setFormError(c("imageTooLargeBody"));
      return;
    }
    setField("profilePhoto", asset.uri);
  };

  const saveProfile = async () => {
    if (saving) return;
    setFormError("");
    if (form.name.trim().split(/\s+/).filter(Boolean).length < 2) return setFormError(c("validationName"));
    if (!isValidEmail(form.email)) return setFormError(c("invalidEmail"));
    if (!isValidDob(form.dob)) return setFormError(c("invalidDob"));

    if (isEmployer) {
      if (form.company.trim().length < 2) return setFormError(c("validationCompany"));
      if (form.contactPerson.trim().split(/\s+/).filter(Boolean).length < 2) return setFormError(c("contactRequiredBody"));
      if (!form.address.trim()) return setFormError(c("addressRequiredBody"));
      if (form.whatsapp && cleanMobile(form.whatsapp).length !== 10) return setFormError(c("checkWhatsappBody"));
      if (form.pincode && !/^\d{6}$/.test(form.pincode)) return setFormError(c("checkPinBody"));
      const year = Number(form.yearEstablished);
      if (form.yearEstablished && (!/^\d{4}$/.test(form.yearEstablished) || year < 1800 || year > new Date().getFullYear())) return setFormError(c("checkYearBody"));
    } else {
      if (form.qualification.trim().length < 2) return setFormError(c("validationQualification"));
      if (form.currentStatus === "employed" && (!form.currentCompany.trim() || !form.currentRole.trim())) return setFormError(c("employmentRequiredBody"));
      if (form.currentStatus === "student" && (!form.collegeName.trim() || !form.fieldOfStudy.trim())) return setFormError(c("educationRequiredBody"));
    }

    setSaving(true);
    try {
      const common: Partial<JobsUser> = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        dob: form.dob || undefined,
        profilePhoto: form.profilePhoto,
      };
      await updateJobsUser(isEmployer ? {
        ...common,
        company: form.company.trim(),
        contactPerson: form.contactPerson.trim(),
        industry: form.industry.trim() || undefined,
        companyType: form.companyType.trim() || undefined,
        companySize: form.companySize.trim() || undefined,
        companyDescription: form.companyDescription.trim() || undefined,
        address: form.address.trim(),
        location: form.address.trim(),
        pincode: form.pincode || undefined,
        whatsapp: cleanMobile(form.whatsapp) || jobsUser.phone,
        website: form.website.trim() || undefined,
        gstNo: form.gstNo.trim() || undefined,
        yearEstablished: form.yearEstablished || undefined,
      } : {
        ...common,
        qualification: form.qualification.trim(),
        skills: form.skills.trim() || undefined,
        currentStatus: form.currentStatus,
        currentCompany: form.currentStatus === "employed" ? form.currentCompany.trim() : undefined,
        currentRole: form.currentStatus === "employed" ? form.currentRole.trim() : undefined,
        collegeName: form.currentStatus === "student" ? form.collegeName.trim() : undefined,
        fieldOfStudy: form.currentStatus === "student" ? form.fieldOfStudy.trim() : undefined,
        experience: form.currentStatus === "fresher" ? undefined : form.experience.trim() || undefined,
        previousCompany: form.previousCompany.trim() || undefined,
        previousRole: form.previousRole.trim() || undefined,
        languages: form.languages.trim() || undefined,
        about: form.about.trim() || undefined,
        location: form.location.trim() || undefined,
      });
      setEditVisible(false);
      setSuccessMessage(c("profileSavedBody"));
    } catch (error) {
      setFormError(getUserErrorMessage(error, c("retryLater")));
    } finally {
      setSaving(false);
    }
  };

  const submitRoleRequest = async () => {
    if (requestLoading) return;
    setPageError("");
    if (reason.trim().length < 10) {
      setPageError(c("moreDetailBody"));
      return;
    }
    setRequestLoading(true);
    try {
      const result = await apiPost<{ request: RoleRequest; message?: string }>("/api/job-portal/role-change-requests", {
        targetRole: isEmployer ? "seeker" : "employer",
        reason: reason.trim(),
      });
      setRoleRequest(result.request);
      setRoleRequestVisible(false);
      setReason("");
      setSuccessMessage(result.message || c("requestSubmittedBody"));
    } catch (error) {
      setPageError(getUserErrorMessage(error, c("retryLater")));
    } finally {
      setRequestLoading(false);
    }
  };

  const requestColor = roleRequest?.status === "approved" ? GREEN : roleRequest?.status === "rejected" ? "#DC2626" : "#D97706";
  const actionTitle = accountActions.pendingAction === "logout" ? c("logoutTitle") : c("switchTitle");
  const actionMessage = accountActions.pendingAction === "logout" ? c("logoutMessage") : c("switchMessage");
  const accountDate = jobsUser.createdAt ? new Date(jobsUser.createdAt).toLocaleDateString() : p("missing");

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#9A3412", ORANGE, "#FB923C"]} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 14 }]}>
        <View style={styles.profileTop}>
          <View style={[styles.avatar, { backgroundColor: jobsUser.avatarColor || ORANGE }]}>
            {jobsUser.profilePhoto ? <Image source={{ uri: jobsUser.profilePhoto }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials(jobsUser.name)}</Text>}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.userName} numberOfLines={2}>{jobsUser.name}</Text>
            <View style={styles.rolePill}><Feather name={isEmployer ? "briefcase" : "user"} size={11} color="white" /><Text style={styles.roleText}>{roleLabel}</Text><Feather name="lock" size={10} color="rgba(255,255,255,0.8)" /></View>
            <Text style={styles.headerSub}>Connect-T Job Portal</Text>
          </View>
          <TouchableOpacity style={styles.editHeaderButton} onPress={openEditor} accessibilityLabel={c("editProfile")}>
            <Feather name="edit-2" size={17} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <AppScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) + 116 }}>
        {successMessage ? <View style={styles.successBanner}><Feather name="check-circle" size={16} color={GREEN} /><Text style={styles.successText}>{successMessage}</Text></View> : null}
        {pageError ? <View style={styles.errorBanner}><Feather name="alert-circle" size={16} color="#DC2626" /><Text style={styles.errorBannerText}>{pageError}</Text></View> : null}

        <Section title={p("personalInfo")}>
          <DetailRow icon="user" label={p("fullName")} value={jobsUser.name} verifiedText={p("verified")} />
          <DetailRow icon="phone" label={c("verifiedMobile")} value={`+91 ${cleanMobile(jobsUser.phone)}`} verified verifiedText={p("verified")} />
          <DetailRow icon="mail" label={p("email")} value={jobsUser.email || p("missing")} verifiedText={p("verified")} />
          <DetailRow icon="calendar" label={p("dob")} value={jobsUser.dob || p("missing")} verifiedText={p("verified")} />
          <DetailRow icon="home" label={isEmployer ? c("completeBusinessAddress") : c("preferredLocation")} value={(isEmployer ? jobsUser.address : jobsUser.location) || p("missing")} verifiedText={p("verified")} />
        </Section>

        <Section title={c("professionalInformation")}>
          {professionalRows.map((row) => <DetailRow key={`${row.label}:${row.value || "empty"}`} {...row} verifiedText={p("verified")} />)}
        </Section>

        <Section title={c("activeJobRole")}>
          <DetailRow icon={isEmployer ? "briefcase" : "user-check"} label={c("activeJobRole")} value={roleLabel} verified verifiedText={p("verified")} />
          <DetailRow icon="lock" label={c("requestStatus")} value={roleRequest ? roleRequest.status.toUpperCase() : c("roleLockedBody")} verifiedText={p("verified")} />
          {roleRequest?.adminNote ? <DetailRow icon="message-square" label={c("adminNote")} value={roleRequest.adminNote} verifiedText={p("verified")} /> : null}
          <ActionRow
            icon="repeat"
            title={c("requestCorrection")}
            subtitle={roleRequest?.status === "pending" ? `${c("requestStatus")}: ${roleRequest.status}` : `${c("requestChangeTo")} ${targetRoleLabel}`}
            onPress={() => { setPageError(""); setRoleRequestVisible(true); }}
            disabled={roleRequest?.status === "pending"}
          />
          {roleRequest ? <View style={[styles.requestStrip, { backgroundColor: `${requestColor}12` }]}><Feather name="shield" size={14} color={requestColor} /><Text style={[styles.requestStripText, { color: requestColor }]}>{c("roleLockedBody")}</Text></View> : null}
        </Section>

        <Section title={p("preferences")}>
          <DetailRow icon="globe" label={p("language")} value={languageOptions.find((option) => option.code === language)?.nativeLabel} verifiedText={p("verified")} />
        </Section>

        <Section title={p("accountInfo")}>
          <DetailRow icon="calendar" label={p("accountSince")} value={accountDate} verifiedText={p("verified")} />
          <DetailRow icon="shield" label={c("activeJobRole")} value={roleLabel} verifiedText={p("verified")} />
        </Section>

        <Section title={p("quickActions")}>
          <ActionRow icon="grid" title={c("switchCivic")} subtitle={c("switchCivicBody")} onPress={accountActions.requestCivicPortal} />
          <ActionRow icon="globe" title={p("language")} subtitle={languageOptions.find((option) => option.code === language)?.nativeLabel || ""} onPress={() => setLanguageVisible(true)} />
        </Section>

        <TouchableOpacity style={styles.logoutButton} onPress={accountActions.requestLogout} accessibilityRole="button">
          <Feather name="log-out" size={18} color="#DC2626" /><Text style={styles.logoutText}>{c("logout")}</Text>
        </TouchableOpacity>
      </AppScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => !saving && setEditVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.editorSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.editorHeader}><Text style={styles.editorTitle}>{c("editProfile")}</Text><TouchableOpacity style={styles.closeButton} onPress={() => setEditVisible(false)} disabled={saving} accessibilityLabel="Close"><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
            <AppScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets>
              <View style={styles.photoEditRow}>
                <TouchableOpacity style={[styles.photoEdit, { backgroundColor: jobsUser.avatarColor || ORANGE }]} onPress={pickPhoto} accessibilityLabel={c("changePhoto")}>
                  {form.profilePhoto ? <Image source={{ uri: form.profilePhoto }} style={styles.photoEditImage} /> : <Text style={styles.photoEditText}>{initials(form.name)}</Text>}
                  <View style={styles.photoCamera}><Feather name="camera" size={13} color="white" /></View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}><Text style={styles.actionTitle}>{c("changePhoto")}</Text><TouchableOpacity onPress={() => setField("profilePhoto", null)}><Text style={styles.removePhotoText}>{c("removePhoto")}</Text></TouchableOpacity></View>
              </View>

              <InputField label={`${c("fullName")} *`} value={form.name} onChangeText={(value) => setField("name", value)} placeholder={c("fullNamePlaceholder")} autoCapitalize="words" maxLength={160} />
              <View style={styles.formGroup}><Text style={styles.formLabel}>{c("verifiedMobile")}</Text><View style={styles.readOnlyInput}><Feather name="lock" size={15} color="#64748B" /><Text style={styles.readOnlyText}>+91 {cleanMobile(jobsUser.phone)}</Text><View style={styles.verifiedPill}><Feather name="check-circle" size={10} color={GREEN} /><Text style={styles.verifiedText}>{p("verified")}</Text></View></View><Text style={styles.helpText}>{c("mobileReadOnly")}</Text></View>
              <InputField label={c("email")} value={form.email} onChangeText={(value) => setField("email", value)} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" maxLength={190} />
              <View style={styles.formGroup}><DobDatePicker label={c("dob")} value={form.dob} onChange={(value) => setField("dob", value)} placeholder={c("dob")} /></View>

              {isEmployer ? <>
                <InputField label={`${c("companyName")} *`} value={form.company} onChangeText={(value) => setField("company", value)} placeholder={c("businessNamePlaceholder")} maxLength={190} />
                <InputField label={`${c("contactPerson")} *`} value={form.contactPerson} onChangeText={(value) => setField("contactPerson", value)} placeholder={c("fullNamePlaceholder")} autoCapitalize="words" maxLength={160} />
                <InputField label={c("industry")} value={form.industry} onChangeText={(value) => setField("industry", value)} placeholder={c("industryPlaceholder")} maxLength={120} />
                <InputField label={c("companyType")} value={form.companyType} onChangeText={(value) => setField("companyType", value)} placeholder={c("companyType")} maxLength={80} />
                <InputField label={c("companySize")} value={form.companySize} onChangeText={(value) => setField("companySize", value)} placeholder="1–10, 11–50, 51–200..." maxLength={80} />
                <InputField label={c("businessDescription")} value={form.companyDescription} onChangeText={(value) => setField("companyDescription", value)} placeholder={c("businessDescriptionPlaceholder")} multiline maxLength={3000} />
                <InputField label={`${c("completeBusinessAddress")} *`} value={form.address} onChangeText={(value) => setField("address", value)} placeholder={c("businessLocationPlaceholder")} multiline maxLength={1500} />
                <InputField label={c("pinCode")} value={form.pincode} onChangeText={(value) => setField("pincode", value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" keyboardType="number-pad" maxLength={6} />
                <InputField label={c("whatsapp")} value={form.whatsapp} onChangeText={(value) => setField("whatsapp", value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" keyboardType="phone-pad" maxLength={10} />
                <InputField label={c("website")} value={form.website} onChangeText={(value) => setField("website", value)} placeholder="www.company.com" autoCapitalize="none" maxLength={190} />
                <InputField label={c("gstRegistration")} value={form.gstNo} onChangeText={(value) => setField("gstNo", value.toUpperCase())} placeholder={c("gstRegistration")} maxLength={64} />
                <InputField label={c("yearEstablished")} value={form.yearEstablished} onChangeText={(value) => setField("yearEstablished", value.replace(/\D/g, "").slice(0, 4))} placeholder="YYYY" keyboardType="number-pad" maxLength={4} />
              </> : <>
                <InputField label={`${c("qualification")} *`} value={form.qualification} onChangeText={(value) => setField("qualification", value)} placeholder={c("qualificationPlaceholder")} maxLength={160} />
                <InputField label={c("skills")} value={form.skills} onChangeText={(value) => setField("skills", value)} placeholder={c("skillsPlaceholder")} multiline maxLength={2000} />
                <Text style={styles.formLabel}>{c("currentStatus")}</Text>
                <View style={styles.chips}>{(["fresher", "student", "unemployed", "employed"] as CurrentStatus[]).map((status) => <TouchableOpacity key={status} style={[styles.chip, form.currentStatus === status && styles.chipActive]} onPress={() => setField("currentStatus", status)} accessibilityState={{ selected: form.currentStatus === status }}><Text style={[styles.chipText, form.currentStatus === status && styles.chipTextActive]}>{statusLabels[status]}</Text></TouchableOpacity>)}</View>
                {form.currentStatus === "employed" ? <><InputField label={`${c("currentCompany")} *`} value={form.currentCompany} onChangeText={(value) => setField("currentCompany", value)} placeholder={c("currentCompany")} maxLength={190} /><InputField label={`${c("currentRole")} *`} value={form.currentRole} onChangeText={(value) => setField("currentRole", value)} placeholder={c("currentRole")} maxLength={160} /></> : null}
                {form.currentStatus === "student" ? <><InputField label={`${c("collegeName")} *`} value={form.collegeName} onChangeText={(value) => setField("collegeName", value)} placeholder={c("collegeName")} maxLength={190} /><InputField label={`${c("fieldOfStudy")} *`} value={form.fieldOfStudy} onChangeText={(value) => setField("fieldOfStudy", value)} placeholder={c("fieldOfStudy")} maxLength={190} /></> : null}
                {form.currentStatus !== "fresher" ? <InputField label={c("workExperience")} value={form.experience} onChangeText={(value) => setField("experience", value)} placeholder={c("workExperiencePlaceholder")} multiline maxLength={2000} /> : null}
                <InputField label={c("previousCompany")} value={form.previousCompany} onChangeText={(value) => setField("previousCompany", value)} placeholder={c("previousCompany")} maxLength={190} />
                <InputField label={c("previousRole")} value={form.previousRole} onChangeText={(value) => setField("previousRole", value)} placeholder={c("previousRole")} maxLength={160} />
                <InputField label={c("objective")} value={form.about} onChangeText={(value) => setField("about", value)} placeholder={c("objective")} multiline maxLength={2000} />
                <InputField label={c("languagesKnown")} value={form.languages} onChangeText={(value) => setField("languages", value)} placeholder={c("languagesPlaceholder")} maxLength={400} />
                <InputField label={c("preferredLocation")} value={form.location} onChangeText={(value) => setField("location", value)} placeholder={c("preferredLocationPlaceholder")} maxLength={500} />
              </>}

              {formError ? <Text style={styles.errorText} accessibilityLiveRegion="assertive">{formError}</Text> : null}
              <View style={styles.editorActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditVisible(false)} disabled={saving}><Text style={styles.cancelText}>{p("cancel")}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={saveProfile} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <Feather name="check" size={16} color="white" />}<Text style={styles.saveText}>{saving ? p("saving") : p("save")}</Text></TouchableOpacity>
              </View>
            </AppScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={languageVisible} transparent animationType="slide" onRequestClose={() => setLanguageVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.editorSheet}><View style={styles.sheetHandle} /><View style={styles.editorHeader}><Text style={styles.editorTitle}>{p("language")}</Text><TouchableOpacity style={styles.closeButton} onPress={() => setLanguageVisible(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><View style={{ padding: 16 }}>{languageOptions.map((option) => <TouchableOpacity key={option.code} style={[styles.optionRow, language === option.code && styles.optionActive]} onPress={() => { setLanguage(option.code); setLanguageVisible(false); }} accessibilityState={{ selected: language === option.code }}><View style={{ flex: 1 }}><Text style={styles.optionText}>{option.nativeLabel}</Text><Text style={styles.optionSub}>{option.label}</Text></View>{language === option.code ? <Feather name="check-circle" size={18} color={ORANGE} /> : null}</TouchableOpacity>)}</View></View></View>
      </Modal>

      <Modal visible={roleRequestVisible} transparent animationType="slide" onRequestClose={() => !requestLoading && setRoleRequestVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.editorSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.editorHeader}><Text style={styles.editorTitle}>{c("requestCorrection")}</Text><TouchableOpacity style={styles.closeButton} onPress={() => setRoleRequestVisible(false)} disabled={requestLoading}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>
            <AppScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
              <View style={styles.roleNotice}><Feather name="shield" size={18} color={ORANGE} /><View style={{ flex: 1 }}><Text style={styles.actionTitle}>{roleLabel} → {targetRoleLabel}</Text><Text style={styles.actionSub}>{c("reasonWarning")}</Text></View></View>
              <InputField label={c("reasonLabel")} value={reason} onChangeText={setReason} placeholder={c("reasonPlaceholder")} multiline maxLength={1200} />
              <TouchableOpacity style={[styles.saveButton, styles.fullButton, requestLoading && styles.disabled]} onPress={submitRoleRequest} disabled={requestLoading}>{requestLoading ? <ActivityIndicator color="white" /> : <Feather name="send" size={16} color="white" />}<Text style={styles.saveText}>{c("submitRequest")}</Text></TouchableOpacity>
            </AppScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmActionModal
        visible={!!accountActions.pendingAction}
        title={actionTitle}
        message={actionMessage}
        confirmLabel={accountActions.pendingAction === "logout" ? c("logout") : c("switchPortal")}
        cancelLabel={p("cancel")}
        icon={accountActions.pendingAction === "logout" ? "log-out" : "shuffle"}
        tone={accountActions.pendingAction === "logout" ? "danger" : "primary"}
        busy={accountActions.busy}
        onCancel={accountActions.cancelAction}
        onConfirm={accountActions.runPendingAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  emptyRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG, padding: 24 },
  emptyTitle: { marginTop: 12, fontSize: 18, color: "#334155", fontFamily: "Inter_700Bold" },
  header: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 70, height: 70, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.45)" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: "white", fontSize: 23, fontFamily: "Inter_700Bold" },
  headerText: { flex: 1, minWidth: 0 },
  userName: { color: "white", fontSize: 21, lineHeight: 26, fontFamily: "Inter_700Bold" },
  rolePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.17)" },
  roleText: { color: "white", fontSize: 11, fontFamily: "Inter_700Bold" },
  headerSub: { marginTop: 5, color: "rgba(255,255,255,0.72)", fontSize: 11.5, fontFamily: "Inter_400Regular" },
  editHeaderButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  scroll: { flex: 1 },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#BBF7D0", padding: 12, marginBottom: 14 },
  successText: { flex: 1, color: "#166534", fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", padding: 12, marginBottom: 14 },
  errorBannerText: { flex: 1, color: "#B91C1C", fontSize: 12.5, lineHeight: 18, fontFamily: "Inter_600SemiBold" },
  section: { marginBottom: 16 },
  sectionTitle: { marginLeft: 4, marginBottom: 8, color: "#64748B", fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  card: { backgroundColor: "white", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#E2E8F0" },
  detailRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  detailIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED" },
  detailText: { flex: 1, minWidth: 0 },
  detailLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  detailLabel: { color: "#94A3B8", fontSize: 11, fontFamily: "Inter_500Medium" },
  detailValue: { marginTop: 3, color: "#0F172A", fontSize: 14, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  verifiedPill: { flexDirection: "row", gap: 3, alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: "#DCFCE7" },
  verifiedText: { color: GREEN, fontSize: 9, fontFamily: "Inter_700Bold" },
  actionRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  actionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED" },
  actionText: { flex: 1, minWidth: 0 },
  actionTitle: { color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" },
  actionSub: { marginTop: 2, color: "#64748B", fontSize: 11.5, lineHeight: 16, fontFamily: "Inter_400Regular" },
  requestStrip: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12 },
  requestStripText: { flex: 1, fontSize: 10.5, lineHeight: 16, fontFamily: "Inter_600SemiBold" },
  logoutButton: { minHeight: 52, borderRadius: 16, backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  logoutText: { color: "#DC2626", fontSize: 14.5, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.55)" },
  editorSheet: { maxHeight: "92%", backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  sheetHandle: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", marginTop: 10 },
  editorHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  editorTitle: { flex: 1, color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" },
  closeButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  editorContent: { padding: 18, paddingBottom: 40 },
  photoEditRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  photoEdit: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  photoEditImage: { width: "100%", height: "100%", borderRadius: 24 },
  photoEditText: { color: "white", fontSize: 22, fontFamily: "Inter_700Bold" },
  photoCamera: { position: "absolute", right: -3, bottom: -3, width: 28, height: 28, borderRadius: 14, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "white" },
  removePhotoText: { marginTop: 5, color: "#DC2626", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  formGroup: { marginBottom: 14 },
  formLabel: { marginBottom: 6, color: "#475569", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 14, color: "#0F172A", fontSize: 14, fontFamily: "Inter_400Regular" },
  multilineInput: { minHeight: 88, paddingTop: 13, paddingBottom: 13 },
  readOnlyInput: { minHeight: 50, borderRadius: 14, backgroundColor: "#F1F5F9", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  readOnlyText: { flex: 1, color: "#475569", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  helpText: { marginTop: 5, color: "#94A3B8", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  chip: { minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  chipActive: { borderColor: "#FDBA74", backgroundColor: "#FFF7ED" },
  chipText: { color: "#64748B", fontSize: 10.5, fontFamily: "Inter_600SemiBold" },
  chipTextActive: { color: ORANGE },
  roleNotice: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", padding: 12, marginBottom: 16 },
  errorText: { marginTop: 4, color: "#DC2626", fontSize: 12.5, lineHeight: 18, textAlign: "center", fontFamily: "Inter_600SemiBold" },
  editorActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelButton: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 14, fontFamily: "Inter_700Bold" },
  saveButton: { flex: 1.4, minHeight: 50, borderRadius: 14, backgroundColor: ORANGE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  fullButton: { width: "100%", flex: 0, marginTop: 4 },
  saveText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
  disabled: { opacity: 0.6 },
  optionRow: { minHeight: 54, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginBottom: 7, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  optionActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  optionText: { flex: 1, color: "#334155", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optionSub: { marginTop: 2, color: "#94A3B8", fontSize: 11, fontFamily: "Inter_400Regular" },
});
