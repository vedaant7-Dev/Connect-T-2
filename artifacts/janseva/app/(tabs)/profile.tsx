import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform, Modal, Linking, Image, TextInput, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useComplaints } from "@/context/ComplaintContext";
import { useLanguage, languageOptions, Language } from "@/context/LanguageContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { ambernathWards } from "@/data/mumbaiServices";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";

const roleConfig = {
  citizen: {
    label: "BJP Member", subLabel: "भाजपा सदस्य", icon: "user" as const,
    color: "#EA580C", bg: "#FFF7ED",
    grad: ["#C2410C", "#EA580C", "#FB923C"] as [string, string, string],
  },
  nagarsevak: {
    label: "Nagarsevak", subLabel: "नगरसेवक", icon: "briefcase" as const,
    color: "#16A34A", bg: "#DCFCE7",
    grad: ["#166534", "#16A34A", "#22C55E"] as [string, string, string],
  },
};

const usefulLinks = [
  { label: "AMC Official Website", url: "https://ambernathmc.org", icon: "globe" as const },
  { label: "Maharashtra Govt Portal", url: "https://maharashtra.gov.in", icon: "globe" as const },
  { label: "RTI Portal", url: "https://rtionline.gov.in", icon: "file-text" as const },
  { label: "Aadhaar Services", url: "https://uidai.gov.in", icon: "user" as const },
];

function AvatarWithPhoto({
  name, color, photoUri, size = 72, onPress,
}: { name: string; color: string; photoUri?: string; size?: number; onPress?: () => void }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ position: "relative" }}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{
            width: size, height: size, borderRadius: size / 2,
            borderWidth: 3, borderColor: "rgba(255,255,255,0.5)",
          }}
        />
      ) : (
        <View style={{
          width: size, height: size, borderRadius: size / 2, backgroundColor: color,
          alignItems: "center", justifyContent: "center",
          borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
        }}>
          <Text style={{ fontSize: size * 0.35, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" }}>
            {initials}
          </Text>
        </View>
      )}
      <View style={styles.cameraOverlay}>
        <Feather name="camera" size={11} color="white" />
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { complaints } = useComplaints();
  const { language, setLanguage, t } = useLanguage();
  const { handleScroll } = useTabBarVisibility();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWardPicker, setShowWardPicker] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editWard, setEditWard] = useState(user?.ward || "");

  if (!user) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#7C2D12", "#C2410C", "#EA580C"]}
          style={[styles.header, { paddingTop: topPad + 12, alignItems: "center", paddingBottom: 48 }]}
        >
          <View style={styles.guestIcon}>
            <Feather name="user" size={36} color="#EA580C" />
          </View>
          <Text style={[styles.userName, { textAlign: "center", marginTop: 14 }]}>Welcome to Connect T</Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 4 }}>
            Login to access your profile
          </Text>
        </LinearGradient>
        <View style={{ padding: 20 }}>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push("/login")} activeOpacity={0.85}>
            <LinearGradient colors={["#EA580C", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtnGrad}>
              <Feather name="log-in" size={18} color="white" />
              <Text style={styles.loginBtnText}>Login / Sign Up</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const rc = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.citizen;
  const totalComplaints = complaints.length;
  const activeCount = complaints.filter((c) => ["submitted", "assigned", "in_progress"].includes(c.status)).length;
  const resolvedCount = complaints.filter((c) => c.status === "resolved").length;

  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = async () => { setShowLogoutModal(false); await logout(); };

  const pickPhoto = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo library access to set your profile photo.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await updateUser({ profilePhoto: result.assets[0].uri });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openEditModal = () => {
    setEditName(user.name);
    setEditWard(user.ward || "");
    setShowEditModal(true);
  };

  const saveProfile = async () => {
    if (!editName.trim()) return;
    const newWard = editWard || user.ward;
    const wardWasChanged = !!user.ward && newWard !== user.ward;
    await updateUser({
      name: editName.trim(),
      ward: newWard,
      wardChanged: user.wardChanged || wardWasChanged,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowEditModal(false);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={rc.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12, overflow: "hidden" }]}
      >
        <TopShade height={100} />
        <DecorativeCircles />
        <View style={styles.headerContent}>
          <AvatarWithPhoto
            name={user.name}
            color={rc.color}
            photoUri={user.profilePhoto}
            onPress={pickPhoto}
          />
          <View style={styles.headerText}>
            <View style={styles.nameEditRow}>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              <TouchableOpacity onPress={openEditModal} style={styles.editProfileBtn} activeOpacity={0.8}>
                <Feather name="edit-2" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.editProfileBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rolePillRow}>
              <View style={styles.rolePill}>
                <Feather name={rc.icon} size={11} color="rgba(255,255,255,0.9)" />
                <Text style={styles.rolePillText}>{rc.label}</Text>
              </View>
              <Text style={styles.roleSub}>{rc.subLabel}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoChipRow}>
                <Feather name="map-pin" size={10} color="rgba(255,255,255,0.55)" />
                <Text style={styles.infoChipText}>{user.ward || "Ward 1 — Shivaji Chowk"}</Text>
              </View>
              <View style={styles.infoChipRow}>
                <Feather name="phone" size={10} color="rgba(255,255,255,0.55)" />
                <Text style={styles.infoChipText}>+91 {user.mobile}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{totalComplaints}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#FDE68A" }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#6EE7B7" }]}>{resolvedCount}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 8) + 70 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {user.role === "nagarsevak" && (
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/admin" as any)}
              activeOpacity={0.85}
              style={styles.adminCard}
            >
              <LinearGradient
                colors={["#166534", "#16A34A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.adminCardGrad}
              >
                <View style={styles.adminCardIcon}>
                  <Feather name="briefcase" size={22} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminCardTitle}>{t("nagarsevakPanel")}</Text>
                  <Text style={styles.adminCardSub}>{t("viewResolveWard")}</Text>
                </View>
                <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.card}>
            {[
              { icon: "edit-3" as const, label: "My Complaints", sub: "View and track all complaints", color: "#EA580C", bg: "#FFF7ED", onPress: () => router.push("/(tabs)/complaints") },
              { icon: "rss" as const, label: "News Feed", sub: "Ward updates & announcements", color: "#7C3AED", bg: "#F5F3FF", onPress: () => router.push("/(tabs)/feed") },
              { icon: "phone-call" as const, label: "Emergency", sub: "Quick access to help numbers", color: "#DC2626", bg: "#FEE2E2", onPress: () => router.push("/(tabs)/emergency") },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.actionRow, idx < arr.length - 1 && styles.rowBorder]}
                onPress={item.onPress}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: item.bg }]}>
                  <Feather name={item.icon} size={16} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionLabel}>{item.label}</Text>
                  <Text style={styles.actionSub}>{item.sub}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>
            <TouchableOpacity onPress={openEditModal} activeOpacity={0.8} style={styles.editLinkBtn}>
              <Feather name="edit-2" size={11} color="#EA580C" />
              <Text style={styles.editLinkText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {[
              { icon: "user" as const, label: "Full Name", value: user.name },
              { icon: "phone" as const, label: "Mobile", value: "+91 " + user.mobile },
              { icon: "map-pin" as const, label: "Ward", value: user.ward || "Ward 1 — Shivaji Chowk" },
              { icon: "shield" as const, label: "Role", value: rc.label + " · " + rc.subLabel },
            ].map((item, idx, arr) => (
              <View key={item.label} style={[styles.actionRow, idx < arr.length - 1 && styles.rowBorder]}>
                <View style={[styles.actionIcon, { backgroundColor: rc.bg }]}>
                  <Feather name={item.icon} size={14} color={rc.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionSub}>{item.label}</Text>
                  <Text style={styles.actionLabel}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("language").toUpperCase()}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowLangModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FFF7ED" }]}>
                <Feather name="globe" size={16} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionLabel}>{t("changeLanguage")}</Text>
                <Text style={styles.actionSub}>
                  {languageOptions.find((l) => l.code === language)?.nativeLabel} ({languageOptions.find((l) => l.code === language)?.label})
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Useful Links */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("usefulLinks").toUpperCase()}</Text>
          <View style={styles.card}>
            {usefulLinks.map((link, idx, arr) => (
              <TouchableOpacity
                key={link.label}
                style={[styles.actionRow, idx < arr.length - 1 && styles.rowBorder]}
                onPress={() => Linking.openURL(link.url)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: "#FFF7ED" }]}>
                  <Feather name={link.icon} size={14} color="#EA580C" />
                </View>
                <Text style={[styles.actionLabel, { flex: 1 }]}>{link.label}</Text>
                <Feather name="external-link" size={14} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appInfoBrand}>Connect T</Text>
          <Text style={styles.appInfoTagline}>BJP Member Services · सबका साथ, सबका विकास</Text>
          <Text style={styles.appInfoVersion}>v1.0</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <View style={styles.logoutInner}>
            <Feather name="log-out" size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 28 }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={styles.photoEditRow}>
              {user.profilePhoto ? (
                <Image source={{ uri: user.profilePhoto }} style={styles.photoEditThumb} />
              ) : (
                <View style={[styles.photoEditThumb, { backgroundColor: rc.color, alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" }}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.photoEditLabel}>Profile Photo</Text>
                <Text style={styles.photoEditSub}>Tap to change from gallery</Text>
              </View>
              <View style={styles.photoEditBtn}>
                <Feather name="camera" size={16} color="#EA580C" />
              </View>
            </TouchableOpacity>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>WARD</Text>
              <TouchableOpacity
                style={[styles.fieldInput, { justifyContent: "center", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, user.wardChanged && { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }]}
                onPress={() => { if (!user.wardChanged) setShowWardPicker(true); }}
                activeOpacity={user.wardChanged ? 1 : 0.8}
                disabled={!!user.wardChanged}
              >
                <Text style={{ color: editWard ? (user.wardChanged ? "#64748B" : "#0F172A") : "#94A3B8", fontSize: 14, fontFamily: "Inter_400Regular" }}>
                  {editWard || "Select your ward"}
                </Text>
                {user.wardChanged && <Feather name="lock" size={14} color="#94A3B8" />}
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: user.wardChanged ? "#94A3B8" : "#64748B", fontFamily: "Inter_400Regular", marginTop: 6, lineHeight: 15 }}>
                {user.wardChanged
                  ? "Ward has already been updated. It can only be changed once."
                  : "You can update your ward only once."}
              </Text>
            </View>

            <View style={styles.editBtnRow}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.cancelEditBtn} activeOpacity={0.8}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveProfile} activeOpacity={0.85} style={styles.saveEditBtnWrap}>
                <LinearGradient colors={["#EA580C", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveEditBtn}>
                  <Feather name="check" size={16} color="white" />
                  <Text style={styles.saveEditText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ward Picker Modal */}
      <Modal visible={showWardPicker} transparent animationType="slide" onRequestClose={() => setShowWardPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "75%", paddingBottom: 20 }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Select Ward</Text>
              <TouchableOpacity onPress={() => setShowWardPicker(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
              {ambernathWards.map((ward) => (
                <TouchableOpacity
                  key={ward}
                  style={[styles.wardOption, editWard === ward && styles.wardOptionActive]}
                  onPress={() => { setEditWard(ward); setShowWardPicker(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.wardOptionText, editWard === ward && { color: "#EA580C", fontWeight: "700" }]}>{ward}</Text>
                  {editWard === ward && <Feather name="check-circle" size={18} color="#EA580C" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal visible={showLangModal} transparent animationType="fade" onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalIconWrap}>
              <Feather name="globe" size={28} color="#EA580C" />
            </View>
            <Text style={styles.modalTitle}>{t("selectLanguage")}</Text>
            <View style={{ width: "100%", gap: 8, marginTop: 8 }}>
              {languageOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={[styles.langOption, language === opt.code && styles.langOptionActive]}
                  onPress={() => { setLanguage(opt.code); setShowLangModal(false); }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langOptionLabel, language === opt.code && { color: "#EA580C" }]}>{opt.nativeLabel}</Text>
                    <Text style={styles.langOptionSub}>{opt.label}</Text>
                  </View>
                  {language === opt.code && <Feather name="check-circle" size={20} color="#EA580C" />}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLangModal(false)} activeOpacity={0.8}>
              <Text style={styles.modalCancelText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalIconWrap, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="log-out" size={28} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalBody}>Are you sure you want to logout from Connect T?</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalLogoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
                <Feather name="log-out" size={15} color="white" />
                <Text style={styles.modalLogoutText}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  guestIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  cameraOverlay: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "white",
  },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  headerText: { flex: 1, gap: 3 },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editProfileBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  editProfileBtnText: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.9)", fontFamily: "Inter_600SemiBold" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  userName: { fontSize: 18, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3, flex: 1 },
  rolePillRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  rolePillText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.9)", fontFamily: "Inter_700Bold" },
  roleSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },
  infoChipRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoChipText: { fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 10, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 24, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statDiv: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 0 },
  section: { marginBottom: 20 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingLeft: 2 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  editLinkBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  editLinkText: { fontSize: 11, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_600SemiBold" },
  card: { backgroundColor: "white", borderRadius: 18, overflow: "hidden", shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  actionIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionLabel: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  actionSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
  adminCard: { borderRadius: 18, overflow: "hidden", shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  adminCardGrad: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  adminCardIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  adminCardTitle: { fontSize: 15, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  adminCardSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  appInfoCard: { backgroundColor: "white", borderRadius: 18, padding: 20, alignItems: "center", marginBottom: 16, shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  appInfoBrand: { fontSize: 22, fontWeight: "900", color: "#C2410C", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  appInfoTagline: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "center" },
  appInfoVersion: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 6 },
  logoutBtn: { backgroundColor: "#FEE2E2", borderRadius: 16, borderWidth: 1.5, borderColor: "#FECACA", marginBottom: 8 },
  logoutInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_700Bold" },
  loginBtn: { borderRadius: 16, overflow: "hidden" },
  loginBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  loginBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "flex-end", padding: 0 },
  modalSheet: {
    backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    width: "100%", padding: 24, alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", marginBottom: 4 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  modalIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  modalBody: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  modalBtnRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  modalLogoutBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: "#DC2626" },
  modalLogoutText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  photoEditRow: { flexDirection: "row", alignItems: "center", gap: 14, width: "100%", backgroundColor: "#F8FAFC", padding: 14, borderRadius: 16, marginBottom: 4 },
  photoEditThumb: { width: 56, height: 56, borderRadius: 28, flexShrink: 0 },
  photoEditLabel: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  photoEditSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 2 },
  photoEditBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF7ED", borderWidth: 1.5, borderColor: "#FED7AA", alignItems: "center", justifyContent: "center" },

  fieldGroup: { width: "100%", marginBottom: 4 },
  fieldLabel: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 6, paddingLeft: 2 },
  fieldInput: {
    backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0",
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A",
    fontFamily: "Inter_400Regular", outlineWidth: 0,
  } as any,
  editBtnRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8 },
  cancelEditBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  cancelEditText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  saveEditBtnWrap: { flex: 2, borderRadius: 14, overflow: "hidden" },
  saveEditBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  saveEditText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  wardOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#F1F5F9" },
  wardOptionActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  wardOptionText: { fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular" },

  langOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#F1F5F9" },
  langOptionActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  langOptionLabel: { fontSize: 15, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  langOptionSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
});
