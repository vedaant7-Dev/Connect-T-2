import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import { languageOptions, useLanguage } from "@/context/LanguageContext";

const ORANGE = "#EA580C";

export default function ProfileLanguageButton() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();
  const [visible, setVisible] = useState(false);

  const title = language === "mr" ? "भाषा निवडा" : language === "hi" ? "भाषा चुनें" : "Select language";
  const subtitle = language === "mr"
    ? "Connect-T ची ॲप भाषा बदला"
    : language === "hi"
      ? "Connect-T की ऐप भाषा बदलें"
      : "Change the language used across Connect-T";
  const current = languageOptions.find((option) => option.code === language);

  return (
    <>
      <TouchableOpacity
        style={[styles.floatingButton, { bottom: Math.max(insets.bottom, 10) + (Platform.OS === "web" ? 74 : 82) }]}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <Feather name="globe" size={17} color="white" />
        <Text style={styles.floatingText}>{current?.nativeLabel || "English"}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay} accessibilityViewIsModal>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              <TouchableOpacity style={styles.close} onPress={() => setVisible(false)} accessibilityLabel="Close language selector">
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <AppScrollView contentContainerStyle={styles.options}>
              {languageOptions.map((option) => {
                const active = option.code === language;
                return (
                  <TouchableOpacity
                    key={option.code}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      void setLanguage(option.code);
                      setVisible(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.icon, active && styles.iconActive]}>
                      <Feather name="globe" size={17} color={active ? ORANGE : "#64748B"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionNative, active && styles.optionTextActive]}>{option.nativeLabel}</Text>
                      <Text style={styles.optionEnglish}>{option.label}</Text>
                    </View>
                    {active ? <Feather name="check-circle" size={19} color={ORANGE} /> : null}
                  </TouchableOpacity>
                );
              })}
            </AppScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    right: 16,
    minHeight: 46,
    maxWidth: 160,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: "#7C2D12",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 7,
  },
  floatingText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold", flexShrink: 1 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.58)" },
  sheet: { maxHeight: "76%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", overflow: "hidden" },
  handle: { alignSelf: "center", width: 42, height: 5, marginTop: 10, borderRadius: 999, backgroundColor: "#CBD5E1" },
  header: { minHeight: 72, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  title: { color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { marginTop: 3, color: "#64748B", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" },
  close: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  options: { padding: 16, gap: 8 },
  option: { minHeight: 64, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center", gap: 11 },
  optionActive: { borderColor: "#FDBA74", backgroundColor: "#FFF7ED" },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#E2E8F0" },
  iconActive: { backgroundColor: "#FFEDD5" },
  optionNative: { color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_700Bold" },
  optionTextActive: { color: ORANGE },
  optionEnglish: { marginTop: 2, color: "#64748B", fontSize: 10, fontFamily: "Inter_400Regular" },
});
