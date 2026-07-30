from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]

ctxp = ROOT / 'mobile/context/JobsContext.tsx'
ctx = ctxp.read_text()
ctx = ctx.replace('''      if (jobsUser?.id) {
        try {
          const appParams = new URLSearchParams();
          appParams.set(jobsUser.role === "employer" ? "employerId" : "seekerId", jobsUser.id);
          const applicationResult = await apiGet<{ success: boolean; applications: any[] }>(`/api/job-portal/applications?${appParams.toString()}`);''','''      if (jobsUser?.id || isSuperAdmin) {
        try {
          const appParams = new URLSearchParams();
          if (jobsUser?.id) appParams.set(jobsUser.role === "employer" ? "employerId" : "seekerId", jobsUser.id);
          const query = appParams.toString();
          const applicationResult = await apiGet<{ success: boolean; applications: any[] }>(`/api/job-portal/applications${query ? `?${query}` : ""}`);''')
ctxp.write_text(ctx)

p = ROOT / 'mobile/app/super-admin/jobs.tsx'
t = p.read_text()
t = t.replace('  const { jobs, deleteJob, toggleJobActive, refreshJobs } = useJobs();','  const { jobs, applications, deleteJob, toggleJobActive, refreshJobs } = useJobs();')
t = t.replace('style={{ flex: 1, backgroundColor: "white", borderRadius: 14, padding: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: "center" }}','style={{ flex: 1, minHeight: 94, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 7, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: "center", justifyContent: "center" }}',1)
t = re.sub(r'    const totalApplications = jobs\.reduce\(.*?  \}, \[jobs\]\);', '''    const totalApplications = applications.length;
    const totalHired = applications.filter((application) => application.status === "hired").length;
    const totalEmployers = [...new Set(jobs.map((job) => job.employerId).filter(Boolean))].length;
    const totalSeekers = [...new Set(applications.map((application) => application.seekerId).filter(Boolean))].length;
    const placementRate = totalApplications > 0 ? Math.round((totalHired / totalApplications) * 100) : 0;
    return { activeJobs, expiredJobs, totalApplications, totalHired, totalEmployers, totalSeekers, placementRate };
  }, [jobs, applications]);''', t, count=1, flags=re.S)
t = re.sub(r'  const topHiredCategories = useMemo\(\(\) => \(.*?  \), \[jobs\]\);', '''  const topHiredCategories = useMemo(() => (
    Object.entries(jobs.reduce((acc: Record<string, number>, job) => {
      const hiredCount = applications.filter((application) => application.jobId === job.id && application.status === "hired").length;
      acc[job.category] = (acc[job.category] || 0) + hiredCount;
      return acc;
    }, {})).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 5)
  ), [jobs, applications]);''', t, count=1, flags=re.S)
t = t.replace('contentContainerStyle={{ padding: 16, paddingBottom: 32 }}','contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 36 }}')
t = t.replace('<View style={{ gap: 8 }}>','<View style={{ gap: 10, marginBottom: 14 }}>',1)
analytics='<View style={{ marginTop: 2 }}><SectionHeader title="Job Success Analytics" sub="Hiring outcomes and placement data" /></View>'
t=t.replace('<SectionHeader title="Job Success Analytics" sub="Hiring outcomes and placement data" />',analytics)
button='''            <TouchableOpacity onPress={() => openModal("totalJobs", "All Job Posts", `${jobs.length} total`)} activeOpacity={0.8}
              style={{ height: 44, borderRadius: 12, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <Feather name="briefcase" size={15} color="#059669" />
              <Text style={{ marginLeft: 8, fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#047857" }}>View All Jobs</Text>
              <Feather name="chevron-right" size={16} color="#059669" style={{ marginLeft: 4 }} />
            </TouchableOpacity>

'''
t=t.replace('            '+analytics,button+'            '+analytics,1)
t=t.replace('<SectionHeader title="Category Breakdown" sub="Job posts by category" />','<View style={{ marginTop: 2 }}><SectionHeader title="Category Breakdown" sub="Job posts by category" /></View>')
marker='{categoryBreakdown.length === 0'
pos=t.index(marker)
start=t.rfind('            <View',0,pos)
end=t.index('        </>',pos)
grid='''            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {Object.keys(JOB_CATEGORIES).map((cat) => {
                const count = Number(categoryBreakdown.find(([key]) => key === cat)?.[1] || 0);
                const cfg = CAT_COLORS[cat] || CAT_COLORS.other;
                return (
                  <TouchableOpacity key={cat} activeOpacity={0.8}
                    onPress={() => openModal("totalJobs", `${JOB_CATEGORIES[cat]} Jobs`, `${count} job posts`)}
                    style={{ width: "23%", minHeight: 92, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 5, paddingVertical: 10, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center", marginBottom: 7 }}>
                      <Feather name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{count}</Text>
                    <Text numberOfLines={2} style={{ fontSize: 9, lineHeight: 12, fontFamily: "Inter_500Medium", color: "#64748B", textAlign: "center", marginTop: 2 }}>{JOB_CATEGORIES[cat]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
'''
t=t[:start]+grid+t[end:]
t=t.replace('// JOBS_SINGLE_OVERVIEW_V110','// JOBS_SINGLE_OVERVIEW_V110\n// JOBS_DASHBOARD_POLISH_V113')
p.write_text(t)
print('done')
