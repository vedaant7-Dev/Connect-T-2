import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { calcProfileCompletion, CurrentStatus, JobsUser, useJobsAuth } from "@/context/JobsAuthContext";

function cleanPhone(value?: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function initials(name?: string) {
  return String(name || "CT").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
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
  return `${year}-${day.padStart(2, "0") ? month.padStart(2, "0") : month}-${day.padStart(2, "0")}`;
}

function validEmail(value?: string) {
  const v = String(value || "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function Section({ title, icon, children }: { title: string; icon: keyof typeof Feather.glyphMap; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <View style={s.sectionHead}>
        <View style={s.sectionIcon}><Feather name={icon} size={17} color="#047857" /></View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { label: string; helper?: string }) {
  const { label, helper, multiline, style, ...rest } = props;
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      <TextInput {...rest} multiline={multiline} style={[s.input, multiline && s.textArea, style]} placeholderTextColor="#94A3B8" />
      {!!helper && <Text style={s.helper}>{helper}</Text>}
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
      <Text style={s.helper}>Same DOB format as citizen registration</Text>
    </View>
  );
}

export default function JobPortalProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 56 : insets.top;
  const { jobsUser, updateJobsUser, logoutJobs } = useJobsAuth();
  const [saving, setSaving] = useState(false);

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

  const completion = useMemo(() => (jobsUser ? calcProfileCompletion({ ...jobsUser, profilePhoto, currentStatus, qualification, skills, about, experience, location, languages } as JobsUser) : 0), [jobsUser, profilePhoto, currentStatus, qualification, skills, about, experience, location, languages]);
  const isEmployer = jobsUser?.role === "employer";

  if (!jobsUser) return null;

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow gallery access to update your photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setProfilePhoto(result.assets[0].uri);
  };

  const saveProfile = async () => {
    if (saving) return;
    if (name.trim().length < 3) {
      Alert.alert("Check profile", "Enter a valid full name.");
      return;
    }
    if (!validEmail(email)) {
      Alert.alert("Check profile", "Enter a valid email address.");
      return;
    }
    if (!isEmployer && about.trim() && (countWords(about) < 5 || countWords(about) > 80)) {
      Alert.alert("Check profile", "About / Objective must be 5 to 80 words.");
      return;
    }
    if (isEmployer && companyDescription.trim() && countWords(companyDescription) > 100) {
      Alert.alert("Check profile", "Company description must be maximum 100 words.");
      return;
    }

    setSaving(true);
    try {
      if (isEmployer) {
        await updateJobsUser({
          name: name.trim(),
          email: email.trim() || undefined,
          profilePhoto,
          company: company.trim(),
          contactPerson: contactPerson.trim() || name.trim(),
          whatsapp: cleanPhone(whatsapp || jobsUser.phone),
          industry: industry.trim() || undefined,
          gstNo: gstNo.trim() || undefined,
          companyType: companyType.trim() || undefined,
          companySize: companySize.trim() || undefined,
          yearEstablished: yearEstablished.trim() || undefined,
          website: website.trim() || undefined,
          address: address.trim() || undefined,
          pincode: pincode.trim() || undefined,
          companyDescription: companyDescription.trim() || undefined,
        });
      } else {
        await updateJobsUser({
          name: name.trim(),
          email: email.trim() || undefined,
          profilePhoto,
          dob: makeDob(day, month, year),
          location: location.trim() || undefined,
          qualification: qualification.trim() || undefined,
          skills: skills.trim() || undefined,
          currentStatus,
          experience: currentStatus === "fresher" ? undefined : experience.trim() || undefined,
          languages: languages.trim() || undefined,
          about: about.trim() || undefined,
          currentCompany: currentStatus === "employed" ? currentCompany.trim() || undefined : undefined,
          currentRole: currentStatus === "employed" ? currentRole.trim() || undefined : undefined,
          previousCompany: previousCompany.trim() || undefined,
          previousRole: previousRole.trim() || undefined,
          collegeName: currentStatus === "student" ? collegeName.trim() || undefined : undefined,
          fieldOfStudy: currentStatus === "student" ? fieldOfStudy.trim() || undefined : undefined,
        });
      }
      Alert.alert("Profile saved", "Your Job Portal profile has been updated.");
    } catch (err: any) {
      Alert.alert("Save failed", err?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Logout", "Logout from Job Portal?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logoutJobs },
    ]);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#064E3B", "#047857", "#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad + 12 }]}> 
        <View style={s.headerRow}>
          <TouchableOpacity style={s.avatarWrap} onPress={pickPhoto} activeOpacity={0.84}>
            {profilePhoto ? <Image source={{ uri: profilePhoto }} style={s.avatarImg} /> : <Text style={s.avatarText}>{initials(name)}</Text>}
            <View style={s.cameraDot}><Feather name="camera" size={11} color="#047857" /></View>
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.headerPill}><Text style={s.headerPillText}>{isEmployer ? "EMPLOYER PROFILE" : "JOB SEEKER PROFILE"}</Text></View>
            <Text style={s.headerTitle} numberOfLines={1}>{name || jobsUser.name}</Text>
            <Text style={s.headerSub} numberOfLines={1}>+91 {jobsUser.phone}{email ? ` · ${email}` : ""}</Text>
          </View>
        </View>
        {!isEmployer && (
          <View style={s.progressWrap}>
            <View style={s.progressTrack}><View style={[s.progressFill, { width: `${completion}%` as any }]} /></View>
            <Text style={s.progressText}>{completion}%</Text>
          </View>
        )}
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 104 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                <Input label="Company Description" value={companyDescription} onChangeText={setCompanyDescription} placeholder="About your company" multiline helper={`${countWords(companyDescription)} / 100 words`} />
              </Section>
            </>
          ) : (
            <>
              <Section title="Career Profile" icon="briefcase">
                <Input label="Location" value={location} onChangeText={setLocation} placeholder="Ambernath East / West" />
                <Input label="Qualification" value={qualification} onChangeText={setQualification} placeholder="10th, 12th, ITI, Graduate..." />
                <Input label="Skills" value={skills} onChangeText={setSkills} placeholder="Computer, Sales, Driving..." multiline />
                <Text style={s.label}>Current Status</Text>
                <View style={s.chipRow}>
                  {(["unemployed", "employed", "student", "fresher"] as CurrentStatus[]).map((item) => (
                    <Chip key={item} label={item === "unemployed" ? "Unemployed" : item === "employed" ? "Employed" : item === "student" ? "Student" : "Fresher"} active={currentStatus === item} onPress={() => setCurrentStatus(item)} />
                  ))}
                </View>
                {currentStatus !== "fresher" && <Input label="Experience" value={experience} onChangeText={setExperience} placeholder="Fresher / 1 year / 3 years..." />}
                <Input label="Languages Known" value={languages} onChangeText={setLanguages} placeholder="Marathi, Hindi, English..." />
                <Input label="About / Objective" value={about} onChangeText={setAbout} placeholder="Short career objective" multiline helper={`${countWords(about)} / 80 words`} />
              </Section>

              {currentStatus === "employed" && (
                <Section title="Current Work" icon="activity">
                  <Input label="Current Company" value={currentCompany} onChangeText={setCurrentCompany} placeholder="Company name" />
                  <Input label="Current Role" value={currentRole} onChangeText={setCurrentRole} placeholder="Role / designation" />
                </Section>
              )}

              {currentStatus === "student" && (
                <Section title="Student Details" icon="book-open">
                  <Input label="College Name" value={collegeName} onChangeText={setCollegeName} placeholder="College / institute" />
                  <Input label="Field of Study" value={fieldOfStudy} onChangeText={setFieldOfStudy} placeholder="Commerce, ITI, Engineering..." />
                </Section>
              )}

              <Section title="Previous Work" icon="clock">
                <Input label="Previous Company" value={previousCompany} onChangeText={setPreviousCompany} placeholder="Optional" />
                <Input label="Previous Role" value={previousRole} onChangeText={setPreviousRole} placeholder="Optional" />
              </Section>
            </>
          )}

          <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={saveProfile} disabled={saving} activeOpacity={0.9}>
            <Text style={s.saveBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
            <Feather name="check-circle" size={18} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout} activeOpacity={0.82}>
            <Feather name="log-out" size={16} color="#DC2626" />
            <Text style={s.logoutText}>Logout from Job Portal</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6FAF8" },
  header: { paddingHorizontal: 20, paddingBottom: 23, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, shadowColor: "#064E3B", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: { width: 76, height: 76, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.45)" },
  avatarImg: { width: 76, height: 76, borderRadius: 26 },
  avatarText: { fontSize: 26, color: "white", fontFamily: "Inter_800ExtraBold", fontWeight: "900" },
  cameraDot: { position: "absolute", right: -5, bottom: -5, width: 28, height: 28, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#A7F3D0" },
  headerPill: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", paddingHorizontal: 10, paddingVertical: 5, marginBottom: 6 },
  headerPillText: { color: "white", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_800ExtraBold" },
  headerTitle: { fontSize: 25, color: "white", fontFamily: "Inter_800ExtraBold", fontWeight: "900", letterSpacing: -0.5 },
  headerSub: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular" },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 17 },
  progressTrack: { flex: 1, height: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#D1FAE5", borderRadius: 999 },
  progressText: { minWidth: 38, textAlign: "right", color: "white", fontSize: 13, fontFamily: "Inter_800ExtraBold" },
  content: { padding: 16, gap: 13 },
  card: { backgroundColor: "white", borderRadius: 24, padding: 16, gap: 12, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  sectionIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#A7F3D0" },
  sectionTitle: { flex: 1, fontSize: 15, color: "#0F172A", fontFamily: "Inter_800ExtraBold", fontWeight: "900" },
  inputGroup: { gap: 7 },
  label: { fontSize: 12, color: "#334155", fontFamily: "Inter_800ExtraBold" },
  input: { minHeight: 50, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 11, color: "#0F172A", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  textArea: { minHeight: 92, textAlignVertical: "top" },
  helper: { marginTop: -2, fontSize: 11, color: "#64748B", fontFamily: "Inter_500Medium" },
  dobRow: { flexDirection: "row", gap: 10 },
  dobInput: { flex: 1, height: 50, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", textAlign: "center", color: "#0F172A", fontSize: 14, fontFamily: "Inter_800ExtraBold" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: "#047857", borderColor: "#047857" },
  chipText: { fontSize: 12, color: "#475569", fontFamily: "Inter_700Bold" },
  chipTextActive: { color: "white" },
  saveBtn: { height: 58, borderRadius: 20, backgroundColor: "#047857", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: "#047857", shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  saveBtnDisabled: { opacity: 0.62 },
  saveBtnText: { color: "white", fontSize: 16, fontFamily: "Inter_800ExtraBold", fontWeight: "900" },
  logoutBtn: { height: 52, borderRadius: 18, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  logoutText: { color: "#DC2626", fontSize: 13, fontFamily: "Inter_800ExtraBold", fontWeight: "900" },
});
