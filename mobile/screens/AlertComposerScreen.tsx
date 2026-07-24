import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { AlertLanguage, AlertPriority, AlertStatus, AlertType, useAlerts } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { NAGARSEVAK_WARDS } from "@/data/wards";
import { alertComposerCopy } from "@/i18n/alertComposerCopy";
import { getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const ORANGE = "#EA580C";
const BG = "#EEF2F7";

type PublishMode = "published" | "scheduled" | "draft";

type ImageAsset = {
  uri: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
};

const TYPE_OPTIONS: Array<{ key: AlertType; icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = [
  { key: "alert", icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2" },
  { key: "news", icon: "radio", color: "#166534", bg: "#DCFCE7" },
  { key: "emergency", icon: "alert-octagon", color: "#B91C1C", bg: "#FEE2E2" },
];

const PRIORITY_OPTIONS: AlertPriority[] = ["normal", "important", "urgent"];
const LANGUAGE_OPTIONS: AlertLanguage[] = ["en", "mr", "hi"];
const MODE_OPTIONS: PublishMode[] = ["published", "scheduled", "draft"];

function parseLocalDate(value: string): Date | null | undefined {
  const text = value.trim();
  if (!text) return null;
  const normalized = text.includes("T") ? text : text.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function typeLabel(type: AlertType, c: (key: Parameters<typeof alertComposerCopy>[1]) => string) {
  return c(type);
}

function priorityLabel(priority: AlertPriority, c: (key: Parameters<typeof alertComposerCopy>[1]) => string) {
  if (priority === "high") return c("urgent");
  return c(priority);
}

function languageLabel(language: AlertLanguage) {
  if (language === "mr") return "मराठी";
  if (language === "hi") return "हिंदी";
  return "English";
}

function modeLabel(mode: PublishMode, c: (key: Parameters<typeof alertComposerCopy>[1]) => string) {
  if (mode === "scheduled") return c("scheduled");
  if (mode === "draft") return c("draft");
  return c("immediate");
}

function ChoiceButton({ active, label, icon, color = ORANGE, background = "#FFF7ED", onPress }: {
  active: boolean;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  color?: string;
  background?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.choice, active && { borderColor: color, backgroundColor: background }]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {icon ? <Feather name={icon} size={14} color={active ? color : "#64748B"} /> : null}
      <Text style={[styles.choiceText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AlertComposerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language: interfaceLanguage } = useLanguage();
  const { addAlert } = useAlerts();
  const c = (key: Parameters<typeof alertComposerCopy>[1]) => alertComposerCopy(interfaceLanguage, key);

  const isSuperAdmin = user?.role === "super_admin" || !!user?.isSuperAdmin;
  const canPublish = isSuperAdmin || user?.role === "nagarsevak";

  const [type, setType] = useState<AlertType>("news");
  const [priority, setPriority] = useState<AlertPriority>("normal");
  const [contentLanguage, setContentLanguage] = useState<AlertLanguage>(interfaceLanguage);
  const [mode, setMode] = useState<PublishMode>("published");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "ward">(isSuperAdmin ? "all" : "ward");
  const [ward, setWard] = useState(user?.ward || "");
  const [publishAtText, setPublishAtText] = useState("");
  const [expiryText, setExpiryText] = useState("");
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [wardVisible, setWardVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const theme = TYPE_OPTIONS.find((item) => item.key === type) || TYPE_OPTIONS[0];
  const effectiveWard = isSuperAdmin ? (audience === "all" ? undefined : ward) : user?.ward;

  const previewMeta = useMemo(() => [
    typeLabel(type, c),
    priorityLabel(priority, c),
    languageLabel(contentLanguage),
    effectiveWard || c("allCitizens"),
    modeLabel(mode, c),
  ].join(" · "), [contentLanguage, effectiveWard, interfaceLanguage, mode, priority, type]);

  if (!canPublish) {
    return (
      <View style={styles.blocked}>
        <Feather name="shield-off" size={42} color="#94A3B8" />
        <Text style={styles.blockedTitle}>Publishing unavailable</Text>
        <Text style={styles.blockedText}>Only an approved Nagarsevak or Super Admin can publish official updates.</Text>
        <TouchableOpacity style={styles.blockedButton} onPress={() => router.replace("/alert/list" as any)}><Text style={styles.blockedButtonText}>{c("back")}</Text></TouchableOpacity>
      </View>
    );
  }

  const pickImage = async () => {
    setError("");
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return setError(c("permission"));
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.65,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const fileName = asset.fileName || `official_update_${Date.now()}.jpg`;
    const extension = fileName.split(".").pop()?.toLowerCase();
    const mimeType = String(asset.mimeType || (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg")).toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return setError(c("imageUnsupported"));
    if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) return setError(c("imageTooLarge"));
    setImage({ uri: asset.uri, fileName, mimeType, fileSize: asset.fileSize });
  };

  const validate = () => {
    if (title.trim().length < 3 || body.trim().length < 5) return c("required");
    if (isSuperAdmin && audience === "ward" && !ward) return c("ward");
    const publishAt = parseLocalDate(publishAtText);
    const expiresAt = parseLocalDate(expiryText);
    if (mode === "scheduled" && (!publishAt || publishAt === undefined || publishAt.getTime() <= Date.now())) return c("invalidSchedule");
    if (expiryText && (!expiresAt || expiresAt === undefined || expiresAt.getTime() <= Date.now())) return c("invalidExpiry");
    const effectivePublishTime = mode === "scheduled" && publishAt instanceof Date ? publishAt.getTime() : Date.now();
    if (expiresAt instanceof Date && expiresAt.getTime() <= effectivePublishTime) return c("expiryBeforePublish");
    return "";
  };

  const submit = async () => {
    if (submitting) return;
    const validation = validate();
    if (validation) return setError(validation);
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const publishAt = parseLocalDate(publishAtText);
      const expiresAt = parseLocalDate(expiryText);
      await addAlert({
        title: title.trim(),
        body: body.trim(),
        type,
        priority,
        language: contentLanguage,
        status: mode as AlertStatus,
        publishAt: publishAt instanceof Date ? publishAt.toISOString() : undefined,
        expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : undefined,
        validUntil: expiresAt instanceof Date ? expiresAt.toLocaleString("en-IN") : undefined,
        targetAudience: effectiveWard ? "Ward residents" : "All citizens",
        location: effectiveWard,
        media: image ? { uri: image.uri, type: "image", fileName: image.fileName, mimeType: image.mimeType } : undefined,
      }, user?.name || "Connect-T", user?.id, effectiveWard);
      setSuccess(c("success"));
      setTimeout(() => router.replace("/alert/list" as any), 650);
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, c("failure")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 10 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace("/alert/list" as any)}><Feather name="chevron-left" size={20} color="white" /><Text style={styles.backText}>{c("back")}</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{c("title")}</Text>
        <Text style={styles.headerSub}>{c("subtitle")}</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <AppScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 36 }]} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
          {!isSuperAdmin ? <View style={styles.scope}><Feather name="shield" size={15} color="#166534" /><Text style={styles.scopeText}>{c("scopeOfficer")} {user?.ward ? `(${user.ward})` : ""}</Text></View> : null}

          <Text style={styles.label}>{c("type")}</Text>
          <View style={styles.choices}>{TYPE_OPTIONS.map((item) => <ChoiceButton key={item.key} active={type === item.key} label={typeLabel(item.key, c)} icon={item.icon} color={item.color} background={item.bg} onPress={() => setType(item.key)} />)}</View>

          <Text style={styles.label}>{c("headline")} *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={c("headlinePlaceholder")} placeholderTextColor="#94A3B8" returnKeyType="next" maxLength={255} />
          <Text style={styles.counter}>{title.length}/255</Text>

          <Text style={styles.label}>{c("message")} *</Text>
          <TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={setBody} placeholder={c("messagePlaceholder")} placeholderTextColor="#94A3B8" multiline textAlignVertical="top" maxLength={10000} />
          <Text style={styles.counter}>{body.length}/10000</Text>

          <Text style={styles.label}>{c("priority")}</Text>
          <View style={styles.choices}>{PRIORITY_OPTIONS.map((item) => <ChoiceButton key={item} active={priority === item} label={priorityLabel(item, c)} onPress={() => setPriority(item)} />)}</View>

          <Text style={styles.label}>{c("language")}</Text>
          <View style={styles.choices}>{LANGUAGE_OPTIONS.map((item) => <ChoiceButton key={item} active={contentLanguage === item} label={languageLabel(item)} onPress={() => setContentLanguage(item)} />)}</View>

          {isSuperAdmin ? <>
            <Text style={styles.label}>{c("audience")}</Text>
            <View style={styles.choices}><ChoiceButton active={audience === "all"} label={c("allCitizens")} icon="users" onPress={() => setAudience("all")} /><ChoiceButton active={audience === "ward"} label={c("wardResidents")} icon="map-pin" onPress={() => setAudience("ward")} /></View>
            {audience === "ward" ? <><Text style={styles.label}>{c("ward")}</Text><TouchableOpacity style={[styles.input, styles.picker]} onPress={() => setWardVisible(true)}><Text style={[styles.pickerText, !ward && { color: "#94A3B8" }]}>{ward || c("ward")}</Text><Feather name="chevron-down" size={16} color="#64748B" /></TouchableOpacity></> : null}
          </> : null}

          <Text style={styles.label}>{c("schedule")}</Text>
          <View style={styles.choices}>{MODE_OPTIONS.map((item) => <ChoiceButton key={item} active={mode === item} label={modeLabel(item, c)} icon={item === "draft" ? "file" : item === "scheduled" ? "clock" : "send"} onPress={() => setMode(item)} />)}</View>
          {mode === "scheduled" ? <><Text style={styles.label}>{c("publishAt")} *</Text><TextInput style={styles.input} value={publishAtText} onChangeText={setPublishAtText} placeholder="2026-08-15 10:30" placeholderTextColor="#94A3B8" autoCapitalize="none" /><Text style={styles.help}>{c("dateHint")}</Text></> : null}
          {mode !== "draft" ? <><Text style={styles.label}>{c("expiry")}</Text><TextInput style={styles.input} value={expiryText} onChangeText={setExpiryText} placeholder="2026-08-16 18:00" placeholderTextColor="#94A3B8" autoCapitalize="none" /><Text style={styles.help}>{c("dateHint")}</Text></> : null}

          <Text style={styles.label}>{c("image")}</Text>
          {image ? <View style={styles.imagePreview}><Image source={{ uri: image.uri }} style={styles.previewImage} /><TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)} accessibilityLabel={c("removeImage")}><Feather name="x" size={17} color="white" /></TouchableOpacity></View> : <TouchableOpacity style={styles.imagePicker} onPress={pickImage}><Feather name="image" size={22} color={ORANGE} /><Text style={styles.imagePickerTitle}>{c("chooseImage")}</Text><Text style={styles.imagePickerSub}>JPEG, PNG or WebP · max 8MB</Text></TouchableOpacity>}

          <View style={[styles.previewCard, { borderColor: `${theme.color}40` }]}>
            <View style={styles.previewHeader}><View style={[styles.previewIcon, { backgroundColor: theme.bg }]}><Feather name={theme.icon} size={18} color={theme.color} /></View><View style={{ flex: 1 }}><Text style={styles.previewType}>{typeLabel(type, c)}</Text><Text style={styles.previewMeta}>{previewMeta}</Text></View></View>
            <Text style={styles.previewTitle}>{title.trim() || c("headlinePlaceholder")}</Text>
            <Text style={styles.previewBody} numberOfLines={4}>{body.trim() || c("messagePlaceholder")}</Text>
            {image ? <Image source={{ uri: image.uri }} style={styles.previewThumb} /> : null}
          </View>

          {error ? <Text style={styles.error} accessibilityLiveRegion="assertive">{error}</Text> : null}
          {success ? <Text style={styles.success} accessibilityLiveRegion="polite">{success}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={submitting}><Text style={styles.cancelText}>{c("cancel")}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.previewButton} onPress={() => setPreviewVisible(true)} disabled={submitting}><Feather name="eye" size={16} color={ORANGE} /><Text style={styles.previewButtonText}>{c("preview")}</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.submitButton, submitting && styles.disabled]} onPress={submit} disabled={submitting}>{submitting ? <ActivityIndicator color="white" /> : <Feather name={mode === "draft" ? "save" : mode === "scheduled" ? "clock" : "send"} size={17} color="white" />}<Text style={styles.submitText}>{submitting ? "Saving..." : mode === "draft" ? c("draftButton") : mode === "scheduled" ? c("scheduleButton") : c("publish")}</Text></TouchableOpacity>
        </AppScrollView>
      </KeyboardAvoidingView>

      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.modalOverlay} accessibilityViewIsModal><View style={styles.modalCard}><View style={[styles.previewIcon, { backgroundColor: theme.bg }]}><Feather name={theme.icon} size={24} color={theme.color} /></View><Text style={styles.modalTitle}>{title.trim() || c("headlinePlaceholder")}</Text><Text style={styles.modalBody}>{body.trim() || c("messagePlaceholder")}</Text>{image ? <Image source={{ uri: image.uri }} style={styles.modalImage} /> : null}<Text style={styles.previewMeta}>{previewMeta}</Text><TouchableOpacity style={styles.closeButton} onPress={() => setPreviewVisible(false)}><Text style={styles.closeText}>{c("close")}</Text></TouchableOpacity></View></View>
      </Modal>

      <Modal visible={wardVisible} transparent animationType="slide" onRequestClose={() => setWardVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.wardSheet}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{c("ward")}</Text><TouchableOpacity style={styles.sheetClose} onPress={() => setWardVisible(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><AppScrollView contentContainerStyle={{ padding: 14 }}>{NAGARSEVAK_WARDS.map((item) => <TouchableOpacity key={item} style={[styles.wardRow, ward === item && styles.wardActive]} onPress={() => { setWard(item); setWardVisible(false); }}><Text style={[styles.wardText, ward === item && { color: ORANGE }]}>{item}</Text>{ward === item ? <Feather name="check" size={16} color={ORANGE} /> : null}</TouchableOpacity>)}</AppScrollView></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  blocked: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: BG },
  blockedTitle: { marginTop: 12, color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" },
  blockedText: { marginTop: 6, color: "#64748B", fontSize: 12, lineHeight: 18, textAlign: "center", fontFamily: "Inter_400Regular" },
  blockedButton: { marginTop: 16, minHeight: 46, borderRadius: 14, backgroundColor: GREEN, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" },
  blockedButtonText: { color: "white", fontFamily: "Inter_700Bold" },
  header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  headerTitle: { marginTop: 8, color: "white", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontSize: 11.5, fontFamily: "Inter_400Regular" },
  content: { padding: 16 },
  scope: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 14, padding: 11, backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#BBF7D0" },
  scopeText: { flex: 1, color: "#166534", fontSize: 10.5, lineHeight: 16, fontFamily: "Inter_500Medium" },
  label: { marginTop: 15, marginBottom: 7, color: "#64748B", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "white" },
  choiceText: { color: "#64748B", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "white", paddingHorizontal: 14, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 118, paddingTop: 13, paddingBottom: 13 },
  counter: { marginTop: 4, color: "#94A3B8", fontSize: 9.5, textAlign: "right", fontFamily: "Inter_400Regular" },
  help: { marginTop: 5, color: "#94A3B8", fontSize: 9.7, lineHeight: 14, fontFamily: "Inter_400Regular" },
  picker: { flexDirection: "row", alignItems: "center" },
  pickerText: { flex: 1, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_500Medium" },
  imagePicker: { minHeight: 118, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#FED7AA", backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  imagePickerTitle: { marginTop: 7, color: ORANGE, fontSize: 12, fontFamily: "Inter_700Bold" },
  imagePickerSub: { marginTop: 3, color: "#94A3B8", fontSize: 9.7, fontFamily: "Inter_400Regular" },
  imagePreview: { height: 190, borderRadius: 17, overflow: "hidden", backgroundColor: "#F1F5F9" },
  previewImage: { width: "100%", height: "100%" },
  removeImage: { position: "absolute", top: 10, right: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(220,38,38,0.92)", alignItems: "center", justifyContent: "center" },
  previewCard: { marginTop: 18, borderRadius: 17, borderWidth: 1.5, backgroundColor: "white", padding: 14 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  previewType: { color: "#0F172A", fontSize: 12, fontFamily: "Inter_700Bold" },
  previewMeta: { marginTop: 3, color: "#94A3B8", fontSize: 9.5, lineHeight: 14, fontFamily: "Inter_400Regular" },
  previewTitle: { marginTop: 12, color: "#0F172A", fontSize: 16, lineHeight: 21, fontFamily: "Inter_700Bold" },
  previewBody: { marginTop: 6, color: "#475569", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  previewThumb: { marginTop: 10, width: "100%", height: 130, borderRadius: 13, backgroundColor: "#F1F5F9" },
  error: { marginTop: 14, color: "#DC2626", fontSize: 11.5, lineHeight: 17, textAlign: "center", fontFamily: "Inter_600SemiBold" },
  success: { marginTop: 14, color: "#166534", fontSize: 11.5, textAlign: "center", fontFamily: "Inter_600SemiBold" },
  actions: { marginTop: 16, flexDirection: "row", gap: 9 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 12.5, fontFamily: "Inter_700Bold" },
  previewButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  previewButtonText: { color: ORANGE, fontSize: 12.5, fontFamily: "Inter_700Bold" },
  submitButton: { marginTop: 10, minHeight: 52, borderRadius: 15, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitText: { color: "white", fontSize: 13.5, fontFamily: "Inter_700Bold" },
  disabled: { opacity: 0.65 },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22, backgroundColor: "rgba(15,23,42,0.6)" },
  modalCard: { width: "100%", maxWidth: 380, borderRadius: 24, backgroundColor: "white", padding: 21, alignItems: "center" },
  modalTitle: { marginTop: 11, color: "#0F172A", fontSize: 19, lineHeight: 25, textAlign: "center", fontFamily: "Inter_700Bold" },
  modalBody: { marginTop: 9, color: "#475569", fontSize: 12.5, lineHeight: 19, textAlign: "center", fontFamily: "Inter_400Regular" },
  modalImage: { marginTop: 12, width: "100%", height: 170, borderRadius: 14, backgroundColor: "#F1F5F9" },
  closeButton: { marginTop: 18, minWidth: 130, minHeight: 46, borderRadius: 14, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  closeText: { color: "white", fontSize: 12.5, fontFamily: "Inter_700Bold" },
  wardSheet: { width: "100%", maxHeight: "76%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "white", overflow: "hidden", alignSelf: "flex-end", position: "absolute", bottom: 0 },
  sheetHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  sheetTitle: { flex: 1, color: "#0F172A", fontSize: 17, fontFamily: "Inter_700Bold" },
  sheetClose: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  wardRow: { minHeight: 52, flexDirection: "row", alignItems: "center", borderRadius: 13, paddingHorizontal: 13, marginBottom: 6, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  wardActive: { borderColor: "#FED7AA", backgroundColor: "#FFF7ED" },
  wardText: { flex: 1, color: "#334155", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
