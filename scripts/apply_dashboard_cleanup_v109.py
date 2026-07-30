from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


# Super Admin dashboard: remove complaint search UI and search-only filtering.
path = "mobile/app/super-admin/index.tsx"
text = read(path)
text = text.replace(
    'import { View, Text, ScrollView, TouchableOpacity, Platform, Dimensions, Modal, FlatList, TextInput, Image, RefreshControl } from "react-native";',
    'import { View, Text, ScrollView, TouchableOpacity, Platform, Dimensions, Modal, FlatList, Image, RefreshControl } from "react-native";',
)
text = text.replace('  const [complaintSearch, setComplaintSearch] = useState("");\n', '')
text, count = re.subn(
    r'\n  const searchableComplaints = useMemo\(\(\) => \{.*?\n  \}, \[complaints, complaintSearch, allOfficers\]\);\n',
    '\n',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Could not remove searchableComplaints block")
text = text.replace(
    '  const recentComplaints = useMemo(() => (\n    [...searchableComplaints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)\n  ), [searchableComplaints]);',
    '  const recentComplaints = useMemo(() => (\n    [...complaints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)\n  ), [complaints]);',
)
text = text.replace(
    '    const source = complaintSearch.trim() ? searchableComplaints : complaints;\n    const sorted = [...source].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());',
    '    const sorted = [...complaints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());',
)
text = text.replace(
    '  }, [complaints, searchableComplaints, complaintSearch, selectedCategory]);',
    '  }, [complaints, selectedCategory]);',
)
text = text.replace(
    '<SectionHeader title="Complaint Control Center" sub="Search by Complaint ID, citizen, Nagarsevak, ward or category" />',
    '<SectionHeader title="Complaint Control Center" sub="Review complaints by status and category" />',
)
text, count = re.subn(
    r'\n        <View style=\{\{ flexDirection: "row", alignItems: "center", backgroundColor: "white".*?<TextInput.*?\n        </View>\n        <View style=\{\{ gap: 8 \}\}>',
    '\n        <View style={{ gap: 8 }}>',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Could not remove complaint search bar")
text = text.replace(
    'export default function SuperAdminDashboard() {',
    '// DASHBOARD_CLEANUP_V109\nexport default function SuperAdminDashboard() {',
    1,
)
write(path, text)


# Super Admin Jobs: remove the local Citizen Management card and unused storage logic.
path = "mobile/app/super-admin/jobs.tsx"
text = read(path)
text = text.replace('import AsyncStorage from "@react-native-async-storage/async-storage";\n', '')
text, count = re.subn(
    r'\n  const \[totalCitizens, setTotalCitizens\] = useState<number>\(0\);\n\n  React\.useEffect\(\(\) => \{.*?\n  \}, \[\]\);\n',
    '\n',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Could not remove citizen storage state")
text, count = re.subn(
    r'\n            <View style=\{\{ marginTop: 16 \}\}>\n              <SectionHeader title="Citizen Management".*?\n            </View>\n          </>',
    '\n          </>',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Could not remove Citizen Management section")
write(path, text)

print("Dashboard cleanup applied")
