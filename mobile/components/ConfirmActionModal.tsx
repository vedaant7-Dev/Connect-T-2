import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type ConfirmActionTone = "primary" | "danger";

type ConfirmActionModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: keyof typeof Feather.glyphMap;
  confirmIcon?: keyof typeof Feather.glyphMap;
  tone?: ConfirmActionTone;
  busy?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmActionModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  icon = "alert-circle",
  confirmIcon,
  tone = "primary",
  busy = false,
  errorMessage = "",
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  const accent = tone === "danger" ? "#DC2626" : "#EA580C";
  const surface = tone === "danger" ? "#FEE2E2" : "#FFF7ED";
  const actionIcon = confirmIcon || (tone === "danger" ? "alert-triangle" : "check");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: surface }]}>
            <Feather name={icon} size={26} color={accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {errorMessage ? (
            <View style={styles.errorBox} accessibilityLiveRegion="assertive">
              <Feather name="alert-triangle" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: accent }, busy && styles.disabled]}
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={busy ? `${confirmLabel}. Processing.` : confirmLabel}
              accessibilityState={{ disabled: busy }}
            >
              {busy ? <ActivityIndicator size="small" color="white" /> : <Feather name={actionIcon} size={16} color="white" />}
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.58)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 19, color: "#0F172A", fontFamily: "Inter_700Bold", textAlign: "center" },
  message: { marginTop: 7, fontSize: 13, lineHeight: 20, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center" },
  errorBox: { marginTop: 14, width: "100%", borderRadius: 13, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", padding: 10, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  errorText: { flex: 1, color: "#991B1B", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_600SemiBold" },
  actions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 22 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 14, fontFamily: "Inter_700Bold" },
  confirmButton: { flex: 1.25, minHeight: 48, borderRadius: 14, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  confirmText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
  disabled: { opacity: 0.68 },
});
