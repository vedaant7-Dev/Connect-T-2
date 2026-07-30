from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

# 1) Super admin must load all applications so overview counts are accurate.
path = ROOT / 'mobile/context/JobsContext.tsx'
text = path.read_text()
old = '''      let nextApplications: JobApplication[] = [];
      if (jobsUser?.id) {
        try {
          const appParams = new URLSearchParams();
          appParams.set(jobsUser.role === "employer" ? "employerId" : "seekerId", jobsUser.id);
          const applicationResult = await apiGet<{ success: boolean; applications: any[] }>(`/api/job-portal/applications?${appParams.toString()}`);
          nextApplications = (applicationResult.applications || []).map(normalizeApplication);
        } catch (applicationError) {
          setError(getUserErrorMessage(applicationError, "Jobs loaded, but application updates could not be refreshed."));
        }
      }
'''
new = '''      let nextApplications: JobApplication[] = [];
      if (isSuperAdmin || jobsUser?.id) {
        try {
          const appParams = new URLSearchParams();
          if (!isSuperAdmin && jobsUser?.id) {
            appParams.set(jobsUser.role === "employer" ? "employerId" : "seekerId", jobsUser.id);
          }
          const query = appParams.toString();
          const applicationResult = await apiGet<{ success: boolean; applications: any[] }>(`/api/job-portal/applications${query ? `?${query}` : ""}`);
          nextApplications = (applicationResult.applications || []).map(normalizeApplication);
        } catch (applicationError) {
          setError(getUserErrorMessage(applicationError, "Jobs loaded, but application updates could not be refreshed."));
        }
      }
'''
if old not in text:
    raise RuntimeError('JobsContext applications block not found')
text = text.replace(old, new, 1)
path.write_text(text)

# 2) Add paginated Super Admin citizens API and runtime DB schema audit.
path = ROOT / 'backend/server.js'
text = path.read_text()
anchor = 'app.get("/api/job-portal/applications", async (req, res) => {'
if anchor not in text:
    raise RuntimeError('applications route anchor not found')
route = r'''// Super Admin citizen directory: database-backed, ward filter, 10-per-page pagination.
app.get("/api/admin/citizens", requireSuperAdmin, async (req, res) => {
  try {
    await ensureUserProfileSchema();
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || "10"), 10) || 10));
    const offset = (page - 1) * limit;
    const ward = String(req.query.ward || "").trim();
    const where = ["role = 'citizen'"];
    const params = [];
    if (ward && ward.toLowerCase() !== "all") {
      where.push("(LOWER(TRIM(COALESCE(ward, ''))) = LOWER(?) OR LOWER(TRIM(COALESCE(ward_code, ''))) = LOWER(?) OR CAST(COALESCE(ward_number, 0) AS CHAR) = ?)");
      params.push(ward, ward, ward.replace(/\D/g, ""));
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;
    const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params);
    const [citizens] = await db.query(
      `SELECT id, name, mobile, email, ward, ward_code, ward_number, address, dob, age, profile_photo, created_at, last_login_at
       FROM users ${whereSql}
       ORDER BY COALESCE(ward_number, 9999), ward, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [wardRows] = await db.query(
      `SELECT ward, ward_code, ward_number, COUNT(*) AS citizen_count
       FROM users WHERE role = 'citizen'
       GROUP BY ward, ward_code, ward_number
       ORDER BY COALESCE(ward_number, 9999), ward`,
    );
    const total = Number(countRow?.total || 0);
    res.json({
      success: true,
      citizens,
      wards: wardRows.map((row) => ({
        ward: row.ward || row.ward_code || (row.ward_number ? `Ward ${row.ward_number}` : "Unassigned"),
        wardCode: row.ward_code || null,
        wardNumber: row.ward_number || null,
        count: Number(row.citizen_count || 0),
      })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error("[Connect-T] Citizen directory failed:", error);
    res.status(500).json({ success: false, error: "Citizen directory could not be loaded." });
  }
});

app.get("/api/admin/schema-health", requireSuperAdmin, async (_req, res) => {
  try {
    const requiredTables = [
      "users", "complaints", "job_portal_users", "job_portal_jobs", "job_applications",
      "broadcasts", "notifications", "notification_devices", "role_assignments", "role_audit_logs"
    ];
    const [rows] = await db.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()",
    );
    const existing = new Set(rows.map((row) => String(row.TABLE_NAME)));
    const missing = requiredTables.filter((table) => !existing.has(table));
    res.json({ success: true, requiredTables, missingTables: missing, healthy: missing.length === 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: "Database schema could not be checked." });
  }
});

'''
text = text.replace(anchor, route + anchor, 1)
path.write_text(text)

# 3) Jobs dashboard layout, functional metrics, 4-column category boxes, citizen directory.
path = ROOT / 'mobile/app/super-admin/jobs.tsx'
text = path.read_text()
text = text.replace('import React, { useState, useMemo, useCallback, memo } from "react";', 'import React, { useState, useMemo, useCallback, useEffect, memo } from "react";')
text = text.replace('import { useRouter } from "expo-router";', 'import { useRouter } from "expo-router";\nimport { apiGet } from "@/lib/api";')

state_anchor = '  const [selectedJob, setSelectedJob] = useState<Job | null>(null);\n'
state_block = '''  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [citizens, setCitizens] = useState<any[]>([]);
  const [citizenWards, setCitizenWards] = useState<any[]>([]);
  const [citizenPage, setCitizenPage] = useState(1);
  const [citizenPages, setCitizenPages] = useState(1);
  const [citizenTotal, setCitizenTotal] = useState(0);
  const [selectedCitizenWard, setSelectedCitizenWard] = useState("all");
  const [citizensLoading, setCitizensLoading] = useState(false);
'''
if state_anchor not in text:
    raise RuntimeError('Jobs state anchor not found')
text = text.replace(state_anchor, state_block, 1)

insert_anchor = '  const closeModal = useCallback(() => { setModal(null); setSelectedJob(null); }, []);\n'
insert_block = '''  const closeModal = useCallback(() => { setModal(null); setSelectedJob(null); }, []);

  const loadCitizens = useCallback(async (page = 1, ward = selectedCitizenWard) => {
    setCitizensLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (ward && ward !== "all") params.set("ward", ward);
      const result = await apiGet<any>(`/api/admin/citizens?${params.toString()}`);
      setCitizens(result.citizens || []);
      setCitizenWards(result.wards || []);
      setCitizenPage(result.pagination?.page || page);
      setCitizenPages(result.pagination?.totalPages || 1);
      setCitizenTotal(result.pagination?.total || 0);
    } finally {
      setCitizensLoading(false);
    }
  }, [selectedCitizenWard]);

  useEffect(() => {
    void loadCitizens(1, selectedCitizenWard).catch(() => undefined);
  }, [loadCitizens, selectedCitizenWard]);
'''
if insert_anchor not in text:
    raise RuntimeError('Jobs closeModal anchor not found')
text = text.replace(insert_anchor, insert_block, 1)

text = text.replace('contentContainerStyle={{ padding: 16, paddingBottom: 32 }}', 'contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 36 }}')
text = text.replace('<View style={{ gap: 8 }}>', '<View style={{ gap: 10, marginBottom: 18 }}>', 1)
text = text.replace('<View style={{ flexDirection: "row", gap: 8 }}>', '<View style={{ flexDirection: "row", gap: 8, alignItems: "stretch" }}>', 2)

# Add explicit refresh option below overview cards.
overview_end = '''              </View>
            </View>


            <SectionHeader title="Job Success Analytics"'''
overview_new = '''              </View>
            </View>
            <TouchableOpacity onPress={() => void refreshJobs()} activeOpacity={0.8}
              style={{ height: 44, borderRadius: 12, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#BBF7D0", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 18 }}>
              <Feather name="refresh-cw" size={15} color="#16A34A" />
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#15803D" }}>Refresh Job Portal Data</Text>
            </TouchableOpacity>

            <SectionHeader title="Job Success Analytics"'''
if overview_end not in text:
    raise RuntimeError('Overview end anchor not found')
text = text.replace(overview_end, overview_new, 1)

# Replace category progress list with compact 4-column boxes and citizen directory.
pattern = re.compile(r'''            <SectionHeader title="Category Breakdown" sub="Job posts by category" />\n            <View style=\{\{ backgroundColor: "white".*?\n            </View>\n        </>''', re.S)
replacement = '''            <SectionHeader title="Category Breakdown" sub="Job posts by category" />
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 12, marginBottom: 18, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {categoryBreakdown.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 16, fontFamily: "Inter_400Regular", fontSize: 13 }}>No jobs posted yet</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
                  {categoryBreakdown.map(([cat, count]) => {
                    const cfg = CAT_COLORS[cat] || CAT_COLORS.other;
                    return (
                      <TouchableOpacity key={cat} onPress={() => openModal("totalJobs", JOB_CATEGORIES[cat] || cat, `${count} job posts`)} activeOpacity={0.8}
                        style={{ width: "25%", padding: 4 }}>
                        <View style={{ minHeight: 92, borderRadius: 12, backgroundColor: cfg.bg, padding: 9, alignItems: "center", justifyContent: "center" }}>
                          <Feather name={cfg.icon as any} size={17} color={cfg.color} />
                          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: cfg.color, marginTop: 5 }}>{count}</Text>
                          <Text numberOfLines={2} style={{ fontSize: 9, lineHeight: 12, fontFamily: "Inter_500Medium", color: cfg.color, textAlign: "center", marginTop: 2 }}>{JOB_CATEGORIES[cat] || cat}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <SectionHeader title="All Citizens" sub={`${citizenTotal} registered citizens · Ward-wise database directory`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
              {[{ ward: "all", count: citizenWards.reduce((sum, item) => sum + Number(item.count || 0), 0) }, ...citizenWards].map((item: any) => {
                const value = item.ward || "Unassigned";
                const active = selectedCitizenWard === value;
                return (
                  <TouchableOpacity key={`${value}-${item.wardCode || ""}`} onPress={() => { setSelectedCitizenWard(value); setCitizenPage(1); }}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: active ? "#16A34A" : "white", borderWidth: 1, borderColor: active ? "#16A34A" : "#E2E8F0" }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: active ? "white" : "#475569" }}>{value === "all" ? "All Wards" : value} ({item.count || 0})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {citizensLoading ? (
                <Text style={{ paddingVertical: 24, textAlign: "center", color: "#64748B", fontFamily: "Inter_500Medium" }}>Loading citizens...</Text>
              ) : citizens.length === 0 ? (
                <Text style={{ paddingVertical: 24, textAlign: "center", color: "#94A3B8", fontFamily: "Inter_500Medium" }}>No citizens found for this ward.</Text>
              ) : citizens.map((citizen, index) => (
                <View key={citizen.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: index < citizens.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#15803D" }}>{String(citizen.name || "C").charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>{citizen.name || "Citizen"}</Text>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#64748B" }}>{citizen.mobile || "No mobile"} · {citizen.ward || citizen.ward_code || (citizen.ward_number ? `Ward ${citizen.ward_number}` : "Unassigned")}</Text>
                    {citizen.address ? <Text numberOfLines={1} style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{citizen.address}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: "#94A3B8" }}>#{(citizenPage - 1) * 10 + index + 1}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                <TouchableOpacity disabled={citizenPage <= 1 || citizensLoading} onPress={() => void loadCitizens(citizenPage - 1)}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: citizenPage <= 1 ? "#F1F5F9" : "#DCFCE7" }}>
                  <Text style={{ color: citizenPage <= 1 ? "#94A3B8" : "#15803D", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Previous</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 11, color: "#64748B", fontFamily: "Inter_500Medium" }}>Page {citizenPage} of {citizenPages}</Text>
                <TouchableOpacity disabled={citizenPage >= citizenPages || citizensLoading} onPress={() => void loadCitizens(citizenPage + 1)}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: citizenPage >= citizenPages ? "#F1F5F9" : "#DCFCE7" }}>
                  <Text style={{ color: citizenPage >= citizenPages ? "#94A3B8" : "#15803D", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
        </>'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise RuntimeError('Category section replacement failed')

text = text.replace('// JOBS_SINGLE_OVERVIEW_V110', '// JOBS_DASHBOARD_V111')
path.write_text(text)
print('Jobs dashboard v111 patch applied')
