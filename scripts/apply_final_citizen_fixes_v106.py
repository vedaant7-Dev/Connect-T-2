from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MARKER = "FINAL_CITIZEN_FIXES_V106"


def path(rel: str) -> Path:
    return ROOT / rel


def read(rel: str) -> str:
    return path(rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    path(rel).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise RuntimeError(f"Missing expected pattern: {label}")


# ---------------------------------------------------------------------------
# 1. Reliable, approval-free Job Seeker <-> Employer switching.
# ---------------------------------------------------------------------------
rel = "backend/jobPortalSessionRecoveryPatch.js"
text = read(rel)
if MARKER not in text:
    text = text.replace('"use strict";', f'"use strict";\n\n// {MARKER}', 1)
    text = replace_once(
        text,
        "async function findOrCreateRoleProfile(db, civicUser, phone, role) {",
        "async function findOrCreateRoleProfile(db, civicUser, phone, role, data = {}) {",
        "role profile helper signature",
    )
    text = replace_once(
        text,
        '  const name = cleanText(civicUser.name, 160) || "Connect T Citizen";\n  const location = cleanText(civicUser.address, 190) || null;',
        '  const name = cleanText(data.name || civicUser.name, 160) || "Connect T Citizen";\n  const location = cleanText(data.location || data.address || civicUser.address, 190) || null;\n  const company = role === "employer" ? (cleanText(data.company, 190) || `${name}\'s Business`) : null;\n  const contactPerson = role === "employer" ? (cleanText(data.contactPerson, 160) || name) : null;',
        "role creation defaults",
    )
    text = replace_once(
        text,
        '      location,\n      null,\n      role === "employer" ? name : null,\n      location,',
        '      location,\n      company,\n      contactPerson,\n      location,',
        "employer role values",
    )
    switch_handler = r'''

async function switchRole(req, res) {
  try {
    if (!pool) throw new Error("Database pool is not ready");
    await ensureLockSchema(pool);

    const auth = verifyRequestToken(req);
    if (!auth?.sub || auth.scope === "job_portal") {
      return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    }

    const [civicRows] = await pool.query(
      "SELECT id, name, mobile, dob, email, address, profile_photo, role FROM users WHERE id = ? LIMIT 1",
      [auth.sub],
    );
    const civicUser = civicRows[0];
    if (!civicUser || civicUser.role !== "citizen") {
      return sendJson(res, 403, { success: false, message: "Job Portal is available from a citizen account." });
    }

    const phone = cleanPhone(civicUser.mobile);
    if (phone.length !== 10) {
      return sendJson(res, 400, { success: false, message: "Your Connect T mobile number is not valid." });
    }

    const requestedRole = cleanText(req.body?.role, 20);
    if (!["seeker", "employer"].includes(requestedRole)) {
      return sendJson(res, 400, { success: false, message: "Choose Job Seeker or Employer." });
    }

    const profile = await findOrCreateRoleProfile(pool, civicUser, phone, requestedRole, req.body || {});
    if (!profile) throw new Error("Requested role profile could not be created");
    await saveActiveRole(pool, phone, profile);

    const user = userPayload(profile);
    return sendJson(res, 200, {
      success: true,
      roleLocked: false,
      roleSwitchingEnabled: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
    console.warn("[JobPortalSessionRecovery] role switch failed:", err.message);
    return sendJson(res, 500, { success: false, message: "Job Portal role could not be switched right now." });
  }
}
'''
    text = text.replace('\ntry {\n  const mysql = require("mysql2/promise");', switch_handler + '\ntry {\n  const mysql = require("mysql2/promise");', 1)
    text = replace_once(
        text,
        '    originalPost.call(app, "/api/job-portal/session", session);',
        '    originalPost.call(app, "/api/job-portal/session", session);\n    originalPost.call(app, "/api/job-portal/switch-role", switchRole);',
        "install dedicated role switch route",
    )
    text = replace_once(
        text,
        "module.exports = { session, findOrCreateRoleProfile };",
        "module.exports = { session, switchRole, findOrCreateRoleProfile };",
        "export role switch handler",
    )
write(rel, text)

rel = "mobile/lib/api.ts"
text = read(rel)
text = replace_once(
    text,
    '  const usesCivicJobSession = path === "/api/job-portal/session" || path === "/api/job-portal/onboarding";',
    '  const usesCivicJobSession = path === "/api/job-portal/session" || path === "/api/job-portal/onboarding" || path === "/api/job-portal/switch-role";',
    "use civic authentication for role switching",
)
write(rel, text)

rel = "mobile/context/JobsAuthContext.tsx"
text = read(rel)
old = '  const activateJobs = async (role: JobsUserRole, data: Partial<JobsUser> = {}) => { await openUnifiedSession(role, data); };'
new = '''  const activateJobs = async (role: JobsUserRole, data: Partial<JobsUser> = {}) => {
    const payload = { ...data, role } as Record<string, unknown>;
    delete payload.phone;
    delete payload.id;
    delete payload.createdAt;
    delete payload.companies;
    const response = await apiPost<any>("/api/job-portal/switch-role", payload);
    if (!response?.user || response.user.role !== role) {
      throw new Error("The selected Job Portal role could not be activated. Please try again.");
    }
    await storeJobsAuthToken(response.token);
    await persist(normalizeUser(response.user));
  };'''
text = replace_once(text, old, new, "mobile activateJobs implementation")
write(rel, text)


# ---------------------------------------------------------------------------
# 2. Home tab: complaints remain in Complaints tab only, never in Home feed.
# ---------------------------------------------------------------------------
rel = "mobile/app/(tabs)/index.tsx"
text = read(rel)
old = '''  const notifItems: NotifItem[] = [
    ...complaintNotifs.map((c) => ({ kind: "complaint" as const, id: `c-${c.id}`, createdAt: c.updatedAt || c.createdAt, complaint: c })),
    ...newsItems.map((a) => ({ kind: "news" as const, id: `n-${a.id}`, createdAt: a.createdAt, alert: a })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());'''
new = '''  // Complaints are intentionally excluded from Home. Citizens track them only in the Complaints tab.
  const notifItems: NotifItem[] = newsItems
    .map((a) => ({ kind: "news" as const, id: `n-${a.id}`, createdAt: a.createdAt, alert: a }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());'''
text = replace_once(text, old, new, "remove complaints from home notifications")
write(rel, text)


# ---------------------------------------------------------------------------
# 3. Use one simple Logout label everywhere.
# ---------------------------------------------------------------------------
for file in (ROOT / "mobile").rglob("*"):
    if file.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
        continue
    content = file.read_text(encoding="utf-8")
    updated = content
    updated = updated.replace("Logout from Connect-T?", "Logout?")
    updated = updated.replace("Logout from Connect-T", "Logout")
    updated = updated.replace("Connect-T मधून लॉगआउट करायचे?", "लॉगआउट करायचे?")
    updated = updated.replace("Connect-T से लॉगआउट करें?", "लॉगआउट करें?")
    if updated != content:
        file.write_text(updated, encoding="utf-8")


# ---------------------------------------------------------------------------
# 4. Remove Email / WhatsApp notification choices from registration and profile.
# ---------------------------------------------------------------------------
rel = "mobile/screens/CivicProfileScreen.tsx"
text = read(rel)
text = text.replace("  Switch,\n", "")
text = text.replace("  notifyEmail: boolean;\n  notifyWhatsapp: boolean;\n", "")
text = text.replace("    notifyEmail: !!user.notifyEmail,\n    notifyWhatsapp: !!user.notifyWhatsapp,\n", "")
text = text.replace("        notifyEmail: form.notifyEmail,\n        notifyWhatsapp: form.notifyWhatsapp,\n", "")
text = replace_once(
    text,
    '''        <Section title={c("preferences")}>
          <DetailRow icon="mail" label={c("emailNotifications")} value={user.notifyEmail ? c("notificationsOn") : c("notificationsOff")} />
          <DetailRow icon="message-circle" label={c("whatsappNotifications")} value={user.notifyWhatsapp ? c("notificationsOn") : c("notificationsOff")} />
          <DetailRow icon="globe" label={c("language")} value={languageOptions.find((option) => option.code === language)?.nativeLabel} />
        </Section>''',
    '''        <Section title={c("preferences")}>
          <DetailRow icon="globe" label={c("language")} value={languageOptions.find((option) => option.code === language)?.nativeLabel} />
        </Section>''',
    "profile preference display",
)
text = text.replace('              <View style={styles.preferenceRow}><View style={styles.preferenceText}><Text style={styles.actionTitle}>{c("emailNotifications")}</Text></View><Switch value={form.notifyEmail} onValueChange={(notifyEmail) => setForm({ ...form, notifyEmail })} /></View>\n', "")
text = text.replace('              <View style={styles.preferenceRow}><View style={styles.preferenceText}><Text style={styles.actionTitle}>{c("whatsappNotifications")}</Text></View><Switch value={form.notifyWhatsapp} onValueChange={(notifyWhatsapp) => setForm({ ...form, notifyWhatsapp })} /></View>\n', "")
write(rel, text)

rel = "mobile/app/login.tsx"
text = read(rel)
text = text.replace(' type Step = "form" | "otp" | "notifications" | "success";', ' type Step = "form" | "otp" | "success";')
text = text.replace('  const [notifyEmail, setNotifyEmail] = useState(true);\n  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);\n', '')
text = text.replace('    notifyEmail,\n    notifyWhatsapp,\n', '')
text = text.replace('      setNotifyEmail(draft.notifyEmail !== false);\n      setNotifyWhatsapp(draft.notifyWhatsapp !== false);\n', '')
old = '''      if (tab === "register") {
        setStep("notifications");
      } else {
        const user = await unifiedLogin(cleanPhone(loginPhone));
        router.replace(user.role === "super_admin" || user.isSuperAdmin ? ("/super-admin" as any) : user.role === "nagarsevak" ? ("/(tabs)/admin" as any) : ("/portal-select" as any));
      }'''
new = '''      if (tab === "register") {
        await register({
          name: regName.trim(),
          email: regEmail.trim(),
          mobile: cleanPhone(regPhone),
          role: "citizen",
          ward: regWard,
          dob: regDob.trim(),
          address: regAddress.trim(),
        } as any);
        setStep("success");
        setTimeout(() => router.replace("/portal-select" as any), 800);
      } else {
        const user = await unifiedLogin(cleanPhone(loginPhone));
        router.replace(user.role === "super_admin" || user.isSuperAdmin ? ("/super-admin" as any) : user.role === "nagarsevak" ? ("/(tabs)/admin" as any) : ("/portal-select" as any));
      }'''
text = replace_once(text, old, new, "complete registration immediately after OTP")
text = re.sub(r'\n  const finishRegister = async \(\) => \{.*?\n  \};\n\n  return \(', '\n\n  return (', text, count=1, flags=re.S)
text = re.sub(r'\n\s*\{step === "notifications" && \(.*?\n\s*\)\}', '', text, count=1, flags=re.S)
text = re.sub(r'\nfunction CheckRow\(.*?\n\}', '', text, count=1, flags=re.S)
write(rel, text)


# ---------------------------------------------------------------------------
# 5. Instagram-style citizen News feed with visible-video autoplay and tap pause.
# ---------------------------------------------------------------------------
rel = "mobile/components/ComplaintMediaViewer.tsx"
text = read(rel)
text = text.replace('import React, { useMemo, useState } from "react";', 'import React, { useEffect, useMemo, useState } from "react";')
text = replace_once(
    text,
    '  rightActions?: React.ReactNode;\n};',
    '  rightActions?: React.ReactNode;\n  autoPlay?: boolean;\n  active?: boolean;\n};',
    "media autoplay props",
)
if "function InlineFeedVideo" not in text:
    inline_component = '''

function InlineFeedVideo({ uri, active }: { uri: string; active: boolean }) {
  const source = useMemo(() => ({ uri, useCaching: true }), [uri]);
  const [pausedByUser, setPausedByUser] = useState(false);
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  useEffect(() => {
    if (active && !pausedByUser) player.play();
    else player.pause();
    return () => player.pause();
  }, [active, pausedByUser, player]);

  const paused = !active || pausedByUser;
  return (
    <TouchableOpacity
      style={styles.inlineVideoWrap}
      onPress={() => setPausedByUser((value) => !value)}
      activeOpacity={0.96}
      accessibilityRole="button"
      accessibilityLabel={paused ? "Play video" : "Pause video"}
    >
      <VideoView player={player} style={styles.inlineVideo} nativeControls={false} contentFit="cover" />
      <View style={styles.inlineVideoControl}>
        <Feather name={paused ? "play" : "pause"} size={17} color="white" />
        <Text style={styles.inlineVideoControlText}>{paused ? "Play" : "Pause"}</Text>
      </View>
      <View style={styles.mutedBadge}><Feather name="volume-x" size={13} color="white" /><Text style={styles.mutedText}>Muted</Text></View>
    </TouchableOpacity>
  );
}
'''
    text = text.replace('\nfunction ActionButton(', inline_component + '\nfunction ActionButton(', 1)
text = replace_once(
    text,
    '  rightActions,\n}: Props) {',
    '  rightActions,\n  autoPlay = false,\n  active = false,\n}: Props) {',
    "media autoplay destructuring",
)
old_preview = '''      <TouchableOpacity style={styles.previewButton} onPress={() => setViewerOpen(true)} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`View full complaint ${kind}`}>
        {kind === "video" ? (
          <View style={styles.videoPreview}>
            <View style={styles.playCircle}><Feather name="play" size={30} color="white" /></View>
            <Text style={styles.videoPreviewTitle}>Complaint video</Text>
            <Text style={styles.videoPreviewHint}>Tap to play inside the app</Text>
          </View>
        ) : (
          <Image source={{ uri: safeUri }} style={styles.previewImage} resizeMode="cover" />
        )}
        <View style={styles.viewOverlay}>
          <Feather name="maximize-2" size={15} color="white" />
          <Text style={styles.viewOverlayText}>View full {kind}</Text>
        </View>
      </TouchableOpacity>'''
new_preview = '''      {kind === "video" && autoPlay ? (
        <InlineFeedVideo uri={safeUri} active={active} />
      ) : (
        <TouchableOpacity style={styles.previewButton} onPress={() => setViewerOpen(true)} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`View full ${kind}`}>
          {kind === "video" ? (
            <View style={styles.videoPreview}>
              <View style={styles.playCircle}><Feather name="play" size={30} color="white" /></View>
              <Text style={styles.videoPreviewTitle}>Video update</Text>
              <Text style={styles.videoPreviewHint}>Tap to play inside the app</Text>
            </View>
          ) : (
            <Image source={{ uri: safeUri }} style={styles.previewImage} resizeMode="cover" />
          )}
          <View style={styles.viewOverlay}>
            <Feather name="maximize-2" size={15} color="white" />
            <Text style={styles.viewOverlayText}>View full {kind}</Text>
          </View>
        </TouchableOpacity>
      )}'''
text = replace_once(text, old_preview, new_preview, "inline autoplay preview")
text = replace_once(
    text,
    '  previewButton: { minHeight: 220, backgroundColor: "#0F172A", position: "relative" },',
    '  previewButton: { minHeight: 220, backgroundColor: "#0F172A", position: "relative" },\n  inlineVideoWrap: { height: 420, backgroundColor: "#020617", position: "relative", overflow: "hidden" },\n  inlineVideo: { width: "100%", height: "100%" },\n  inlineVideoControl: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(2,6,23,0.78)", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999 },\n  inlineVideoControlText: { color: "white", fontSize: 11, fontFamily: "Inter_700Bold" },\n  mutedBadge: { position: "absolute", right: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(2,6,23,0.72)", paddingHorizontal: 9, paddingVertical: 7, borderRadius: 999 },\n  mutedText: { color: "white", fontSize: 10, fontFamily: "Inter_600SemiBold" },',
    "inline video styles",
)
write(rel, text)

rel = "mobile/app/(tabs)/feed.tsx"
text = read(rel)
text = text.replace('import React, { useMemo, useState } from "react";', 'import React, { useMemo, useRef, useState } from "react";')
text = text.replace('function NewsAlertCard({ item }: { item: AppAlert }) {', 'function NewsAlertCard({ item, active }: { item: AppAlert; active: boolean }) {')
text = text.replace('function BroadcastCard({ item, highlighted }: { item: AppBroadcast; highlighted: boolean }) {', 'function BroadcastCard({ item, highlighted, active }: { item: AppBroadcast; highlighted: boolean; active: boolean }) {')
text = text.replace('<ComplaintMediaViewer uri={item.media.uri} title={item.title} label={item.media.type === "video" ? "Official video" : "Official image"} />', '<ComplaintMediaViewer uri={item.media.uri} title={item.title} label={item.media.type === "video" ? "Official video" : "Official image"} autoPlay active={active} />')
text = text.replace('<ComplaintMediaViewer uri={item.mediaUri} title={item.title} label={item.mediaType === "video" ? "Broadcast video" : "Broadcast image"} />', '<ComplaintMediaViewer uri={item.mediaUri} title={item.title} label={item.mediaType === "video" ? "Broadcast video" : "Broadcast image"} autoPlay active={active} />')
state_old = '  const userId = user?.id || "guest"; const [searchQuery, setSearchQuery] = useState(""); const [selectedWard, setSelectedWard] = useState<string | null>(null); const [refreshing, setRefreshing] = useState(false);'
state_new = '''  const userId = user?.id || "guest"; const [searchQuery, setSearchQuery] = useState(""); const [selectedWard, setSelectedWard] = useState<string | null>(null); const [refreshing, setRefreshing] = useState(false); const [activeFeedKey, setActiveFeedKey] = useState<string | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 65, minimumViewTime: 180 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ item?: FeedItem; isViewable?: boolean }> }) => {
    const visible = viewableItems.find((entry) => entry.isViewable && entry.item);
    setActiveFeedKey(visible?.item ? `${visible.item.kind}:${visible.item.item.id}` : null);
  }).current;'''
text = replace_once(text, state_old, state_new, "feed viewability state")
render_old = 'renderItem={({ item }) => item.kind === "broadcast" ? <BroadcastCard item={item.item} highlighted={item.item.id === requestedId} /> : item.kind === "alert" ? <NewsAlertCard item={item.item} /> : <PostCard post={item.item} userId={userId} />} contentContainerStyle='
render_new = 'renderItem={({ item }) => { const key = `${item.kind}:${item.item.id}`; return item.kind === "broadcast" ? <BroadcastCard item={item.item} highlighted={item.item.id === requestedId} active={activeFeedKey === key} /> : item.kind === "alert" ? <NewsAlertCard item={item.item} active={activeFeedKey === key} /> : <PostCard post={item.item} userId={userId} />; }} onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={viewabilityConfig} contentContainerStyle='
text = replace_once(text, render_old, render_new, "feed autoplay render wiring")
text = text.replace('Official municipal, ward and community updates', 'Scroll through official news, announcements, notices and ward updates')
text = text.replace('card: { backgroundColor: "white", padding: 14, marginHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0" }', 'card: { backgroundColor: "white", padding: 14, marginHorizontal: 0, borderRadius: 0, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#E2E8F0" }')
write(rel, text)


# ---------------------------------------------------------------------------
# 6. Regression coverage for all requested fixes.
# ---------------------------------------------------------------------------
test_rel = "mobile/test/final-citizen-fixes-v106.test.mjs"
test_content = '''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Job Portal role switching uses the dedicated civic-auth route and persists the returned role", () => {
  const auth = read("context/JobsAuthContext.tsx");
  const api = read("lib/api.ts");
  assert.match(auth, /apiPost<any>\("\/api\/job-portal\/switch-role"/);
  assert.match(auth, /response\.user\.role !== role/);
  assert.match(auth, /persist\(normalizeUser\(response\.user\)\)/);
  assert.match(api, /path === "\/api\/job-portal\/switch-role"/);
});

test("Home notifications do not include complaints", () => {
  const home = read("app/(tabs)/index.tsx");
  const block = home.slice(home.indexOf("const notifItems"), home.indexOf("useEffect", home.indexOf("const notifItems")));
  assert.doesNotMatch(block, /complaintNotifs\.map/);
  assert.match(block, /newsItems/);
});

test("registration and civic profile no longer expose email or WhatsApp notification choices", () => {
  const login = read("app/login.tsx");
  const profile = read("screens/CivicProfileScreen.tsx");
  assert.doesNotMatch(login, /step === "notifications"/);
  assert.doesNotMatch(login, /Email Notifications|WhatsApp Notifications/);
  assert.doesNotMatch(profile, /<Switch/);
  assert.doesNotMatch(profile, /c\("emailNotifications"\)|c\("whatsappNotifications"\)/);
});

test("all runtime logout labels use the simple Logout wording", () => {
  for (const file of ["i18n/profileCopy.ts", "i18n/jobsCopy.ts", "screens/CivicProfileScreen.tsx", "screens/LocalizedJobPortalProfileScreen.tsx", "app/super-admin/settings.tsx"]) {
    assert.doesNotMatch(read(file), /Logout from Connect-T/);
  }
});

test("citizen news feed autoplays only the visible video and allows user pause", () => {
  const feed = read("app/(tabs)/feed.tsx");
  const media = read("components/ComplaintMediaViewer.tsx");
  assert.match(feed, /onViewableItemsChanged/);
  assert.match(feed, /itemVisiblePercentThreshold: 65/);
  assert.match(feed, /autoPlay active=\{active\}/);
  assert.match(media, /function InlineFeedVideo/);
  assert.match(media, /if \(active && !pausedByUser\) player\.play\(\)/);
  assert.match(media, /setPausedByUser/);
  assert.match(media, /name=\{paused \? "play" : "pause"\}/);
});
'''
write(test_rel, test_content)

print("Applied final citizen, role switch, logout, notification and news-feed fixes.")
