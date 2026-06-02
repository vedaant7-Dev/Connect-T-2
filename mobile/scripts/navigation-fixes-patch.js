const fs = require('fs');
const path = require('path');

function replaceOnce(text, from, to) {
  return text.includes(from) ? text.replace(from, to) : text;
}

function patchAdminBoxes() {
  const file = path.join(__dirname, '..', 'app', '(tabs)', 'admin.tsx');
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, 'utf8');
  const from = '  const openComplaintTab = (nextFilter: ComplaintStatus) => {\n    if (Platform.OS !== "web") Haptics.selectionAsync();\n    setFilter(nextFilter);\n    setTimeout(() => complaintListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);\n  };';
  const to = '  const openComplaintTab = (nextFilter: ComplaintStatus) => {\n    if (Platform.OS !== "web") Haptics.selectionAsync();\n    setFilter(nextFilter);\n    router.push({ pathname: "/complaint/list" as any, params: { status: nextFilter } });\n  };';
  const next = replaceOnce(text, from, to);
  if (next !== text) fs.writeFileSync(file, next);
  return next !== text;
}

function patchNagarsevakTabs() {
  const file = path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx');
  if (!fs.existsSync(file)) return false;
  let text = fs.readFileSync(file, 'utf8');
  let next = text;

  next = replaceOnce(next, 'import { Tabs } from "expo-router";', 'import { Tabs, router } from "expo-router";');

  if (!next.includes('const pathMap: Record<string, string>')) {
    next = replaceOnce(
      next,
      '  const iconMap: Record<string, string> = { admin: "home", ward: "users", news: "radio", profile: "user" };',
      '  const iconMap: Record<string, string> = { admin: "home", ward: "users", news: "radio", profile: "user" };\n  const pathMap: Record<string, string> = { admin: "/(tabs)/admin", ward: "/(tabs)/ward", news: "/(tabs)/news", profile: "/(tabs)/profile" };'
    );
  }

  next = replaceOnce(
    next,
    '          if (!isFocused && !event.defaultPrevented) navigation.navigate(name);',
    '          if (!isFocused && !event.defaultPrevented) router.replace(pathMap[name] as any);'
  );

  if (next !== text) fs.writeFileSync(file, next);
  return next !== text;
}

try {
  const changedAdmin = patchAdminBoxes();
  const changedTabs = patchNagarsevakTabs();
  console.log(`[Connect-T] Navigation fixes patch ${changedAdmin || changedTabs ? 'applied' : 'already clean'}`);
} catch (err) {
  console.warn('[Connect-T] Navigation fixes patch skipped:', err.message);
}
