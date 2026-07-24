import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import DobDatePicker from "@/components/DobDatePicker";
import { useAuth, User, UserRole } from "@/context/AuthContext";
import { languageOptions, useLanguage } from "@/context/LanguageContext";
import { ambernathWards } from "@/data/mumbaiServices";
import { useAccountActions } from "@/hooks/useAccountActions";
import { profileCopy } from "@/i18n/profileCopy";
import { getUserErrorMessage } from "@/lib/api";

const ORANGE = "#EA580C";
const GREEN = "#059669";
const BG = "#EEF2F7";
const MAX_PROFILE_PHOTO_BYTES = 8 * 1024 * 1024;

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

function roleName(role: UserRole, language: Parameters<typeof profileCopy>[0]) {
  if (role === "nagarsevak") return profileCopy(language, "nagarsevak");
  if (role === "super_admin") return profileCopy(language, "superAdmin");
  return profileCopy(language, "citizen");
}

type FormState = {
  name: string;
  email: string;
  dob: string;
  address: string;
  ward: string;
  officeAddress: string;
  residenceAddress: string;
  officeTimings: string;
  contactName: string;
  contactNumber: string;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
  profilePhoto?: string | null;
};

function formFromUser(user: User): FormState {
  return {
    name: user.name || "",
    email: user.email || "",
    dob: user.dob || "",
    address: user.address || "",
    ward: user.ward || "",
    officeAddress: user.officeAddress || "",
    residenceAddress: user.residenceAddress || "",
    officeTimings: user.officeTimings || "",
    contactName: user.contactName || user.name || "",
    contactNumber: user.contactNumber || "",
    notifyEmail: !!user.notifyEmail,
    notifyWhatsapp: !!user.notifyWhatsapp,
    profilePhoto: user.profilePhoto ?? null,
  };
}

function DetailRow({ icon, label, value, verified }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string | null; verified?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}><Feather name={icon} size={16} color={ORANGE} /></View>
      <View style={styles.detailText}>
        <View style={styles.detailLabelRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          {verified ? <View style={styles.verifiedPill}><Feather name="check-circle" size={10} color={GREEN} /><Text style={styles.verifiedText}>Verified</Text></View> : null}
        </View>
        <Text style={styles.detailValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.card}>{children}</View></View>;
}

function InputField({ label, multiline, style, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        returnKeyType={multiline ? "default" : "next"}
        placeholderTextColor="#94A3B8"
        style={[styles.input, multiline && styles.multilineInput, style]}
      />
    </View>
  );
}

export default function CivicProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const accountActions = useAccountActions();
  const c = (key: Parameters<typeof profileCopy>[1]) => profileCopy(language, key);

  const [editVisible, setEditVisible] = useState(false);
  const [wardVisible, setWardVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<FormState | null>(user ? formFromUser(user) : null);

  useEffect(() => {
    if (user && !editVisible) setForm(formFromUser(user));
  }, [editVisible, user]);

  const roleLabel = useMemo(() => user ? roleName(user.role, language) : c("citizen"), [language, user]);
  const officialAccount = user?.role === "nagarsevak" || user?.role === "super_admin";
  const roleColor = officialAccount ? GREEN : ORANGE;
  const headerColors = officialAccount
    ? (["#14532D", "#16A34A", "#22C55E"] as const)
    : (["#9A3412", ORANGE, "#FB923C"] as const);

  if (!user || !form) {
    return (
      <View style={styles.emptyRoot}>
        <Feather name="lock" size={42} color="#94A3B8" />
        <Text style={styles.emptyTitle}>Login required</Text>
        <TouchableOpacity style={styles.primaryCompact} onPress={() => router.replace("/login" as any)}><Text style={styles.primaryCompactText}>Login</Text></TouchableOpacity>
      </View>
    );
  }

  const openEditor = () => {
    setForm(formFromUser(user));
    setFormError("");
    setSuccessMessage("");
    setEditVisible(true);
  };

  const pickPhoto = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError("Allow photo access to choose a profile image.");
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
      setFormError("Choose a JPEG, PNG or WebP profile image.");
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_PROFILE_PHOTO_BYTES) {
      setFormError("Choose a profile image smaller than 8MB.");
      return;
    }
    setForm((current) => current ? { ...current, profilePhoto: asset.uri } : current);
  };

  const saveProfile = async () => {
    if (saving) return;
    setFormError("");
    setSuccessMessage("");
    if (form.name.trim().split(/\s+/).filter(Boolean).length < 2) return setFormError(c("nameRequired"));
    if (!isValidEmail(form.email)) return setFormError(c("emailInvalid"));
    if (!isValidDob(form.dob)) return setFormError(c("dobInvalid"));
    if (!form.address.trim() && user.role === "citizen") return setFormError(c("addressRequired"));
    if (user.role !== "super_admin" && !form.ward) return setFormError(c("selectWard"));
    if (form.contactNumber && cleanMobile(form.contactNumber).length !== 10) return setFormError("Enter a valid 10-digit office contact number.");

    const wardWasChanged = !!user.ward && form.ward !== user.ward;
    setSaving(true);
    try {
      await updateUser({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        dob: form.dob || undefined,
        address: form.address.trim() || undefined,
        ward: user.role === "super_admin" ? user.ward : form.ward,
        wardChanged: user.wardChanged || wardWasChanged,
        officeAddress: officialAccount ? form.officeAddress.trim() || undefined : user.officeAddress,
        residenceAddress: officialAccount ? form.residenceAddress.trim() || undefined : user.residenceAddress,
        officeTimings: officialAccount ? form.officeTimings.trim() || undefined : user.officeTimings,
        contactName: officialAccount ? form.contactName.trim() || undefined : user.contactName,
        contactNumber: officialAccount ? cleanMobile(form.contactNumber) || undefined : user.contactNumber,
        notifyEmail: form.notifyEmail,
        notifyWhatsapp: form.notifyWhatsapp,
        profilePhoto: form.profilePhoto,
      });
      setEditVisible(false);
      setSuccessMessage(c("profileSaved"));
    } catch (error) {
      setFormError(getUserErrorMessage(error, c("profileSaveFailed")));
    } finally {
      setSaving(false);
    }
  };

  const officialRows = officialAccount ? [
    { icon: "briefcase" as const, label: c("designation"), value: user.officialDesignation || roleLabel },
    ...(user.role === "nagarsevak" ? [{ icon: "award" as const, label: c("nagarsevakId"), value: user.nagarsevakId }] : []),
    { icon: "check-circle" as const, label: c("approvalStatus"), value: user.approvalStatus || "approved" },
    ...(user.role === "nagarsevak" ? [{ icon: "map-pin" as const, label: c("ward"), value: user.ward }] : []),
    { icon: "home" as const, label: c("officeAddress"), value: user.officeAddress },
    { icon: "map" as const, label: c("residenceAddress"), value: user.residenceAddress },
    { icon: "clock" as const, label: c("officeTimings"), value: user.officeTimings },
    { icon: "user-check" as const, label: c("contactPerson"), value: user.contactName },
    { icon: "phone-call" as const, label: c("officeContact"), value: user.contactNumber ? `+91 ${cleanMobile(user.contactNumber)}` : undefined },
  ] : [];

  const actionTitle = accountActions.pendingAction === "logout" ? c("logoutTitle") : c("switchJobsTitle");
  const actionMessage = accountActions.pendingAction === "logout" ? c("logoutMessage") : c("switchJobsMessage");

  return (
    <View style={styles.root}>
      <LinearGradient colors={headerColors} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 14 }]}>
        <View style={styles.profileTop}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            {user.profilePhoto ? <Image source={{ uri: user.profilePhoto }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials(user.name)}</Text>}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.userName} numberOfLines={2}>{user.name}</Text>
            <View style={styles.rolePill}><Feather name={user.role === "citizen" ? "user" : "shield"} size={11} color="white" /><Text style={styles.roleText}>{roleLabel}</Text></View>
            <Text style={styles.headerSub}>{c("civicAccount")}</Text>
          </View>
          <TouchableOpacity style={styles.editHeaderButton} onPress={openEditor} accessibilityLabel={c("editProfile")}>
            <Feather name="edit-2" size={17} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <AppScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) + 86 }}>
        {successMessage ? <View style={styles.successBanner}><Feather name="check-circle" size={16} color={GREEN} /><Text style={styles.successText}>{successMessage}</Text></View> : null}

        <Section title={c("personalInfo")}>
          <DetailRow icon="user" label={c("fullName")} value={user.name} />
          <DetailRow icon="phone" label={c("mobile")} value={`+91 ${cleanMobile(user.mobile)}`} verified />
          <DetailRow icon="mail" label={c("email")} value={user.email || c("missing")} />
          <DetailRow icon="calendar" label={c("dob")} value={user.dob || c("missing")} />
          <DetailRow icon="home" label={c("address")} value={user.address || c("missing")} />
          {user.role !== "super_admin" ? <DetailRow icon="map-pin" label={c("ward")} value={user.ward || c("missing")} /> : null}
        </Section>

        {officialRows.length ? <Section title={c("officialInfo")}>{officialRows.map((row) => <DetailRow key={row.label} {...row} />)}</Section> : null}

        <Section title={c("preferences")}>
          <DetailRow icon="mail" label={c("emailNotifications")} value={user.notifyEmail ? c("notificationsOn") : c("notificationsOff")} />
          <DetailRow icon="message-circle" label={c("whatsappNotifications")} value={user.notifyWhatsapp ? c("notificationsOn") : c("notificationsOff")} />
          <DetailRow icon="globe" label={c("language")} value={languageOptions.find((option) => option.code === language)?.nativeLabel} />
        </Section>

        <Section title={c("accountInfo")}>
          <DetailRow icon="calendar" label={c("accountSince")} value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : c("missing")} />
          {officialAccount ? <DetailRow icon="shield" label={c("approvalStatus")} value={user.approvalStatus || "approved"} /> : null}
        </Section>

        <Section title={c("quickActions")}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/complaint/list" as any)}>
            <View style={styles.actionIcon}><Feather name="file-text" size={18} color={ORANGE} /></View><View style={styles.actionText}><Text style={styles.actionTitle}>{c("complaints")}</Text><Text style={styles.actionSub}>{c("complaintsSub")}</Text></View><Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/alert/list" as any)}>
            <View style={styles.actionIcon}><Feather name="bell" size={18} color={ORANGE} /></View><View style={styles.actionText}><Text style={styles.actionTitle}>{c("alerts")}</Text><Text style={styles.actionSub}>{c("alertsSub")}</Text></View><Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
          {user.role === "citizen" ? <TouchableOpacity style={styles.actionRow} onPress={accountActions.requestJobsPortal}>
            <View style={styles.actionIcon}><Feather name="briefcase" size={18} color={ORANGE} /></View><View style={styles.actionText}><Text style={styles.actionTitle}>{c("switchJobs")}</Text><Text style={styles.actionSub}>{c("switchJobsMessage")}</Text></View><Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity> : null}
          <TouchableOpacity style={styles.actionRow} onPress={() => setLanguageVisible(true)}>
            <View style={styles.actionIcon}><Feather name="globe" size={18} color={ORANGE} /></View><View style={styles.actionText}><Text style={styles.actionTitle}>{c("language")}</Text><Text style={styles.actionSub}>{languageOptions.find((option) => option.code === language)?.nativeLabel}</Text></View><Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
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
                <TouchableOpacity style={[styles.photoEdit, { backgroundColor: roleColor }]} onPress={pickPhoto} accessibilityLabel={c("editPhoto")}>
                  {form.profilePhoto ? <Image source={{ uri: form.profilePhoto }} style={styles.photoEditImage} /> : <Text style={styles.photoEditText}>{initials(form.name)}</Text>}
                  <View style={styles.photoCamera}><Feather name="camera" size={13} color="white" /></View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}><Text style={styles.actionTitle}>{c("editPhoto")}</Text><TouchableOpacity onPress={() => setForm((current) => current ? { ...current, profilePhoto: null } : current)}><Text style={styles.removePhotoText}>{c("removePhoto")}</Text></TouchableOpacity></View>
              </View>

              <InputField label={c("fullName")} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder={c("fullName")} autoCapitalize="words" maxLength={160} />
              <View style={styles.formGroup}><Text style={styles.formLabel}>{c("mobile")}</Text><View style={styles.readOnlyInput}><Feather name="lock" size={15} color="#64748B" /><Text style={styles.readOnlyText}>+91 {cleanMobile(user.mobile)}</Text><View style={styles.verifiedPill}><Feather name="check-circle" size={10} color={GREEN} /><Text style={styles.verifiedText}>{c("verified")}</Text></View></View><Text style={styles.helpText}>{c("readOnlyMobile")}</Text></View>
              <InputField label={c("email")} value={form.email} onChangeText={(email) => setForm({ ...form, email })} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" maxLength={190} />
              <View style={styles.formGroup}><DobDatePicker label={c("dob")} value={form.dob} onChange={(dob) => setForm({ ...form, dob })} placeholder={c("dob")} /></View>
              <InputField label={c("address")} value={form.address} onChangeText={(address) => setForm({ ...form, address })} placeholder={c("address")} multiline maxLength={1000} />

              {user.role !== "super_admin" ? <View style={styles.formGroup}><Text style={styles.formLabel}>{c("ward")}</Text><TouchableOpacity style={[styles.input, styles.pickerInput, user.wardChanged && styles.readOnlyDisabled]} onPress={() => !user.wardChanged && setWardVisible(true)} disabled={!!user.wardChanged}><Text style={styles.pickerValue}>{form.ward || c("selectWard")}</Text><Feather name={user.wardChanged ? "lock" : "chevron-down"} size={16} color="#64748B" /></TouchableOpacity><Text style={styles.helpText}>{user.wardChanged ? "Ward change has already been used for this account." : "Ward can be changed once after registration."}</Text></View> : null}

              {officialAccount ? <>
                <InputField label={c("officeAddress")} value={form.officeAddress} onChangeText={(officeAddress) => setForm({ ...form, officeAddress })} placeholder={c("officeAddress")} multiline maxLength={1000} />
                <InputField label={c("residenceAddress")} value={form.residenceAddress} onChangeText={(residenceAddress) => setForm({ ...form, residenceAddress })} placeholder={c("residenceAddress")} multiline maxLength={1000} />
                <InputField label={c("officeTimings")} value={form.officeTimings} onChangeText={(officeTimings) => setForm({ ...form, officeTimings })} placeholder="10:00 AM – 5:00 PM" maxLength={190} />
                <InputField label={c("contactPerson")} value={form.contactName} onChangeText={(contactName) => setForm({ ...form, contactName })} placeholder={c("contactPerson")} autoCapitalize="words" maxLength={150} />
                <InputField label={c("officeContact")} value={form.contactNumber} onChangeText={(contactNumber) => setForm({ ...form, contactNumber: contactNumber.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={10} />
              </> : null}

              <View style={styles.preferenceRow}><View style={styles.preferenceText}><Text style={styles.actionTitle}>{c("emailNotifications")}</Text></View><Switch value={form.notifyEmail} onValueChange={(notifyEmail) => setForm({ ...form, notifyEmail })} /></View>
              <View style={styles.preferenceRow}><View style={styles.preferenceText}><Text style={styles.actionTitle}>{c("whatsappNotifications")}</Text></View><Switch value={form.notifyWhatsapp} onValueChange={(notifyWhatsapp) => setForm({ ...form, notifyWhatsapp })} /></View>

              {formError ? <Text style={styles.errorText} accessibilityLiveRegion="assertive">{formError}</Text> : null}
              <View style={styles.editorActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditVisible(false)} disabled={saving}><Text style={styles.cancelText}>{c("cancel")}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={saveProfile} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <Feather name="check" size={16} color="white" />}<Text style={styles.saveText}>{saving ? c("saving") : c("save")}</Text></TouchableOpacity>
              </View>
            </AppScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={wardVisible} transparent animationType="slide" onRequestClose={() => setWardVisible(false)}>
        <View style={styles.modalOverlay}><View style={[styles.editorSheet, { maxHeight: "72%" }]}><View style={styles.sheetHandle} /><View style={styles.editorHeader}><Text style={styles.editorTitle}>{c("selectWard")}</Text><TouchableOpacity style={styles.closeButton} onPress={() => setWardVisible(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><AppScrollView contentContainerStyle={{ padding: 16 }}>{ambernathWards.map((ward) => <TouchableOpacity key={ward} style={[styles.optionRow, form.ward === ward && styles.optionActive]} onPress={() => { setForm({ ...form, ward }); setWardVisible(false); }}><Text style={[styles.optionText, form.ward === ward && styles.optionTextActive]}>{ward}</Text>{form.ward === ward ? <Feather name="check" size={16} color={ORANGE} /> : null}</TouchableOpacity>)}</AppScrollView></View></View>
      </Modal>

      <Modal visible={languageVisible} transparent animationType="slide" onRequestClose={() => setLanguageVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.editorSheet}><View style={styles.sheetHandle} /><View style={styles.editorHeader}><Text style={styles.editorTitle}>{c("language")}</Text><TouchableOpacity style={styles.closeButton} onPress={() => setLanguageVisible(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><View style={{ padding: 16 }}>{languageOptions.map((option) => <TouchableOpacity key={option.code} style={[styles.optionRow, language === option.code && styles.optionActive]} onPress={() => { setLanguage(option.code); setLanguageVisible(false); }}><View style={{ flex: 1 }}><Text style={styles.optionText}>{option.nativeLabel}</Text><Text style={styles.optionSub}>{option.label}</Text></View>{language === option.code ? <Feather name="check-circle" size={18} color={ORANGE} /> : null}</TouchableOpacity>)}</View></View></View>
      </Modal>

      <ConfirmActionModal
        visible={!!accountActions.pendingAction}
        title={actionTitle}
        message={actionMessage}
        confirmLabel={accountActions.pendingAction === "logout" ? c("logout") : c("switchNow")}
        cancelLabel={c("cancel")}
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
  primaryCompact: { marginTop: 18, minHeight: 46, backgroundColor: ORANGE, paddingHorizontal: 26, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryCompactText: { color: "white", fontFamily: "Inter_700Bold" },
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
  pickerInput: { flexDirection: "row", alignItems: "center" },
  pickerValue: { flex: 1, color: "#0F172A", fontSize: 14, fontFamily: "Inter_400Regular" },
  readOnlyDisabled: { opacity: 0.68 },
  preferenceRow: { minHeight: 56, flexDirection: "row", alignItems: "center", borderRadius: 14, backgroundColor: "#F8FAFC", paddingHorizontal: 14, marginBottom: 10 },
  preferenceText: { flex: 1 },
  errorText: { marginTop: 4, color: "#DC2626", fontSize: 12.5, lineHeight: 18, textAlign: "center", fontFamily: "Inter_600SemiBold" },
  editorActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelButton: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 14, fontFamily: "Inter_700Bold" },
  saveButton: { flex: 1.4, minHeight: 50, borderRadius: 14, backgroundColor: ORANGE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
  disabled: { opacity: 0.65 },
  optionRow: { minHeight: 54, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginBottom: 7, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  optionActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  optionText: { flex: 1, color: "#334155", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optionTextActive: { color: ORANGE },
  optionSub: { marginTop: 2, color: "#94A3B8", fontSize: 11, fontFamily: "Inter_400Regular" },
});
