import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  TextInput, Alert, Modal, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useJobsAuth, calcProfileCompletion, getSeekerFields, CurrentStatus } from "@/context/JobsAuthContext";
import { useJobs } from "@/context/JobsContext";

const STATUS_OPTIONS: { id: CurrentStatus; label: string; icon: string; color: string }[] = [
  { id: "employed",   label: "Currently Employed",  icon: "briefcase", color: "#059669" },
  { id: "unemployed", label: "Looking for Work",     icon: "search",    color: "#EA580C" },
  { id: "student",    label: "Student",              icon: "book-open", color: "#7C3AED" },
  { id: "fresher",    label: "Fresher (No Exp)",     icon: "star",      color: "#0369A1" },
];

const COMPANY_TYPES = ["Private Ltd", "Public Ltd", "Partnership", "Proprietorship", "Government", "NGO / Trust", "Other"];
const COMPANY_SIZES = ["1–10 employees", "11–50 employees", "51–200 employees", "201–500 employees", "500+ employees"];
const INDUSTRIES = ["Manufacturing", "IT / Software", "Retail / FMCG", "Healthcare", "Construction", "Transport / Logistics", "Education", "Security", "Finance / Banking", "Hospitality", "Agriculture", "Other"];

function Avatar({ user, size = 72 }: { user: any; size?: number }) {
  const initials = (user.name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  if (user.profilePhoto) {
    return <Image source={{ uri: user.profilePhoto }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: "rgba(255,255,255,0.5)" }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: user.avatarColor, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.4)" }}>
      <Text style={{ fontSize: size * 0.32, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

function CompletionBar({ pct }: { pct: number }) {
  return (
    <View style={cs.barWrap}>
      <View style={cs.barTrack}>
        <View style={[cs.barFill, { width: `${pct}%` as any, backgroundColor: "#FFFFFF" }]} />
      </View>
      <Text style={cs.barLabel}>{pct}%</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, accent }: { icon: string; label: string; value?: string; accent?: boolean }) {
  if (!value) return null;
  return (
    <View style={cs.infoRow}>
      <View style={[cs.infoIconWrap, accent && { backgroundColor: "#FFEDD5" }]}>
        <Feather name={icon as any} size={14} color={accent ? "#EA580C" : "#64748B"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={cs.infoLabel}>{label}</Text>
        <Text style={cs.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={cs.sectionCard}>
      <View style={cs.sectionCardHeader}>
        <View style={cs.sectionIconWrap}>
          <Feather name={icon as any} size={14} color="#EA580C" />
        </View>
        <Text style={cs.sectionCardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function EditField({ label, value, onChange, placeholder, keyboardType, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={cs.fieldWrap}>
      <Text style={cs.fieldLabel}>{label}</Text>
      <TextInput
        style={[cs.fieldInput, multiline && { minHeight: 80, textAlignVertical: "top", paddingTop: 12 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        autoCapitalize={keyboardType === "email-address" || keyboardType === "url" ? "none" : "sentences"}
      />
    </View>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={cs.fieldWrap}>
      <Text style={cs.fieldLabel}>{label}</Text>
      <TouchableOpacity style={cs.selectBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[cs.selectBtnText, !value && { color: "#CBD5E1" }]}>{value || `Select ${label}`}</Text>
        <Feather name="chevron-down" size={14} color="#94A3B8" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={cs.selectOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={cs.selectList}>
            <Text style={cs.selectListTitle}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              {options.map((opt) => (
                <TouchableOpacity key={opt} style={[cs.selectItem, value === opt && cs.selectItemActive]} onPress={() => { onChange(opt); setOpen(false); }}>
                  <Text style={[cs.selectItemText, value === opt && { color: "#EA580C", fontFamily: "Inter_600SemiBold" }]}>{opt}</Text>
                  {value === opt && <Feather name="check" size={14} color="#EA580C" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function JobsProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser, logoutJobs, updateJobsUser } = useJobsAuth();
  const { getJobsByEmployer, jobs } = useJobs();
  const router = useRouter();

  const [showLogout, setShowLogout] = useState(false);
  const [editing, setEditing] = useState(false);

  // Seeker fields
  const [eName, setEName] = useState(jobsUser?.name || "");
  const [eEmail, setEEmail] = useState(jobsUser?.email || "");
  const [eAge, setEAge] = useState(jobsUser?.age || "");
  const [eQual, setEQual] = useState(jobsUser?.qualification || "");
  const [eSkills, setESkills] = useState(jobsUser?.skills || "");
  const [eAbout, setEAbout] = useState(jobsUser?.about || "");
  const [eStatus, setEStatus] = useState<CurrentStatus | "">(jobsUser?.currentStatus || "");
  const [eCurrentCompany, setECurrentCompany] = useState(jobsUser?.currentCompany || "");
  const [eCurrentRole, setECurrentRole] = useState(jobsUser?.currentRole || "");
  const [eExperience, setEExperience] = useState(jobsUser?.experience || "");
  const [ePrevCompany, setEPrevCompany] = useState(jobsUser?.previousCompany || "");
  const [ePrevRole, setEPrevRole] = useState(jobsUser?.previousRole || "");
  const [eCollegeName, setECollegeName] = useState(jobsUser?.collegeName || "");
  const [eFieldOfStudy, setEFieldOfStudy] = useState(jobsUser?.fieldOfStudy || "");
  const [eLocation, setELocation] = useState(jobsUser?.location || "");
  const [eLanguages, setELanguages] = useState(jobsUser?.languages || "");

  // Employer fields
  const [eCompany, setECompany] = useState(jobsUser?.company || "");
  const [eGst, setEGst] = useState(jobsUser?.gstNo || "");
  const [eCompanyType, setECompanyType] = useState(jobsUser?.companyType || "");
  const [eCompanySize, setECompanySize] = useState(jobsUser?.companySize || "");
  const [eIndustry, setEIndustry] = useState(jobsUser?.industry || "");
  const [eWebsite, setEWebsite] = useState(jobsUser?.website || "");
  const [eCompanyDesc, setECompanyDesc] = useState(jobsUser?.companyDescription || "");
  const [eAddress, setEAddress] = useState(jobsUser?.address || "");
  const [ePincode, setEPincode] = useState(jobsUser?.pincode || "");
  const [eWhatsapp, setEWhatsapp] = useState(jobsUser?.whatsapp || "");
  const [eYearEst, setEYearEst] = useState(jobsUser?.yearEstablished || "");
  const [eContactPerson, setEContactPerson] = useState(jobsUser?.contactPerson || "");

  if (!jobsUser) return null;

  const isEmployer = jobsUser.role === "employer";
  const completion = calcProfileCompletion(jobsUser);
  const myJobs = isEmployer ? getJobsByEmployer(jobsUser.id) : [];
  const totalApplicants = myJobs.reduce((a, j) => a + j.applicants.length, 0);
  const totalShortlisted = myJobs.reduce((a, j) => a + j.shortlisted.length, 0);
  const activeJobs = myJobs.filter((j) => j.active).length;
  const appliedCount = isEmployer ? 0 : jobs.filter((j) => j.applicants.includes(jobsUser.id)).length;
  const isVerified = !!(jobsUser.gstNo?.trim());

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo library access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) await updateJobsUser({ profilePhoto: result.assets[0].uri });
  };

  const handleSave = async () => {
    if (!eName.trim()) { Alert.alert("Name is required"); return; }
    await updateJobsUser({
      name: eName.trim(), email: eEmail.trim(), age: eAge.trim(),
      qualification: eQual.trim(), skills: eSkills.trim(), about: eAbout.trim(),
      currentStatus: eStatus as CurrentStatus || undefined,
      currentCompany: eStatus === "employed" ? eCurrentCompany.trim() : "",
      currentRole:    eStatus === "employed" ? eCurrentRole.trim()    : "",
      experience:     eStatus === "fresher"  ? "Fresher"               : eExperience.trim(),
      previousCompany: ePrevCompany.trim(),
      previousRole:    ePrevRole.trim(),
      collegeName:  eStatus === "student" ? eCollegeName.trim()  : "",
      fieldOfStudy: eStatus === "student" ? eFieldOfStudy.trim() : "",
      location: eLocation.trim(), languages: eLanguages.trim(),
      company: eCompany.trim(), gstNo: eGst.trim(),
      companyType: eCompanyType, companySize: eCompanySize, industry: eIndustry,
      website: eWebsite.trim(), companyDescription: eCompanyDesc.trim(),
      address: eAddress.trim(), pincode: ePincode.trim(),
      whatsapp: eWhatsapp.trim(), yearEstablished: eYearEst.trim(),
      contactPerson: eContactPerson.trim(),
    });
    setEditing(false);
    Alert.alert("Saved", "Profile updated successfully.");
  };

  const openEdit = () => {
    setEName(jobsUser.name || ""); setEEmail(jobsUser.email || ""); setEAge(jobsUser.age || "");
    setEQual(jobsUser.qualification || ""); setESkills(jobsUser.skills || ""); setEAbout(jobsUser.about || "");
    setEStatus(jobsUser.currentStatus || ""); setECurrentCompany(jobsUser.currentCompany || "");
    setECurrentRole(jobsUser.currentRole || ""); setEExperience(jobsUser.experience || "");
    setEPrevCompany(jobsUser.previousCompany || ""); setEPrevRole(jobsUser.previousRole || "");
    setECollegeName(jobsUser.collegeName || ""); setEFieldOfStudy(jobsUser.fieldOfStudy || "");
    setELocation(jobsUser.location || ""); setELanguages(jobsUser.languages || "");
    setECompany(jobsUser.company || ""); setEGst(jobsUser.gstNo || "");
    setECompanyType(jobsUser.companyType || ""); setECompanySize(jobsUser.companySize || "");
    setEIndustry(jobsUser.industry || ""); setEWebsite(jobsUser.website || "");
    setECompanyDesc(jobsUser.companyDescription || ""); setEAddress(jobsUser.address || "");
    setEPincode(jobsUser.pincode || ""); setEWhatsapp(jobsUser.whatsapp || "");
    setEYearEst(jobsUser.yearEstablished || ""); setEContactPerson(jobsUser.contactPerson || "");
    setEditing(true);
  };

  const missingFields = getSeekerFields(jobsUser).filter((f) => { const val = jobsUser[f.key]; return !val || String(val).trim() === ""; });
  const switchPortal = () => router.replace("/portal-select" as any);

  return (
    <View style={cs.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[cs.header, { paddingTop: topPad + 12 }]}
      >
        <View style={cs.headerRow}>
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={cs.avatarWrap}>
            <Avatar user={jobsUser} size={70} />
            <View style={cs.cameraBtn}><Feather name="camera" size={12} color="white" /></View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={cs.headerName} numberOfLines={1}>{isEmployer ? (jobsUser.company || jobsUser.name) : jobsUser.name}</Text>
              {isEmployer && isVerified && (
                <View style={cs.verifiedBadge}>
                  <Feather name="shield" size={10} color="#059669" />
                  <Text style={cs.verifiedText}>GST</Text>
                </View>
              )}
            </View>
            {isEmployer && jobsUser.company && (
              <Text style={cs.headerSubName}>{jobsUser.name}</Text>
            )}
            <View style={cs.rolePill}>
              <Feather name={isEmployer ? "briefcase" : "user"} size={10} color="#EA580C" />
              <Text style={cs.rolePillText}>{isEmployer ? "Employer Account" : "Job Seeker"}</Text>
            </View>
            {isEmployer && jobsUser.industry && (
              <Text style={cs.headerIndustry}>{jobsUser.industry} · {jobsUser.location || "Ambernath"}</Text>
            )}
            {!isEmployer && <Text style={cs.headerSub}>+91 {jobsUser.phone}</Text>}
          </View>
          <TouchableOpacity onPress={openEdit} style={cs.editBtn}>
            <Feather name="edit-2" size={16} color="white" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={cs.switchBtn} onPress={switchPortal} activeOpacity={0.85}>
          <Feather name="refresh-cw" size={13} color="#EA580C" />
          <Text style={cs.switchBtnText}>Switch to civic service</Text>
        </TouchableOpacity>

        {!isEmployer && (
          <View style={cs.completionCard}>
            <View style={cs.completionTop}>
              <Text style={cs.completionLabel}>Profile Completion</Text>
              {completion === 100 && (
                <TouchableOpacity onPress={() => router.push("/jobs/resume" as any)} style={cs.resumeBtn}>
                  <Feather name="file-text" size={12} color="white" />
                  <Text style={cs.resumeBtnText}>View Resume</Text>
                </TouchableOpacity>
              )}
            </View>
            <CompletionBar pct={completion} />
            {completion < 100 && <Text style={cs.completionHint}>Complete your profile to unlock resume generation →</Text>}
            {completion === 100 && <Text style={[cs.completionHint, { color: "white", fontFamily: "Inter_600SemiBold" }]}>✅ Profile complete! Your resume is ready.</Text>}
          </View>
        )}

        <View style={cs.statsRow}>
          {isEmployer ? (
            <>
              <View style={cs.statBox}><Text style={cs.statNum}>{myJobs.length}</Text><Text style={cs.statLabel}>Posted</Text></View>
              <View style={cs.statDivider} />
              <View style={cs.statBox}><Text style={cs.statNum}>{activeJobs}</Text><Text style={cs.statLabel}>Active</Text></View>
              <View style={cs.statDivider} />
              <View style={cs.statBox}><Text style={cs.statNum}>{totalApplicants}</Text><Text style={cs.statLabel}>Applicants</Text></View>
              <View style={cs.statDivider} />
              <View style={cs.statBox}><Text style={cs.statNum}>{totalShortlisted}</Text><Text style={cs.statLabel}>Shortlisted</Text></View>
            </>
          ) : (
            <>
              <View style={cs.statBox}><Text style={cs.statNum}>{appliedCount}</Text><Text style={cs.statLabel}>Applied</Text></View>
              <View style={cs.statDivider} />
              <View style={cs.statBox}><Text style={cs.statNum}>{jobsUser.experience || "—"}</Text><Text style={cs.statLabel}>Experience</Text></View>
              <View style={cs.statDivider} />
              <View style={cs.statBox}><Text style={cs.statNum}>{completion}%</Text><Text style={cs.statLabel}>Profile</Text></View>
            </>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[cs.content, { paddingBottom: Math.max(insets.bottom, 8) + 90 }]} showsVerticalScrollIndicator={false}>

        {/* ─── EMPLOYER PROFILE ─── */}
        {isEmployer && (
          <>
            {/* About company */}
            {jobsUser.companyDescription ? (
              <SectionCard title="About Company" icon="info">
                <Text style={cs.aboutText}>{jobsUser.companyDescription}</Text>
              </SectionCard>
            ) : (
              <TouchableOpacity onPress={openEdit} activeOpacity={0.8}>
                <View style={[cs.sectionCard, cs.emptyCard]}>
                  <Feather name="plus-circle" size={18} color="#EA580C" />
                  <Text style={cs.emptyCardText}>Add company description</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Company overview */}
            <SectionCard title="Company Overview" icon="briefcase">
              <View style={cs.overviewGrid}>
                {jobsUser.companyType && (
                  <View style={cs.overviewChip}>
                    <Feather name="tag" size={12} color="#EA580C" />
                    <Text style={cs.overviewChipText}>{jobsUser.companyType}</Text>
                  </View>
                )}
                {jobsUser.companySize && (
                  <View style={cs.overviewChip}>
                    <Feather name="users" size={12} color="#1D4ED8" />
                    <Text style={[cs.overviewChipText, { color: "#1D4ED8" }]}>{jobsUser.companySize}</Text>
                  </View>
                )}
                {jobsUser.industry && (
                  <View style={cs.overviewChip}>
                    <Feather name="layers" size={12} color="#7C3AED" />
                    <Text style={[cs.overviewChipText, { color: "#7C3AED" }]}>{jobsUser.industry}</Text>
                  </View>
                )}
                {jobsUser.yearEstablished && (
                  <View style={cs.overviewChip}>
                    <Feather name="calendar" size={12} color="#059669" />
                    <Text style={[cs.overviewChipText, { color: "#059669" }]}>Est. {jobsUser.yearEstablished}</Text>
                  </View>
                )}
              </View>
              {(!jobsUser.companyType && !jobsUser.companySize && !jobsUser.industry) && (
                <TouchableOpacity onPress={openEdit} style={cs.addInfoBtn}>
                  <Text style={cs.addInfoText}>+ Add company details</Text>
                </TouchableOpacity>
              )}
              <InfoRow icon="globe" label="Website" value={jobsUser.website} accent />
            </SectionCard>

            {/* Contact & Address */}
            <SectionCard title="Contact Information" icon="phone">
              <InfoRow icon="user" label="Contact Person" value={jobsUser.contactPerson} />
              <InfoRow icon="phone" label="Mobile" value={`+91 ${jobsUser.phone}`} />
              {jobsUser.whatsapp && <InfoRow icon="message-circle" label="WhatsApp" value={`+91 ${jobsUser.whatsapp}`} accent />}
              <InfoRow icon="mail" label="Email" value={jobsUser.email} />
            </SectionCard>

            <SectionCard title="Address" icon="map-pin">
              <InfoRow icon="map-pin" label="Area / Location" value={jobsUser.location} />
              <InfoRow icon="home" label="Full Address" value={jobsUser.address} />
              <InfoRow icon="hash" label="PIN Code" value={jobsUser.pincode} />
            </SectionCard>

            {/* Verification */}
            <SectionCard title="Business Verification" icon="shield">
              {jobsUser.gstNo ? (
                <View style={cs.verifiedRow}>
                  <View style={cs.verifiedIcon}>
                    <Feather name="check-circle" size={18} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={cs.verifiedLabel}>GST Registered</Text>
                    <Text style={cs.verifiedGst}>{jobsUser.gstNo}</Text>
                  </View>
                  <View style={cs.verifiedPill}>
                    <Text style={cs.verifiedPillText}>Verified</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={openEdit} style={cs.unverifiedRow}>
                  <Feather name="alert-circle" size={16} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={cs.unverifiedTitle}>Not Verified</Text>
                    <Text style={cs.unverifiedSub}>Add your GST number to get a verified badge</Text>
                  </View>
                  <Text style={cs.addInfoText}>Add →</Text>
                </TouchableOpacity>
              )}
            </SectionCard>

            {/* Job stats mini */}
            {myJobs.length > 0 && (
              <SectionCard title="Hiring Performance" icon="bar-chart-2">
                {myJobs.slice(0, 3).map((job) => (
                  <View key={job.id} style={cs.miniJobRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={cs.miniJobTitle} numberOfLines={1}>{job.title}</Text>
                      <Text style={cs.miniJobSub}>{job.location}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Text style={cs.miniJobStat}>{job.applicants.length} applied</Text>
                      <Text style={[cs.miniJobStat, { color: "#059669" }]}>{job.shortlisted.length} shortlisted</Text>
                    </View>
                    <View style={[cs.miniJobStatus, { backgroundColor: job.active ? "#D1FAE5" : "#F1F5F9" }]}>
                      <Text style={[cs.miniJobStatusText, { color: job.active ? "#059669" : "#94A3B8" }]}>
                        {job.active ? "Active" : "Paused"}
                      </Text>
                    </View>
                  </View>
                ))}
                {myJobs.length > 3 && (
                  <Text style={cs.addInfoText}>+{myJobs.length - 3} more jobs posted</Text>
                )}
              </SectionCard>
            )}
          </>
        )}

        {/* ─── SEEKER PROFILE ─── */}
        {!isEmployer && completion < 100 && missingFields.length > 0 && (
          <View style={cs.missingCard}>
            <Feather name="alert-circle" size={15} color="#EA580C" />
            <View style={{ flex: 1 }}>
              <Text style={cs.missingTitle}>Complete your profile</Text>
              <Text style={cs.missingText}>Missing: {missingFields.map(f => f.label).join(", ")}</Text>
            </View>
            <TouchableOpacity onPress={openEdit} style={cs.missingBtn}>
              <Text style={cs.missingBtnText}>Fill Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isEmployer && (
          <>
            <SectionCard title="Personal Information" icon="user">
              <InfoRow icon="user" label="Full Name" value={jobsUser.name} />
              <InfoRow icon="calendar" label="Age" value={jobsUser.age ? `${jobsUser.age} years` : undefined} />
              <InfoRow icon="phone" label="Mobile" value={`+91 ${jobsUser.phone}`} />
              <InfoRow icon="mail" label="Email" value={jobsUser.email} />
              <InfoRow icon="map-pin" label="Location" value={jobsUser.location} />
              <InfoRow icon="globe" label="Languages" value={jobsUser.languages} />
            </SectionCard>
            <SectionCard title="Education" icon="book-open">
              <InfoRow icon="award" label="Qualification" value={jobsUser.qualification} />
            </SectionCard>
            <SectionCard title="Current Status" icon="activity">
              {jobsUser.currentStatus ? (
                <View style={cs.statusPill}>
                  <Feather name={STATUS_OPTIONS.find(s => s.id === jobsUser.currentStatus)?.icon as any || "briefcase"} size={14} color={STATUS_OPTIONS.find(s => s.id === jobsUser.currentStatus)?.color || "#EA580C"} />
                  <Text style={[cs.statusPillText, { color: STATUS_OPTIONS.find(s => s.id === jobsUser.currentStatus)?.color || "#EA580C" }]}>
                    {STATUS_OPTIONS.find(s => s.id === jobsUser.currentStatus)?.label}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity onPress={openEdit} style={cs.emptyField}><Text style={cs.emptyFieldText}>Tap to add status</Text></TouchableOpacity>
              )}
              {jobsUser.currentStatus === "employed" && (
                <>
                  <InfoRow icon="briefcase" label="Company" value={jobsUser.currentCompany} />
                  <InfoRow icon="tag" label="Role" value={jobsUser.currentRole} />
                  <InfoRow icon="clock" label="Experience" value={jobsUser.experience} />
                </>
              )}
              {jobsUser.currentStatus === "student" && (
                <>
                  <InfoRow icon="book" label="College" value={jobsUser.collegeName} />
                  <InfoRow icon="bookmark" label="Field of Study" value={jobsUser.fieldOfStudy} />
                </>
              )}
            </SectionCard>
            {jobsUser.currentStatus === "unemployed" && (jobsUser.experience || jobsUser.previousCompany || jobsUser.previousRole) ? (
              <SectionCard title="Work Experience" icon="clock">
                <InfoRow icon="clock" label="Total Exp." value={jobsUser.experience} />
                <InfoRow icon="briefcase" label="Prev. Company" value={jobsUser.previousCompany} />
                <InfoRow icon="tag" label="Prev. Role" value={jobsUser.previousRole} />
              </SectionCard>
            ) : null}
            {jobsUser.skills && (
              <SectionCard title="Skills" icon="zap">
                <View style={cs.skillsWrap}>
                  {jobsUser.skills.split(",").map((s, i) => (
                    <View key={i} style={cs.skillChip}><Text style={cs.skillText}>{s.trim()}</Text></View>
                  ))}
                </View>
              </SectionCard>
            )}
            {jobsUser.about && (
              <SectionCard title="About / Objective" icon="file-text">
                <Text style={cs.aboutText}>{jobsUser.about}</Text>
              </SectionCard>
            )}
            {completion === 100 && (
              <TouchableOpacity onPress={() => router.push("/jobs/resume" as any)} style={cs.resumeCardBtn} activeOpacity={0.88}>
                <LinearGradient colors={["#059669", "#16A34A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cs.resumeCardGrad}>
                  <Feather name="file-text" size={20} color="white" />
                  <View>
                    <Text style={cs.resumeCardTitle}>Generate Resume</Text>
                    <Text style={cs.resumeCardSub}>Choose from 3 professional templates</Text>
                  </View>
                  <Feather name="arrow-right" size={18} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity style={cs.switchBtn} onPress={() => router.replace("/portal-select" as any)} activeOpacity={0.85}>
          <Feather name="home" size={18} color="#EA580C" />
          <Text style={cs.switchBtnText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={cs.logoutBtn} onPress={() => setShowLogout(true)} activeOpacity={0.85}>
          <Feather name="log-out" size={18} color="#DC2626" />
          <Text style={cs.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editing} animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          <LinearGradient colors={["#C2410C", "#EA580C"]} style={[cs.editHeader, { paddingTop: (Platform.OS === "web" ? 44 : insets.top) + 12 }]}>
            <TouchableOpacity onPress={() => setEditing(false)} style={cs.editClose}>
              <Feather name="x" size={20} color="white" />
            </TouchableOpacity>
            <Text style={cs.editHeaderTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} style={cs.editSaveBtn}>
              <Text style={cs.editSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={cs.editScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={cs.editSection}>Basic Information</Text>
            <EditField label="Full Name *" value={eName} onChange={setEName} placeholder="Your full name" />
            <EditField label="Email Address" value={eEmail} onChange={setEEmail} placeholder="you@email.com" keyboardType="email-address" />

            {isEmployer ? (
              <>
                <Text style={cs.editSection}>Company Information</Text>
                <EditField label="Company Name *" value={eCompany} onChange={setECompany} placeholder="e.g. XYZ Pvt Ltd" />
                <EditField label="Contact Person Name" value={eContactPerson} onChange={setEContactPerson} placeholder="e.g. Ramesh Sharma (HR Manager)" />
                <SelectField label="Company Type" value={eCompanyType} options={COMPANY_TYPES} onChange={setECompanyType} />
                <SelectField label="Company Size" value={eCompanySize} options={COMPANY_SIZES} onChange={setECompanySize} />
                <SelectField label="Industry" value={eIndustry} options={INDUSTRIES} onChange={setEIndustry} />
                <EditField label="Year Established" value={eYearEst} onChange={setEYearEst} placeholder="e.g. 2010" keyboardType="number-pad" />
                <EditField label="Website" value={eWebsite} onChange={setEWebsite} placeholder="e.g. www.yourcompany.com" keyboardType="url" />
                <EditField label="About Company" value={eCompanyDesc} onChange={setECompanyDesc} placeholder="Describe your company, culture, products/services…" multiline />

                <Text style={cs.editSection}>Contact & Address</Text>
                <EditField label="WhatsApp Number" value={eWhatsapp} onChange={setEWhatsapp} placeholder="10-digit WhatsApp number" keyboardType="phone-pad" />
                <EditField label="Area / Location" value={eLocation} onChange={setELocation} placeholder="e.g. MIDC Ambernath" />
                <EditField label="Full Address" value={eAddress} onChange={setEAddress} placeholder="Plot no, street, area…" multiline />
                <EditField label="PIN Code" value={ePincode} onChange={setEPincode} placeholder="e.g. 421501" keyboardType="number-pad" />

                <Text style={cs.editSection}>Business Verification</Text>
                <EditField label="GST Number" value={eGst} onChange={setEGst} placeholder="e.g. 27AABCU9603R1ZX" />
              </>
            ) : (
              <>
                <EditField label="Age" value={eAge} onChange={setEAge} placeholder="e.g. 25" keyboardType="number-pad" />
                <EditField label="Location / Area" value={eLocation} onChange={setELocation} placeholder="e.g. Ambernath East" />
                <EditField label="Languages Known" value={eLanguages} onChange={setELanguages} placeholder="e.g. Hindi, Marathi, English" />

                <Text style={cs.editSection}>Education</Text>
                <EditField label="Highest Qualification" value={eQual} onChange={setEQual} placeholder="e.g. 12th Pass, B.Com, ITI" />

                <View style={cs.statusBanner}>
                  <LinearGradient colors={["#FFEDD5", "#FED7AA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cs.statusBannerGrad}>
                    <View style={cs.statusBannerIcon}><Feather name="activity" size={16} color="#EA580C" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={cs.statusBannerTitle}>Tell us where you stand</Text>
                      <Text style={cs.statusBannerSub}>Your status decides which fields you fill next.</Text>
                    </View>
                  </LinearGradient>
                </View>

                <SelectField
                  label="Current Status"
                  value={STATUS_OPTIONS.find((s) => s.id === eStatus)?.label || ""}
                  options={STATUS_OPTIONS.map((s) => s.label)}
                  onChange={(label) => {
                    const found = STATUS_OPTIONS.find((s) => s.label === label);
                    if (found) setEStatus(found.id);
                  }}
                />

                {eStatus === "employed" && (
                  <View style={cs.condBlock}>
                    <View style={[cs.condHeader, { backgroundColor: "#D1FAE5" }]}>
                      <Feather name="briefcase" size={14} color="#059669" />
                      <Text style={[cs.condHeaderText, { color: "#059669" }]}>Your current job</Text>
                    </View>
                    <EditField label="Current Company" value={eCurrentCompany} onChange={setECurrentCompany} placeholder="e.g. ABC Pvt Ltd" />
                    <EditField label="Current Role / Designation" value={eCurrentRole} onChange={setECurrentRole} placeholder="e.g. Sales Executive" />
                    <EditField label="Total Experience" value={eExperience} onChange={setEExperience} placeholder="e.g. 2 years" />
                  </View>
                )}

                {eStatus === "unemployed" && (
                  <View style={cs.condBlock}>
                    <View style={[cs.condHeader, { backgroundColor: "#FFEDD5" }]}>
                      <Feather name="search" size={14} color="#EA580C" />
                      <Text style={[cs.condHeaderText, { color: "#EA580C" }]}>Your last job (optional)</Text>
                    </View>
                    <EditField label="Total Experience" value={eExperience} onChange={setEExperience} placeholder="e.g. 2 years" />
                    <EditField label="Previous Company" value={ePrevCompany} onChange={setEPrevCompany} placeholder="e.g. ABC Pvt Ltd" />
                    <EditField label="Previous Role" value={ePrevRole} onChange={setEPrevRole} placeholder="e.g. Factory Operator" />
                  </View>
                )}

                {eStatus === "student" && (
                  <View style={cs.condBlock}>
                    <View style={[cs.condHeader, { backgroundColor: "#EDE9FE" }]}>
                      <Feather name="book-open" size={14} color="#7C3AED" />
                      <Text style={[cs.condHeaderText, { color: "#7C3AED" }]}>Your studies</Text>
                    </View>
                    <EditField label="College / Institute Name" value={eCollegeName} onChange={setECollegeName} placeholder="e.g. K.M. Agrawal College" />
                    <EditField label="Currently Studying (Field)" value={eFieldOfStudy} onChange={setEFieldOfStudy} placeholder="e.g. B.Sc Computer Science" />
                  </View>
                )}

                {eStatus === "fresher" && (
                  <View style={cs.condBlock}>
                    <View style={[cs.condHeader, { backgroundColor: "#DBEAFE" }]}>
                      <Feather name="star" size={14} color="#0369A1" />
                      <Text style={[cs.condHeaderText, { color: "#0369A1" }]}>Just starting out — no experience needed</Text>
                    </View>
                  </View>
                )}

                <Text style={cs.editSection}>Skills & Career Objective</Text>
                <EditField label="Skills" value={eSkills} onChange={setESkills} placeholder="e.g. Welding, MS Office, Driving" />
                <EditField label="About / Career Objective" value={eAbout} onChange={setEAbout} placeholder="Write a short objective statement…" multiline />
              </>
            )}

            <TouchableOpacity onPress={handleSave} style={cs.saveBtnFull} activeOpacity={0.85}>
              <LinearGradient colors={["#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cs.saveBtnGrad}>
                <Feather name="check" size={18} color="white" />
                <Text style={cs.saveBtnText}>Save Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={showLogout} transparent animationType="fade" onRequestClose={() => setShowLogout(false)}>
        <View style={cs.modalOverlay}>
          <View style={cs.modalCard}>
            <Text style={cs.modalTitle}>Logout?</Text>
            <Text style={cs.modalSub}>You will be returned to the job portal login screen.</Text>
            <View style={cs.modalBtns}>
              <TouchableOpacity style={cs.modalCancel} onPress={() => setShowLogout(false)}><Text style={cs.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={cs.modalConfirm} onPress={async () => { setShowLogout(false); await logoutJobs(); router.replace("/jobs/login" as any); }}><Text style={cs.modalConfirmText}>Logout</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  avatarWrap: { position: "relative" },
  cameraBtn: { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "white" },
  headerName: { fontSize: 17, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSubName: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 1 },
  headerIndustry: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#D1FAE5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { fontSize: 9, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "white", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: "flex-start", marginTop: 4 },
  rolePillText: { fontSize: 11, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 3 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  switchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white", padding: 12, borderRadius: 14, marginTop: 8 },
  switchBtnText: { fontSize: 13, fontWeight: "700", color: "#EA580C", fontFamily: "Inter_600SemiBold" },

  completionCard: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, padding: 12, marginBottom: 12 },
  completionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  completionLabel: { fontSize: 13, fontWeight: "600", color: "white", fontFamily: "Inter_600SemiBold" },
  resumeBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#059669", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  resumeBtnText: { fontSize: 11, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  barWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  barTrack: { flex: 1, height: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barLabel: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold", width: 36, textAlign: "right" },
  completionHint: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 6 },

  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, padding: 12 },
  statBox: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  statNum: { fontSize: 18, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 2 },

  content: { padding: 14, gap: 10 },

  // Section card
  sectionCard: { backgroundColor: "white", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#FFEDD5", alignItems: "center", justifyContent: "center" },
  sectionCardTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },

  // Info row
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  infoIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginTop: 2 },
  infoLabel: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, color: "#0F172A", fontFamily: "Inter_500Medium", marginTop: 1 },

  // Employer sections
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  overviewChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFEDD5", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  overviewChipText: { fontSize: 12, fontWeight: "600", color: "#EA580C", fontFamily: "Inter_600SemiBold" },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingVertical: 20, borderWidth: 1.5, borderColor: "#FED7AA", borderStyle: "dashed" },
  emptyCardText: { fontSize: 13, color: "#EA580C", fontFamily: "Inter_500Medium" },
  addInfoBtn: { paddingVertical: 8 },
  addInfoText: { fontSize: 12, color: "#EA580C", fontFamily: "Inter_500Medium" },

  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  verifiedIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" },
  verifiedLabel: { fontSize: 13, fontWeight: "600", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  verifiedGst: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  verifiedPill: { backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  verifiedPillText: { fontSize: 11, fontWeight: "700", color: "#059669", fontFamily: "Inter_700Bold" },
  unverifiedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  unverifiedTitle: { fontSize: 13, fontWeight: "600", color: "#92400E", fontFamily: "Inter_600SemiBold" },
  unverifiedSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 2 },

  miniJobRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  miniJobTitle: { fontSize: 13, fontWeight: "600", color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  miniJobSub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  miniJobStat: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },
  miniJobStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  miniJobStatusText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },

  // Seeker sections
  aboutText: { fontSize: 13, color: "#475569", fontFamily: "Inter_400Regular", lineHeight: 20 },
  missingCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF7ED", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#FED7AA" },
  missingTitle: { fontSize: 13, fontWeight: "700", color: "#92400E", fontFamily: "Inter_700Bold" },
  missingText: { fontSize: 11, color: "#B45309", fontFamily: "Inter_400Regular", marginTop: 2 },
  missingBtn: { backgroundColor: "#EA580C", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  missingBtnText: { fontSize: 12, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF7ED", padding: 12, borderRadius: 12, alignSelf: "flex-start" },
  statusPillText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyField: { backgroundColor: "#F1F5F9", padding: 12, borderRadius: 10, alignItems: "center" },
  emptyFieldText: { fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { backgroundColor: "#FFEDD5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  skillText: { fontSize: 12, fontWeight: "600", color: "#92400E", fontFamily: "Inter_600SemiBold" },
  resumeCardBtn: { borderRadius: 16, overflow: "hidden" },
  resumeCardGrad: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  resumeCardTitle: { fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  resumeCardSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginTop: 2 },

  switchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "white", padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#FED7AA" },
  switchBtnText: { fontSize: 14, fontWeight: "600", color: "#EA580C", fontFamily: "Inter_600SemiBold" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#FEF2F2", padding: 14, borderRadius: 14 },
  logoutBtnText: { fontSize: 14, fontWeight: "600", color: "#DC2626", fontFamily: "Inter_600SemiBold" },

  // Edit modal
  editHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16 },
  editClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  editHeaderTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold", textAlign: "center" },
  editSaveBtn: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  editSaveBtnText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  editScroll: { padding: 16, gap: 4, paddingBottom: 40 },
  editSection: { fontSize: 12, fontWeight: "700", color: "#94A3B8", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  fieldInput: { backgroundColor: "white", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  selectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  selectBtnText: { fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  selectOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", paddingHorizontal: 24 },
  selectList: { backgroundColor: "white", borderRadius: 20, overflow: "hidden", paddingBottom: 8 },
  selectListTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  selectItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  selectItemActive: { backgroundColor: "#FFF7ED" },
  selectItemText: { fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular" },
  statusOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statusOption: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "white" },
  statusOptionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#64748B" },
  statusBanner: { borderRadius: 14, overflow: "hidden", marginTop: 6, marginBottom: 12 },
  statusBannerGrad: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  statusBannerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  statusBannerTitle: { fontSize: 13, fontWeight: "700", color: "#9A3412", fontFamily: "Inter_700Bold" },
  statusBannerSub: { fontSize: 11, color: "#9A3412", opacity: 0.8, fontFamily: "Inter_400Regular", marginTop: 2 },
  condBlock: { backgroundColor: "white", borderRadius: 14, padding: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: "#F1F5F9" },
  condHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, alignSelf: "flex-start", marginBottom: 10 },
  condHeaderText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  saveBtnFull: { borderRadius: 14, overflow: "hidden", marginTop: 16 },
  saveBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 10 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },

  // Logout modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", paddingHorizontal: 32 },
  modalCard: { backgroundColor: "white", borderRadius: 20, padding: 24, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: "#F1F5F9", padding: 13, borderRadius: 12, alignItems: "center" },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: "#64748B", fontFamily: "Inter_600SemiBold" },
  modalConfirm: { flex: 1, backgroundColor: "#FEE2E2", padding: 13, borderRadius: 12, alignItems: "center" },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_700Bold" },
});
