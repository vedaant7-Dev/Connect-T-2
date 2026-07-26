import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const GREEN = "#16A34A";
const ORANGE = "#EA580C";

export type AppTimePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseTime(value?: string) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function roundToFive(date: Date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.round(rounded.getMinutes() / 5) * 5);
  if (rounded.getMinutes() === 60) {
    rounded.setMinutes(0);
    rounded.setHours(rounded.getHours() + 1);
  }
  return rounded;
}

function toPickerParts(hour24: number, minute: number) {
  return {
    hour12: hour24 % 12 || 12,
    minute: Math.floor(minute / 5) * 5,
    period: hour24 >= 12 ? "PM" as const : "AM" as const,
  };
}

function toStoredValue(hour12: number, minute: number, period: "AM" | "PM") {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${pad(hour24)}:${pad(minute)}`;
}

export function formatTimeLabel(value?: string) {
  const parsed = parseTime(value);
  if (!parsed) return "";
  const date = new Date(2000, 0, 1, parsed.hour, parsed.minute, 0, 0);
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function AppTimePicker({
  value,
  onChange,
  placeholder = "Select time",
  accessibilityLabel = "Select time",
}: AppTimePickerProps) {
  const current = parseTime(value);
  const initialDate = roundToFive(new Date());
  const initial = toPickerParts(current?.hour ?? initialDate.getHours(), current?.minute ?? initialDate.getMinutes());
  const [visible, setVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(initial.hour12);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(initial.period);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, index) => index * 5), []);

  const open = () => {
    const parsed = parseTime(value);
    const fallback = roundToFive(new Date());
    const parts = toPickerParts(parsed?.hour ?? fallback.getHours(), parsed?.minute ?? fallback.getMinutes());
    setSelectedHour(parts.hour12);
    setSelectedMinute(parts.minute);
    setSelectedPeriod(parts.period);
    setVisible(true);
  };

  const apply = () => {
    onChange(toStoredValue(selectedHour, selectedMinute, selectedPeriod));
    setVisible(false);
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.webWrap}>
        {React.createElement("input" as any, {
          type: "time",
          value: value || "",
          step: 300,
          "aria-label": accessibilityLabel,
          onChange: (event: any) => onChange(String(event?.target?.value || "")),
          style: {
            flex: 1,
            width: "100%",
            minHeight: 50,
            borderRadius: 14,
            border: "1.5px solid #E2E8F0",
            background: "#F8FAFC",
            padding: "0 14px",
            color: "#0F172A",
            fontSize: 13.5,
            fontFamily: "Inter_400Regular, Inter, sans-serif",
            boxSizing: "border-box",
            outline: "none",
          },
        })}
        {value ? (
          <TouchableOpacity style={styles.clearButton} onPress={() => onChange("")} accessibilityLabel="Clear selected time">
            <Feather name="x" size={16} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={open} accessibilityRole="button" accessibilityLabel={accessibilityLabel} activeOpacity={0.85}>
        <Feather name="clock" size={17} color={ORANGE} />
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>{formatTimeLabel(value) || placeholder}</Text>
        {value ? (
          <TouchableOpacity style={styles.clearButton} onPress={(event) => { event.stopPropagation(); onChange(""); }} accessibilityLabel="Clear selected time">
            <Feather name="x" size={16} color="#64748B" />
          </TouchableOpacity>
        ) : <Feather name="chevron-down" size={16} color="#64748B" />}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Select time</Text>
                <Text style={styles.subtitle}>{formatTimeLabel(toStoredValue(selectedHour, selectedMinute, selectedPeriod))}</Text>
              </View>
              <TouchableOpacity style={styles.close} onPress={() => setVisible(false)} accessibilityLabel="Close time picker">
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>HOUR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                <TouchableOpacity key={hour} style={[styles.timeChip, selectedHour === hour && styles.activeChip]} onPress={() => setSelectedHour(hour)}>
                  <Text style={[styles.timeText, selectedHour === hour && styles.activeText]}>{pad(hour)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>MINUTE</Text>
            <View style={styles.minuteGrid}>
              {minutes.map((minute) => (
                <TouchableOpacity key={minute} style={[styles.timeChip, selectedMinute === minute && styles.activeChip]} onPress={() => setSelectedMinute(minute)}>
                  <Text style={[styles.timeText, selectedMinute === minute && styles.activeText]}>{pad(minute)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>AM / PM</Text>
            <View style={styles.periodRow}>
              {(["AM", "PM"] as const).map((period) => (
                <TouchableOpacity key={period} style={[styles.periodChip, selectedPeriod === period && styles.periodChipActive]} onPress={() => setSelectedPeriod(period)}>
                  <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>{period}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancel} onPress={() => setVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.apply} onPress={apply}><Feather name="check" size={17} color="white" /><Text style={styles.applyText}>Apply</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  webWrap: { position: "relative", minHeight: 50, flexDirection: "row", alignItems: "center", gap: 8 },
  field: { minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingLeft: 14, paddingRight: 8, flexDirection: "row", alignItems: "center", gap: 9 },
  fieldText: { flex: 1, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_400Regular" },
  placeholder: { color: "#94A3B8" },
  clearButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.6)" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", paddingBottom: 24 },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", marginTop: 10 },
  header: { minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  title: { color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { marginTop: 3, color: "#64748B", fontSize: 12, fontFamily: "Inter_500Medium" },
  close: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  sectionLabel: { marginTop: 16, marginBottom: 8, paddingHorizontal: 18, color: "#64748B", fontSize: 10, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  timeRow: { paddingHorizontal: 18, gap: 7 },
  timeChip: { minWidth: 50, minHeight: 42, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  timeText: { color: "#334155", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  minuteGrid: { paddingHorizontal: 18, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  activeChip: { backgroundColor: "#FFF7ED", borderColor: ORANGE },
  activeText: { color: ORANGE },
  periodRow: { paddingHorizontal: 18, flexDirection: "row", gap: 10 },
  periodChip: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  periodChipActive: { borderColor: GREEN, backgroundColor: "#F0FDF4" },
  periodText: { color: "#475569", fontSize: 13, fontFamily: "Inter_700Bold" },
  periodTextActive: { color: GREEN },
  actions: { marginTop: 22, paddingHorizontal: 18, flexDirection: "row", gap: 10 },
  cancel: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 13, fontFamily: "Inter_700Bold" },
  apply: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: GREEN, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  applyText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
});
