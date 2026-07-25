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

export type AppDateTimePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  accessibilityLabel?: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseValue(value?: string) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplay(value?: string) {
  const date = parseValue(value);
  if (!date) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export default function AppDateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  minimumDate,
  accessibilityLabel = "Select date and time",
}: AppDateTimePickerProps) {
  const initial = parseValue(value) || new Date(Math.max(Date.now() + 5 * 60 * 1000, minimumDate?.getTime() || 0));
  const [visible, setVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(startOfDay(initial));
  const [selectedHour, setSelectedHour] = useState(initial.getHours());
  const [selectedMinute, setSelectedMinute] = useState(Math.floor(initial.getMinutes() / 5) * 5);

  const minimum = useMemo(() => startOfDay(minimumDate || new Date()), [minimumDate?.getTime()]);
  const days = useMemo(() => Array.from({ length: 366 }, (_, index) => {
    const date = new Date(minimum);
    date.setDate(date.getDate() + index);
    return date;
  }), [minimum.getTime()]);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, index) => index * 5), []);

  const open = () => {
    const current = parseValue(value) || new Date(Math.max(Date.now() + 5 * 60 * 1000, minimumDate?.getTime() || 0));
    setSelectedDay(startOfDay(current));
    setSelectedHour(current.getHours());
    setSelectedMinute(Math.floor(current.getMinutes() / 5) * 5);
    setVisible(true);
  };

  const apply = () => {
    const next = new Date(selectedDay);
    next.setHours(selectedHour, selectedMinute, 0, 0);
    if (minimumDate && next.getTime() < minimumDate.getTime()) return;
    onChange(toLocalInputValue(next));
    setVisible(false);
  };

  if (Platform.OS === "web") {
    const webValue = value ? value.slice(0, 16).replace(" ", "T") : "";
    const min = minimumDate ? toLocalInputValue(minimumDate) : undefined;
    return (
      <View style={styles.webWrap}>
        {React.createElement("input" as any, {
          type: "datetime-local",
          value: webValue,
          min,
          "aria-label": accessibilityLabel,
          onChange: (event: any) => onChange(String(event?.target?.value || "")),
          style: {
            flex: 1,
            width: "100%",
            minHeight: 50,
            borderRadius: 14,
            border: "1.5px solid #E2E8F0",
            background: "#FFFFFF",
            padding: "0 14px",
            color: "#0F172A",
            fontSize: 13.5,
            fontFamily: "Inter_400Regular, Inter, sans-serif",
            boxSizing: "border-box",
            outline: "none",
          },
        })}
        {value ? (
          <TouchableOpacity style={styles.clearButton} onPress={() => onChange("")} accessibilityLabel="Clear selected date and time">
            <Feather name="x" size={16} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={open} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        <Feather name="calendar" size={17} color={ORANGE} />
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>{formatDisplay(value) || placeholder}</Text>
        {value ? (
          <TouchableOpacity style={styles.clearButton} onPress={(event) => { event.stopPropagation(); onChange(""); }} accessibilityLabel="Clear selected date and time">
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
                <Text style={styles.title}>Select date and time</Text>
                <Text style={styles.subtitle}>{formatDisplay(toLocalInputValue(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), selectedHour, selectedMinute)))}</Text>
              </View>
              <TouchableOpacity style={styles.close} onPress={() => setVisible(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>DATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
              {days.map((date) => {
                const active = date.toDateString() === selectedDay.toDateString();
                return (
                  <TouchableOpacity key={date.toISOString()} style={[styles.dayChip, active && styles.activeChip]} onPress={() => setSelectedDay(startOfDay(date))}>
                    <Text style={[styles.dayWeek, active && styles.activeText]}>{date.toLocaleDateString("en-IN", { weekday: "short" })}</Text>
                    <Text style={[styles.dayNumber, active && styles.activeText]}>{date.getDate()}</Text>
                    <Text style={[styles.dayMonth, active && styles.activeText]}>{date.toLocaleDateString("en-IN", { month: "short" })}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>HOUR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
              {Array.from({ length: 24 }, (_, hour) => (
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
  field: { minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "white", paddingLeft: 14, paddingRight: 8, flexDirection: "row", alignItems: "center", gap: 9 },
  fieldText: { flex: 1, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_400Regular" },
  placeholder: { color: "#94A3B8" },
  clearButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.6)" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", paddingBottom: 24 },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", marginTop: 10 },
  header: { minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  title: { color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { marginTop: 3, color: "#64748B", fontSize: 11, fontFamily: "Inter_400Regular" },
  close: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  sectionLabel: { marginTop: 15, marginBottom: 8, paddingHorizontal: 18, color: "#64748B", fontSize: 10, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  dayRow: { paddingHorizontal: 18, gap: 8 },
  dayChip: { width: 68, minHeight: 78, borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  dayWeek: { color: "#64748B", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  dayNumber: { marginTop: 2, color: "#0F172A", fontSize: 20, fontFamily: "Inter_700Bold" },
  dayMonth: { color: "#94A3B8", fontSize: 9, fontFamily: "Inter_500Medium" },
  timeRow: { paddingHorizontal: 18, gap: 7 },
  timeChip: { minWidth: 50, minHeight: 42, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  timeText: { color: "#334155", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  minuteGrid: { paddingHorizontal: 18, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  activeChip: { backgroundColor: "#FFF7ED", borderColor: ORANGE },
  activeText: { color: ORANGE },
  actions: { marginTop: 20, paddingHorizontal: 18, flexDirection: "row", gap: 10 },
  cancel: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 13, fontFamily: "Inter_700Bold" },
  apply: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: GREEN, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  applyText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
});
