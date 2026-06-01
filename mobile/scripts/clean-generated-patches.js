const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function writeIfChanged(file, before, after, label) {
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log(`[Connect-T] Cleaned ${label}`);
  }
}

function cleanupSuperAdmin() {
  const file = path.join(__dirname, '..', 'app', 'super-admin', 'index.tsx');
  const before = read(file);
  if (!before) return;
  let next = before;

  const stateLine = '  const [complaintSearch, setComplaintSearch] = useState("");\n';
  next = next.replace(/\n?\s*const \[complaintSearch, setComplaintSearch\] = useState\(""\);\n/g, '\n');
  next = next.replace(
    '  const [selectedC, setSelectedC] = useState<Complaint | null>(null);\n',
    '  const [selectedC, setSelectedC] = useState<Complaint | null>(null);\n' + stateLine,
  );

  // Remove duplicated TextInput imports inside react-native import blocks.
  next = next.replace(/(\n\s*TextInput,)+/g, '\n  TextInput,');

  writeIfChanged(file, before, next, 'Super Admin duplicate search state');
}

function cleanupNagarsevakAdmin() {
  const file = path.join(__dirname, '..', 'app', '(tabs)', 'admin.tsx');
  const before = read(file);
  if (!before) return;
  let next = before;

  const styleKeys = [
    'performancePanel',
    'performanceHeader',
    'performanceIcon',
    'performanceTitle',
    'performanceSub',
    'performanceRate',
    'performanceStats',
    'performanceStat',
    'performanceStatNum',
    'performanceStatLabel',
    'searchPanel',
    'searchInput',
    'complaintIdText',
  ];

  // Keep only the first occurrence of each generated style key.
  for (const key of styleKeys) {
    const re = new RegExp(`\\n\\s*${key}: \\{[^\\n]*\\},`, 'g');
    const matches = [...next.matchAll(re)].map((m) => m[0]);
    if (matches.length > 1) {
      let seen = false;
      next = next.replace(re, (m) => {
        if (!seen) {
          seen = true;
          return m;
        }
        return '';
      });
    }
  }

  // Ensure resolutionRate appears only once and after resolvedCount/rejectedCount.
  next = next.replace(/\n\s*const resolutionRate = wardComplaints\.length > 0 \? Math\.round\(\(resolvedCount \/ wardComplaints\.length\) \* 100\) : 0;/g, '');
  next = next.replace(
    '  const resolvedCount = wardComplaints.filter((c) => c.status === "resolved").length;\n  const rejectedCount = wardComplaints.filter((c) => c.status === "rejected").length;',
    '  const resolvedCount = wardComplaints.filter((c) => c.status === "resolved").length;\n  const rejectedCount = wardComplaints.filter((c) => c.status === "rejected").length;\n  const resolutionRate = wardComplaints.length > 0 ? Math.round((resolvedCount / wardComplaints.length) * 100) : 0;',
  );

  writeIfChanged(file, before, next, 'Nagarsevak duplicate generated styles');
}

cleanupSuperAdmin();
cleanupNagarsevakAdmin();
console.log('[Connect-T] Generated patch cleanup complete');
