import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useComplaints, ComplaintCategory } from "@/context/ComplaintContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

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
  const [location, setLocation] = useState("Near Old Ambernath, Ambernath");
  const [submitting, setSubmitting] = useState(false);

  const handleCamera = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (Platform.OS === "web") {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("permissionNeeded"), t("cameraPermission"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert(t("selectCategoryAlert"), t("selectCategoryMsg"));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t("addTitleAlert"), t("addTitleMsg"));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t("addDescAlert"), t("addDescMsg"));
      return;
    }

    setSubmitting(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setTimeout(() => {
      const complaint = addComplaint({
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        photoUri,
        location,
        ward: user?.ward || "Ward 1 — Shivaji Chowk",
        userName: user?.name,
        userMobile: user?.mobile,
        userAddress: user?.address,
        userAge: user?.age,
        userEmail: user?.email,
      });

      setSubmitting(false);
      router.replace({ pathname: "/complaint/[id]", params: { id: complaint.id, fresh: "1" } });
    }, 800);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t("reportProblemTitle")}</Text>
            <Text style={styles.headerSub}>{t("yourComplaintGoes")}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 8) + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* PHOTO */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("photoOfProblem")}</Text>
          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <TouchableOpacity style={styles.retakeBtn} onPress={handleCamera} activeOpacity={0.8}>
                <Feather name="refresh-cw" size={14} color="white" />
                <Text style={styles.retakeBtnText}>{t("retake")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.cameraBtn} onPress={handleCamera} activeOpacity={0.85}>
                <LinearGradient colors={["#EA580C", "#FB923C"]} style={styles.cameraBtnGrad}>
                  <Feather name="camera" size={24} color="white" />
                  <Text style={styles.cameraBtnText}>{t("takePhoto")}</Text>
                  <Text style={styles.cameraBtnSub}>{t("clickPhotoOfProblem")}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.galleryBtn} onPress={handleGallery} activeOpacity={0.85}>
                <Feather name="image" size={18} color="#EA580C" />
                <Text style={styles.galleryBtnText}>{t("chooseFromGallery")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* CATEGORY */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("complaintCategory")}</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryItem,
                  selectedCategory === cat.id && styles.categoryItemSelected,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.catIconWrap,
                  { backgroundColor: selectedCategory === cat.id ? cat.color : cat.bg },
                ]}>
                  <Feather
                    name={cat.icon as any}
                    size={18}
                    color={selectedCategory === cat.id ? "white" : cat.color}
                  />
                </View>
                <Text style={[
                  styles.catLabel,
                  selectedCategory === cat.id && { color: cat.color },
                ]}>
                  {t(categoryLabelKeys[cat.id])}
                </Text>
                {selectedCategory === cat.id && (
                  <View style={[styles.catCheck, { backgroundColor: cat.color }]}>
                    <Feather name="check" size={8} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("complaintTitle")}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t("titlePlaceholder")}
            placeholderTextColor="#CBD5E1"
            maxLength={80}
          />
        </View>

        {/* DESCRIPTION */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("description")}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t("descriptionPlaceholder")}
            placeholderTextColor="#CBD5E1"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* LOCATION */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("location")}</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Feather name="map-pin" size={16} color="#EA580C" />
            </View>
            <TextInput
              style={[styles.input, styles.locationInput]}
              value={location}
              onChangeText={setLocation}
              placeholder={t("enterExactLocation")}
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <View style={styles.wardRow}>
            <Feather name="home" size={12} color="#94A3B8" />
            <Text style={styles.wardText}>Ward 1 — Shivaji Chowk ({t("autoDetected")})</Text>
          </View>
        </View>

        {/* NOTICE */}
        <View style={styles.noticeCard}>
          <Feather name="info" size={14} color="#EA580C" />
          <Text style={styles.noticeText}>
            {t("complaintNotice")}
          </Text>
        </View>
      </ScrollView>

      {/* SUBMIT */}
      <View style={[styles.submitBar, { paddingBottom: Math.max(insets.bottom, 8) + 16 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#059669", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGrad}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Feather name="send" size={18} color="white" />
                <Text style={styles.submitBtnText}>{t("submitComplaint")}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 8,
    paddingLeft: 2,
  },
  backBtnText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.2,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
  },
  photoButtons: { gap: 10 },
  cameraBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#B45309",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  cameraBtnGrad: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  cameraBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  cameraBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  galleryBtnText: { fontSize: 13, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_600SemiBold" },
  photoContainer: { borderRadius: 16, overflow: "hidden", position: "relative" },
  photo: { width: "100%", height: 200, borderRadius: 16 },
  retakeBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  retakeBtnText: { fontSize: 12, color: "white", fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryItem: {
    width: "22%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "white",
    position: "relative",
  },
  categoryItemSelected: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
  catCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#0F172A",
    fontFamily: "Inter_400Regular",
    outlineWidth: 0,
  } as any,
  textarea: {
    height: 110,
    paddingTop: 13,
  },
  charCount: { fontSize: 10, color: "#CBD5E1", textAlign: "right", marginTop: 4, fontFamily: "Inter_400Regular" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  locationInput: { flex: 1 },
  wardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingLeft: 52,
  },
  wardText: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  noticeCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    alignItems: "flex-start",
  },
  noticeText: { flex: 1, fontSize: 12, color: "#EA580C", fontFamily: "Inter_400Regular", lineHeight: 18 },
  submitBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  submitBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#B45309",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
