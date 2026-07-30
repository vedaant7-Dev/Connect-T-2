from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

# 1. Remove Category Breakdown and All Citizens from Jobs tab.
path = ROOT / "mobile/app/super-admin/jobs.tsx"
text = path.read_text()
text = re.sub(r'\n\s*<SectionHeader title="Category Breakdown".*?\n\s*</>\n\s*</AppScrollView>', '\n        </>\n      </AppScrollView>', text, count=1, flags=re.S)
text = re.sub(r'\n\s*const \[citizens,.*?const \[citizensLoading, setCitizensLoading\] = useState\(false\);\n', '\n', text, count=1, flags=re.S)
text = re.sub(r'\n\s*const loadCitizens = useCallback\(.*?\n\s*useEffect\(\(\) => \{\n\s*void loadCitizens\(1, selectedCitizenWard\).*?\n\s*\}, \[loadCitizens, selectedCitizenWard\]\);\n', '\n', text, count=1, flags=re.S)
text = text.replace('import { apiGet } from "@/lib/api";\n', '')
text = text.replace('// JOBS_DASHBOARD_FINISH_V111', '// ADMIN_USERS_COMMUNITY_V112', 1)
path.write_text(text)

# 2. Upgrade Super Admin civic dashboard.
path = ROOT / "mobile/app/super-admin/index.tsx"
text = path.read_text()
old_config = re.search(r'const categoryConfig: Record<string, \{ icon: string; color: string; label: string \}> = \{.*?\n\};', text, re.S)
if not old_config:
    raise RuntimeError("Civic category config not found")
new_config = '''const categoryConfig: Record<string, { icon: string; color: string; label: string }> = {
  roads: { icon: "truck", color: "#92400E", label: "Roads" },
  water: { icon: "droplet", color: "#0369A1", label: "Water" },
  electricity: { icon: "zap", color: "#D97706", label: "Electricity" },
  garbage: { icon: "trash-2", color: "#059669", label: "Garbage" },
  drainage: { icon: "git-merge", color: "#0EA5E9", label: "Drainage" },
  streetlight: { icon: "sun", color: "#7C3AED", label: "Streetlight" },
  encroachment: { icon: "alert-triangle", color: "#DC2626", label: "Encroachment" },
  sanitation: { icon: "shield", color: "#0F766E", label: "Sanitation" },
  sewage: { icon: "activity", color: "#0369A1", label: "Sewage" },
  public_health: { icon: "heart", color: "#DC2626", label: "Public Health" },
  parks: { icon: "sunrise", color: "#16A34A", label: "Parks" },
  stray_animals: { icon: "github", color: "#7C3AED", label: "Stray Animals" },
  traffic: { icon: "navigation", color: "#EA580C", label: "Traffic" },
  building: { icon: "home", color: "#475569", label: "Building" },
  certificates: { icon: "file-text", color: "#2563EB", label: "Certificates" },
  other: { icon: "more-horizontal", color: "#64748B", label: "Other" },
};'''
text = text[:old_config.start()] + new_config + text[old_config.end():]
text = re.sub(r'\n\s*const recentComplaints = useMemo\(.*?\n\s*\), \[complaints\]\);\n', '\n', text, count=1, flags=re.S)
category_pattern = re.compile(r'''\n\s*<View style=\{\{ marginTop: 16 \}\}>\n\s*<SectionHeader title="Category Breakdown".*?\n\s*</View>\n\n\s*<View style=\{\{ marginTop: 16 \}\}>\n\s*<SectionHeader title="Recent Complaints".*?\n\s*</View>''', re.S)
replacement = '''
        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Civic Category Breakdown" sub="All civic complaint categories" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
            {Object.keys(categoryConfig).map((cat) => {
              const cfg = categoryConfig[cat];
              const count = Number(categoryAnalytics.find(([key]) => key === cat)?.[1] || 0);
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.78}
                  onPress={() => { setSelectedCategory(cat); openModal("category", `${cfg.label} Complaints`, `${count} complaints in this category`); }}
                  style={{ width: "25%", padding: 4 }}
                >
                  <View style={{ minHeight: 94, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center", paddingHorizontal: 5, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: cfg.color + "18", alignItems: "center", justifyContent: "center", marginBottom: 5 }}>
                      <Feather name={cfg.icon as any} size={15} color={cfg.color} />
                    </View>
                    <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{count}</Text>
                    <Text numberOfLines={2} style={{ fontSize: 8.5, lineHeight: 11, fontFamily: "Inter_500Medium", color: "#64748B", textAlign: "center", marginTop: 2 }}>{cfg.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Administration" sub="Users and officer coordination" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity onPress={() => router.push("/super-admin/users" as any)} activeOpacity={0.82} style={{ flex: 1, minHeight: 110, borderRadius: 16, backgroundColor: "white", padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" }}><Feather name="users" size={19} color="#2563EB" /></View>
              <Text style={{ marginTop: 10, fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" }}>App Users</Text>
              <Text style={{ marginTop: 3, fontSize: 10, lineHeight: 14, fontFamily: "Inter_400Regular", color: "#64748B" }}>View database users with pagination</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/community" as any)} activeOpacity={0.82} style={{ flex: 1, minHeight: 110, borderRadius: 16, backgroundColor: "white", padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}><Feather name="message-circle" size={19} color="#16A34A" /></View>
              <Text style={{ marginTop: 10, fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" }}>Officer Community</Text>
              <Text style={{ marginTop: 3, fontSize: 10, lineHeight: 14, fontFamily: "Inter_400Regular", color: "#64748B" }}>Administer Nagarsevak communication</Text>
            </TouchableOpacity>
          </View>
        </View>'''
text, count = category_pattern.subn(replacement, text, count=1)
if count != 1:
    raise RuntimeError("Dashboard category/recent sections not found")
text = text.replace('// DASHBOARD_CLEANUP_V109', '// ADMIN_USERS_COMMUNITY_V112', 1)
path.write_text(text)

# 3. Add Nagarsevak community entry on Home.
path = ROOT / "mobile/app/(tabs)/admin.tsx"
text = path.read_text()
anchor = '  const saveUtilityStatus = async () => {'
# UI insertion occurs before first UtilityStatusManager render.
community_card = '''
      <TouchableOpacity onPress={() => router.push("/community" as any)} activeOpacity={0.84} style={{ marginHorizontal: 14, marginTop: 14, marginBottom: 4, minHeight: 76, borderRadius: 17, backgroundColor: "white", padding: 14, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}><Feather name="message-circle" size={22} color={GREEN} /></View>
        <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: "#0F172A", fontFamily: "Inter_700Bold", fontSize: 14 }}>Nagarsevak Community</Text><Text style={{ marginTop: 3, color: "#64748B", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 14 }}>Messages, notices, information, images and videos for all officers</Text></View>
        <Feather name="chevron-right" size={20} color={GREEN} />
      </TouchableOpacity>
'''
inserted = False
for candidate in ['      <UtilityStatusManager', '      <AppScrollView']:
    pos = text.find(candidate)
    if pos >= 0:
        text = text[:pos] + community_card + text[pos:]
        inserted = True
        break
if not inserted:
    raise RuntimeError("Nagarsevak home insertion point not found")
path.write_text(text)

# 4. Install backend community routes before safe error handler / server start.
path = ROOT / "backend/server.js"
text = path.read_text()
install_line = '''\n// ADMIN_USERS_COMMUNITY_V112\nrequire("./nagarsevakCommunity")({ app, db, verifyToken, currentCivicUser, createId, uploadDir: UPLOAD_DIR });\n\n'''
if 'ADMIN_USERS_COMMUNITY_V112' not in text:
    marker = 'installSafeErrorHandler(app);'
    if marker in text:
        text = text.replace(marker, install_line + marker, 1)
    else:
        marker = 'const PORT ='
        if marker not in text:
            raise RuntimeError("Backend route installation marker not found")
        text = text.replace(marker, install_line + marker, 1)
path.write_text(text)

print("Admin users, civic category grid and Nagarsevak community applied")
