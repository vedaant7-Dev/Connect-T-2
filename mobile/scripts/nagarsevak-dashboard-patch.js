const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', '(tabs)', 'admin.tsx');

function replaceOnce(text, from, to) {
  if (!text.includes(from)) return text;
  return text.replace(from, to);
}

function cleanupRemovedPerformanceBox(text) {
  let next = text;
  next = next.replace(/\n\s*<View style=\{styles\.performancePanel\}>[\s\S]*?\n\s*<\/View>\n\n\s*\{\/\* ALERTS PANEL \*\/\}/g, '\n      {/* ALERTS PANEL */}');
  const styleKeys = [
    'performancePanel', 'performanceHeader', 'performanceIcon', 'performanceTitle', 'performanceSub',
    'performanceRate', 'performanceStats', 'performanceStat', 'performanceStatNum', 'performanceStatLabel',
  ];
  for (const key of styleKeys) {
    next = next.replace(new RegExp(`\\n\\s*${key}: \\{[^\\n]*\\},`, 'g'), '');
  }
  next = next.replace(/\n\s*const resolutionRate = wardComplaints\.length > 0 \? Math\.round\(\(resolvedCount \/ wardComplaints\.length\) \* 100\) : 0;/g, '');
  return next;
}

try {
  let text = fs.readFileSync(file, 'utf8');
  let next = text;

  next = replaceOnce(
    next,
    '  const openComplaintTab = (nextFilter: ComplaintStatus) => {\n    if (Platform.OS !== "web") Haptics.selectionAsync();\n    router.push({ pathname: "/complaint/list", params: { status: nextFilter } } as any);\n  };',
    '  const openComplaintTab = (nextFilter: ComplaintStatus) => {\n    if (Platform.OS !== "web") Haptics.selectionAsync();\n    setFilter(nextFilter);\n    setTimeout(() => complaintListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);\n  };'
  );

  next = replaceOnce(next, '    await logout();\n    router.replace("/login");', '    await logout("/nagarsevak/login");\n    router.replace("/nagarsevak/login" as any);');
  next = replaceOnce(next, '    await logout();\n    router.replace("/portal-select" as any);', '    await logout("/nagarsevak/login");\n    router.replace("/nagarsevak/login" as any);');

  next = replaceOnce(
    next,
    '          <Text style={styles.cmpTitle} numberOfLines={1}>{complaint.title}</Text>\n          <Text style={styles.cmpMeta}>{timeAgo(complaint.createdAt)}</Text>',
    '          <Text style={styles.cmpTitle} numberOfLines={1}>{complaint.title}</Text>\n          <Text style={styles.complaintIdText}>ID: {complaint.id}</Text>\n          <Text style={styles.cmpMeta}>{timeAgo(complaint.createdAt)}</Text>'
  );

  next = cleanupRemovedPerformanceBox(next);

  if (next !== text) {
    fs.writeFileSync(file, next);
    console.log('[Connect-T] Nagarsevak dashboard patch cleaned');
  } else {
    console.log('[Connect-T] Nagarsevak dashboard patch already clean');
  }
} catch (err) {
  console.warn('[Connect-T] Nagarsevak dashboard patch skipped:', err.message);
}
