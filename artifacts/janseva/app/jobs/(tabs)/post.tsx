import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert, ActivityIndicator, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJobs, categoryConfig, typeConfig, JobCategory, JobType } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { useRouter } from "expo-router";

const categories = Object.entries(categoryConfig).map(([id, cfg]) => ({ id: id as JobCategory, ...cfg }));
const types = Object.entries(typeConfig).map(([id, cfg]) => ({ id: id as JobType, ...cfg }));

// ─── Category Dropdown ────────────────────────────────────────────────────────
function CategoryDropdown({
  value, customLabel, onSelect, onCustomChange,
}: {
  value: JobCategory;
  customLabel: string;
  onSelect: (id: JobCategory) => void;
  onCustomChange: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === value);
  const displayLabel = value === "other" && customLabel.trim() ? customLabel : selected?.label ?? "Select Category";

  return (
    <View>
      {/* Trigger button */}
      <TouchableOpacity
        style={styles.dropdownBtn}
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
      >
        {selected && value !== "other" && (
          <View style={[styles.dropdownIcon, { backgroundColor: selected.bg }]}>
            <Feather name={selected.icon as any} size={14} color={selected.color} />
          </View>
        )}
        {value === "other" && (
          <View style={[styles.dropdownIcon, { backgroundColor: "#F1F5F9" }]}>
            <Feather name="edit-3" size={14} color="#64748B" />
          </View>
        )}
        <Text style={styles.dropdownBtnText} numberOfLines={1}>{displayLabel}</Text>
        <Feather name="chevron-down" size={16} color="#94A3B8" />
      </TouchableOpacity>

      {/* Manual input when "Other" is selected */}
      {value === "other" && (
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={customLabel}
          onChangeText={onCustomChange}
          placeholder="Type your job category (e.g. Agriculture, Tailoring…)"
          placeholderTextColor="#CBD5E1"
        />
      )}

      {/* Dropdown modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.dropdownList}>
            <View style={styles.dropdownListHeader}>
              <Text style={styles.dropdownListTitle}>Select Job Category</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.dropdownClose}>
                <Feather name="x" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.dropdownItem, value === c.id && styles.dropdownItemActive]}
                  activeOpacity={0.75}
                  onPress={() => { onSelect(c.id); setOpen(false); }}
                >
                  <View style={[styles.dropdownItemIcon, { backgroundColor: c.bg }]}>
                    <Feather name={c.icon as any} size={16} color={c.color} />
                  </View>
                  <Text style={[styles.dropdownItemText, value === c.id && { color: "#EA580C", fontFamily: "Inter_600SemiBold" }]}>
                    {c.label}
                  </Text>
                  {value === c.id && <Feather name="check" size={14} color="#EA580C" />}
                </TouchableOpacity>
              ))}

              {/* Manual / Other option */}
              <TouchableOpacity
                style={[styles.dropdownItem, value === "other" && styles.dropdownItemActive]}
                activeOpacity={0.75}
                onPress={() => { onSelect("other"); setOpen(false); }}
              >
                <View style={[styles.dropdownItemIcon, { backgroundColor: "#F1F5F9" }]}>
                  <Feather name="edit-3" size={16} color="#64748B" />
                </View>
                <Text style={[styles.dropdownItemText, value === "other" && { color: "#EA580C", fontFamily: "Inter_600SemiBold" }]}>
                  Other / Type Manually
                </Text>
                {value === "other" && <Feather name="check" size={14} color="#EA580C" />}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function CompanyDropdown({
  companies,
  selectedCompanyId,
  onSelect,
}: {
  companies: { id: string; name: string }[];
  selectedCompanyId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];

  return (
    <View>
      <TouchableOpacity style={styles.dropdownBtn} activeOpacity={0.85} onPress={() => setOpen(true)}>
        <View style={[styles.dropdownIcon, { backgroundColor: "#FFF7ED" }]}>
          <Feather name="briefcase" size={14} color="#C2410C" />
        </View>
        <Text style={styles.dropdownBtnText} numberOfLines={1}>
          {selected?.name || "Select Company"}
        </Text>
        <Feather name="chevron-down" size={16} color="#94A3B8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.dropdownList}>
            <View style={styles.dropdownListHeader}>
              <Text style={styles.dropdownListTitle}>Choose Company</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.dropdownClose}>
                <Feather name="x" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              {companies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={[styles.dropdownItem, selectedCompanyId === company.id && styles.dropdownItemActive]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelect(company.id);
                    setOpen(false);
                  }}
                >
                  <Feather name="home" size={16} color={selectedCompanyId === company.id ? "#EA580C" : "#94A3B8"} />
                  <Text style={[styles.dropdownItemText, selectedCompanyId === company.id && { color: "#EA580C", fontFamily: "Inter_600SemiBold" }]}>
                    {company.name}
                  </Text>
                  {selectedCompanyId === company.id && <Feather name="check" size={14} color="#EA580C" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PostJobScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser } = useJobsAuth();
  const { addJob } = useJobs();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<JobCategory>("manufacturing");
  const [customCategory, setCustomCategory] = useState("");
  const [type, setType] = useState<JobType>("full-time");
  const [salary, setSalary] = useState("");
  const [location, setLocation] = useState("Ambernath");
  const [openings, setOpenings] = useState("1");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [contactNo, setContactNo] = useState(jobsUser.whatsapp || jobsUser.phone || "");
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [postedTitle, setPostedTitle] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const companies = jobsUser.companies?.length
    ? jobsUser.companies
    : jobsUser.company
      ? [{
          id: "primary",
          name: jobsUser.company,
          type: jobsUser.companyType,
          size: jobsUser.companySize,
          industry: jobsUser.industry,
          website: jobsUser.website,
          description: jobsUser.companyDescription,
          address: jobsUser.address,
          pincode: jobsUser.pincode,
          whatsapp: jobsUser.whatsapp,
          yearEstablished: jobsUser.yearEstablished,
          contactPerson: jobsUser.contactPerson,
          gstNo: jobsUser.gstNo,
        }]
      : [];
  const showCompanyPicker = companies.length > 1;
  const defaultCompanyId = companies[0]?.id || "";
  const activeCompanyId = useMemo(() => selectedCompanyId || defaultCompanyId, [selectedCompanyId, defaultCompanyId]);

  if (!jobsUser || jobsUser.role !== "employer") {
    return (
      <View style={styles.restricted}>
        <Feather name="lock" size={44} color="#CBD5E1" />
        <Text style={styles.restrictedTitle}>Employers Only</Text>
        <Text style={styles.restrictedSub}>Only employer accounts can post jobs.</Text>
      </View>
    );
  }

  if (posted) {
    return (
      <View style={styles.successScreen}>
        <LinearGradient
          colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.successIconWrap}
        >
          <Feather name="check" size={48} color="white" />
        </LinearGradient>
        <Text style={styles.successTitle}>Posted Successfully!</Text>
        <Text style={styles.successSub}>
          <Text style={{ fontFamily: "Inter_600SemiBold", color: "#EA580C" }}>{postedTitle}</Text>
          {"\n"}is now live and visible to job seekers.
        </Text>
        <TouchableOpacity
          style={styles.successBtn}
          activeOpacity={0.85}
          onPress={() => router.replace("/jobs/(tabs)" as any)}
        >
          <LinearGradient
            colors={["#C2410C", "#EA580C", "#F97316"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.successBtnGrad}
          >
            <Feather name="home" size={16} color="white" />
            <Text style={styles.successBtnText}>Go to Dashboard</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.successSecondaryBtn}
          activeOpacity={0.75}
          onPress={() => {
            setPosted(false);
            setTitle(""); setSalary(""); setDescription(""); setRequirements("");
            setLocation("Ambernath"); setOpenings("1"); setCategory("manufacturing"); setCustomCategory("");
          }}
        >
          <Text style={styles.successSecondaryText}>Post Another Job</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (submitting) return;
    if (!title.trim()) { Alert.alert("Enter job title"); return; }
    if (category === "other" && !customCategory.trim()) { Alert.alert("Enter your custom job category"); return; }
    if (!salary.trim()) { Alert.alert("Enter salary range"); return; }
    if (!description.trim()) { Alert.alert("Enter job description"); return; }
    if (!requirements.trim()) { Alert.alert("Enter requirements"); return; }

    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      const selectedCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];
      if (!selectedCompany) {
        Alert.alert("Add a company first");
        return;
      }
      addJob({
        employerId: jobsUser.id,
        employerName: jobsUser.name,
        company: selectedCompany.name,
        employerPhone: jobsUser.phone,
        employerWhatsApp: contactNo.trim() || jobsUser.whatsapp || jobsUser.phone,
        title: title.trim(),
        category,
        type,
        salary: salary.trim(),
        location: location.trim(),
        openings: parseInt(openings) || 1,
        description: description.trim(),
        requirements: requirements.trim(),
      });
      setPostedTitle(title.trim());
      setPosted(true);
    } catch {
      Alert.alert("Unable to post job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Text style={styles.headerTitle}>Post a Job</Text>
        <Text style={styles.headerSub}>Fill in the details to attract candidates</Text>
      </LinearGradient>

      {showCompanyPicker && (
        <View style={styles.field}>
          <Text style={styles.label}>Select Company *</Text>
          <CompanyDropdown companies={companies} selectedCompanyId={activeCompanyId} onSelect={setSelectedCompanyId} />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.form, { paddingTop: showCompanyPicker ? 4 : 12, paddingBottom: Math.max(insets.bottom, 8) + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={styles.label}>Job Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Factory Operator, Sales Executive"
            placeholderTextColor="#CBD5E1"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Job Category *</Text>
          <CategoryDropdown
            value={category}
            customLabel={customCategory}
            onSelect={setCategory}
            onCustomChange={setCustomCategory}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Job Type *</Text>
          <View style={styles.typeRow}>
            {types.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeChip, type === t.id && { backgroundColor: "#EA580C", borderColor: "#EA580C" }]}
                onPress={() => setType(t.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeChipText, type === t.id && { color: "white" }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Salary *</Text>
            <TextInput
              style={styles.input}
              value={salary}
              onChangeText={setSalary}
              placeholder="e.g. ₹12,000–₹18,000/mo"
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <View style={[styles.field, { width: 90 }]}>
            <Text style={styles.label}>Openings</Text>
            <TextInput
              style={styles.input}
              value={openings}
              onChangeText={(v) => setOpenings(v.replace(/\D/g, ""))}
              placeholder="1"
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>WhatsApp Contact No *</Text>
          <TextInput style={styles.input} value={contactNo} onChangeText={setContactNo} placeholder="Enter WhatsApp number" placeholderTextColor="#CBD5E1" keyboardType="phone-pad" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. MIDC Ambernath"
            placeholderTextColor="#CBD5E1"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Job Description *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the job role and responsibilities…"
            placeholderTextColor="#CBD5E1"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Requirements *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={requirements}
            onChangeText={setRequirements}
            placeholder="Qualifications, experience, skills needed…"
            placeholderTextColor="#CBD5E1"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85} disabled={submitting}>
          <LinearGradient
            colors={["#C2410C", "#EA580C", "#FB923C"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.submitGrad}
          >
            {submitting ? <ActivityIndicator color="white" /> : (
              <><Feather name="upload" size={18} color="white" /><Text style={styles.submitText}>Post Job</Text></>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF7ED" },
  header: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 4 },
  form: { padding: 16, gap: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  companySelectRow: { gap: 8, paddingRight: 8 },
  companySelectChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: "#FED7AA", backgroundColor: "white" },
  companySelectChipActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  companySelectText: { fontSize: 13, color: "#92400E", fontFamily: "Inter_500Medium" },
  companySelectTextActive: { color: "white" },
  input: { backgroundColor: "white", borderWidth: 1.5, borderColor: "#FED7AA", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  textarea: { minHeight: 90, paddingTop: 12 },
  row: { flexDirection: "row", gap: 10 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: "#FED7AA", backgroundColor: "white" },
  typeChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#92400E" },
  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  submitGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 10 },
  submitText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  restricted: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#FFF7ED" },
  restrictedTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  restrictedSub: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular" },

  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", paddingHorizontal: 32, gap: 16 },
  successIconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  successTitle: { fontSize: 26, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", textAlign: "center" },
  successSub: { fontSize: 15, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  successBtn: { borderRadius: 14, overflow: "hidden", width: "100%", marginTop: 8 },
  successBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 10 },
  successBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  successSecondaryBtn: { paddingVertical: 12, paddingHorizontal: 24 },
  successSecondaryText: { fontSize: 14, color: "#EA580C", fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },

  // Dropdown
  dropdownBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", borderWidth: 1.5, borderColor: "#FED7AA", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, width: "100%" },
  dropdownIcon: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  dropdownBtnText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", paddingHorizontal: 16 },
  dropdownList: { backgroundColor: "white", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  dropdownListHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  dropdownListTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  dropdownClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  dropdownItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  dropdownItemActive: { backgroundColor: "#FFF7ED" },
  dropdownItemIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dropdownItemText: { flex: 1, fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular" },
});
