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
  Text,
  TextInput,
  TouchableOpacity,
  View,
  InteractionManager,
  Keyboard,
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

  const acceptProfilePhoto = (asset?: ImagePicker.ImagePickerAsset | null) => {
    if (!asset) return;
    const mime = String(asset.mimeType || "").toLowerCase();
    if (mime && !["image/jpeg", "image/png", "image/webp"].includes(mime)) return setFormError("Choose a JPEG, PNG or WebP profile image.");
    if (asset.fileSize && asset.fileSize > MAX_PROFILE_PHOTO_BYTES) return setFormError("Choose a profile image smaller than 8MB.");
    setForm((current) => current ? { ...current, profilePhoto: asset.uri } : current);
  };
  const pickPhotoFromGallery = async () => {
    setFormError("");
    if (Platform.OS !== "web") { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return setFormError("Allow photo access to choose a profile image."); }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.55 });
    acceptProfilePhoto(result.canceled ? null : result.assets[0]);
  };
  const pickPhotoFromCamera = async () => {
    setFormError("");
    if (Platform.OS === "web") return pickPhotoFromGallery();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setFormError("Allow camera access to take a profile photo.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.55 });
    acceptProfilePhoto(result.canceled ? null : result.assets[0]);
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
        profilePhoto: form.profilePhoto,
      });

      // Dismiss keyboard and wait for native interactions to finish before changing layout state
      Keyboard.dismiss();
      InteractionManager.runAfterInteractions(() => {
        setEditVisible(false);
        setSuccessMessage(c("profileSaved"));
        setSaving(false);
      });
    } catch (error) {
      InteractionManager.runAfterInteractions(() => {
        setFormError(getUserErrorMessage(error, c("profileSaveFailed")));
        setSaving(false);
      });
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
          <DetailRow icon="globe" label={c("language")} value={languageOptions.find((option) => option.code === language)?.nativeLabel} />
        </Section>

        <Section title={c("accountInfo")}>
          <DetailRow icon="calendar" label={c("accountSince")} value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : c("missing")} />
          {officialAccount ? <DetailRow icon="shield" label={c("approvalStatus")} value={user.approvalStatus || "approved"} /> : null}
        </Section>

        <Section title={c("quickActions")}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/complaint/list" as any)}>
            <View style={styles.actionIcon}><Feather name="file-text" size={18} color={ORANGE} /></View><View style={styles.actionText}><Text style={styles.actionTitle}>{c("complaints")}</Text><T
