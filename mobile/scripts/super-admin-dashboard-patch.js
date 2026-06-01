const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', 'super-admin', 'index.tsx');

function replaceOnce(text, from, to) {
  if (!text.includes(from)) return text;
  return text.replace(from, to);
}

function cleanDuplicateComplaintSearchState(text) {
  let next = text;

  // Remove every previous inserted complaintSearch state line, then insert one
  // after selectedC. This makes repeated npm install/postinstall safe.
  next = next.replace(/\n\s*const \[complaintSearch, setComplaintSearch\] = useState\(""\);/g, '');

  next = replaceOnce(
    next,
    '  const [selectedC, setSelectedC] = useState<Complaint | null>(null);',
    '  const [selectedC, setSelectedC] = useState<Complaint | null>(null);\n  const [complaintSearch, setComplaintSearch] = useState("");'
  );

  return next;
}

function ensureTextInputImport(text) {
  let next = text;
  // Remove duplicate TextInput import lines in the same react-native import block.
  next = next.replace(/\n\s*TextInput,\n\s*TextInput,/g, '\n  TextInput,');
  if (!next.includes('TextInput,')) {
    next = replaceOnce(next, 'Modal,\n  FlatList,\n}', 'Modal,\n  FlatList,\n  TextInput,\n}');
  }
  return next;
}

try {
  let text = fs.readFileSync(file, 'utf8');
  let next = text;

  next = ensureTextInputImport(next);
  next = cleanDuplicateComplaintSearchState(next);

  next = replaceOnce(
    next,
    '  const recentComplaints = useMemo(() => (\n    [...complaints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)\n  ), [complaints]);',
    '  const searchableComplaints = useMemo(() => {\n    const q = complaintSearch.trim().toLowerCase();\n    if (!q) return complaints;\n    return complaints.filter((c) => {\n      const officer = allOfficers.find((n) => n.ward === c.ward);\n      return [c.id, c.title, c.description, c.ward, c.category, c.status, c.userName, c.userMobile, officer?.name, officer?.id, officer?.mobile]\n        .filter(Boolean)\n        .some((value) => String(value).toLowerCase().includes(q));\n    });\n  }, [complaints, complaintSearch, allOfficers]);\n\n  const recentComplaints = useMemo(() => (\n    [...searchableComplaints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)\n  ), [searchableComplaints]);'
  );

  next = replaceOnce(
    next,
    '    const sorted = [...complaints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());',
    '    const source = complaintSearch.trim() ? searchableComplaints : complaints;\n    const sorted = [...source].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());'
  );

  next = replaceOnce(next, '  }, [complaints]);\n\n  const openModal', '  }, [complaints, searchableComplaints, complaintSearch]);\n\n  const openModal');

  if (!next.includes('Search by Complaint ID, citizen, Nagarsevak, ward or category')) {
    next = replaceOnce(
      next,
      '        <SectionHeader title="Complaint Control Center" sub="Tap any card to view full data" />',
      '        <SectionHeader title="Complaint Control Center" sub="Search by Complaint ID, citizen, Nagarsevak, ward or category" />\n        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>\n          <Feather name="search" size={16} color="#94A3B8" />\n          <TextInput\n            value={complaintSearch}\n            onChangeText={setComplaintSearch}\n            placeholder="Search complaints, ID, ward officer..."\n            placeholderTextColor="#CBD5E1"\n            style={{ flex: 1, marginLeft: 10, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0F172A", outlineWidth: 0 } as any}\n          />\n          {complaintSearch.length > 0 && <TouchableOpacity onPress={() => setComplaintSearch("")}><Feather name="x" size={16} color="#94A3B8" /></TouchableOpacity>}\n        </View>'
    );
  }

  next = replaceOnce(
    next,
    '<Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }} numberOfLines={1}>{c.title}</Text>\n        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>\n          {c.ward} · {c.userName || "Unknown"} · {timeAgo(c.createdAt)}\n        </Text>',
    '<Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }} numberOfLines={1}>{c.title}</Text>\n        <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A", marginTop: 1 }}>ID: {c.id}</Text>\n        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B" }}>\n          {c.ward} · {c.userName || "Unknown"} · {timeAgo(c.createdAt)}\n        </Text>'
  );

  next = replaceOnce(
    next,
    '<Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#64748B" }}>{c.ward} · {timeAgo(c.createdAt)}</Text>',
    '<Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>ID: {c.id}</Text>\n                         <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#64748B" }}>{c.ward} · {timeAgo(c.createdAt)}</Text>'
  );

  // Final cleanup after all insertions.
  next = cleanDuplicateComplaintSearchState(next);

  if (next !== text) {
    fs.writeFileSync(file, next);
    console.log('[Connect-T] Super Admin complaint search/ID patch applied/fixed');
  } else {
    console.log('[Connect-T] Super Admin complaint patch already clean');
  }
} catch (err) {
  console.warn('[Connect-T] Super Admin dashboard patch skipped:', err.message);
}
