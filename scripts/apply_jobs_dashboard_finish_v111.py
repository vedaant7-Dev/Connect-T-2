from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

# Fix Super Admin application analytics loading.
path = ROOT / "mobile/context/JobsContext.tsx"
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
      if (jobsUser?.id || isSuperAdmin) {
        try {
          const appParams = new URLSearchParams();
          if (jobsUser?.id) {
            appParams.set(jobsUser.role === "employer" ? "employerId" : "seekerId", jobsUser.id);
          }
          const appQuery = appParams.toString();
          const applicationResult = await apiGet<{ success: boolean; applications: any[] }>(
            `/api/job-portal/applications${appQuery ? `?${appQuery}` : ""}`,
          );
          nextApplications = (applicationResult.applications || []).map(normalizeApplication);
        } catch (applicationError) {
          setError(getUserErrorMessage(applicationError, "Jobs loaded, but application updates could not be refreshed."));
        }
      }
'''
if old not in text:
    raise RuntimeError("JobsContext applications block not found")
text = text.replace(old, new, 1)
path.write_text(text)

# Finish the Super Admin Jobs dashboard UI and analytics.
path = ROOT / "mobile/app/super-admin/jobs.tsx"
text = path.read_text()
text = text.replace(
    '  const { jobs, deleteJob, toggleJobActive, refreshJobs } = useJobs();',
    '  const { jobs, applications, loading, error, deleteJob, toggleJobActive, refreshJobs } = useJobs();',
    1,
)

stats_pattern = re.compile(r'''  const stats = useMemo\(\(\) => \{.*?\n  \}, \[jobs\]\);''', re.S)
stats_replacement = '''  const stats = useMemo(() => {
    const activeJobs = jobs.filter((j) => j.active);
    const expiredJobs = jobs.filter((j) => !j.active);
    const embeddedApplications = jobs.flatMap((job) => job.applications || []);
    const analyticsApplications = applications.length > 0 ? applications : embeddedApplications;
    const fallbackApplications = jobs.reduce((sum, job) => sum + Number(job.applicantsCount || job.applicants?.length || 0), 0);
    const totalApplications = analyticsApplications.length > 0 ? analyticsApplications.length : fallbackApplications;
    const totalHired = analyticsApplications.length > 0
      ? analyticsApplications.filter((application) => application.status === "hired").length
      : jobs.reduce((sum, job) => sum + (job.hired?.length || 0), 0);
    const totalEmployers = new Set(jobs.map((job) => job.employerId).filter(Boolean)).size;
    const totalSeekers = analyticsApplications.length > 0
      ? new Set(analyticsApplications.map((application) => application.seekerId).filter(Boolean)).size
      : new Set(jobs.flatMap((job) => job.applicants || [])).size;
    const placementRate = totalApplications > 0 ? Math.round((totalHired / totalApplications) * 100) : 0;
    return { activeJobs, expiredJobs, totalApplications, totalHired, totalEmployers, totalSeekers, placementRate };
  }, [applications, jobs]);'''
text, count = stats_pattern.subn(stats_replacement, text, count=1)
if count != 1:
    raise RuntimeError("Jobs dashboard stats block not found")

text = text.replace(
    'style={{ flex: 1, backgroundColor: "white", borderRadius: 14, padding: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: "center" }}',
    'style={{ flex: 1, minHeight: 94, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 8, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: "center", justifyContent: "center" }}',
    1,
)
text = text.replace(
    '<View style={{ marginBottom: 10, marginTop: 6 }}>',
    '<View style={{ marginBottom: 8, marginTop: 18 }}>',
    1,
)
text = text.replace(
    'contentContainerStyle={{ padding: 16, paddingBottom: 32 }}',
    'contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 0, paddingBottom: 36 }}',
    1,
)
text = text.replace(
    '<SectionHeader title="Job Portal Overview" sub="Tap any card to view full data" />\n            <View style={{ gap: 8 }}>',
    '<SectionHeader title="Job Portal Overview" sub="Tap any card to view full data" />\n            {loading ? (\n              <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 8, fontFamily: "Inter_400Regular" }}>Refreshing Job Portal data...</Text>\n            ) : null}\n            {error ? (\n              <Text style={{ fontSize: 11, color: "#DC2626", marginBottom: 8, fontFamily: "Inter_400Regular" }}>{error}</Text>\n            ) : null}\n            <View style={{ gap: 8, marginBottom: 10 }}>',
    1,
)

overview_end = '''              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatCard icon="user" label="Job Seekers" value={stats.totalSeekers} color="#7C3AED" bg="#EDE9FE" onPress={() => openModal("seekers", "Job Seekers", `${stats.totalSeekers} unique applicants`)} />
                <StatCard icon="send" label="Applications" value={stats.totalApplications} color="#0EA5E9" bg="#E0F2FE" onPress={() => openModal("applications", "Applications", `${stats.totalApplications} total applications`)} />
                <StatCard icon="award" label="People Hired" value={stats.totalHired} color="#059669" bg="#D1FAE5" onPress={() => openModal("hired", "People Hired", `${stats.totalHired} successfully hired`)} />
                <StatCard icon="percent" label="Placement Rate" value={`${stats.placementRate}%`} color="#D97706" bg="#FEF3C7" onPress={() => openModal("placement", "Placement Rate", "Job placement analytics")} />
              </View>
            </View>
'''
overview_new = overview_end + '''            <TouchableOpacity
              onPress={() => openModal("totalJobs", "All Job Posts", `${jobs.length} total`)}
              activeOpacity={0.8}
              style={{ height: 44, borderRadius: 12, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 2 }}
            >
              <Feather name="list" size={16} color="#15803D" />
              <Text style={{ marginLeft: 7, fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#15803D" }}>View All Jobs</Text>
              <Feather name="chevron-right" size={16} color="#15803D" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
'''
if overview_end not in text:
    raise RuntimeError("Overview grid end not found")
text = text.replace(overview_end, overview_new, 1)

text = text.replace(
    '<View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>',
    '<View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>',
    1,
)

category_pattern = re.compile(r'''            <SectionHeader title="Category Breakdown" sub="Job posts by category" />\n            <View style=\{\{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0\.06, shadowRadius: 8, elevation: 2 \}\}>.*?\n            </View>\n''', re.S)
category_replacement = '''            <SectionHeader title="Category Breakdown" sub="Job posts by category" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
              {Object.keys(JOB_CATEGORIES).map((cat) => {
                const count = Number(categoryBreakdown.find(([key]) => key === cat)?.[1] || 0);
                const cfg = CAT_COLORS[cat] || CAT_COLORS.other;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => openModal("totalJobs", JOB_CATEGORIES[cat] || cat, `${count} job post${count === 1 ? "" : "s"}`)}
                    activeOpacity={0.8}
                    style={{ width: "23.5%", minHeight: 90, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 6, paddingVertical: 10, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                      <Feather name={cfg.icon as any} size={15} color={cfg.color} />
                    </View>
                    <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{count}</Text>
                    <Text numberOfLines={2} style={{ marginTop: 2, fontSize: 8.5, lineHeight: 11, textAlign: "center", fontFamily: "Inter_500Medium", color: "#64748B" }}>
                      {JOB_CATEGORIES[cat] || cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
'''
text, count = category_pattern.subn(category_replacement, text, count=1)
if count != 1:
    raise RuntimeError("Category Breakdown block not found")

text = text.replace('// JOBS_SINGLE_OVERVIEW_V110', '// JOBS_DASHBOARD_FINISH_V111', 1)
path.write_text(text)

print("Jobs dashboard spacing, analytics and category grid updated")
