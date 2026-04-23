import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Platform, Alert as RNAlert, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { AlertMedia, AlertPriority, AlertType, useAlerts } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";

const MAX_VIDEO_MS = 120000;
const ALERT_ACTIVE_MS = 12 * 60 * 60 * 1000;

const categories = ["Civic", "Water", "Electricity", "Road", "Health", "Event"];
const audiences = ["Ward residents", "All citizens"];

function DropdownSelect({
  label,
  value,
  options,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.dropdownBlock}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.dropdownBtn, open && styles.dropdownBtnOpen]} onPress={onToggle} activeOpacity={0.85}>
        <Text style={styles.dropdownValue}>{value}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color="#64748B" />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {options.map((item) => {
            const active = value === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                onPress={() => onSelect(item)}
                activeOpacity={0.85}
              >
                <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{item}</Text>
                {active && <Feather name="check" size={15} color="#EA580C" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${message}`);
  } else {
    RNAlert.alert(title, message);
  }
}

function formatValidUntil(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NewAlertScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 54 : insets.top;
  const { addAlert } = useAlerts();
  const { user } = useAuth();
  const [type, setType] = useState<AlertType>("alert");
  const [priority, setPriority] = useState<AlertPriority>("important");
  const [category, setCategory] = useState("Civic");
  const [targetAudience, setTargetAudience] = useState("Ward residents");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState(user?.ward || "");
  const [contact, setContact] = useState("");
  const [media, setMedia] = useState<AlertMedia | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [expiresAt] = useState(() => new Date(Date.now() + ALERT_ACTIVE_MS).toISOString());
  const validUntilLabel = formatValidUntil(expiresAt);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  const pickMedia = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage("Permission required", "Allow photo library access to attach a photo or video.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.85,
      videoMaxDuration: 120,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const selectedType = asset.type === "video" ? "video" : "image";

    if (selectedType === "video" && typeof asset.duration === "number" && asset.duration > MAX_VIDEO_MS) {
      showMessage("Video too long", "Please select a video of 2 minutes or less.");
      return;
    }

    setMedia({
      uri: asset.uri,
      type: selectedType,
      fileName: asset.fileName || undefined,
      mimeType: asset.mimeType || undefined,
      duration: asset.duration || undefined,
    });
  };

  const submit = () => {
    if (!canSubmit) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addAlert({
      title: title.trim(),
      body: contact.trim() ? `${body.trim()}\n\nContact: ${contact.trim()}` : body.trim(),
      type,
      priority,
      category,
      targetAudience,
      location: location.trim(),
      validUntil: validUntilLabel,
      expiresAt,
      media,
    }, user?.name || "Nagarsevak", user?.id, targetAudience === "Ward residents" ? user?.ward : undefined);
    router.back();
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#166534", "#16A34A", "#22C55E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
            <Feather name="chevron-left" size={20} color="white" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.headerPill}>
            <Feather name="radio" size={12} color="#DCFCE7" />
            <Text style={styles.headerPillText}>Broadcast</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Post Alert / News</Text>
        <Text style={styles.headerSub}>Create a detailed public update with photo or video attachment.</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Type</Text>
          <View style={styles.segmentRow}>
            {(["alert", "news"] as AlertType[]).map((item) => {
              const active = type === item;
              const color = item === "alert" ? "#DC2626" : "#EA580C";
              return (
                <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.segmentBtn, active && { borderColor: color, backgroundColor: color + "12" }]} activeOpacity={0.85}>
                  <Feather name={item === "alert" ? "alert-triangle" : "radio"} size={16} color={active ? color : "#94A3B8"} />
                  <Text style={[styles.segmentText, active && { color }]}>{item === "alert" ? "Alert" : "News"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Priority</Text>
          <View style={styles.chipRow}>
            {(["normal", "important", "urgent"] as AlertPriority[]).map((item) => (
              <TouchableOpacity key={item} onPress={() => setPriority(item)} style={[styles.chip, priority === item && styles.chipActive]} activeOpacity={0.85}>
                <Text style={[styles.chipText, priority === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Water supply cut tomorrow" placeholderTextColor="#CBD5E1" maxLength={100} />
          <Text style={styles.label}>Detailed message</Text>
          <TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={setBody} placeholder="Explain what happened, affected area, timing, and citizen instructions..." placeholderTextColor="#CBD5E1" multiline textAlignVertical="top" maxLength={900} />
          <View style={styles.twoCol}>
            <View style={styles.half}>
              <Text style={styles.label}>Area / Ward</Text>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Ward or area" placeholderTextColor="#CBD5E1" maxLength={80} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Valid until</Text>
              <View style={styles.readOnlyBox}>
                <Feather name="clock" size={14} color="#EA580C" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.readOnlyValue}>{validUntilLabel}</Text>
                  <Text style={styles.readOnlyHint}>Post valid for 12 hours</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.label}>Helpline / contact optional</Text>
          <TextInput style={styles.input} value={contact} onChangeText={setContact} placeholder="Phone number or office contact" placeholderTextColor="#CBD5E1" keyboardType="phone-pad" maxLength={60} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Category & audience</Text>
          <DropdownSelect
            label="Category"
            value={category}
            options={categories}
            open={categoryOpen}
            onToggle={() => {
              setCategoryOpen((prev) => !prev);
              setAudienceOpen(false);
            }}
            onSelect={(item) => {
              setCategory(item);
              setCategoryOpen(false);
            }}
          />
          <DropdownSelect
            label="Audience"
            value={targetAudience}
            options={audiences}
            open={audienceOpen}
            onToggle={() => {
              setAudienceOpen((prev) => !prev);
              setCategoryOpen(false);
            }}
            onSelect={(item) => {
              setTargetAudience(item);
              setAudienceOpen(false);
            }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Photo / Video</Text>
          <Text style={styles.helperText}>Attach one photo or one video. Videos must be 2 minutes or less.</Text>
          {media ? (
            <View style={styles.mediaPreview}>
              {media.type === "image" ? (
                <Image source={{ uri: media.uri }} style={styles.mediaImage} />
              ) : (
                <View style={styles.videoPreview}>
                  <Feather name="play-circle" size={42} color="#EA580C" />
                  <Text style={styles.videoPreviewText}>Video selected · max 2 minutes</Text>
                </View>
              )}
              <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setMedia(null)} activeOpacity={0.85}>
                <Feather name="x" size={14} color="#DC2626" />
                <Text style={styles.removeMediaText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={pickMedia} activeOpacity={0.85}>
              <View style={styles.uploadIcon}>
                <Feather name="upload-cloud" size={24} color="#EA580C" />
              </View>
              <Text style={styles.uploadTitle}>Add photo or video</Text>
              <Text style={styles.uploadSub}>Photo JPG/PNG or video up to 2 minutes</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitBtn, !canSubmit && { opacity: 0.45 }]} onPress={submit} disabled={!canSubmit} activeOpacity={0.9}>
            <LinearGradient colors={["#C2410C", "#EA580C"]} style={styles.submitGrad}>
              <Feather name="send" size={16} color="white" />
              <Text style={styles.submitText}>Broadcast</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingRight: 10 },
  backText: { fontSize: 14, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  headerPillText: { fontSize: 11, fontWeight: "800", color: "#DCFCE7", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.76)", fontFamily: "Inter_400Regular", marginTop: 5, lineHeight: 18 },
  scroll: { flex: 1 },
  content: { padding: 14, gap: 12 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#166534", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 12 },
  segmentRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  segmentBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  segmentText: { fontSize: 14, fontWeight: "900", color: "#94A3B8", fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontWeight: "900", color: "#475569", fontFamily: "Inter_700Bold", marginBottom: 7, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: "#FFF7ED", borderColor: "#EA580C" },
  chipText: { fontSize: 12, color: "#64748B", fontWeight: "800", fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  chipTextActive: { color: "#C2410C" },
  dropdownBlock: { marginBottom: 12 },
  dropdownBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 13, backgroundColor: "#FFFFFF" },
  dropdownBtnOpen: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  dropdownValue: { fontSize: 14, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  dropdownMenu: { marginTop: 7, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, backgroundColor: "white", overflow: "hidden" },
  dropdownOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 13, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  dropdownOptionActive: { backgroundColor: "#FFF7ED" },
  dropdownOptionText: { fontSize: 13, fontWeight: "700", color: "#475569", fontFamily: "Inter_700Bold" },
  dropdownOptionTextActive: { color: "#C2410C" },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", backgroundColor: "#FFFFFF", marginBottom: 10, outlineWidth: 0 } as any,
  readOnlyBox: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: "#FED7AA", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#FFF7ED", marginBottom: 10 },
  readOnlyValue: { fontSize: 13, fontWeight: "900", color: "#C2410C", fontFamily: "Inter_700Bold" },
  readOnlyHint: { fontSize: 10, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_700Bold", marginTop: 1 },
  textArea: { minHeight: 128, lineHeight: 20 },
  twoCol: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  helperText: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 12 },
  uploadBox: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "#FDBA74", backgroundColor: "#FFF7ED", borderRadius: 18, minHeight: 138, alignItems: "center", justifyContent: "center", padding: 16 },
  uploadIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "white", marginBottom: 10 },
  uploadTitle: { fontSize: 15, fontWeight: "900", color: "#C2410C", fontFamily: "Inter_700Bold" },
  uploadSub: { fontSize: 11, color: "#EA580C", fontFamily: "Inter_400Regular", marginTop: 3, textAlign: "center" },
  mediaPreview: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  mediaImage: { width: "100%", height: 180 },
  videoPreview: { height: 150, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFF7ED" },
  videoPreviewText: { fontSize: 12, fontWeight: "800", color: "#EA580C", fontFamily: "Inter_700Bold" },
  removeMediaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, backgroundColor: "white" },
  removeMediaText: { fontSize: 13, fontWeight: "900", color: "#DC2626", fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  cancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: "center", backgroundColor: "white", borderWidth: 1.5, borderColor: "#E2E8F0" },
  cancelText: { fontSize: 14, fontWeight: "900", color: "#64748B", fontFamily: "Inter_700Bold" },
  submitBtn: { flex: 2, borderRadius: 16, overflow: "hidden" },
  submitGrad: { paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  submitText: { fontSize: 14, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
});