import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ConfirmActionModal from "@/components/ConfirmActionModal";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getUserErrorMessage } from "@/lib/api";
import LocalizedJobPortalProfileScreen from "@/screens/LocalizedJobPortalProfileScreen";

const ORANGE = "#EA580C";

const roleSwitchCopy = {
  en: {
    seeker: "Job Seeker",
    employer: "Employer",
    switchTo: "Switch to",
    title: "Switch Job Portal role?",
    body: "You can switch instantly and switch back anytime. No Super Admin approval is required.",
    failed: "Role could not be switched right now. Please try again.",
  },
  mr: {
    seeker: "नोकरी शोधणारा",
    employer: "नियोक्ता",
    switchTo: "बदला",
    title: "जॉब पोर्टल भूमिका बदलायची?",
    body: "तुम्ही भूमिका त्वरित बदलू शकता आणि कधीही परत बदलू शकता. सुपर अॅडमिनची मंजुरी आवश्यक नाही.",
    failed: "सध्या भूमिका बदलता आली नाही. कृपया पुन्हा प्रयत्न करा.",
  },
  hi: {
    seeker: "नौकरी खोजने वाला",
    employer: "नियोक्ता",
    switchTo: "बदलें",
    title: "जॉब पोर्टल भूमिका बदलें?",
    body: "आप तुरंत भूमिका बदल सकते हैं और कभी भी वापस बदल सकते हैं। सुपर एडमिन की मंजूरी आवश्यक नहीं है।",
    failed: "अभी भूमिका नहीं बदली जा सकी। कृपया फिर से प्रयास करें।",
  },
} as const;

export default function JobPortalProfileRoute() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { jobsUser, activateJobs } = useJobsAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  const copy = roleSwitchCopy[language] || roleSwitchCopy.en;
  const targetRole = jobsUser?.role === "employer" ? "seeker" : "employer";
  const targetLabel = targetRole === "employer" ? copy.employer : copy.seeker;
  const buttonLabel = useMemo(() => `${copy.switchTo} ${targetLabel}`, [copy.switchTo, targetLabel]);

  const switchRole = async () => {
    if (!jobsUser || switching) return;
    setSwitching(true);
    setError("");
    try {
      await activateJobs(targetRole);
      setConfirmVisible(false);
    } catch (switchError) {
      setError(getUserErrorMessage(switchError, copy.failed));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <View style={styles.root}>
      <LocalizedJobPortalProfileScreen />

      {jobsUser ? (
        <View style={[styles.switchContainer, { bottom: Math.max(insets.bottom, 8) + 70 }]} pointerEvents="box-none">
          {error ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color="#B91C1C" />
              <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.switchButton, switching && styles.disabled]}
            onPress={() => { setError(""); setConfirmVisible(true); }}
            disabled={switching}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            {switching ? <ActivityIndicator color="white" size="small" /> : <Feather name="repeat" size={17} color="white" />}
            <Text style={styles.switchText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ConfirmActionModal
        visible={confirmVisible}
        title={copy.title}
        message={`${copy.body}\n\n${jobsUser?.role === "employer" ? copy.employer : copy.seeker} → ${targetLabel}`}
        confirmLabel={buttonLabel}
        cancelLabel={language === "mr" ? "रद्द करा" : language === "hi" ? "रद्द करें" : "Cancel"}
        icon="repeat"
        tone="primary"
        busy={switching}
        onCancel={() => !switching && setConfirmVisible(false)}
        onConfirm={switchRole}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  switchContainer: { position: "absolute", left: 16, right: 16, zIndex: 30, alignItems: "flex-end" },
  switchButton: {
    minHeight: 50,
    maxWidth: 260,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "#C2410C",
    shadowColor: "#7C2D12",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 9,
  },
  switchText: { color: "white", fontSize: 13.5, fontFamily: "Inter_700Bold" },
  errorBanner: {
    maxWidth: 320,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  errorText: { flex: 1, color: "#B91C1C", fontSize: 11.5, lineHeight: 16, fontFamily: "Inter_600SemiBold" },
  disabled: { opacity: 0.65 },
});
