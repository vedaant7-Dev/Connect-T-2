from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "mobile/app/super-admin/jobs.tsx"
text = path.read_text()

text = text.replace('  const [activeTab, setActiveTab] = useState<"overview" | "employers" | "analytics">("overview");\n', '')

# Remove the Overview / Analytics / Employers selector bar.
text, count = re.subn(
    r'\n      <View style=\{\{ flexDirection: "row", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" \}\}>.*?\n      </View>\n\n      <AppScrollView',
    '\n\n      <AppScrollView',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Jobs tab selector bar not found")

# Make Overview content always visible.
text = text.replace(
    '        {activeTab === "overview" && (\n          <>',
    '        <>',
    1,
)

# Remove the Overview conditional closing immediately before Analytics.
text, count = re.subn(
    r'\n          </>\n        \)\}\n\n        \{activeTab === "analytics" && \(\n          <>',
    '\n',
    text,
    count=1,
)
if count != 1:
    raise RuntimeError("Overview/Analytics boundary not found")

# Remove the Analytics conditional closing immediately before Employers.
text, count = re.subn(
    r'\n          </>\n        \)\}\n\n        \{activeTab === "employers" && \(\n          <>.*?\n          </>\n        \)\}',
    '\n        </>',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Analytics/Employers section boundary not found")

text = text.replace(
    'export default function JobsAdminScreen() {',
    '// JOBS_SINGLE_OVERVIEW_V110\nexport default function JobsAdminScreen() {',
    1,
)

path.write_text(text)
print("Jobs screen converted to a single overview with analytics")
