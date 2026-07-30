import { Feather } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
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
const SLOT_MINUTES = 30;

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

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function roundUpToSlot(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const remainder = next.getMinutes() % SLOT_MINUTES;
  if (remainder) next.setMinutes(next.getMinutes() + SLOT_MINUTES - remainder);
  return next;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function sameTime(left: Date, right: Date) {
  return left.getHours() === right.getHours() && left.getMinutes() === right.getMinutes();
}

function formatDisplay(value?: string) {
  const date = parseValue(value);
  if (!date) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AppDateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  minimumDate,
  accessibilityLabel = "Select date and time",
}: AppDateTimePickerProps) {
  const minimumTime = minimumDate?.getTime() || Date.now();
  const fallback = roundUpToSlot(new Date(Math.max(Date.now() + 5 * 60 * 1000, minimumTime)));
  const [visible, setVisible] = useState(false);
  const [activePanel, setActivePanel] = useState<"date" | "time">("date");
  const [draft, setDraft] = useState<Date>(() => parseValue(value) || fallback);
  const dateScrollRef = useRef<ScrollView>(null);
  const timeScrollRef = useRef<ScrollView>(null);

  const minimumDay = useMemo(() => startOfDay(minimumDate || new Date()), [minimumTime]);
  const days = useMemo(() => Array.from({ length: 180 }, (_, index) => {
    const date = new Date(minimumDay);
    date.setDate(date.getDate() + index);
    return date;
  }), [minimumDay.getTime()]);

  const timeSlots = useMemo(() => Array.from({ length: 48 }, (_, index) => {
    const date = new Date(draft);
    date.setHours(Math.floor(index / 2), index % 2 === 0 ? 0 : 30, 0, 0);
    return date;
  }), [draft.getFullYear(), draft.getMonth(), draft.getDate()]);

  const open = () => {
    const selected = parseValue(value);
    const next = selected && selected.getTime() >= minimumTime ? selected : fallback;
    setDraft(roundUpToSlot(next));
    setActivePanel("date");
    setVisible(true);
  };

  const chooseDate = (date: Date) => {
    const next = new Date(date);
    next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
    const valid = next.getTime() < minimumTime ? roundUpToSlot(new Date(minimumTime)) : next;
    setDraft(valid);
    setActivePanel("time");
    setTimeout(() => timeScrollRef.current?.scrollTo({ y: Math.max(0, valid.getHours() * 84 - 70), animated: true }), 120);
  };

  const chooseTime = (slot: Date) => {
    if (slot.getTime() < minimumTime) return;
    setDraft(slot);
  };

  const apply = () => {
    if (draft.getTime() < minimumTime) return;
    onChange(toLocalInputValue(draft));
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.fieldIcon}><Feather name="calendar" size={16} color={ORANGE} /></View>
        <View style={styles.fieldCopy}>
          <Text style={styles.fieldLabel}>DATE & TIME</Text>
          <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
            {formatDisplay(value) || placeholder}
          </Text>
        </View>
        {value ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={(event) => {
              event.stopPropagation();
              onChange("");
            }}
            accessibilityLabel="Clear selected date and time"
          >
            <Feather name="x" size={16} color="#64748B" />
          </TouchableOpacity>
        ) : (
          <Feather name="chevron-down" size={17} color="#64748B" />
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Select date and time</Text>
                <Text style={styles.subtitle}>{formatDate(draft)} · {formatTime(draft)}</Text>
              </View>
              <TouchableOpacity style={styles.close} onPress={() => setVisible(false)}>
                <Feather name="x" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selector, activePanel === "date" && styles.selectorActive]}
                onPress={() => setActivePanel("date")}
              >
                <Text style={styles.selectorLabel}>DATE</Text>
                <View style={styles.selectorValueRow}>
                  <Feather name="calendar" size={15} color={activePanel === "date" ? ORANGE : "#64748B"} />
                  <Text style={[styles.selectorValue, activePanel === "date" && styles.selectorValueActive]} numberOfLines={1}>
                    {draft.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                  <Feather name={activePanel === "date" ? "chevron-up" : "chevron-down"} size={15} color="#64748B" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selector, activePanel === "time" && styles.selectorActive]}
                onPress={() => setActivePanel("time")}
              >
                <Text style={styles.selectorLabel}>TIME</Text>
                <View style={styles.selectorValueRow}>
                  <Feather name="clock" size={15} color={activePanel === "time" ? ORANGE : "#64748B"} />
                  <Text style={[styles.selectorValue, activePanel === "time" && styles.selectorValueActive]} numberOfLines={1}>
                    {formatTime(draft)}
                  </Text>
                  <Feather name={activePanel === "time" ? "chevron-up" : "chevron-down"} size={15} color="#64748B" />
                </View>
              </TouchableOpacity>
            </View>

            {activePanel === "date" ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Choose a date</Text>
                <Text style={styles.panelHint}>Swipe to see more available dates.</Text>
                <ScrollView
                  ref={dateScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayRow}
                >
                  {days.map((date) => {
                    const active = sameDay(date, draft);
                    return (
                      <TouchableOpacity
                        key={date.toISOString()}
                        style={[styles.dayCard, active && styles.dayCardActive]}
                        onPress={() => chooseDate(date)}
                      >
                        <Text style={[styles.dayWeek, active && styles.activeText]}>
                          {date.toLocaleDateString("en-IN", { weekday: "short" })}
                        </Text>
                        <Text style={[styles.dayNumber, active && styles.activeText]}>{date.getDate()}</Text>
                        <Text style={[styles.dayMonth, active && styles.activeText]}>
                          {date.toLocaleDateString("en-IN", { month: "short" })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Choose a time</Text>
                <Text style={styles.panelHint}>Available in simple 30-minute slots.</Text>
                <ScrollView ref={timeScrollRef} style={styles.timeMenu} contentContainerStyle={styles.timeMenuContent} showsVerticalScrollIndicator={false}>
                  {timeSlots.map((slot) => {
                    const active = sameTime(slot, draft);
                    const disabled = slot.getTime() < minimumTime;
                    return (
                      <TouchableOpacity
                        key={`${slot.getHours()}-${slot.getMinutes()}`}
                        style={[styles.timeOption, active && styles.timeOptionActive, disabled && styles.timeOptionDisabled]}
                        onPress={() => chooseTime(slot)}
                        disabled={disabled}
                      >
                        <Text style={[styles.timeOptionText, active && styles.activeText, disabled && styles.disabledText]}>
                          {formatTime(slot)}
                        </Text>
                        {active ? <Feather name="check" size={17} color={ORANGE} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancel} onPress={() => setVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.apply} onPress={apply}>
                <Feather name="check" size={17} color="white" />
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "white",
    paddingLeft: 10,
    paddingRight: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  fieldCopy: { flex: 1, minWidth: 0 },
  fieldLabel: { color: "#94A3B8", fontSize: 8.5, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  fieldText: { marginTop: 2, color: "#0F172A", fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  placeholder: { color: "#94A3B8", fontFamily: "Inter_400Regular" },
  clearButton: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18, backgroundColor: "rgba(15,23,42,0.62)" },
  dialog: {
    width: "100%",
    maxWidth: 520,
    maxHeight: Platform.OS === "web" ? 620 : "86%",
    borderRadius: 24,
    backgroundColor: "white",
    overflow: "hidden",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  header: { minHeight: 74, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { marginTop: 3, color: "#64748B", fontSize: 10.5, fontFamily: "Inter_500Medium" },
  close: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  selectorRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  selector: { flex: 1, minWidth: 0, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", padding: 11 },
  selectorActive: { borderColor: ORANGE, backgroundColor: "#FFF7ED" },
  selectorLabel: { color: "#94A3B8", fontSize: 8.5, letterSpacing: 0.9, fontFamily: "Inter_700Bold" },
  selectorValueRow: { marginTop: 7, flexDirection: "row", alignItems: "center", gap: 7 },
  selectorValue: { flex: 1, color: "#334155", fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
  selectorValueActive: { color: "#C2410C" },
  panel: { minHeight: 250, paddingTop: 18 },
  panelTitle: { paddingHorizontal: 18, color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold" },
  panelHint: { marginTop: 3, paddingHorizontal: 18, color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_400Regular" },
  dayRow: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, gap: 8 },
  dayCard: { width: 68, minHeight: 82, borderRadius: 15, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  dayCardActive: { borderColor: ORANGE, backgroundColor: "#FFF7ED" },
  dayWeek: { color: "#64748B", fontSize: 9.5, fontFamily: "Inter_600SemiBold" },
  dayNumber: { marginTop: 2, color: "#0F172A", fontSize: 20, fontFamily: "Inter_700Bold" },
  dayMonth: { color: "#94A3B8", fontSize: 9, fontFamily: "Inter_500Medium" },
  activeText: { color: ORANGE },
  timeMenu: { marginTop: 12, marginHorizontal: 18, maxHeight: 285, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  timeMenuContent: { padding: 6 },
  timeOption: { minHeight: 44, paddingHorizontal: 13, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeOptionActive: { backgroundColor: "#FFF7ED" },
  timeOptionDisabled: { opacity: 0.38 },
  timeOptionText: { color: "#334155", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  disabledText: { color: "#94A3B8" },
  actions: { padding: 16, paddingTop: 14, flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  cancel: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#475569", fontSize: 12.5, fontFamily: "Inter_700Bold" },
  apply: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: GREEN, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  applyText: { color: "white", fontSize: 12.5, fontFamily: "Inter_700Bold" },
});
