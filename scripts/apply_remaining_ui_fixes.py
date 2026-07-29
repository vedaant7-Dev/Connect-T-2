from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# 1) Restore the Report an Issue CTA above Utility Status on the Civic home screen.
home = Path("mobile/app/(tabs)/index.tsx")
home_text = home.read_text(encoding="utf-8")
if "{/* REPORT AN ISSUE CTA */}" not in home_text:
    marker = "\n\n        {/* UTILITY STATUS */}"
    cta = '''\n\n        {/* REPORT AN ISSUE CTA */}\n        <TouchableOpacity style={styles.complaintCTA} onPress={() => router.push(\"/complaint/new\")} activeOpacity={0.88}>\n          <LinearGradient colors={[\"#15803D\", \"#16A34A\", \"#22C55E\"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.complaintCTAGrad}>\n            <View style={styles.complaintCTAIcon}>\n              <Feather name=\"camera\" size={24} color=\"white\" />\n            </View>\n            <View style={{ flex: 1 }}>\n              <Text style={styles.complaintCTATitle}>{t(\"reportProblem\")}</Text>\n              <Text style={styles.complaintCTASub}>{t(\"reportProblemSub\")}</Text>\n            </View>\n            <View style={styles.complaintCTAArrow}>\n              <Feather name=\"arrow-right\" size={18} color=\"white\" />\n            </View>\n          </LinearGradient>\n        </TouchableOpacity>\n\n        {/* UTILITY STATUS */}'''
    if marker not in home_text:
        raise SystemExit("Utility Status marker not found in Civic home screen")
    home.write_text(home_text.replace(marker, cta, 1), encoding="utf-8")


# 2) Let media cards hide the duplicate View action and place admin actions on the right.
viewer = Path("mobile/components/ComplaintMediaViewer.tsx")
replace_once(
    viewer,
    '''  accentColor?: string;\n};''',
    '''  accentColor?: string;\n  showInlineViewAction?: boolean;\n  rightActions?: React.ReactNode;\n};''',
)
replace_once(
    viewer,
    '''export default function ComplaintMediaViewer({ uri, title = "Complaint evidence", label = "Complaint evidence", accentColor = "#EA580C" }: Props) {''',
    '''export default function ComplaintMediaViewer({\n  uri,\n  title = "Complaint evidence",\n  label = "Complaint evidence",\n  accentColor = "#EA580C",\n  showInlineViewAction = true,\n  rightActions,\n}: Props) {''',
)
replace_once(
    viewer,
    '''        <View style={styles.inlineActions}>\n          <ActionButton icon="eye" label="View" onPress={() => setViewerOpen(true)} accentColor={accentColor} />\n          <ActionButton icon="download" label="Save" onPress={saveMedia} busy={busyAction === "save"} accentColor={accentColor} />\n          <ActionButton icon="share-2" label="Share" onPress={shareMedia} busy={busyAction === "share"} accentColor={accentColor} />\n        </View>''',
    '''        <View style={styles.actionBar}>\n          <View style={styles.inlineActions}>\n            {showInlineViewAction ? <ActionButton icon="eye" label="View" onPress={() => setViewerOpen(true)} accentColor={accentColor} /> : null}\n            <ActionButton icon="download" label="Save" onPress={saveMedia} busy={busyAction === "save"} accentColor={accentColor} />\n            <ActionButton icon="share-2" label="Share" onPress={shareMedia} busy={busyAction === "share"} accentColor={accentColor} />\n          </View>\n          {rightActions ? <View style={styles.rightActions}>{rightActions}</View> : null}\n        </View>''',
)
replace_once(
    viewer,
    '''  inlineActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },''',
    '''  actionBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },\n  inlineActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 6 },\n  rightActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },''',
)


# 3) Simplify Broadcast posts and combine Save/Share with Pause/Delete in one row.
broadcast = Path("mobile/screens/BroadcastCenterMediaScreen.tsx")
replace_once(
    broadcast,
    '''  const status = statusMeta(item.status);\n  return (''',
    '''  const status = statusMeta(item.status);\n  const adminActions = (\n    <>\n      {item.status === "paused" ? (\n        <TouchableOpacity style={[styles.actionButton, styles.resumeButton]} onPress={onResume}><Feather name="play" size={14} color="#166534" /><Text style={styles.resumeText}>Resume</Text></TouchableOpacity>\n      ) : (\n        <TouchableOpacity style={[styles.actionButton, styles.pauseButton]} onPress={onPause}><Feather name="pause" size={14} color="#7C3AED" /><Text style={styles.pauseText}>Pause</Text></TouchableOpacity>\n      )}\n      <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}><Feather name="trash-2" size={14} color="#DC2626" /><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>\n    </>\n  );\n  return (''',
)
replace_once(
    broadcast,
    '''      {item.mediaUri ? <ComplaintMediaViewer uri={item.mediaUri} title={item.title} label={item.mediaType === "video" ? "Broadcast video" : "Broadcast image"} accentColor={ORANGE} /> : null}\n      <View style={styles.metrics}>\n        <View style={styles.metric}><Text style={styles.metricValue}>{item.deliveredCount}</Text><Text style={styles.metricLabel}>Delivered</Text></View>\n        <View style={styles.metric}><Text style={styles.metricValue}>{item.readCount}</Text><Text style={styles.metricLabel}>Read</Text></View>\n        <View style={styles.metric}><Text style={[styles.metricValue, styles.providerValue]}>{item.externalPushStatus === "not_configured" ? "In-app" : item.externalPushStatus}</Text><Text style={styles.metricLabel}>Delivery</Text></View>\n      </View>\n      <View style={styles.cardFooter}>\n        <Text style={styles.cardDate}>{formatDate(item.status === "scheduled" ? item.scheduledAt : item.sentAt || item.createdAt)}</Text>\n        <View style={styles.actionRow}>\n          {item.status === "paused" ? (\n            <TouchableOpacity style={[styles.actionButton, styles.resumeButton]} onPress={onResume}><Feather name="play" size={14} color="#166534" /><Text style={styles.resumeText}>Resume</Text></TouchableOpacity>\n          ) : (\n            <TouchableOpacity style={[styles.actionButton, styles.pauseButton]} onPress={onPause}><Feather name="pause" size={14} color="#7C3AED" /><Text style={styles.pauseText}>Pause</Text></TouchableOpacity>\n          )}\n          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}><Feather name="trash-2" size={14} color="#DC2626" /><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>\n        </View>\n      </View>''',
    '''      {item.mediaUri ? (\n        <ComplaintMediaViewer\n          uri={item.mediaUri}\n          title={item.title}\n          label={item.mediaType === "video" ? "Broadcast video" : "Broadcast image"}\n          accentColor={ORANGE}\n          showInlineViewAction={false}\n          rightActions={adminActions}\n        />\n      ) : null}\n      <View style={styles.cardFooter}>\n        <Text style={styles.cardDate}>{formatDate(item.status === "scheduled" ? item.scheduledAt : item.sentAt || item.createdAt)}</Text>\n        {!item.mediaUri ? <View style={styles.actionRow}>{adminActions}</View> : null}\n      </View>''',
)
replace_once(
    broadcast,
    '''  cardFooter: { marginTop: 10, gap: 8 },''',
    '''  cardFooter: { marginTop: 10, gap: 8 },''',
)


# 4) Add a focused regression test.
test_path = Path("mobile/test/remaining-requested-ui-fixes.test.mjs")
test_path.write_text('''import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport test from "node:test";\n\nconst read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");\n\ntest("Civic home restores Report an Issue above Utility Status", () => {\n  const home = read("app/(tabs)/index.tsx");\n  const cta = home.indexOf("REPORT AN ISSUE CTA");\n  const utility = home.indexOf("UTILITY STATUS");\n  assert.ok(cta >= 0);\n  assert.ok(utility > cta);\n  assert.match(home, /router\\.push\\(\\"\\/complaint\\/new\\"\\)/);\n});\n\ntest("Broadcast posts hide delivery metrics and use one combined action row", () => {\n  const screen = read("screens/BroadcastCenterMediaScreen.tsx");\n  const viewer = read("components/ComplaintMediaViewer.tsx");\n  assert.doesNotMatch(screen, />Delivered<\\/Text>/);\n  assert.doesNotMatch(screen, />Delivery<\\/Text>/);\n  assert.match(screen, /showInlineViewAction=\\{false\\}/);\n  assert.match(screen, /rightActions=\\{adminActions\\}/);\n  assert.match(viewer, /showInlineViewAction \\? <ActionButton icon=\\"eye\\"/);\n  assert.match(viewer, /rightActions \\? <View style=\\{styles\\.rightActions\\}>/);\n});\n''', encoding="utf-8")

print("Remaining requested UI fixes applied.")
