import fs from "node:fs";

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch anchor: ${label}`);
  if (source.split(search).length !== 2) throw new Error(`Patch anchor is not unique: ${label}`);
  return source.replace(search, replacement);
}

const homePath = "mobile/app/(tabs)/index.tsx";
let home = fs.readFileSync(homePath, "utf8");
home = replaceOnce(
  home,
  'import { UtilityCard } from "@/components/UtilityCard";\n',
  'import { UtilityCard } from "@/components/UtilityCard";\nimport CivicBroadcastAnnouncementBar from "@/components/CivicBroadcastAnnouncementBar";\n',
  "home component import",
);
home = replaceOnce(
  home,
  'import { useAlerts, AppAlert, wardKey } from "@/context/AlertContext";\n',
  'import { useAlerts, AppAlert, wardKey } from "@/context/AlertContext";\nimport { useBroadcasts } from "@/context/BroadcastContext";\n',
  "broadcast context import",
);
home = replaceOnce(
  home,
  '  const { alerts: allAlerts, refreshAlerts } = useAlerts();\n',
  '  const { alerts: allAlerts, refreshAlerts } = useAlerts();\n  const { broadcasts, refreshBroadcasts } = useBroadcasts();\n',
  "broadcast context hook",
);
home = replaceOnce(
  home,
  '  const newsItems = alerts.filter((item) => item.type === "news");\n',
  '  const newsItems = alerts.filter((item) => item.type === "news");\n  const broadcastItems = broadcasts\n    .filter((item) => item.status === "sent")\n    .sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime());\n',
  "visible broadcast list",
);
home = replaceOnce(
  home,
  '        onAppRefresh={() => Promise.all([refreshAlerts(), refreshComplaints()]).then(() => undefined)}\n',
  '        onAppRefresh={() => Promise.all([refreshAlerts(), refreshBroadcasts(), refreshComplaints()]).then(() => undefined)}\n',
  "home refresh",
);
home = replaceOnce(
  home,
  '        {/* ALERTS & NEWS */}\n',
  '        <CivicBroadcastAnnouncementBar\n          items={broadcastItems}\n          onOpen={(item) => router.push({ pathname: "/alert/list", params: { broadcastId: item.id } } as any)}\n          onViewAll={() => router.push("/alert/list" as any)}\n        />\n\n        {/* ALERTS & NEWS */}\n',
  "home announcement bar",
);
fs.writeFileSync(homePath, home);

const updatesPath = "mobile/screens/OfficialUpdatesMediaScreen.tsx";
let updates = fs.readFileSync(updatesPath, "utf8");
updates = replaceOnce(
  updates,
  'import { useFocusEffect, useRouter } from "expo-router";\n',
  'import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";\n',
  "news route params import",
);
updates = replaceOnce(
  updates,
  'import React, { useCallback, useMemo, useState } from "react";\n',
  'import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";\n',
  "news effect imports",
);
updates = replaceOnce(
  updates,
  '  const router = useRouter();\n  const { user } = useAuth();\n',
  '  const router = useRouter();\n  const { broadcastId } = useLocalSearchParams<{ broadcastId?: string | string[] }>();\n  const requestedBroadcastId = Array.isArray(broadcastId) ? broadcastId[0] : broadcastId;\n  const openedBroadcastParam = useRef<string | null>(null);\n  const { user } = useAuth();\n',
  "news deep link state",
);
updates = replaceOnce(
  updates,
  '  const confirmDelete = (item: AppAlert) => Alert.alert(c("removeTitle"), `${c("removeMessage")}\\n\\n${item.title}`, [\n',
  '  useEffect(() => {\n    if (!requestedBroadcastId || openedBroadcastParam.current === requestedBroadcastId) return;\n    const requested = sentBroadcasts.find((item) => item.id === requestedBroadcastId);\n    if (!requested) return;\n    openedBroadcastParam.current = requestedBroadcastId;\n    void openBroadcast(requested);\n  }, [requestedBroadcastId, sentBroadcasts]);\n\n  const confirmDelete = (item: AppAlert) => Alert.alert(c("removeTitle"), `${c("removeMessage")}\\n\\n${item.title}`, [\n',
  "news deep link effect",
);
fs.writeFileSync(updatesPath, updates);

const pickerPath = "mobile/components/BroadcastMediaPicker.tsx";
let picker = fs.readFileSync(pickerPath, "utf8");
picker = replaceOnce(
  picker,
  "      quality: 0.85,\n",
  "      quality: 1,\n",
  "maximum image quality",
);
fs.writeFileSync(pickerPath, picker);

const testPath = "mobile/test/civic-broadcast-announcements.test.mjs";
fs.writeFileSync(testPath, `import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport test from "node:test";\n\nconst read = (path) => readFileSync(new URL(\`../\${path}\`, import.meta.url), "utf8");\n\ntest("Civic Home renders every visible sent broadcast as a deep-linked text announcement tile", () => {\n  const home = read("app/(tabs)/index.tsx");\n  const bar = read("components/CivicBroadcastAnnouncementBar.tsx");\n  assert.match(home, /useBroadcasts\\(\\)/);\n  assert.match(home, /item\\.status === "sent"/);\n  assert.match(home, /CivicBroadcastAnnouncementBar/);\n  assert.match(home, /broadcastId: item\\.id/);\n  assert.match(home, /refreshBroadcasts\\(\\)/);\n  assert.match(bar, /items\\.map/);\n  assert.match(bar, /Announcement/);\n  assert.match(bar, /numberOfLines=\\{2\\}/);\n});\n\ntest("Civic News opens the exact broadcast selected from Home and displays its media", () => {\n  const news = read("screens/OfficialUpdatesMediaScreen.tsx");\n  assert.match(news, /useLocalSearchParams/);\n  assert.match(news, /requestedBroadcastId/);\n  assert.match(news, /sentBroadcasts\\.find/);\n  assert.match(news, /openBroadcast\\(requested\\)/);\n  assert.match(news, /mediaType === "image"/);\n  assert.match(news, /mediaType === "video"/);\n  assert.match(news, /Linking\\.openURL/);\n});\n\ntest("Broadcast media selection preserves maximum image quality and original video duration", () => {\n  const picker = read("components/BroadcastMediaPicker.tsx");\n  assert.match(picker, /quality: 1/);\n  assert.match(picker, /allowsEditing: false/);\n  assert.match(picker, /videoMaxDuration: 300/);\n  assert.match(picker, /MAX_VIDEO_DURATION_MS = 5 \\* 60 \\* 1000/);\n});\n`);

console.log("Applied Civic broadcast announcement, deep-link and media quality updates.");
