import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { calcProfileCompletion, CurrentStatus, JobsUser, useJobsAuth } from "@/context/JobsAuthContext";
import { useJobs } from "@/context/JobsContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

function cleanPhone(value?: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function initials(name?: string) {
  return String(name || "CT")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function countWords(value?: string) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function normalizeDobForInputs(value?: string) {
  const raw = String(value || "").trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { day: iso[3], month: iso[2], year: iso[1] };
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return { day: slash[1].padStart(2, "0"), month: slash[2].padStart(2, "0"), year: slash[3] };
  return { day: "", month: "", year: "" };
}

function makeDob(day: string, month: string, year: string) {
  if (!day && !month && !year) return undefined;
  if (day.length < 1 || month.length < 1 || year.length !== 4) return undefined;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function validEmail(value?: string) {
  const v = String(value || "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function Section({ title, icon, children }: { title: string; icon: keyof typeof Feather.glyphMap; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{title.toUpperCase()}</Text>
      <View style={s.card}>
        <View style={s.formHead}>
          <View style={s.formIcon}><Feather name={icon} size={15} color={ORANGE} /></View>
          <Text style={s.formTitle}>{title}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, style, ...rest } = props;
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        style={[s.input, multiline && s.textArea, style]}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress} activeOpacity={0.82}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DobEditor({ day, month, year, setDay, setMonth, setYear }: { day: string; month: string; year: string; setDay: (v: string) => void; setMonth: (v: string) => void; setYear: (v: string) => void }) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>Date of Birth</Text>
      <View style={s.dobRow}>
        <TextInput value={day} onChangeText={(v) => setDay(v.replace(/\D/g, "").slice(0, 2))} placeholder="DD" keyboardType="number-pad" maxLength={2} style={s.dobInput} placeholderTextColor="#94A3B8" />
        <TextInput value={month} onChangeText={(v) => setMonth(v.replace(/\D/g, "").slice(0, 2))} placeholder="MM" keyboardType="number-pad" maxLength={2} style={s.dobInput} placeholderTextColor="#94A3B8" />
        <TextInput value={year} onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))} placeholder="YYYY" keyboardType="number-pad" maxLength={4} style={[s.dobInput, { flex: 1.35 }]} placeholderTextColor="#94A3B8" />
      </View>
    </View>
  );
}

function ActionRow({ icon, label, sub, color, bg, onPress, border }: { icon: keyof typeof Feather.glyphMap; label: string; sub: string; color: string; bg: string; onPress: () => void; border?: boolean }) {
  return (
    <TouchableOpacity style={[s.actionRow, border && s.rowBorder]} onPress={onPress} activeOpacity={0.82}>
      <View style={[s.actionIcon, { backgroundColor: bg }]}><Feather name={icon} size={16} color={color} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.actionLabel}>{label}</Text>
        <Text style={s.actionSub}>{sub}</Text>
      </View>
      <Feather name="chevron-right" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

function DetailRow({ icon, label, value, border = true }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string; border?: boolean }) {
  return (
    <View style={[s.actionRow, border && s.rowBorder]}>
      <View style={[s.actionIcon, { backgroundColor: "#FFF7ED" }]}><Feather name={icon} size={15} color={ORANGE} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.actionSub}>{label}</Text>
        <Text style={s.actionLabel} numberOfLines={2}>{value || "Not added"}</Text>
      </View>
    </View>
  );
}

function AppNotice({ visible, title, message, tone = "success", onClose, onConfirm, confirmText }: { visible: boolean; title: string; message: string; tone?: "success" | "danger" | "info"; onClose: () => void; onConfirm?: () => void; confirmText?: string }) {
  const color = tone === "danger" ? "#DC2626" : tone === "info" ? "#2563EB" : ORANGE;
  const bg = tone === "danger" ? "#FEF2F2" : tone === "info" ? "#EFF6FF" : "#FFF7ED";
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.noticeOverlay}>
        <View style={s.noticeCard}>
          <View style={[s.noticeIcon, { backgroundColor: bg }]}><Feather name={tone === "danger" ? "log-out" : "check-circle"} size={26} color={color} /></View>
          <Text style={s.noticeTitle}>{title}</Text>
          <Text style={s.noticeMsg}>{message}</Text>
          <View style={s.noticeBtns}>
            {onConfirm && <TouchableOpacity style={s.noticeCancel} onPress={onClose}><Text style={s.noticeCancelText}>Cancel</Text></TouchableOpacity>}
            <TouchableOpacity style={[s.noticeOk, { backgroundColor: color }]} onPress={onConfirm || onClose}><Text style={s.noticeOkText}>{confirmText || "OK"}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function JobPortalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser, updateJobsUser, logoutJobs } = useJobsAuth();
  const { jobs } = useJobs();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ visible: boolean; title: string; message: string; tone?: "success" | "danger" | "info"; onConfirm?: () => void; confirmText?: string }>({ visible: false, title: "", message: "" });

  const dob = normalizeDobForInputs(jobsUser?.dob);
  const [name, setName] = useState(jobsUser?.name || "");
  const [email, setEmail] = useState(jobsUser?.email || "");
  const [profilePhoto, setProfilePhoto] = useState(jobsUser?.profilePhoto);
  const [day, setDay] = useState(dob.day);
  const [month, setMonth] = useState(dob.month);
  const [year, setYear] = useState(dob.year);
  const [location, setLocation] = useState(jobsUser?.location || "");
  const [qualification, setQualification] = useState(jobsUser?.qualification || "");
  const [skills, setSkills] = useState(jobsUser?.skills || "");
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>(jobsUser?.currentStatus || "unemployed");
  const [experience, setExperience] = useState(jobsUser?.experience || "");
  const [languages, setLanguages] = useState(jobsUser?.languages || "");
  const [about, setAbout] = useState(jobsUser?.about || "");
  const [currentCompany, setCurrentCompany] = useState(jobsUser?.currentCompany || "");
  const [currentRole, setCurrentRole] = useState(jobsUser?.currentRole || "");
  const [previousCompany, setPreviousCompany] = useState(jobsUser?.previousCompany || "");
  const [previousRole, setPreviousRole] = useState(jobsUser?.previousRole || "");
  const [collegeName, setCollegeName] = useState(jobsUser?.collegeName || "");
  const [fieldOfStudy, setFieldOfStudy] = useState(jobsUser?.fieldOfStudy || "");
  const [company, setCompany] = useState(jobsUser?.company || jobsUser?.companies?.[0]?.name || "");
  const [contactPerson, setContactPerson] = useState(jobsUser?.contactPerson || "");
  const [whatsapp, setWhatsapp] = useState(jobsUser?.whatsapp || jobsUser?.phone || "");
  const [industry, setIndustry] = useState(jobsUser?.industry || "");
  const [gstNo, setGstNo] = useState(jobsUser?.gstNo || "");
  const [companyType, setCompanyType] = useState(jobsUser?.companyType || jobsUser?.companies?.[0]?.type || "");
  const [companySize, setCompanySize] = useState(jobsUser?.companySize || jobsUser?.companies?.[0]?.size || "");
  const [yearEstablished, setYearEstablished] = useState(jobsUser?.yearEstablished || jobsUser?.companies?.[0]?.yearEstablished || "");
  const [website, setWebsite] = useState(jobsUser?.website || "");
  const [address, setAddress] = useState(jobsUser?.address || "");
  const [pincode, setPincode] = useState(jobsUser?.pincode || "");
  const [companyDescription, setCompanyDescription] = useState(jobsUser?.companyDescription || jobsUser?.companies?.[0]?.description || "");

  if (!jobsUser) return null;

  const isEmployer = jobsUser.role === "employer";
  const completion = isEmployer ? 100 : calcProfileCompletion({ ...jobsUser, profilePhoto, currentStatus, qualification, skills, about, experience, location, languages } as JobsUser);
  const appliedCount = jobs.filter((job) => job.applicants.includes(jobsUser.id)).length;
  const hiredCount = jobs.filter((job) => job.hired.includes(jobsUser.id)).length;
  const employerJobs = jobs.filter((job) => job.employerId === jobsUser.id);
  const employerApplicants = employerJobs.reduce((sum, job) => sum + job.applicants.length, 0);
  const roleText = isEmployer ? "Employer" : "Job Seeker";
  const roleSub = isEmployer ? "नियोक्ता" : "रोजगार साधक";

  const showNotice = (title: string, message: string, tone: "success" | "danger" | "info" = "info") => setNotice({ visible: true, title, message, tone });

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showNotice("Permission needed", "Please allow gallery access to update your photo.", "info");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.55 });
    if (!result.canceled && result.assets?.[0]?.uri) setProfilePhoto(result.assets[0].uri);
  };

  const saveProfile = async () => {
    if (saving) return;
    if (name.trim().length < 3) return showNotice("Check profile", "Enter a valid full name.", "info");
    if (!validEmail(email)) return showNotice("Check profile", "Enter a valid email address.", "info");
    if (!isEmployer && about.trim() && countWords(about) > 80) return showNotice("Check profile", "About / Objective must be maximum 80 words.", "info");
    if (isEmployer && companyDescription.trim() && countWords(companyDescription) > 100) return showNotice("Check profile", "Company description must be maximum 100 words.", "info");

    setSaving(true);
    try {
      if (isEmployer) {
        await updateJobsUser({ name: name.trim(), email: email.trim() || undefined, profilePhoto, company: company.trim(), contactPerson: contactPerson.trim() || name.trim(), whatsapp: cleanPhone(whatsapp || jobsUser.phone), industry: industry.trim() || undefined, gstNo: gstNo.trim() || undefined, companyType: companyType.trim() || undefined, companySize: companySize.trim() || undefined, yearEstablished: yearEstablished.trim() || undefined, website: website.trim() || undefined, address: address.trim() || undefined, pincode: pincode.trim() || undefined, companyDescription: companyDescription.trim() || undefined });
      } else {
        await updateJobsUser({ name: name.trim(), email: email.trim() || undefined, profilePhoto, dob: makeDob(day, month, year), location: location.trim() || undefined, qualification: qualification.trim() || undefined, skills: skills.trim() || undefined, currentStatus, experience: currentStatus === "fresher" ? undefined : experience.trim() || undefined, languages: languages.trim() || undefined, about: about.trim() || undefined, currentCompany: currentStatus === "employed" ? currentCompany.trim() || undefined : undefined, currentRole: currentStatus === "employed" ? currentRole.trim() || undefined : undefined, previousCompany: previousCompany.trim() || undefined, previousRole: previousRole.trim() || undefined, collegeName: currentStatus === "student" ? collegeName.trim() || undefined : undefined, fieldOfStudy: currentStatus === "student" ? fieldOfStudy.trim() || undefined : undefined });
      }
      showNotice("Profile saved", "Your Job Portal profile has been updated.", "success");
    } catch (err: any) {
      showNotice("Save failed", err?.message || "Please try again.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => setNotice({
    visible: true,
    title: "Logout",
    message: "Logout from Job Portal?",
    tone: "danger",
    confirmText: "Logout",
    onConfirm: async () => {
      setNotice((prev) => ({ ...prev, visible: false }));
      await logoutJobs();
    },
  });

  const quickActions = isEmployer
    ? [
        { icon: "plus-circle" as const, label: "Post Job", sub: "Create a new job listing", color: ORANGE, bg: "#FFF7ED", onPress: () => router.push("/jobs/(tabs)/post" as any) },
        { icon: "briefcase" as const, label: "My Jobs", sub: "View applicants for posted jobs", color: "#2563EB", bg: "#EFF6FF", onPress: () => router.push("/jobs/(tabs)" as any) },
        { icon: "message-circle" as const, label: "Messages", sub: "Chat with applicants", color: "#7C3AED", bg: "#F5F3FF", onPress: () => router.push("/jobs/(tabs)/messages" as any) },
      ]
    : [
        { icon: "search" as const, label: "Search Jobs", sub: "Find nearby verified jobs", color: ORANGE, bg: "#FFF7ED", onPress: () => router.push("/jobs/search" as any) },
        { icon: "check-circle" as const, label: "Applied Jobs", sub: "Track applications", color: "#2563EB", bg: "#EFF6FF", onPress: () => router.push("/jobs/(tabs)/applied" as any) },
        { icon: "file-text" as const, label: "Resume Builder", sub: "Create resume from profile", color: "#7C3AED", bg: "#F5F3FF", onPress: () => router.push("/jobs/resume" as any) },
      ];

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad + 12 }]}> 
        <TopShade height={116} />
        <DecorativeCircles />
        <View style={s.headerContent}>
          <TouchableOpacity style={s.avatarWrap} onPress={pickPhoto} activeOpacity={0.84}>
            {profilePhoto ? <Image source={{ uri: profilePhoto }} style={s.avatarImg} /> : <Text style={s.avatarText}>{initials(name)}</Text>}
            <View style={s.cameraDot}><Feather name="camera" size={10} color={ORANGE} /></View>
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.userName} numberOfLines={1}>{name || jobsUser.name}</Text>
            <View style={s.rolePillRow}>
              <View style={s.rolePill}><Feather name={isEmployer ? "briefcase" : "user"} size={11} color="rgba(255,255,255,0.9)" /><Text style={s.rolePillText}>{roleText}</Text></View>
              <Text style={s.roleSub}>{roleSub}</Text>
            </View>
            <TouchableOpacity style={s.switchPortalBtn} onPress={() => router.replace("/(tabs)" as any)} activeOpacity={0.85}>
              <Feather name="home" size={12} color={ORANGE} />
              <Text style={s.switchPortalText}>Switch to Civic Service</Text>
            </TouchableOpacity>
            <View style={s.infoRow}>
              <View style={s.infoChipRow}><Feather name="phone" size={10} color="rgba(255,255,255,0.58)" /><Text style={s.infoChipText}>+91 {jobsUser.phone}</Text></View>
              <View style={s.infoChipRow}><Feather name="map-pin" size={10} color="rgba(255,255,255,0.58)" /><Text style={s.infoChipText} numberOfLines={1}>{location || address || "Ambernath"}</Text></View>
            </View>
          </View>
        </View>
        <View style={s.statsRow}>
          {isEmployer ? (
            <>
              <View style={s.statItem}><Text style={s.statNum}>{employerJobs.length}</Text><Text style={s.statLabel}>Jobs</Text></View><View style={s.statDiv} />
              <View style={s.statItem}><Text style={[s.statNum, { color: "#FDE68A" }]}>{employerApplicants}</Text><Text style={s.statLabel}>Applicants</Text></View><View style={s.statDiv} />
              <View style={s.statItem}><Text style={[s.statNum, { color: "#6EE7B7" }]}>{employerJobs.filter((j) => j.active).length}</Text><Text style={s.statLabel}>Active</Text></View>
            </>
          ) : (
            <>
              <View style={s.statItem}><Text style={s.statNum}>{completion}%</Text><Text style={s.statLabel}>Profile</Text></View><View style={s.statDiv} />
              <View style={s.statItem}><Text style={[s.statNum, { color: "#FDE68A" }]}>{appliedCount}</Text><Text style={s.statLabel}>Applied</Text></View><View style={s.statDiv} />
              <View style={s.statItem}><Text style={[s.statNum, { color: "#6EE7B7" }]}>{hiredCount}</Text><Text style={s.statLabel}>Hired</Text></View>
            </>
          )}
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 104 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.section}><Text style={s.sectionLabel}>QUICK ACTIONS</Text><View style={s.card}>{quickActions.map((item, idx) => <ActionRow key={item.label} {...item} border={idx < quickActions.length - 1} />)}</View></View>

          <View style={s.section}><Text style={s.sectionLabel}>ACCOUNT DETAILS</Text><View style={s.card}>{isEmployer ? <><DetailRow icon="user" label="Owner / HR Name" value={name} /><DetailRow icon="briefcase" label="Company" value={company} /><DetailRow icon="phone" label="Mobile" value={`+91 ${jobsUser.phone}`} /><DetailRow icon="message-circle" label="WhatsApp" value={cleanPhone(whatsapp) ? `+91 ${cleanPhone(whatsapp)}` : "Not added"} /><DetailRow icon="map-pin" label="Address" value={address} border={false} /></> : <><DetailRow icon="user" label="Full Name" value={name} /><DetailRow icon="phone" label="Mobile" value={`+91 ${jobsUser.phone}`} /><DetailRow icon="map-pin" label="Location" value={location} /><DetailRow icon="award" label="Qualification" value={qualification} /><DetailRow icon="tool" label="Skills" value={skills} border={false} /></>}</View></View>

          <Section title="Basic Details" icon="user">
            <Input label={isEmployer ? "Owner / HR Name" : "Full Name"} value={name} onChangeText={setName} placeholder="Full name" />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
            {!isEmployer && <DobEditor day={day} month={month} year={year} setDay={setDay} setMonth={setMonth} setYear={setYear} />}
          </Section>

          {isEmployer ? (
            <>
              <Section title="Company Details" icon="briefcase">
                <Input label="Company / Business Name" value={company} onChangeText={setCompany} placeholder="Company name" />
                <Input label="Contact Person" value={contactPerson} onChangeText={setContactPerson} placeholder="Owner / HR / Manager" />
                <Input label="WhatsApp Number" value={whatsapp} onChangeText={(v) => setWhatsapp(cleanPhone(v))} placeholder="WhatsApp contact" keyboardType="phone-pad" maxLength={10} />
                <Input label="Industry" value={industry} onChangeText={setIndustry} placeholder="Manufacturing, Retail, IT..." />
                <Input label="GST / Business Registration" value={gstNo} onChangeText={setGstNo} placeholder="Optional" autoCapitalize="characters" />
                <Input label="Company Type" value={companyType} onChangeText={setCompanyType} placeholder="Private, Proprietorship, Shop..." />
                <Input label="Company Size" value={companySize} onChangeText={setCompanySize} placeholder="1-10, 11-50, 50+ employees" />
                <Input label="Year Established" value={yearEstablished} onChangeText={(v) => setYearEstablished(v.replace(/\D/g, "").slice(0, 4))} placeholder="2020" keyboardType="number-pad" maxLength={4} />
                <Input label="Website" value={website} onChangeText={setWebsite} placeholder="https://..." autoCapitalize="none" />
              </Section>
              <Section title="Address & Trust Info" icon="map-pin">
                <Input label="Full Address" value={address} onChangeText={setAddress} placeholder="Complete business address" multiline />
                <Input label="Pincode" value={pincode} onChangeText={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))} placeholder="421501" keyboardType="number-pad" maxLength={6} />
                <Input label="Company Description" value={companyDescription} onChangeText={setCompanyDescription} placeholder="About your company" multiline />
              </Section>
            </>
          ) : (
            <>
              <Section title="Candidate Profile" icon="briefcase">
                <Input label="Location" value={location} onChangeText={setLocation} placeholder="Ambernath East, MIDC..." />
                <Input label="Qualification" value={qualification} onChangeText={setQualification} placeholder="10th, ITI, Graduate..." />
                <Input label="Skills" value={skills} onChangeText={setSkills} placeholder="Computer, Sales, Machine handling..." multiline />
                <View style={s.inputGroup}><Text style={s.label}>Current Status</Text><View style={s.chipRow}>{(["unemployed", "employed", "student", "fresher"] as CurrentStatus[]).map((item) => <Chip key={item} label={item.charAt(0).toUpperCase() + item.slice(1)} active={currentStatus === item} onPress={() => setCurrentStatus(item)} />)}</View></View>
                {currentStatus !== "fresher" && <Input label="Experience" value={experience} onChangeText={setExperience} placeholder="Fresher / 1 year / 3 years" />}
                <Input label="Languages Known" value={languages} onChangeText={setLanguages} placeholder="Marathi, Hindi, English" />
                <Input label="About / Objective" value={about} onChangeText={setAbout} placeholder="Short career summary" multiline />
              </Section>
              {currentStatus === "employed" && <Section title="Current Work" icon="briefcase"><Input label="Current Company" value={currentCompany} onChangeText={setCurrentCompany} placeholder="Company name" /><Input label="Current Role" value={currentRole} onChangeText={setCurrentRole} placeholder="Job role" /></Section>}
              {currentStatus === "student" && <Section title="Student Details" icon="book-open"><Input label="College Name" value={collegeName} onChangeText={setCollegeName} placeholder="College name" /><Input label="Field of Study" value={fieldOfStudy} onChangeText={setFieldOfStudy} placeholder="Commerce, ITI, Engineering..." /></Section>}
              <Section title="Previous Work" icon="clock"><Input label="Previous Company" value={previousCompany} onChangeText={setPreviousCompany} placeholder="Optional" /><Input label="Previous Role" value={previousRole} onChangeText={setPreviousRole} placeholder="Optional" /></Section>
            </>
          )}

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.65 }]} onPress={saveProfile} disabled={saving} activeOpacity={0.88}>
            <LinearGradient colors={[DARK, ORANGE, "#F97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveGrad}>
              <Feather name="check" size={17} color="white" />
              <Text style={s.saveText}>{saving ? "Saving..." : "Save Profile"}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}><View style={s.logoutInner}><Feather name="log-out" size={18} color="#DC2626" /><Text style={s.logoutText}>Logout from Job Portal</Text></View></TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <AppNotice visible={notice.visible} title={notice.title} message={notice.message} tone={notice.tone} confirmText={notice.confirmText} onClose={() => setNotice((prev) => ({ ...prev, visible: false }))} onConfirm={notice.onConfirm} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 2.2, borderColor: "rgba(255,255,255,0.45)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarImg: { width: 58, height: 58, borderRadius: 29 },
  avatarText: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  cameraDot: { position: "absolute", right: -1, bottom: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "white", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.7)" },
  headerText: { flex: 1, gap: 4, minWidth: 0 },
  userName: { fontSize: 18, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  rolePillRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  rolePillText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.9)", fontFamily: "Inter_700Bold" },
  roleSub: { fontSize: 11, color: "rgba(255,255,255,0.58)", fontFamily: "Inter_400Regular" },
  switchPortalBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginTop: 6 },
  switchPortalText: { fontSize: 12, color: ORANGE, fontFamily: "Inter_700Bold", fontWeight: "900" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 },
  infoChipRow: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "100%" },
  infoChipText: { fontSize: 10.5, color: "rgba(255,255,255,0.58)", fontFamily: "Inter_400Regular", maxWidth: 190 },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 10, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 23, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.58)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statDiv: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },
  content: { padding: 16 },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 8, paddingLeft: 2 },
  card: { backgroundColor: "white", borderRadius: 18, overflow: "hidden", shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  actionIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionLabel: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  actionSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1, lineHeight: 15 },
  formHead: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 10 },
  formIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  formTitle: { fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" },
  inputGroup: { paddingHorizontal: 18, paddingBottom: 14 },
  label: { fontSize: 9.5, fontWeight: "700", color: "#94A3B8", letterSpacing: 1, fontFamily: "Inter_600SemiBold", marginBottom: 6, paddingLeft: 2 },
  input: { width: "100%", backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 15, paddingVertical: 12, fontSize: 13.5, color: "#0F172A", fontFamily: "Inter_400Regular", outlineWidth: 0 } as any,
  textArea: { minHeight: 88, textAlignVertical: "top" },
  dobRow: { flexDirection: "row", gap: 8 },
  dobInput: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 12, fontSize: 13.5, color: "#0F172A", fontFamily: "Inter_600SemiBold", textAlign: "center", outlineWidth: 0 } as any,
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  chipText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_600SemiBold" },
  chipTextActive: { color: ORANGE, fontFamily: "Inter_700Bold" },
  saveBtn: { borderRadius: 18, overflow: "hidden", marginTop: 2, marginBottom: 12, shadowColor: DARK, shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  saveGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  saveText: { fontSize: 14.5, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" },
  logoutBtn: { backgroundColor: "#FEE2E2", borderRadius: 16, borderWidth: 1.5, borderColor: "#FECACA", marginBottom: 8 },
  logoutInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15 },
  logoutText: { fontSize: 14, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_700Bold" },
  noticeOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", padding: 22 },
  noticeCard: { width: "100%", maxWidth: 360, backgroundColor: "white", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  noticeIcon: { width: 58, height: 58, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  noticeTitle: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" },
  noticeMsg: { marginTop: 6, fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  noticeBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 18 },
  noticeCancel: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  noticeCancelText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_700Bold" },
  noticeOk: { flex: 1.4, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  noticeOkText: { fontSize: 13, color: "white", fontFamily: "Inter_700Bold" },
});
