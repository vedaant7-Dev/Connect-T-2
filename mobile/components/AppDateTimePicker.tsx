import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const GREEN = "#16A34A";
const ORANGE = "#EA580C";
const SLOT_MINUTES = 30;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type AppDateTimePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  accessibilityLabel?: string;
};

function pad(value: number) { return String(value).padStart(2, "0"); }
function toLocalInputValue(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function parseValue(value?: string) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}
function startOfDay(date: Date) { const next = new Date(date); next.setHours(0, 0, 0, 0); return next; }
function startOfMonth(date: Date) { const next = new Date(date.getFullYear(), date.getMonth(), 1); next.setHours(0, 0, 0, 0); return next; }
function roundUpToSlot(date: Date) {
  const next = new Date(date); next.setSeconds(0, 0);
  const remainder = next.getMinutes() % SLOT_MINUTES;
  if (remainder) next.setMinutes(next.getMinutes() + SLOT_MINUTES - remainder);
  return next;
}
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function sameTime(a: Date, b: Date) { return a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes(); }
function formatDisplay(value?: string) {
  const date = parseValue(value); if (!date) return "";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
function formatDate(date: Date) { return date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }); }
function formatTime(date: Date) { return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }); }

export default function AppDateTimePicker({ value, onChange, placeholder = "Select date and time", minimumDate, accessibilityLabel = "Select date and time" }: AppDateTimePickerProps) {
  const minimumTime = minimumDate?.getTime() || Date.now();
  const fallback = roundUpToSlot(new Date(Math.max(Date.now() + 5 * 60 * 1000, minimumTime)));
  const [visible, setVisible] = useState(false);
  const [activePanel, setActivePanel] = useState<"date" | "time">("date");
  const [draft, setDraft] = useState<Date>(() => parseValue(value) || fallback);
  const [month, setMonth] = useState<Date>(() => startOfMonth(parseValue(value) || fallback));
  const minimumDay = useMemo(() => startOfDay(minimumDate || new Date()), [minimumTime]);

  const calendarCells = useMemo(() => {
    const first = startOfMonth(month);
    const leading = first.getDay();
    const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - leading + 1;
      return day >= 1 && day <= lastDate ? new Date(month.getFullYear(), month.getMonth(), day) : null;
    });
  }, [month.getFullYear(), month.getMonth()]);

  const timeSlots = useMemo(() => Array.from({ length: 48 }, (_, index) => {
    const slot = new Date(draft); slot.setHours(Math.floor(index / 2), index % 2 ? 30 : 0, 0, 0); return slot;
  }), [draft.getFullYear(), draft.getMonth(), draft.getDate()]);

  const open = () => {
    const selected = parseValue(value);
    const next = selected && selected.getTime() >= minimumTime ? selected : fallback;
    const rounded = roundUpToSlot(next);
    setDraft(rounded); setMonth(startOfMonth(rounded)); setActivePanel("date"); setVisible(true);
  };
  const chooseDate = (date: Date) => {
    const next = new Date(date); next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
    const valid = next.getTime() < minimumTime ? roundUpToSlot(new Date(minimumTime)) : next;
    setDraft(valid); setActivePanel("time");
  };
  const chooseTime = (slot: Date) => { if (slot.getTime() >= minimumTime) setDraft(slot); };
  const apply = () => { if (draft.getTime() >= minimumTime) { onChange(toLocalInputValue(draft)); setVisible(false); } };
  const previousMonthDisabled = startOfMonth(month).getTime() <= startOfMonth(minimumDay).getTime();

  return <>
    <TouchableOpacity style={styles.field} onPress={open} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <View style={styles.fieldIcon}><Feather name="calendar" size={16} color={ORANGE} /></View>
      <View style={styles.fieldCopy}><Text style={styles.fieldLabel}>DATE & TIME</Text><Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>{formatDisplay(value) || placeholder}</Text></View>
      {value ? <TouchableOpacity style={styles.clearButton} onPress={(event) => { event.stopPropagation(); onChange(""); }}><Feather name="x" size={16} color="#64748B" /></TouchableOpacity> : <Feather name="chevron-down" size={17} color="#64748B" />}
    </TouchableOpacity>

    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}><View style={styles.dialog}>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.title}>Select date and time</Text><Text style={styles.subtitle}>{formatDate(draft)} · {formatTime(draft)}</Text></View><TouchableOpacity style={styles.close} onPress={() => setVisible(false)}><Feather name="x" size={20} color="#475569" /></TouchableOpacity></View>
        <View style={styles.selectorRow}>
<TouchableOpacity style={[styles.selector, activePanel === "date" && styles.selectorActive]} onPress={() => setActivePanel("date")}><Text style={styles.selectorLabel}>DATE</Text><View style={styles.selectorValueRow}><Feather name="calendar" size={15} color={activePanel === "date" ? ORANGE : "#64748B"} /><Text style={[styles.selectorValue, activePanel === "date" && styles.selectorValueActive]} numberOfLines={1}>{draft.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Text><Feather name={activePanel === "date" ? "chevron-up" : "chevron-down"} size={15} color="#64748B" /></View></TouchableOpacity>
<TouchableOpacity style={[styles.selector, activePanel === "time" && styles.selectorActive]} onPress={() => setActivePanel("time")}><Text style={styles.selectorLabel}>TIME</Text><View style={styles.selectorValueRow}><Feather name="clock" size={15} color={activePanel === "time" ? ORANGE : "#64748B"} /><Text style={[styles.selectorValue, activePanel === "time" && styles.selectorValueActive]}>{formatTime(draft)}</Text><Feather name={activePanel === "time" ? "chevron-up" : "chevron-down"} size={15} color="#64748B" /></View></TouchableOpacity>
        </View>

        {activePanel === "date" ? <View style={styles.panel}>
<View style={styles.monthHeader}><TouchableOpacity style={[styles.monthButton, previousMonthDisabled && styles.monthButtonDisabled]} disabled={previousMonthDisabled} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Feather name="chevron-left" size={19} color={previousMonthDisabled ? "#CBD5E1" : "#334155"} /></TouchableOpacity><Text style={styles.monthTitle}>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</Text><TouchableOpacity style={styles.monthButton} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Feather name="chevron-right" size={19} color="#334155" /></TouchableOpacity></View>
<View style={styles.weekRow}>{WEEKDAYS.map((day) => <Text key={day} style={styles.weekText}>{day}</Text>)}</View>
<View style={styles.calendarGrid}>{calendarCells.map((date, index) => {
  if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
  const disabled = startOfDay(date).getTime() < minimumDay.getTime();
  const active = sameDay(date, draft);
  const today = sameDay(date, new Date());
  return <TouchableOpacity key={date.toISOString()} style={[styles.dayCell, active && styles.dayCellActive, today && !active && styles.todayCell]} disabled={disabled} onPress={() => chooseDate(date)}><Text style={[styles.dayCellText, active && styles.activeText, disabled && styles.disabledText]}>{date.getDate()}</Text></TouchableOpacity>;
})}</View>
        </View> : <View style={styles.panel}><Text style={styles.panelTitle}>Choose a time</Text><Text style={styles.panelHint}>Available in 30-minute slots.</Text><ScrollView style={styles.timeMenu} contentContainerStyle={styles.timeMenuContent} showsVerticalScrollIndicator={false}>{timeSlots.map((slot) => { const active = sameTime(slot, draft); const disabled = slot.getTime() < minimumTime; return <TouchableOpacity key={`${slot.getHours()}-${slot.getMinutes()}`} style={[styles.timeOption, active && styles.timeOptionActive, disabled && styles.timeOptionDisabled]} disabled={disabled} onPress={() => chooseTime(slot)}><Text style={[styles.timeOptionText, active && styles.activeText, disabled && styles.disabledText]}>{formatTime(slot)}</Text>{active ? <Feather name="check" size={17} color={ORANGE} /> : null}</TouchableOpacity>; })}</ScrollView></View>}

        <View style={styles.actions}><TouchableOpacity style={styles.cancel} onPress={() => setVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.apply} onPress={apply}><Feather name="check" size={17} color="white" /><Text style={styles.applyText}>Apply</Text></TouchableOpacity></View>
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  field: { minHeight: 54, borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "white", paddingLeft: 10, paddingRight: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  fieldIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" }, fieldCopy: { flex: 1, minWidth: 0 }, fieldLabel: { color: "#94A3B8", fontSize: 8.5, letterSpacing: 0.8, fontFamily: "Inter_700Bold" }, fieldText: { marginTop: 2, color: "#0F172A", fontSize: 12.5, fontFamily: "Inter_600SemiBold" }, placeholder: { color: "#94A3B8", fontFamily: "Inter_400Regular" }, clearButton: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16, backgroundColor: "rgba(15,23,42,0.62)" }, dialog: { width: "100%", maxWidth: 520, maxHeight: Platform.OS === "web" ? 650 : "90%", borderRadius: 24, backgroundColor: "white", overflow: "hidden", elevation: 12, shadowColor: "#020617", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 28 },
  header: { minHeight: 74, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }, headerCopy: { flex: 1 }, title: { color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold" }, subtitle: { marginTop: 3, color: "#64748B", fontSize: 10.5, fontFamily: "Inter_500Medium" }, close: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  selectorRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 10 }, selector: { flex: 1, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, padding: 11, backgroundColor: "#F8FAFC" }, selectorActive: { borderColor: ORANGE, backgroundColor: "#FFF7ED" }, selectorLabel: { color: "#94A3B8", fontSize: 8.5, letterSpacing: 0.8, fontFamily: "Inter_700Bold" }, selectorValueRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }, selectorValue: { flex: 1, color: "#334155", fontSize: 11.5, fontFamily: "Inter_700Bold" }, selectorValueActive: { color: ORANGE },
  panel: { paddingHorizontal: 16, paddingBottom: 8 }, monthHeader: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, monthTitle: { color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold" }, monthButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }, monthButtonDisabled: { opacity: 0.45 }, weekRow: { flexDirection: "row", marginTop: 4 }, weekText: { width: "14.2857%", textAlign: "center", color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_700Bold" }, calendarGrid: { marginTop: 6, flexDirection: "row", flexWrap: "wrap" }, dayCell: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 12 }, dayCellActive: { backgroundColor: ORANGE }, todayCell: { borderWidth: 1, borderColor: ORANGE }, dayCellText: { color: "#334155", fontSize: 12, fontFamily: "Inter_600SemiBold" }, activeText: { color: ORANGE }, disabledText: { color: "#CBD5E1" },
  panelTitle: { color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold" }, panelHint: { marginTop: 3, color: "#94A3B8", fontSize: 10, fontFamily: "Inter_400Regular" }, timeMenu: { marginTop: 10, maxHeight: 300 }, timeMenuContent: { gap: 6, paddingBottom: 6 }, timeOption: { minHeight: 46, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }, timeOptionActive: { borderColor: ORANGE, backgroundColor: "#FFF7ED" }, timeOptionDisabled: { opacity: 0.48 }, timeOptionText: { color: "#334155", fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  actions: { padding: 16, flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0" }, cancel: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }, cancelText: { color: "#475569", fontSize: 13, fontFamily: "Inter_700Bold" }, apply: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, applyText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
});
