import { AppScrollView } from "@/components/AppScrollView";
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, Modal, Platform, ActivityIndicator, Keyboard, KeyboardAvoidingView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useComplaints, ComplaintCategory, ComplaintPhotoAsset } from "@/context/ComplaintContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getUserErrorMessage } from "@/lib/api";

const ORANGE = "#EA580C";
const GREEN = "#059669";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const categoryLabelKeys: Record<string, string> = {
  roads: "roads", water: "waterSupply", electricity: "electricity", garbage: "garbage",
  drainage: "drainage", streetlight: "streetLight", encroachment: "encroachment", other: "other",
};

const categories: { id: ComplaintCategory; icon: string; color: string; bg: string }[] = [
  { id: "roads", icon: "truck", color: "#92400E", bg: "#FEF3C7" },
  { id: "water", icon: "droplet", color: "#0369A1", bg: "#BAE6FD" },
  { id: "electricity", icon: "zap", color: "#D97706", bg: "#FEF3C7" },
  { id: "garbage", icon: "trash-2", color: "#059669", bg: "#D1FAE5" },
  { id: "drainage", icon: "git-merge", color: "#0EA5E9", bg: "#FFF7ED" },
  { id: "streetlight", icon: "sun", color: "#7C3AED", bg: "#EDE9FE" },
  { id: "encroachment", icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2" },
  { id: "other", icon: "more-horizontal", color: "#475569", bg: "#F1F5F9" },
];

type NoticeTone = "info" | "success" | "danger";
type NoticeState = { visible: boolean; title: string; message: string; tone: NoticeTone; onDone?: () => void };

function NoticeModal({ notice, onClose }: { notice: NoticeState; onClose: () => void }) {
  const color = notice.tone === "success" ? GREEN : notice.tone === "danger" ? "#DC2626" : ORANGE;
  const bg = notice.tone === "success" ? "#D1FAE5" : notice.tone === "danger" ? "#FEE2E2" : "#FFF7ED";
  const icon = notice.tone === "success" ? "check-circle" : notice.tone === "danger" ? "alert-circle" : "info";
  const close = () => notice.onDone ? notice.onDone() : onClose();
  return (
    <Modal visible={notice.visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.modalNoticeOverlay}>
        <View style={styles.modalNoticeCard}>
          <View style={[styles.modalNoticeIcon, { backgroundColor: bg }]}><Feather name={icon as any} size={28} color={color} /></View>
          <Text style={styles.modalNoticeTitle}>{notice.title}</Text>
          <Text style={styles.modalNoticeText}>{notice.message}</Text>
          <TouchableOpacity style={[styles.modalNoticeBtn, { backgroundColor: color }]} onPress={close} activeOpacity={0.85} accessibilityRole="button"><Text style={styles.modalNoticeBtnText}>OK</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

function makeRequestId() {
  return `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export default function NewComplaintScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { addComplaint } = useComplaints();
  const { user } = useAuth();
  const { t } = useLanguage();
  const keyboardVisible = useKeyboardVisible();
  const requestIdRef = useRef(makeRequestId());

  const [photoAsset, setPhotoAsset] = useState<ComplaintPhotoAsset>();
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState>({ visible: false, title: "", message: "", tone: "info" });

  const verifiedMobile = String(user?.mobile || "").replace(/\D/g, "").slice(-10);
  const showNotice = (titleText: string, messageText: string, tone: NoticeTone = "info", onDone?: () => void) => setNotice({ visible: true, title: titleText, message: messageText, tone, onDone });
  const closeNotice = () => setNotice((previous) => ({ ...previous, visible: false, onDone: undefined }));

  const acceptPhoto = (asset: ImagePicker.ImagePickerAsset) => {
    const mimeType = String(asset.mimeType || "").toLowerCase();
    const fileName = asset.fileName || `complaint_${Date.now()}.jpg`;
    const extension = fileName.split(".").pop()?.toLowerCase();
    const inferredMime = mimeType || (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : ["jpg", "jpeg"].includes(extension || "") ? "image/jpeg" : "");
    if (!["image/jpeg", "image/png", "image/webp"].includes(inferredMime)) {
      showNotice("Unsupported image", "Choose a JPEG, PNG or WebP image.", "danger");
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      showNotice("Image too large", "Choose an image smaller than 8MB. Camera photos are compressed automatically.", "danger");
      return;
    }
    setPhotoAsset({ uri: asset.uri, fileName, mimeType: inferredMime, fileSize: asset.fileSize, file: asset.file });
  };

  const detectLocation = async (showFailure = true) => {
    if (detectingLocation) return;
    setDetectingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        if (showFailure) showNotice("Location permission needed", "Allow location access to detect the complaint coordinates. You can still enter the location manually.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const { latitude: nextLatitude, longitude: nextLongitude, accuracy } = current.coords;
      setLatitude(nextLatitude); setLongitude(nextLongitude); setLocationAccuracy(typeof accuracy === "number" ? accuracy : null);
      const addresses = await Location.reverseGeocodeAsync({ latitude: nextLatitude, longitude: nextLongitude }).catch(() => []);
      const address = addresses[0];
      const detectedAddress = address ? [address.name, address.street, address.district, address.city, address.postalCode].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).join(", ") : "";
      if (detectedAddress) setLocation(detectedAddress);
      else if (!location.trim()) setLocation(`${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}`);
    } catch {
      if (showFailure) showNotice("Location unavailable", "We could not detect your location right now. Please enter the location or nearby landmark manually.");
    } finally {
      setDetectingLocation(false);
    }
  };

  useEffect(() => { void detectLocation(false); }, []);

  const handleCamera = async () => {
    try {
      if (Platform.OS === "web") {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75, allowsMultipleSelection: false });
        if (!result.canceled && result.assets[0]) acceptPhoto(result.assets[0]);
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return showNotice(t("permissionNeeded"), t("cameraPermission"));
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
      if (!result.canceled && result.assets[0]) acceptPhoto(result.assets[0]);
    } catch {
      showNotice("Camera unavailable", "The camera could not be opened. Try the gallery or submit without an image.", "danger");
    }
  };

  const handleGallery = async () => {
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return showNotice("Photo permission needed", "Allow photo access to attach an image. You can still submit without one.");
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsMultipleSelection: false, selectionLimit: 1 });
      if (!result.canceled && result.assets[0]) acceptPhoto(result.assets[0]);
    } catch {
      showNotice("Gallery unavailable", "The photo library could not be opened. Try again or submit without an image.", "danger");
    }
  };

  const goBack = () => router.canGoBack?.() ? router.back() : router.replace("/(tabs)/complaints" as any);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedCategory) return showNotice(t("selectCategoryAlert"), t("selectCategoryMsg"));
    if (!title.trim()) return showNotice(t("addTitleAlert"), t("addTitleMsg"));
    if (!description.trim()) return showNotice(t("addDescAlert"), t("addDescMsg"));
    if (verifiedMobile.length !== 10) return showNotice("Verified mobile unavailable", "Log in again before submitting the complaint.", "danger");
    if (!location.trim()) return showNotice("Location Required", "Please enter the complaint location or nearby landmark manually.");

    setSubmitting(true);
    try {
      const complaint = await addComplaint({
        clientRequestId: requestIdRef.current,
        title: title.trim(), description: description.trim(), category: selectedCategory, photoAsset,
        location: location.trim(), ward: user?.ward?.trim() || "Ward Pending", wardCode: user?.wardCode || null,
        userId: user?.id, userName: user?.name, userMobile: verifiedMobile, userAddress: user?.address,
        userAge: user?.age, userEmail: user?.email, userDob: user?.dob, userProfilePhoto: user?.profilePhoto,
        latitude, longitude, locationAccuracy,
      });
      showNotice("Complaint submitted", "Your complaint has been registered successfully.", "success", () => {
        closeNotice();
        router.replace({ pathname: "/complaint/[id]", params: { id: complaint.id, fresh: "1" } });
      });
    } catch (error) {
      showNotice("Submission Failed", getUserErrorMessage(error, "Could not submit complaint. Please try again."), "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const SubmitButton = ({ inline = false }: { inline?: boolean }) => (
    <TouchableOpacity style={[styles.submitBtn, inline && styles.inlineSubmit, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ disabled: submitting }}>
      <LinearGradient colors={[GREEN, "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtnGrad}>
        {submitting ? <><ActivityIndicator color="white" /><Text style={styles.submitBtnText}>{photoAsset ? "Uploading image..." : "Submitting..."}</Text></> : <><Feather name="send" size={18} color="white" /><Text style={styles.submitBtnText}>{t("submitComplaint")}</Text></>}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#C2410C", ORANGE, "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back"><Feather name="chevron-left" size={20} color="white" /><Text style={styles.backBtnText}>Back</Text></TouchableOpacity>
        <View style={styles.headerRow}><View style={styles.headerCenter}><Text style={styles.headerTitle}>{t("reportProblemTitle")}</Text><Text style={styles.headerSub}>{t("yourComplaintGoes")}</Text></View></View>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <AppScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 8) + (keyboardVisible ? 32 : 112) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("photoOfProblem")}</Text>
            {photoAsset ? <View style={styles.photoContainer}><Image source={{ uri: photoAsset.uri }} style={styles.photo} /><TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoAsset(undefined)} activeOpacity={0.8} accessibilityLabel="Remove complaint image"><Feather name="x" size={16} color="white" /></TouchableOpacity><TouchableOpacity style={styles.retakeBtn} onPress={handleCamera} activeOpacity={0.8}><Feather name="refresh-cw" size={14} color="white" /><Text style={styles.retakeBtnText}>{t("retake")}</Text></TouchableOpacity></View> : <View style={styles.photoButtons}><TouchableOpacity style={styles.cameraBtn} onPress={handleCamera} activeOpacity={0.85}><LinearGradient colors={[ORANGE, "#FB923C"]} style={styles.cameraBtnGrad}><Feather name="camera" size={24} color="white" /><Text style={styles.cameraBtnText}>{t("takePhoto")}</Text><Text style={styles.cameraBtnSub}>{t("clickPhotoOfProblem")}</Text></LinearGradient></TouchableOpacity><TouchableOpacity style={styles.galleryBtn} onPress={handleGallery} activeOpacity={0.85}><Feather name="image" size={18} color={ORANGE} /><Text style={styles.galleryBtnText}>{t("chooseFromGallery")}</Text></TouchableOpacity></View>}
          </View>

          <View style={styles.section}><Text style={styles.sectionLabel}>{t("complaintCategory")}</Text><View style={styles.categoryGrid}>{categories.map((category) => <TouchableOpacity key={category.id} style={[styles.categoryItem, selectedCategory === category.id && styles.categoryItemSelected]} onPress={() => setSelectedCategory(category.id)} activeOpacity={0.8}><View style={[styles.catIconWrap, { backgroundColor: selectedCategory === category.id ? category.color : category.bg }]}><Feather name={category.icon as any} size={18} color={selectedCategory === category.id ? "white" : category.color} /></View><Text style={[styles.catLabel, selectedCategory === category.id && { color: category.color }]}>{t(categoryLabelKeys[category.id])}</Text>{selectedCategory === category.id && <View style={[styles.catCheck, { backgroundColor: category.color }]}><Feather name="check" size={8} color="white" /></View>}</TouchableOpacity>)}</View></View>
          <View style={styles.section}><Text style={styles.sectionLabel}>{t("complaintTitle")}</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t("titlePlaceholder")} placeholderTextColor="#CBD5E1" maxLength={80} returnKeyType="next" /></View>
          <View style={styles.section}><Text style={styles.sectionLabel}>{t("description")}</Text><TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder={t("descriptionPlaceholder")} placeholderTextColor="#CBD5E1" multiline numberOfLines={4} textAlignVertical="top" maxLength={500} /></View>

          <View style={styles.section}><Text style={styles.sectionLabel}>LOCATION *</Text><View style={styles.locationRow}><View style={styles.locationIcon}><Feather name="map-pin" size={16} color={ORANGE} /></View><TextInput style={[styles.input, styles.locationInput]} value={location} onChangeText={setLocation} placeholder="Enter exact location / landmark manually" placeholderTextColor="#CBD5E1" returnKeyType="next" /></View><TouchableOpacity style={styles.detectLocationBtn} onPress={() => detectLocation(true)} disabled={detectingLocation} activeOpacity={0.82}>{detectingLocation ? <ActivityIndicator size="small" color={ORANGE} /> : <Feather name="crosshair" size={14} color={ORANGE} />}<Text style={styles.detectLocationText}>{detectingLocation ? "Detecting location..." : latitude !== null && longitude !== null ? "Refresh exact location" : "Detect exact location"}</Text></TouchableOpacity>{latitude !== null && longitude !== null ? <Text style={styles.coordinateText}>Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}{locationAccuracy ? ` · Accuracy about ${Math.round(locationAccuracy)} m` : ""}</Text> : null}<Text style={styles.wardText}>Ward: {user?.ward || "Ward Pending"}</Text></View>

          <View style={styles.section}><Text style={styles.sectionLabel}>VERIFIED CONTACT NUMBER</Text><View style={styles.locationRow}><View style={styles.locationIcon}><Feather name="check-circle" size={15} color={GREEN} /></View><View style={[styles.input, styles.locationInput, styles.readOnlyContact]}><Text style={styles.readOnlyContactText}>{verifiedMobile ? `+91 ${verifiedMobile}` : "Not available"}</Text><Feather name="lock" size={14} color="#94A3B8" /></View></View><Text style={[styles.wardText, { marginTop: 6 }]}>This verified number cannot be changed while filing a complaint.</Text></View>
          <View style={styles.noticeCard}><Feather name="info" size={14} color={ORANGE} /><Text style={styles.noticeText}>{t("complaintNotice")}</Text></View>
          {keyboardVisible ? <SubmitButton inline /> : null}
        </AppScrollView>
      </KeyboardAvoidingView>

      {!keyboardVisible && <View style={[styles.submitBar, { paddingBottom: Math.max(insets.bottom, 8) + 16 }]}><SubmitButton /></View>}
      <NoticeModal notice={notice} onClose={closeNotice} />
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10, alignSelf: "flex-start", paddingVertical: 8, paddingRight: 8, paddingLeft: 2, minHeight: 44 },
  backBtnText: { color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  root: { flex: 1, backgroundColor: "#ebeffc" }, keyboardArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 }, headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { flex: 1 }, content: { padding: 16 }, section: { marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  photoButtons: { gap: 10 }, cameraBtn: { borderRadius: 16, overflow: "hidden", shadowColor: "#B45309", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  cameraBtnGrad: { alignItems: "center", paddingVertical: 24, gap: 8 }, cameraBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" }, cameraBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  galleryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FFEDD5", minHeight: 44 }, galleryBtnText: { fontSize: 13, fontWeight: "700", color: ORANGE, fontFamily: "Inter_600SemiBold" },
  photoContainer: { borderRadius: 16, overflow: "hidden", position: "relative" }, photo: { width: "100%", height: 200, borderRadius: 16 },
  retakeBtn: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, minHeight: 44 }, removePhotoBtn: { position: "absolute", top: 10, right: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(220,38,38,0.9)", alignItems: "center", justifyContent: "center" }, retakeBtnText: { fontSize: 12, color: "white", fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, categoryItem: { width: "22%", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "white", position: "relative", minHeight: 74 }, categoryItemSelected: { borderColor: ORANGE, backgroundColor: "#FFF7ED" }, catIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }, catLabel: { fontSize: 9, fontWeight: "700", color: "#64748B", textAlign: "center", fontFamily: "Inter_600SemiBold" }, catCheck: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  input: { backgroundColor: "white", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", outlineWidth: 0, minHeight: 48 } as any,
  textarea: { height: 110, paddingTop: 13 }, locationRow: { flexDirection: "row", alignItems: "center", gap: 8 }, locationIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", flexShrink: 0 }, locationInput: { flex: 1 },
  readOnlyContact: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8FAFC" }, readOnlyContactText: { color: "#334155", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  wardText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 8 }, detectLocationBtn: { alignSelf: "flex-start", marginTop: 9, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#FFF7ED", borderRadius: 999, borderWidth: 1, borderColor: "#FED7AA", paddingHorizontal: 12, paddingVertical: 8, minHeight: 40 }, detectLocationText: { fontSize: 11, color: ORANGE, fontFamily: "Inter_700Bold" }, coordinateText: { marginTop: 7, fontSize: 10.5, color: "#64748B", fontFamily: "Inter_500Medium" },
  noticeCard: { flexDirection: "row", gap: 10, backgroundColor: "#FFF7ED", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#FFEDD5", alignItems: "flex-start" }, noticeText: { flex: 1, fontSize: 12, color: ORANGE, fontFamily: "Inter_400Regular", lineHeight: 18 },
  submitBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#F1F5F9" }, submitBtn: { borderRadius: 16, overflow: "hidden", shadowColor: "#B45309", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }, inlineSubmit: { marginTop: 20, marginBottom: 8 }, submitBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, minHeight: 52 }, submitBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  modalNoticeOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", padding: 22 }, modalNoticeCard: { width: "100%", maxWidth: 340, backgroundColor: "white", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 }, modalNoticeIcon: { width: 58, height: 58, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 12 }, modalNoticeTitle: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" }, modalNoticeText: { marginTop: 6, fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" }, modalNoticeBtn: { marginTop: 18, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, alignItems: "center", minHeight: 44 }, modalNoticeBtnText: { fontSize: 13, color: "white", fontFamily: "Inter_700Bold" },
});
