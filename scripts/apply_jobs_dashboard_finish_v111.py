from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

# JobsContext already loads every application for Super Admin in the latest source.
context_path = ROOT / "mobile/context/JobsContext.tsx"
context = context_path.read_text()
if "if (isSuperAdmin || jobsUser?.id)" not in context and "if (jobsUser?.id || isSuperAdmin)" not in context:
    raise RuntimeError("Super Admin application loading is missing from JobsContext")

path = ROOT / "mobile/app/super-admin/jobs.tsx"
text = path.read_text()

text = text.replace(
    '  const { jobs, deleteJob, toggleJobActive, refreshJobs } = useJobs();',
    '  const { jobs, applications, loading, error, deleteJob, toggleJobActive, refreshJobs } = useJobs();',
    1,
)

text = text.replace(
    'type CardType = "totalJobs" | "activeJobs" | "expiredJobs" | "employers" | "seekers" | "applications" | "hired" | "placement";',
    'type CardType = "totalJobs" | "activeJobs" | "expiredJobs" | "employers" | "seekers" | "applications" | "hired" | "placement" | "category";',
    1,
)

text = text.replace(
    '  const [selectedJob, setSelectedJob] = useState<Job | null>(null);\n',
    '  const [selectedJob, setSelectedJob] = useState<Job | null>(null);\n  const [selectedJobCategory, setSelectedJobCategory] = useState<string | null>(null);\n',
    1,
)

stats_pattern = re.compile(r'''  const stats = useMemo\(\(\) => \{.*?\n  \}, \[jobs\]\);''', re.S)
stats_replacement = '''  const stats = useMemo(() => {
    const activeJobs = jobs.filter((job) => job.active);
    const expiredJobs = jobs.filter((job) => !job.active);
    const embeddedApplications = jobs.flatMap((job) => job.applications || []);
    const analyticsApplications = applications.length > 0 ? applications : embeddedApplications;
    const fallbackApplications = jobs.reduce(
      (sum, job) => sum + Number(job.applicantsCount || job.applicants?.length || 0),
      0,
    );
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
    'style={{ flex: 1, minHeight: 96, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 7, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: "center", justifyContent: "center" }}',
    1,
)
text = text.replace(
    '<View style={{ marginBottom: 10, marginTop: 6 }}>',
    '<View style={{ marginBottom: 8, marginTop: 18 }}>',
    1,
)
text = text.replace(
    'contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 36 }}',
    'contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 0, paddingBottom: 36 }}',
    1,
)

text = text.replace(
    '<SectionHeader title="Job Portal Overview" sub="Tap any card to view full data" />\n            <View style={{ gap: 10, marginBottom: 18 }}>',
    '<SectionHeader title="Job Portal Overview" sub="Tap any card to view full data" />\n            {loading ? <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 8, fontFamily: "Inter_400Regular" }}>Refreshing Job Portal data...</Text> : null}\n            {error ? <Text style={{ fontSize: 11, color: "#DC2626", marginBottom: 8, fontFamily: "Inter_400Regular" }}>{error}</Text> : null}\n            <View style={{ gap: 8, marginBottom: 12 }}>',
    1,
)

text = text.replace(
    '  const closeModal = useCallback(() => { setModal(null); setSelectedJob(null); }, []);',
    '  const closeModal = useCallback(() => { setModal(null); setSelectedJob(null); setSelectedJobCategory(null); }, []);',
    1,
)

text = text.replace(
    '      case "hired": return [...jobs].filter((j) => j.hired?.length > 0).sort((a, b) => (b.hired?.length || 0) - (a.hired?.length || 0));\n      default: return [];',
    '      case "hired": return [...jobs].filter((j) => j.hired?.length > 0).sort((a, b) => (b.hired?.length || 0) - (a.hired?.length || 0));\n      case "category": return selectedJobCategory ? jobs.filter((job) => job.category === selectedJobCategory) : [];\n      default: return [];',
    1,
)
text = text.replace('  }, [jobs]);\n\n  const openModal', '  }, [jobs, selectedJobCategory]);\n\n  const openModal', 1)

text = text.replace(
    '<View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>',
    '<View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>',
    1,
)

category_pattern = re.compile(r'''            <SectionHeader title="Category Breakdown" sub="Job posts by category" />\n            <View style=\{\{ backgroundColor: "white", borderRadius: 16, padding: 12, marginBottom: 18, shadowColor: "#000", shadowOpacity: 0\.06, shadowRadius: 8, elevation: 2 \}\}>.*?\n            </View>\n\n            <SectionHeader title="All Citizens"''', re.S)
category_replacement = '''            <SectionHeader title="Category Breakdown" sub="Job posts by category" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginBottom: 2 }}>
              {Object.keys(JOB_CATEGORIES).map((cat) => {
                const count = Number(categoryBreakdown.find(([key]) => key === cat)?.[1] || 0);
                const cfg = CAT_COLORS[cat] || CAT_COLORS.other;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      setSelectedJobCategory(cat);
                      openModal("category", JOB_CATEGORIES[cat] || cat, `${count} job post${count === 1 ? "" : "s"}`);
                    }}
                    activeOpacity={0.8}
                    style={{ width: "25%", padding: 4 }}
                  >
                    <View style={{ minHeight: 94, borderRadius: 12, backgroundColor: "white", paddingHorizontal: 5, paddingVertical: 9, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center", marginBottom: 5 }}>
                        <Feather name={cfg.icon as any} size={15} color={cfg.color} />
                      </View>
                      <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{count}</Text>
                      <Text numberOfLines={2} style={{ fontSize: 8.5, lineHeight: 11, fontFamily: "Inter_500Medium", color: "#64748B", textAlign: "center", marginTop: 2 }}>
                        {JOB_CATEGORIES[cat] || cat}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <SectionHeader title="All Citizens"'''
text, count = category_pattern.subn(category_replacement, text, count=1)
if count != 1:
    raise RuntimeError("Current Category Breakdown block not found")

text = text.replace('// JOBS_DASHBOARD_V111', '// JOBS_DASHBOARD_FINISH_V111', 1)
path.write_text(text)
print("Jobs dashboard final layout and data fixes applied")
