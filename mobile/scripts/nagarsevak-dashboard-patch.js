const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', '(tabs)', 'admin.tsx');

function replaceOnce(text, from, to) {
  if (!text.includes(from)) return text;
  return text.replace(from, to);
}

function repairTypeScriptIssues(text) {
  let next = text;

  // Remove any previously inserted resolutionRate line so it can be placed
  // after resolvedCount is declared. This keeps the patch idempotent.
  next = next.replace(/\n\s*const resolutionRate = wardComplaints\.length > 0 \? Math\.round\(\(resolvedCount \/ wardComplaints\.length\) \* 100\) : 0;/g, '');

  next = replaceOnce(
    next,
    '  const resolvedCount = wardComplaints.filter((c) => c.status === "resolved").length;\n  const rejectedCount = wardComplaints.filter((c) => c.status === "rejected").length;',
    '  const resolvedCount = wardComplaints.filter((c) => c.status === "resolved").length;\n  const rejectedCount = wardComplaints.filter((c) => c.status === "rejected").length;\n  const resolutionRate = wardComplaints.length > 0 ? Math.round((resolvedCount / wardComplaints.length) * 100) : 0;'
  );

  next = next.replace(
    '...(user?.dob ? [{ icon: "calendar" as const, label: "Date of Birth", value: String(user.dob) }] : []),',
    '...((user as any)?.dob ? [{ icon: "calendar" as const, label: "Date of Birth", value: String((user as any).dob) }] : []),'
  );

  return next;
}

try {
  let text = fs.readFileSync(file, 'utf8');
  let next = text;

  next = replaceOnce(
    next,
    '  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");\n  const [active, setActive] = useState<Complaint | null>(null);',
    '  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");\n  const [searchQuery, setSearchQuery] = useState("");\n  const [active, setActive] = useState<Complaint | null>(null);'
  );

  next = replaceOnce(
    next,
    '  const filtered = filter === "all"\n    ? wardComplaints\n    : wardComplaints.filter((c) => {\n        if (filter === "in_progress") return c.status === "in_progress" || c.status === "assigned";\n        return c.status === filter;\n      });',
    '  const searchedWardComplaints = wardComplaints.filter((c) => {\n    const q = searchQuery.trim().toLowerCase();\n    if (!q) return true;\n    return [c.id, c.title, c.description, c.location, c.ward, c.category, c.status, c.userName, c.userMobile]\n      .filter(Boolean)\n      .some((value) => String(value).toLowerCase().includes(q));\n  });\n  const filtered = filter === "all"\n    ? searchedWardComplaints\n    : searchedWardComplaints.filter((c) => {\n        if (filter === "in_progress") return c.status === "in_progress" || c.status === "assigned";\n        return c.status === filter;\n      });'
  );

  next = replaceOnce(
    next,
    '  const openComplaintTab = (nextFilter: ComplaintStatus) => {\n    if (Platform.OS !== "web") Haptics.selectionAsync();\n    router.push({ pathname: "/complaint/list", params: { status: nextFilter } } as any);\n  };',
    '  const openComplaintTab = (nextFilter: ComplaintStatus) => {\n    if (Platform.OS !== "web") Haptics.selectionAsync();\n    setFilter(nextFilter);\n    setTimeout(() => complaintListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);\n  };'
  );

  next = replaceOnce(next, '    await logout();\n    router.replace("/login");', '    await logout();\n    router.replace("/portal-select" as any);');

  next = replaceOnce(
    next,
    '          <Text style={styles.cmpTitle} numberOfLines={1}>{complaint.title}</Text>\n          <Text style={styles.cmpMeta}>{timeAgo(complaint.createdAt)}</Text>',
    '          <Text style={styles.cmpTitle} numberOfLines={1}>{complaint.title}</Text>\n          <Text style={styles.complaintIdText}>ID: {complaint.id}</Text>\n          <Text style={styles.cmpMeta}>{timeAgo(complaint.createdAt)}</Text>'
  );

  next = replaceOnce(
    next,
    '      {/* ALERTS PANEL */}',
    '      <View style={styles.performancePanel}>\n        <View style={styles.performanceHeader}>\n          <View style={styles.performanceIcon}><Feather name="activity" size={16} color="#16A34A" /></View>\n          <View style={{ flex: 1 }}>\n            <Text style={styles.performanceTitle}>Ward Performance</Text>\n            <Text style={styles.performanceSub}>Resolution rate, active load and quick search for your ward</Text>\n          </View>\n          <Text style={styles.performanceRate}>{resolutionRate}%</Text>\n        </View>\n        <View style={styles.performanceStats}>\n          <View style={styles.performanceStat}><Text style={styles.performanceStatNum}>{wardComplaints.length}</Text><Text style={styles.performanceStatLabel}>Total</Text></View>\n          <View style={styles.performanceStat}><Text style={[styles.performanceStatNum, { color: "#D97706" }]}>{pending}</Text><Text style={styles.performanceStatLabel}>Pending</Text></View>\n          <View style={styles.performanceStat}><Text style={[styles.performanceStatNum, { color: "#7C3AED" }]}>{activeCount}</Text><Text style={styles.performanceStatLabel}>Active</Text></View>\n          <View style={styles.performanceStat}><Text style={[styles.performanceStatNum, { color: "#059669" }]}>{resolvedCount}</Text><Text style={styles.performanceStatLabel}>Resolved</Text></View>\n        </View>\n      </View>\n\n      {/* ALERTS PANEL */}'
  );

  next = replaceOnce(
    next,
    '      <View style={styles.dashboardGrid}>',
    '      <View style={styles.searchPanel}>\n        <Feather name="search" size={15} color="#94A3B8" />\n        <TextInput\n          value={searchQuery}\n          onChangeText={setSearchQuery}\n          placeholder="Search by complaint ID, citizen, mobile, area..."\n          placeholderTextColor="#94A3B8"\n          style={styles.searchInput as any}\n        />\n        {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery("")}><Feather name="x" size={16} color="#94A3B8" /></TouchableOpacity>}\n      </View>\n\n      <View style={styles.dashboardGrid}>'
  );

  next = replaceOnce(
    next,
    '                  ...(user?.age ? [{ icon: "calendar" as const, label: t("age"), value: String(user.age) + " years" }] : []),',
    '                  ...((user as any)?.dob ? [{ icon: "calendar" as const, label: "Date of Birth", value: String((user as any).dob) }] : []),\n                  ...(user?.age ? [{ icon: "calendar" as const, label: t("age"), value: String(user.age) + " years" }] : []),'
  );

  next = replaceOnce(
    next,
    '  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 2 },',
    '  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 2 },\n  performancePanel: { backgroundColor: "white", marginHorizontal: 14, marginTop: 12, borderRadius: 18, padding: 14, shadowColor: "#166534", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },\n  performanceHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },\n  performanceIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },\n  performanceTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" },\n  performanceSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 1 },\n  performanceRate: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#16A34A" },\n  performanceStats: { flexDirection: "row", gap: 8 },\n  performanceStat: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 12, paddingVertical: 9, alignItems: "center" },\n  performanceStatNum: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F172A" },\n  performanceStatLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 1 },\n  searchPanel: { marginHorizontal: 14, marginTop: 10, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#166534", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },\n  searchInput: { flex: 1, minHeight: 34, fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular", paddingVertical: 0, outlineWidth: 0 },\n  complaintIdText: { fontSize: 10, color: "#16A34A", fontFamily: "Inter_700Bold", marginTop: 1 },'
  );

  next = repairTypeScriptIssues(next);

  if (next !== text) {
    fs.writeFileSync(file, next);
    console.log('[Connect-T] Nagarsevak dashboard feature patch applied/fixed');
  } else {
    console.log('[Connect-T] Nagarsevak dashboard feature patch already applied');
  }
} catch (err) {
  console.warn('[Connect-T] Nagarsevak dashboard patch skipped:', err.message);
}
