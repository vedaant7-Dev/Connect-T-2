from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

# Fix Super Admin application loading in JobsContext.
path = ROOT / "mobile/context/JobsContext.tsx"
text = path.read_text()
text = text.replace(
    "      if (jobsUser?.id) {\n        try {\n          const appParams = new URLSearchParams();\n          appParams.set(jobsUser.role === \"employer\" ? \"employerId\" : \"seekerId\", jobsUser.id);\n          const applicationResult = await apiGet<{ success: boolean; applications: any[] }>(`/api/job-portal/applications?${appParams.toString()}`);",
    "      if (jobsUser?.id || isSuperAdmin) {\n        try {\n          const appParams = new URLSearchParams();\n          if (jobsUser?.id) appParams.set(jobsUser.role === \"employer\" ? \"employerId\" : \"seekerId\", jobsUser.id);\n          const query = appParams.toString();\n          const applicationResult = await apiGet<{ success: boolean; applications: any[] }>(`/api/job-portal/applications${query ? `?${query}` : \"\"}`);",
)
path.write_text(text)

# Polish Super Admin Jobs dashboard and use application records as source of truth.
path = ROOT / "mobile/app/super-admin/jobs.tsx"
text = path.read_text()
text = text.replace(
    "  const { jobs, deleteJob, toggleJobActive, refreshJobs } = useJobs();",
    "  const { jobs, applications, deleteJob, toggleJobActive, refreshJobs } = useJobs();",
)
text = text.replace(
    "      style={{ flex: 1, backgroundColor: \"white\", borderRadius: 14, padding: 10, shadowColor: \"#000\", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: \"center\" }}",
    "      style={{ flex: 1, minHeight: 94, backgroundColor: \"white\", borderRadius: 14, paddingHorizontal: 7, paddingVertical: 10, shadowColor: \"#000\", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: \"center\", justifyContent: \"center\" }}",
    1,
)
old_stats = '''    const totalApplications = jobs.reduce((s, j) => s + (j.applicants?.length || 0), 0);
    const totalHired = jobs.reduce((s, j) => s + (j.hired?.length || 0), 0);
    const totalEmployers = [...new Set(jobs.map((j) => j.employerId))].length;
    const totalSeekers = [...new Set(jobs.flatMap((j) => j.applicants || []))].length;
    const placementRate = totalApplications > 0 ? Math.round((totalHired / totalApplications) * 100) : 0;
    return { activeJobs, expiredJobs, totalApplications, totalHired, totalEmployers, totalSeekers, placementRate };
  }, [jobs]);'''
new_stats = '''    const totalApplications = applications.length;
    const totalHired = applications.filter((application) => application.status === "hired").length;
    const totalEmployers = [...new Set(jobs.map((job) => job.employerId).filter(Boolean))].length;
    const totalSeekers = [...new Set(applications.map((application) => application.seekerId).filter(Boolean))].length;
    const placementRate = totalApplications > 0 ? Math.round((totalHired / totalApplications) * 100) : 0;
    return { activeJobs, expiredJobs, totalApplications, totalHired, totalEmployers, totalSeekers, placementRate };
  }, [jobs, applications]);'''
if old_stats not in text:
    raise RuntimeError("Stats block not found")
text = text.replace(old_stats, new_stats)
text = text.replace(
    "  const topHiredCategories = useMemo(() => (\n    Object.entries(jobs.reduce((acc: Record<string, number>, j) => { acc[j.category] = (acc[j.category] || 0) + (j.hired?.length || 0); return acc; }, {}))",
    "  const topHiredCategories = useMemo(() => (\n    Object.entries(jobs.reduce((acc: Record<string, number>, job) => { const hiredCount = applications.filter((application) => application.jobId === job.id && application.status === \"hired\").length; acc[job.category] = (acc[job.category] || 0) + hiredCount; return acc; }, {}))",
)
text = text.replace("  ), [jobs]);\n\n  const getModalJobs", "  ), [jobs, applications]);\n\n  const getModalJobs", 1)
text = text.replace(
    '      <AppScrollView onAppRefresh={refreshJobs} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>',
    '      <AppScrollView onAppRefresh={refreshJobs} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>',
)
text = text.replace(
    '<SectionHeader title="Job Portal Overview" sub="Tap any card to view full data" />\n            <View style={{ gap: 8 }}>',
    '<SectionHeader title="Job Portal Overview" sub="Tap any card to view full data" />\n            <View style={{ gap: 10, marginBottom: 16 }}>',
)
# Insert View All Jobs action after overview grid.
needle = '''              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatCard icon="user" label="Job Seekers" value={stats.totalSeekers} color="#7C3AED" bg="#EDE9FE" onPress={() => openModal("seekers", "Job Seekers", `${stats.totalSeekers} unique applicants`)} />
                <StatCard icon="send" label="Applications" value={stats.totalApplications} color="#0EA5E9" bg="#E0F2FE" onPress={() => openModal("applications", "Applications", `${stats.totalApplications} total applications`)} />
                <StatCard icon="award" label="People Hired" value={stats.totalHired} color="#059669" bg="#D1FAE5" onPress={() => openModal("hired", "People Hired", `${stats.totalHired} successfully hired`)} />
                <StatCard icon="percent" label="Placement Rate" value={`${stats.placementRate}%`} color="#D97706" bg="#FEF3C7" onPress={() => openModal("placement", "Placement Rate", "Job placement analytics")} />
              </View>
            </View>'''
replacement = needle + '''
            <TouchableOpacity onPress={() => openModal("totalJobs", "All Job Posts", `${jobs.length} total`)} activeOpacity={0.8}
              style={{ height: 44, borderRadius: 12, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Feather name="briefcase" size={15} color="#059669" />
              <Text style={{ marginLeft: 8, fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#047857" }}>View All Jobs</Text>
              <Feather name="chevron-right" size={16} color="#059669" style={{ marginLeft: 4 }} />
            </TouchableOpacity>'''
if needle not in text:
    raise RuntimeError("Overview grid boundary not found")
text = text.replace(needle, replacement)
text = text.replace(
    '<SectionHeader title="Job Success Analytics" sub="Hiring outcomes and placement data" />',
    '<View style={{ marginTop: 2 }}><SectionHeader title="Job Success Analytics" sub="Hiring outcomes and placement data" /></View>',
)
text = text.replace(
    '<SectionHeader title="Category Breakdown" sub="Job posts by category" />',
    '<View style={{ marginTop: 2 }}><SectionHeader title="Category Breakdown" sub="Job posts by category" /></View>',
)
# Replace list/progress category breakdown with four-column boxes.
pattern = re.compile(r'''            <View style=\{\{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0\.06, shadowRadius: 8, elevation: 2 \}\}>\n              \{categoryBreakdown\.length === 0 \? \(.*?\n            </View>\n        </>''', re.S)
match = pattern.search(text)
if not match:
    raise RuntimeError("Category breakdown block not found")
new_category = '''            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {Object.keys(JOB_CATEGORIES).map((cat) => {
                const count = Number(categoryBreakdown.find(([key]) => key === cat)?.[1] || 0);
                const cfg = CAT_COLORS[cat] || CAT_COLORS.other;
                return (
                  <TouchableOpacity key={cat} activeOpacity={0.8}
                    onPress={() => openModal("totalJobs", `${JOB_CATEGORIES[cat]} Jobs`, `${count} job posts`)}
                    style={{ width: "23%", minHeight: 92, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 6, paddingVertical: 10, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center", marginBottom: 7 }}>
                      <Feather name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{count}</Text>
                    <Text numberOfLines={2} style={{ fontSize: 9, lineHeight: 12, fontFamily: "Inter_500Medium", color: "#64748B", textAlign: "center", marginTop: 2 }}>{JOB_CATEGORIES[cat]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
        </>'''
text = text[:match.start()] + new_category + text[match.end():]
text = text.replace('// JOBS_SINGLE_OVERVIEW_V110', '// JOBS_SINGLE_OVERVIEW_V110\n// JOBS_DASHBOARD_POLISH_V111')
path.write_text(text)
print("Jobs dashboard polish applied")
