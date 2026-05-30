import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobs, categoryConfig, typeConfig, JobCategory, JobType } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

const categories = Object.entries(categoryConfig).map(([id, cfg]) => ({ id: id as JobCategory, ...cfg }));
const jobTypes = Object.entries(typeConfig).map(([id, cfg]) => ({ id: id as JobType, ...cfg }));
const shifts = ["Day Shift", "Morning Shift", "Evening Shift", "Night Shift", "Rotational Shift"];
const jobModes = ["On-site", "Hybrid", "Remote", "Field Work"];
const joiningOptions = ["Immediate", "Within 7 days", "Within 15 days", "Within 30 days"];
const weeklyOffOptions = ["Sunday", "Saturday & Sunday", "Rotational", "No fixed off"];

function wordCount(value: string) { return value.trim().split(/\s+/).filter(Boolean).length; }
function cleanMoney(value: string) { return value.replace(/[^\d]/g, "").slice(0, 7); }
function validDate(value: string) { if (!value.trim()) return true; if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false; const [y, m, d] = value.split("-").map(Number); const dt = new Date(y, m - 1, d); return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d; }
function validTime(value: string) { if (!value.trim()) return true; return /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(value.trim()) || /^([01]?\d|2[0-3]):[0-5][0-9]$/.test(value.trim()); }

export default function EmployerPostJobScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobsUser } = useJobsAuth();
  const { addJob } = useJobs();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<JobCategory>("manufacturing");
  const [type, setType] = useState<JobType>("full-time");
  const [shift, setShift] = useState("Day Shift");
  const [jobMode, setJobMode] = useState("On-site");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [openings, setOpenings] = useState("1");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [workStartTime, setWorkStartTime] = useState("");
  const [workEndTime, setWorkEndTime] = useState("");
  const [workingDays, setWorkingDays] = useState("Monday to Saturday");
  const [weeklyOff, setWeeklyOff] = useState("Sunday");
  const [experienceRequired, setExperienceRequired] = useState("");
  const [educationRequired, setEducationRequired] = useState("");
  const [skillsRequired, setSkillsRequired] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");
  const [joiningPreference, setJoiningPreference] = useState("Immediate");
  const [lastDateToApply, setLastDateToApply] = useState("");
  const [urgentHiring, setUrgentHiring] = useState(false);

  const descriptionWords = wordCount(description);
  const requirementsWords = wordCount(requirements);
  const benefitsWords = wordCount(benefits);
  const companyName = useMemo(() => jobsUser?.company || jobsUser?.companies?.[0]?.name || "Company", [jobsUser]);
  const salaryText = useMemo(() => { if (salaryMin && salaryMax) return `₹${salaryMin} - ₹${salaryMax}`; if (salaryMin) return `₹${salaryMin}+`; if (salaryMax) return `Up to ₹${salaryMax}`; return ""; }, [salaryMin, salaryMax]);

  const validate = () => {
    const minSalary = Number(salaryMin || 0);
    const maxSalary = Number(salaryMax || 0);
    const openingCount = Number(openings || 0);
    if (!jobsUser || jobsUser.role !== "employer") return "Only employer accounts can post jobs.";
    if (title.trim().length < 3) return "Job title must be at least 3 characters.";
    if (!salaryMin && !salaryMax) return "Enter salary minimum or maximum.";
    if (salaryMin && salaryMax && minSalary > maxSalary) return "Minimum salary cannot be greater than maximum salary.";
    if (!location.trim() || location.trim().length < 3) return "Enter job location.";
    if (!address.trim() || address.trim().length < 8) return "Enter full job address.";
    if (openingCount < 1 || openingCount > 99) return "Openings must be between 1 and 99.";
    if (!validTime(workStartTime) || !validTime(workEndTime)) return "Use valid time like 09:00 AM or 18:00.";
    if (!workingDays.trim()) return "Enter working days.";
    if (!weeklyOff.trim()) return "Enter weekly off.";
    if (descriptionWords < 5 || descriptionWords > 100) return "Description must be minimum 5 words and maximum 100 words.";
    if (requirements.trim() && requirementsWords > 100) return "Requirements must be maximum 100 words.";
    if (benefits.trim() && benefitsWords > 80) return "Benefits must be maximum 80 words.";
    if (!validDate(lastDateToApply)) return "Last date must be in YYYY-MM-DD format.";
    return "";
  };

  const resetForm = () => {
    setTitle(""); setSalaryMin(""); setSalaryMax(""); setOpenings("1"); setLocation(""); setAddress(""); setWorkStartTime(""); setWorkEndTime(""); setWorkingDays("Monday to Saturday"); setWeeklyOff("Sunday"); setExperienceRequired(""); setEducationRequired(""); setSkillsRequired(""); setDescription(""); setRequirements(""); setBenefits(""); setJoiningPreference("Immediate"); setLastDateToApply(""); setUrgentHiring(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const message = validate();
    if (message) { Alert.alert("Check job details", message); return; }
    setSubmitting(true);
    try {
      await addJob({ employerId: jobsUser!.id, employerName: jobsUser!.name, employerPhone: jobsUser!.phone, employerWhatsApp: jobsUser!.whatsapp || jobsUser!.phone, company: companyName, title: title.trim(), category, type, shift, jobMode, salary: salaryText, salaryMin: salaryMin ? Number(salaryMin) : undefined, salaryMax: salaryMax ? Number(salaryMax) : undefined, location: location.trim(), address: address.trim(), workStartTime: workStartTime.trim() || undefined, workEndTime: workEndTime.trim() || undefined, workingDays: workingDays.trim(), weeklyOff: weeklyOff.trim(), openings: Number(openings), description: description.trim(), requirements: requirements.trim(), experienceRequired: experienceRequired.trim() || undefined, educationRequired: educationRequired.trim() || undefined, skillsRequired: skillsRequired.trim() || undefined, benefits: benefits.trim() || undefined, joiningPreference, lastDateToApply: lastDateToApply.trim() || undefined, urgentHiring });
      Alert.alert("Job posted", "Your job has been saved and is now visible to job seekers.");
      resetForm();
      router.replace("/jobs/(tabs)" as any);
    } catch (err: any) { Alert.alert("Unable to post job", err?.message || "Please try again."); }
    finally { setSubmitting(false); }
  };

  if (!jobsUser || jobsUser.role !== "employer") {
    return <View style={styles.emptyRoot}><View style={styles.emptyIcon}><Feather name="lock" size={32} color={ORANGE} /></View><Text style={styles.emptyTitle}>Employer access required</Text><Text style={styles.emptyText}>Please login as an employer to post jobs.</Text></View>;
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TopShade height={110} /><DecorativeCircles />
        <View style={styles.headerRow}><TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}><Feather name="arrow-left" size={18} color="white" /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.kicker}>Employer Dashboard</Text><Text style={styles.title}>Post New Job</Text><Text style={styles.subtitle}>{companyName}</Text></View></View>
      </LinearGradient>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card title="Basic Job Details" icon="briefcase"><Input label="Job Title *" value={title} onChangeText={setTitle} placeholder="Machine Operator, Sales Executive..." /><Label text="Category" /><ChipGrid>{categories.slice(0, 8).map((item) => <Chip key={item.id} label={item.label} active={category === item.id} onPress={() => setCategory(item.id)} />)}</ChipGrid><Label text="Job Type" /><ChipGrid>{jobTypes.map((item) => <Chip key={item.id} label={item.label} active={type === item.id} onPress={() => setType(item.id)} />)}</ChipGrid><Label text="Urgency" /><TouchableOpacity style={[styles.urgentBox, urgentHiring && styles.urgentBoxActive]} onPress={() => setUrgentHiring((v) => !v)} activeOpacity={0.85}><Feather name={urgentHiring ? "zap" : "clock"} size={16} color={urgentHiring ? "#FFFFFF" : ORANGE} /><Text style={[styles.urgentText, urgentHiring && styles.urgentTextActive]}>{urgentHiring ? "Urgent Hiring Enabled" : "Mark as Urgent Hiring"}</Text></TouchableOpacity></Card>
          <Card title="Salary & Openings" icon="credit-card"><View style={styles.twoCol}><Input label="Min Salary" value={salaryMin} onChangeText={(v) => setSalaryMin(cleanMoney(v))} placeholder="15000" keyboardType="number-pad" /><Input label="Max Salary" value={salaryMax} onChangeText={(v) => setSalaryMax(cleanMoney(v))} placeholder="25000" keyboardType="number-pad" /></View><Input label="Openings *" value={openings} onChangeText={(v) => setOpenings(v.replace(/\D/g, "").slice(0, 2))} placeholder="1" keyboardType="number-pad" />{!!salaryText && <Text style={styles.previewText}>Salary preview: {salaryText}</Text>}</Card>
          <Card title="Timing & Shift" icon="clock"><Label text="Shift" /><ChipGrid>{shifts.map((item) => <Chip key={item} label={item} active={shift === item} onPress={() => setShift(item)} />)}</ChipGrid><Label text="Job Mode" /><ChipGrid>{jobModes.map((item) => <Chip key={item} label={item} active={jobMode === item} onPress={() => setJobMode(item)} />)}</ChipGrid><View style={styles.twoCol}><Input label="Start Time" value={workStartTime} onChangeText={setWorkStartTime} placeholder="09:00 AM" /><Input label="End Time" value={workEndTime} onChangeText={setWorkEndTime} placeholder="06:00 PM" /></View><Input label="Working Days *" value={workingDays} onChangeText={setWorkingDays} placeholder="Monday to Saturday" /><Label text="Weekly Off" /><ChipGrid>{weeklyOffOptions.map((item) => <Chip key={item} label={item} active={weeklyOff === item} onPress={() => setWeeklyOff(item)} />)}</ChipGrid></Card>
          <Card title="Location" icon="map-pin"><Input label="Job Location *" value={location} onChangeText={setLocation} placeholder="MIDC Ambernath, Station Road..." /><Input label="Full Address *" value={address} onChangeText={setAddress} placeholder="Complete workplace address" multiline /></Card>
          <Card title="Candidate Requirements" icon="user-check"><Input label="Experience Required" value={experienceRequired} onChangeText={setExperienceRequired} placeholder="Fresher / 1-2 years / 3+ years" /><Input label="Education Required" value={educationRequired} onChangeText={setEducationRequired} placeholder="10th Pass, ITI, Graduate..." /><Input label="Skills Required" value={skillsRequired} onChangeText={setSkillsRequired} placeholder="Computer, Sales, Machine handling..." multiline /><Input label="Requirements" value={requirements} onChangeText={setRequirements} placeholder="Maximum 100 words" multiline /><Text style={styles.helperText}>{requirementsWords} / 100 words</Text></Card>
          <Card title="Job Description" icon="file-text"><Input label="Description *" value={description} onChangeText={setDescription} placeholder="Minimum 5 words and maximum 100 words" multiline /><Text style={styles.helperText}>{descriptionWords} / 100 words · minimum 5 words</Text><Input label="Benefits" value={benefits} onChangeText={setBenefits} placeholder="PF, ESIC, overtime, food, transport..." multiline /><Text style={styles.helperText}>{benefitsWords} / 80 words</Text></Card>
          <Card title="Application Settings" icon="calendar"><Label text="Joining Preference" /><ChipGrid>{joiningOptions.map((item) => <Chip key={item} label={item} active={joiningPreference === item} onPress={() => setJoiningPreference(item)} />)}</ChipGrid><Input label="Last Date To Apply" value={lastDateToApply} onChangeText={setLastDateToApply} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></Card>
          <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.9}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.submitText}>Post Job</Text><Feather name="send" size={18} color="#FFFFFF" /></>}</TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Card({ title, icon, children }: { title: string; icon: keyof typeof Feather.glyphMap; children: React.ReactNode }) { return <View style={styles.card}><View style={styles.cardTitleRow}><View style={styles.cardIcon}><Feather name={icon} size={16} color={ORANGE} /></View><Text style={styles.cardTitle}>{title}</Text></View>{children}</View>; }
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, multiline, style, ...rest } = props; return <View style={styles.inputGroup}><Text style={styles.label}>{label}</Text><TextInput {...rest} multiline={multiline} style={[styles.input, multiline && styles.textArea, style]} placeholderTextColor="#94A3B8" /></View>; }
function ChipGrid({ children }: { children: React.ReactNode }) { return <View style={styles.chipGrid}>{children}</View>; }
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.85}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 13 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  kicker: { fontSize: 9.5, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.7 },
  title: { fontSize: 22, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900", letterSpacing: -0.35 },
  subtitle: { marginTop: 2, fontSize: 11.5, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_600SemiBold" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(254,215,170,0.9)", shadowColor: DARK, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, gap: 10 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 1 }, cardIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", alignItems: "center", justifyContent: "center" }, cardTitle: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" },
  inputGroup: { flex: 1, gap: 6 }, label: { fontSize: 11, color: "#334155", fontFamily: "Inter_700Bold" }, input: { minHeight: 48, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 13, paddingVertical: 10, color: "#0F172A", fontSize: 13, fontFamily: "Inter_600SemiBold" }, textArea: { minHeight: 86, textAlignVertical: "top" }, twoCol: { flexDirection: "row", gap: 9 }, chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" }, chipActive: { backgroundColor: ORANGE, borderColor: ORANGE }, chipText: { fontSize: 11.5, color: "#475569", fontFamily: "Inter_700Bold" }, chipTextActive: { color: "white" },
  urgentBox: { minHeight: 48, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13 }, urgentBoxActive: { backgroundColor: ORANGE, borderColor: ORANGE }, urgentText: { color: ORANGE, fontSize: 12.5, fontFamily: "Inter_700Bold" }, urgentTextActive: { color: "white" }, previewText: { fontSize: 11.5, color: ORANGE, fontFamily: "Inter_700Bold", backgroundColor: "#FFF7ED", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13, borderWidth: 1, borderColor: "#FED7AA" }, helperText: { marginTop: -4, fontSize: 10.5, color: "#64748B", fontFamily: "Inter_500Medium" },
  submitBtn: { height: 54, borderRadius: 17, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9, shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, submitBtnDisabled: { opacity: 0.65 }, submitText: { color: "white", fontSize: 15, fontFamily: "Inter_700Bold", fontWeight: "900" },
  emptyRoot: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", padding: 24 }, emptyIcon: { width: 70, height: 70, borderRadius: 24, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", alignItems: "center", justifyContent: "center" }, emptyTitle: { marginTop: 14, fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" }, emptyText: { marginTop: 6, textAlign: "center", color: "#64748B", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
