from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

# Keep the Jobs tab focused only on Job Portal operations.
path = ROOT / "mobile/app/super-admin/jobs.tsx"
text = path.read_text()
text = text.replace('import React, { useState, useMemo, useCallback, useEffect, memo } from "react";', 'import React, { useState, useMemo, useCallback, memo } from "react";', 1)
text = text.replace('import { View, Text, ScrollView, TouchableOpacity, Platform, Modal, FlatList, Dimensions } from "react-native";', 'import { View, Text, TouchableOpacity, Platform, Modal, FlatList, Dimensions } from "react-native";', 1)
text = text.replace('import { apiGet } from "@/lib/api";\n', '', 1)
text = text.replace(' | "placement" | "category";', ' | "placement";', 1)
text = text.replace('  const [selectedJobCategory, setSelectedJobCategory] = useState<string | null>(null);\n', '', 1)
text = re.sub(
    r'  const \[citizens, setCitizens\] = useState<any\[\]>\(\[\]\);\n'
    r'  const \[citizenWards, setCitizenWards\] = useState<any\[\]>\(\[\]\);\n'
    r'  const \[citizenPage, setCitizenPage\] = useState\(1\);\n'
    r'  const \[citizenPages, setCitizenPages\] = useState\(1\);\n'
    r'  const \[citizenTotal, setCitizenTotal\] = useState\(0\);\n'
    r'  const \[selectedCitizenWard, setSelectedCitizenWard\] = useState\("all"\);\n'
    r'  const \[citizensLoading, setCitizensLoading\] = useState\(false\);\n',
    '',
    text,
    count=1,
)
text = re.sub(
    r'\n  const categoryBreakdown = useMemo\(\(\) => \(.*?\n  \), \[jobs\]\);\n',
    '\n',
    text,
    count=1,
    flags=re.S,
)
text = text.replace('      case "category": return selectedJobCategory ? jobs.filter((job) => job.category === selectedJobCategory) : [];\n', '', 1)
text = text.replace('  }, [jobs, selectedJobCategory]);', '  }, [jobs]);', 1)
text = text.replace('  const closeModal = useCallback(() => { setModal(null); setSelectedJob(null); setSelectedJobCategory(null); }, []);', '  const closeModal = useCallback(() => { setModal(null); setSelectedJob(null); }, []);', 1)
text = re.sub(
    r'\n  const loadCitizens = useCallback\(async \(page = 1, ward = selectedCitizenWard\) => \{.*?\n  \}, \[selectedCitizenWard\]\);\n\n  useEffect\(\(\) => \{.*?\n  \}, \[loadCitizens, selectedCitizenWard\]\);\n',
    '\n',
    text,
    count=1,
    flags=re.S,
)
start = text.find('            <SectionHeader title="Category Breakdown" sub="Job posts by category" />')
end_marker = '\n        </>\n      </AppScrollView>'
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise RuntimeError('Jobs Category/Users section boundary not found')
text = text[:start] + text[end:]
text = text.replace('// JOBS_DASHBOARD_FINISH_V111', '// JOBS_CLEAN_PORTAL_ONLY_V112', 1)
path.write_text(text)

# Rebuild the Civic dashboard category and platform-management area.
path = ROOT / "mobile/app/super-admin/index.tsx"
text = path.read_text()
text = re.sub(
    r'\n\n  const recentComplaints = useMemo\(\(\) => \(.*?\n  \), \[complaints\]\);\n',
    '\n',
    text,
    count=1,
    flags=re.S,
)
section_start = text.find('        <View style={{ marginTop: 16 }}>\n          <SectionHeader title="Category Breakdown" sub="Complaints by type" />')
section_end = text.find('\n      </ScrollView>', section_start)
if section_start < 0 or section_end < 0:
    raise RuntimeError('Civic dashboard category/recent section boundary not found')
replacement = '''        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Category Breakdown" sub="All civic complaint categories" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
            {Object.entries(categoryConfig).map(([cat, cfg]) => {
              const count = Number(categoryAnalytics.find(([key]) => key === cat)?.[1] || 0);
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.78}
                  onPress={() => { setSelectedCategory(cat); openModal("category", `${cfg.label} Complaints`, `${count} complaint${count === 1 ? "" : "s"} in this category`); }}
                  style={{ width: "25%", padding: 4 }}
                >
                  <View style={{ minHeight: 94, borderRadius: 14, backgroundColor: "white", paddingHorizontal: 5, paddingVertical: 10, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 7, elevation: 2 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: cfg.color + "18", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                      <Feather name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{count}</Text>
                    <Text numberOfLines={2} style={{ marginTop: 2, fontSize: 8.7, lineHeight: 11, fontFamily: "Inter_500Medium", color: "#64748B", textAlign: "center" }}>{cfg.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Platform Management" sub="Users and internal officer collaboration" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity onPress={() => router.push("/super-admin/users" as any)} activeOpacity={0.8}
              style={{ flex: 1, minHeight: 118, borderRadius: 17, backgroundColor: "white", padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" }}>
                <Feather name="users" size={19} color="#2563EB" />
              </View>
              <Text style={{ marginTop: 11, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_700Bold" }}>App Users</Text>
              <Text style={{ marginTop: 3, color: "#64748B", fontSize: 10, lineHeight: 14, fontFamily: "Inter_400Regular" }}>Open the live DB directory with 10 profiles per page.</Text>
              <Feather name="arrow-up-right" size={16} color="#2563EB" style={{ position: "absolute", right: 13, top: 13 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/super-admin/community" as any)} activeOpacity={0.8}
              style={{ flex: 1, minHeight: 118, borderRadius: 17, backgroundColor: "white", padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
                <Feather name="message-circle" size={19} color="#15803D" />
              </View>
              <Text style={{ marginTop: 11, color: "#0F172A", fontSize: 13.5, fontFamily: "Inter_700Bold" }}>Nagarsevak Community</Text>
              <Text style={{ marginTop: 3, color: "#64748B", fontSize: 10, lineHeight: 14, fontFamily: "Inter_400Regular" }}>Moderate messages, notices, images and videos.</Text>
              <Feather name="shield" size={16} color="#15803D" style={{ position: "absolute", right: 13, top: 13 }} />
            </TouchableOpacity>
          </View>
        </View>'''
text = text[:section_start] + replacement + text[section_end:]
text = text.replace('// DASHBOARD_CLEANUP_V109', '// CIVIC_USERS_COMMUNITY_V112', 1)
path.write_text(text)

print('Civic dashboard, Jobs cleanup, App Users and Community navigation applied')
