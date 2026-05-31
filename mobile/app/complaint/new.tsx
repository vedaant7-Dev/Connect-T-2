import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useComplaints, ComplaintCategory } from "@/context/ComplaintContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const ORANGE = "#EA580C";
const GREEN = "#059669";

const categoryLabelKeys: Record<string, string> = {
  roads: "roads",
  water: "waterSupply",
  electricity: "electricity",
  garbage: "garbage",
  drainage: "drainage",
  streetlight: "streetLight",
  encroachment: "encroachment",
  other: "other",
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

type NoticeState = {
  visible: boolean;
  title: string;
  message: string;
  tone: NoticeTone;
  onDone?: () => void;
};

function NoticeModal({ notice, onClose }: { notice: NoticeState; onClose: () => void }) {
  const color = notice.tone === "success" ? GREEN : notice.tone === "danger" ? "#DC2626" : ORANGE;
  const bg = notice.tone === "success" ? "#D1FAE5" : notice.tone === "danger" ? "#FEE2E2" : "#FFF7ED";
  const icon = notice.tone === "success" ? "check-circle" : notice.tone === "danger" ? "alert-circle" : "info";
  const close = () => {
    if (notice.onDone) notice.onDone();
    else onClose();
  };

  return (
    <Modal visible={notice.visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.modalNoticeOverlay}>
        <View style={styles.modalNoticeCard}>
          <View style={[styles.modalNoticeIcon, { backgroundColor: bg }]}>
            <Feather name={icon as any} size={28} color={color} />
          </View>
          <Text style={styles.modalNoticeTitle}>{notice.title}</Text>
          <Text style={styles.modalNoticeText}>{notice.message}</Text>
          <TouchableOpacity style={[styles.modalNoticeBtn, { backgroundColor: color }]} onPress={close} activeOpacity={0.85}>
            <Text style={styles.modalNoticeBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function NewComplaintScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { addComplaint } = useComplaints();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [contactNumber, setContactNumber] = useState(user?.mobile || "");
  const [submitting, setSubmitting] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [locStatus, setLocStatus] = useState<"idle" | "ok" | "outside" | "denied">("idle");
  const [notice, setNotice] = useState<NoticeState>({ visible: false, title: "", message: "", tone: "info" });

  const showNotice = (titleText: string, messageText: string, tone: NoticeTone = "info", onDone?: () => void) => {
    setNotice({ visible: true, title: titleText, message: messageText, tone, onDone });
  };

  const closeNotice = () => setNotice((prev) => ({ ...prev, visible: false, onDone: undefined }));

  const AMBERNATH_BOUNDS = { minLat: 19.08, maxLat: 19.23, minLng: 73.13, maxLng: 73.25 };

  const detectLocation = async () => {
    if (Platform.OS === "web") {
      showNotice("Not available", "Location detection is not available on web. Please enter manually.");
      return;
    }
    setDetectingLoc(true);
    setLocStatus("idle");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocStatus("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      const inBounds = latitude >= AMBERNATH_BOUNDS.minLat && latitude <= AMBERNATH_BOUNDS.maxLat && longitude >= AMBERNATH_BOUNDS.minLng && longitude <= AMBERNATH_BOUNDS.maxLng;
      if (!inBounds) {
        setLocStatus("outside");
        return;
      }
      const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addr = rev[0];
      const locString = [addr?.street, addr?.district, addr?.city || "Ambernath"].filter(Boolean).join(", ");
      setLocation(locString || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      setLocStatus("ok");
    } catch {
      showNotice("Location failed", "Could not detect location. Please enter it manually.", "danger");
    } finally {
      setDetectingLoc(false);
    }
  };

  const handleCamera = async () => {
    if (Platform.OS === "web") {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showNotice(t("permissionNeeded"), t("cameraPermission"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const goBack = () => {
    if (router.canGoBack?.()) router.back();
    else router.replace("/(tabs)/complaints" as any);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedCategory) return showNotice(t("selectCategoryAlert"), t("selectCategoryMsg"));
    if (!title.trim()) return showNotice(t("addTitleAlert"), t("addTitleMsg"));
    if (!description.trim()) return showNotice(t("addDescAlert"), t("addDescMsg"));

    const cleanContact = contactNumber.trim().replace(/\D/g, "").slice(-10);
    if (cleanContact.length !== 10) return showNotice("Contact Required", "Please enter your 10-digit contact number so we can reach you.");
    if (!location.trim()) return showNotice("Location Required", "Please enter the location or tap Detect Location.");
    if (locStatus === "outside") return showNotice("Outside Ambernath", "Complaints can only be filed for locations within Ambernath city limits.", "danger");

    setSubmitting(true);
    try {
      const complaint = await addComplaint({
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        photoUri,
        location: location.trim(),
        ward: user?.ward?.trim() || "Ward Pending",
        wardCode: user?.wardCode || null,
        userId: user?.id,
        userName: user?.name,
        userMobile: cleanContact,
        userAddress: user?.address,
        userAge: user?.age,
        userEmail: user?.email,
      });
      showNotice("Complaint submitted", "Your complaint has been registered successfully.", "success", () => {
        closeNotice();
        router.replace({ pathname: "/complaint/[id]", params: { id: complaint.id, fresh: "1" } });
      });
    } catch (error) {
      console.error("Complaint submit failed", error);
      showNotice("Submission Failed", error instanceof Error ? error.message : "Could not submit complaint. Please try again.", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#C2410C", ORANGE, "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}><View style={styles.headerCenter}><Text style={styles.headerTitle}>{t("reportProblemTitle")}</Text><Text style={styles.headerSub}>{t("yourComplaintGoes")}</Text></View></View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 8) + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("photoOfProblem")}</Text>
          {photoUri ? <View style={styles.photoContainer}><Image source={{ uri: photoUri }} style={styles.photo} /><TouchableOpacity style={styles.retakeBtn} onPress={handleCamera} activeOpacity={0.8}><Feather name="refresh-cw" size={14} color="white" /><Text style={styles.retakeBtnText}>{t("retake")}</Text></TouchableOpacity></View> : <View style={styles.photoButtons}><TouchableOpacity style={styles.cameraBtn} onPress={handleCamera} activeOpacity={0.85}><LinearGradient colors={[ORANGE, "#FB923C"]} style={styles.cameraBtnGrad}><Feather name="camera" size={24} color="white" /><Text style={styles.cameraBtnText}>{t("takePhoto")}</Text><Text style={styles.cameraBtnSub}>{t("clickPhotoOfProblem")}</Text></LinearGradient></TouchableOpacity><TouchableOpacity style={styles.galleryBtn} onPress={handleGallery} activeOpacity={0.85}><Feather name="image" size={18} color={ORANGE} /><Text style={styles.galleryBtnText}>{t("chooseFromGallery")}</Text></TouchableOpacity></View>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("complaintCategory")}</Text>
          <View style={styles.categoryGrid}>{categories.map((cat) => <TouchableOpacity key={cat.id} style={[styles.categoryItem, selectedCategory === cat.id && styles.categoryItemSelected]} onPress={() => setSelectedCategory(cat.id)} activeOpacity={0.8}><View style={[styles.catIconWrap, { backgroundColor: selectedCategory === cat.id ? cat.color : cat.bg }]}><Feather name={cat.icon as any} size={18} color={selectedCategory === cat.id ? "white" : cat.color} /></View><Text style={[styles.catLabel, selectedCategory === cat.id && { color: cat.color }]}>{t(categoryLabelKeys[cat.id])}</Text>{selectedCategory === cat.id && <View style={[styles.catCheck, { backgroundColor: cat.color }]}><Feather name="check" size={8} color="white" /></View>}</TouchableOpacity>)}</View>
        </View>

        <View style={styles.section}><Text style={styles.sectionLabel}>{t("complaintTitle")}</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t("titlePlaceholder")} placeholderTextColor="#CBD5E1" maxLength={80} /></View>
        <View style={styles.section}><Text style={styles.sectionLabel}>{t("description")}</Text><TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder={t("descriptionPlaceholder")} placeholderTextColor="#CBD5E1" multiline numberOfLines={4} textAlignVertical="top" maxLength={500} /></View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LOCATION *</Text>
          <TouchableOpacity style={[styles.detectBtn, detectingLoc && { opacity: 0.7 }]} onPress={detectLocation} disabled={detectingLoc} activeOpacity={0.8}>{detectingLoc ? <ActivityIndicator size="small" color={ORANGE} /> : <Feather name="navigation" size={15} color={ORANGE} />}<Text style={styles.detectBtnText}>{detectingLoc ? "Detecting..." : "Detect My Location"}</Text></TouchableOpacity>
          {locStatus === "outside" && <View style={styles.locWarning}><Feather name="alert-circle" size={13} color="#DC2626" /><Text style={styles.locWarningText}>Your location is outside Ambernath. Only complaints within Ambernath are accepted.</Text></View>}
          {locStatus === "denied" && <View style={styles.locWarning}><Feather name="alert-circle" size={13} color="#D97706" /><Text style={styles.locWarningText}>Location permission denied. Enter manually below.</Text></View>}
          {locStatus === "ok" && <View style={styles.locSuccess}><Feather name="check-circle" size={13} color={GREEN} /><Text style={styles.locSuccessText}>Location detected within Ambernath</Text></View>}
          <View style={[styles.locationRow, { marginTop: 10 }]}><View style={styles.locationIcon}><Feather name="map-pin" size={16} color={ORANGE} /></View><TextInput style={[styles.input, styles.locationInput]} value={location} onChangeText={(v) => { setLocation(v); if (locStatus === "ok") setLocStatus("idle"); }} placeholder="Enter exact location / landmark" placeholderTextColor="#CBD5E1" /></View>
          <Text style={styles.wardText}>Ward: {user?.ward || "Auto-detected based on location"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONTACT NUMBER *</Text>
          <View style={styles.locationRow}><View style={styles.locationIcon}><Feather name="phone" size={15} color={ORANGE} /></View><TextInput style={[styles.input, styles.locationInput]} value={contactNumber} onChangeText={(value) => setContactNumber(value.replace(/\D/g, "").slice(0, 10))} placeholder="Your 10-digit contact number" placeholderTextColor="#CBD5E1" keyboardType="phone-pad" maxLength={10} /></View>
          <Text style={[styles.wardText, { marginTop: 6 }]}>Nagarsevak may contact you for resolution updates</Text>
        </View>

        <View style={styles.noticeCard}><Feather name="info" size={14} color={ORANGE} /><Text style={styles.noticeText}>{t("complaintNotice")}</Text></View>
      </ScrollView>

      <View style={[styles.submitBar, { paddingBottom: Math.max(insets.bottom, 8) + 16 }]}><TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}><LinearGradient colors={[GREEN, "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtnGrad}>{submitting ? <ActivityIndicator color="white" /> : <><Feather name="send" size={18} color="white" /><Text style={styles.submitBtnText}>{t("submitComplaint")}</Text></>}</LinearGradient></TouchableOpacity></View>
      <NoticeModal notice={notice} onClose={closeNotice} />
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10, alignSelf: "flex-start", paddingVertical: 4, paddingRight: 8, paddingLeft: 2 },
  backBtnText: { color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  photoButtons: { gap: 10 },
  cameraBtn: { borderRadius: 16, overflow: "hidden", shadowColor: "#B45309", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  cameraBtnGrad: { alignItems: "center", paddingVertical: 24, gap: 8 },
  cameraBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  cameraBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  galleryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FFEDD5" },
  galleryBtnText: { fontSize: 13, fontWeight: "700", color: ORANGE, fontFamily: "Inter_600SemiBold" },
  photoContainer: { borderRadius: 16, overflow: "hidden", position: "relative" },
  photo: { width: "100%", height: 200, borderRadius: 16 },
  retakeBtn: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  retakeBtnText: { fontSize: 12, color: "white", fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryItem: { width: "22%", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "white", position: "relative" },
  categoryItemSelected: { borderColor: ORANGE, backgroundColor: "#FFF7ED" },
  catIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 9, fontWeight: "700", color: "#64748B", textAlign: "center", fontFamily: "Inter_600SemiBold" },
  catCheck: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  input: { backgroundColor: "white", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular", outlineWidth: 0 } as any,
  textarea: { height: 110, paddingTop: 13 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  locationInput: { flex: 1 },
  wardText: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 8 },
  detectBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FFEDD5", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14 },
  detectBtnText: { fontSize: 14, color: ORANGE, fontFamily: "Inter_600SemiBold" },
  locWarning: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#FEE2E2", padding: 10, borderRadius: 10, marginTop: 8 },
  locWarningText: { flex: 1, fontSize: 11, color: "#991B1B", fontFamily: "Inter_400Regular" },
  locSuccess: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#D1FAE5", padding: 8, borderRadius: 10, marginTop: 8 },
  locSuccessText: { fontSize: 11, color: "#065F46", fontFamily: "Inter_400Regular" },
  noticeCard: { flexDirection: "row", gap: 10, backgroundColor: "#FFF7ED", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#FFEDD5", alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 12, color: ORANGE, fontFamily: "Inter_400Regular", lineHeight: 18 },
  submitBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  submitBtn: { borderRadius: 16, overflow: "hidden", shadowColor: "#B45309", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  submitBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  modalNoticeOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalNoticeCard: { width: "100%", maxWidth: 340, backgroundColor: "white", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  modalNoticeIcon: { width: 58, height: 58, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalNoticeTitle: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" },
  modalNoticeText: { marginTop: 6, fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  modalNoticeBtn: { marginTop: 18, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, alignItems: "center" },
  modalNoticeBtnText: { fontSize: 13, color: "white", fontFamily: "Inter_700Bold" },
});
