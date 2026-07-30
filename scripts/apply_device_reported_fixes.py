from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 source block, found {count}")
    return text.replace(old, new, 1)


# 1) Broadcast context: expose edit/update action.
path = "mobile/context/BroadcastContext.tsx"
text = read(path)
text = replace_once(
    text,
    "  createBroadcast: (data: NewBroadcast) => Promise<AppBroadcast>;\n  pauseBroadcast: (id: string) => Promise<void>;",
    "  createBroadcast: (data: NewBroadcast) => Promise<AppBroadcast>;\n  updateBroadcast: (id: string, data: NewBroadcast) => Promise<AppBroadcast>;\n  pauseBroadcast: (id: string) => Promise<void>;",
    "broadcast context type",
)
insert = '''  const updateBroadcast = useCallback(async (id: string, data: NewBroadcast) => {
    const result = await apiPatch<{ broadcast: any }>(`/api/broadcasts/${encodeURIComponent(id)}`, {
      action: "edit",
      title: data.title,
      body: data.body,
      category: data.category,
      language: data.language,
      audienceRole: data.audienceRole,
      ward: data.ward,
      scheduledAt: data.scheduledAt || null,
    });
    const updated = normalizeBroadcast(result.broadcast);
    setBroadcasts((current) => current.map((item) => item.id === id ? updated : item));
    return updated;
  }, []);

'''
text = replace_once(text, "  const runAction = useCallback", insert + "  const runAction = useCallback", "broadcast update callback")
text = replace_once(
    text,
    "    broadcasts, loading, error, uploadProgress, refreshBroadcasts, createBroadcast,\n    pauseBroadcast, resumeBroadcast, deleteBroadcast, markBroadcastRead,",
    "    broadcasts, loading, error, uploadProgress, refreshBroadcasts, createBroadcast, updateBroadcast,\n    pauseBroadcast, resumeBroadcast, deleteBroadcast, markBroadcastRead,",
    "broadcast context value",
)
text = replace_once(
    text,
    "  }), [broadcasts, loading, error, uploadProgress, refreshBroadcasts, createBroadcast, pauseBroadcast, resumeBroadcast, deleteBroadcast, markBroadcastRead]);",
    "  }), [broadcasts, loading, error, uploadProgress, refreshBroadcasts, createBroadcast, updateBroadcast, pauseBroadcast, resumeBroadcast, deleteBroadcast, markBroadcastRead]);",
    "broadcast context dependencies",
)
write(path, text)


# 2) Backend: securely edit broadcasts owned by the creator, or any broadcast for Super Admin.
path = "backend/broadcastActionsPatch.js"
text = read(path)
text = replace_once(
    text,
    'const [rows] = await pool.query("SELECT id, mobile, role, is_super_admin FROM users WHERE id = ? LIMIT 1", [auth.sub]);',
    'const [rows] = await pool.query("SELECT id, mobile, role, ward, ward_code, ward_number, is_super_admin FROM users WHERE id = ? LIMIT 1", [auth.sub]);',
    "broadcast manager ward fields",
)
new_update = r'''async function updateAction(req, res, next) {
  const action = cleanText(req.body?.action, 30).toLowerCase();
  if (action === "archive") return sendJson(res, 410, { success: false, code: "BROADCAST_ARCHIVE_REMOVED", message: "Archive has been replaced by Pause and Delete." });
  if (!["pause", "resume", "edit"].includes(action)) return next();
  try {
    if (!pool) throw new Error("Database pool unavailable");
    const user = await currentUser(req); if (!user) return sendJson(res, 401, { success: false, code: "SESSION_INVALID", message: "Please log in again." });
    const id = cleanText(req.params?.id, 80); const existing = await loadBroadcast(id);
    if (!existing) return sendJson(res, 404, { success: false, message: "Broadcast not found." });
    if (!canManage(user, existing)) return sendJson(res, 403, { success: false, message: "You can manage only broadcasts created from your account." });

    if (action === "edit") {
      const title = cleanText(req.body?.title, 180);
      const body = cleanText(req.body?.body, 5000);
      if (title.length < 3 || body.length < 5) return sendJson(res, 400, { success: false, message: "A clear title and complete message are required." });

      const allowedCategories = new Set(["announcement", "news", "emergency", "information", "notice"]);
      const allowedLanguages = new Set(["en", "mr", "hi"]);
      const allowedAudiences = new Set(["all", "citizen", "nagarsevak", "seeker", "employer"]);
      const category = allowedCategories.has(String(req.body?.category || "")) ? String(req.body.category) : String(existing.category || "announcement");
      const language = allowedLanguages.has(String(req.body?.language || "")) ? String(req.body.language) : String(existing.language || "en");
      let audienceRole = allowedAudiences.has(String(req.body?.audienceRole || "")) ? String(req.body.audienceRole) : String(existing.audience_role || "all");
      let ward = cleanText(req.body?.ward, 120) || existing.ward || null;

      if (!isSuperAdmin(user)) {
        audienceRole = "citizen";
        ward = user.ward || (user.ward_code ? `Ward ${user.ward_code}` : user.ward_number ? `Ward ${user.ward_number}` : existing.ward || null);
      }

      const scheduledRaw = req.body?.scheduledAt;
      let scheduledAt = null;
      if (scheduledRaw) {
        const parsed = new Date(scheduledRaw);
        if (!Number.isFinite(parsed.getTime())) return sendJson(res, 400, { success: false, message: "Choose a valid schedule date and time." });
        scheduledAt = parsed;
      }
      const nextStatus = existing.status === "paused" ? "paused" : scheduledAt && scheduledAt.getTime() > Date.now() ? "scheduled" : "sent";
      await pool.query(
        `UPDATE broadcasts
            SET title = ?, body = ?, category = ?, language = ?, audience_role = ?, ward = ?,
                scheduled_at = ?, status = ?,
                sent_at = CASE WHEN ? = 'sent' THEN COALESCE(sent_at, NOW()) ELSE sent_at END
          WHERE id = ?`,
        [title, body, category, language, audienceRole, ward, scheduledAt, nextStatus, nextStatus, id],
      );
      return sendJson(res, 200, { success: true, broadcast: await loadBroadcast(id) });
    }

    if (action === "pause") {
      if (existing.status === "paused") return sendJson(res, 200, { success: true, broadcast: existing });
      if (!["sent", "scheduled"].includes(String(existing.status))) return sendJson(res, 409, { success: false, message: "Only sent or scheduled broadcasts can be paused." });
      await pool.query("UPDATE broadcasts SET status = 'paused' WHERE id = ?", [id]);
    } else {
      if (existing.status !== "paused") return sendJson(res, 409, { success: false, message: "Only paused broadcasts can be resumed." });
      const scheduledAt = existing.scheduled_at ? new Date(existing.scheduled_at) : null;
      const nextStatus = scheduledAt && Number.isFinite(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now() ? "scheduled" : "sent";
      await pool.query("UPDATE broadcasts SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN COALESCE(sent_at, NOW()) ELSE sent_at END WHERE id = ?", [nextStatus, nextStatus, id]);
    }
    return sendJson(res, 200, { success: true, broadcast: await loadBroadcast(id) });
  } catch (error) {
    console.warn("[BroadcastActionsPatch] update failed", error?.code || error?.name || "broadcast_action_error");
    return sendJson(res, 500, { success: false, message: "The broadcast could not be changed right now." });
  }
}
'''
text, count = re.subn(r"async function updateAction\(req, res, next\) \{.*?\n\}\nasync function deleteBroadcast", new_update + "async function deleteBroadcast", text, count=1, flags=re.S)
if count != 1:
    raise RuntimeError(f"broadcast backend edit handler: {count}")
text = text.replace("pause, resume and delete actions active", "edit, pause, resume and delete actions active")
write(path, text)


# 3) Broadcast Center UI: edit button and shared create/edit form for Super Admin and Nagarsevak.
path = "mobile/screens/BroadcastCenterMediaScreen.tsx"
text = read(path)
text = replace_once(text, 'const BG = "#EEF2F7";\n', 'const BG = "#EEF2F7";\n// SUPER_ADMIN_BROADCAST_EDIT_V107\n', "broadcast marker")
text = replace_once(text, "  onPause: () => void;\n", "  onEdit: () => void;\n  onPause: () => void;\n", "broadcast card edit prop")
text = replace_once(text, "function BroadcastCard({ item, onPause, onResume, onDelete }: CardProps)", "function BroadcastCard({ item, onEdit, onPause, onResume, onDelete }: CardProps)", "broadcast card signature")
text = replace_once(
    text,
    '<TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={() => void shareBroadcast(item)}><Feather name="share-2" size={14} color="#C2410C" /><Text style={styles.shareText}>Share</Text></TouchableOpacity>',
    '<TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={() => void shareBroadcast(item)}><Feather name="share-2" size={13} color="#C2410C" /><Text style={styles.shareText}>Share</Text></TouchableOpacity>\n      <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}><Feather name="edit-2" size={13} color="#2563EB" /><Text style={styles.editText}>Edit</Text></TouchableOpacity>',
    "broadcast edit action",
)
text = replace_once(
    text,
    "  const { broadcasts, loading, error, refreshBroadcasts, createBroadcast, pauseBroadcast, resumeBroadcast, deleteBroadcast } = useBroadcasts();",
    "  const { broadcasts, loading, error, refreshBroadcasts, createBroadcast, updateBroadcast, pauseBroadcast, resumeBroadcast, deleteBroadcast } = useBroadcasts();",
    "broadcast context destructure",
)
text = replace_once(text, "  const [composeVisible, setComposeVisible] = useState(false);\n", "  const [composeVisible, setComposeVisible] = useState(false);\n  const [editingItem, setEditingItem] = useState<AppBroadcast | null>(null);\n", "broadcast editing state")
old_reset = '  const resetForm = () => { setTitle(""); setBody(""); setCategory("announcement"); setAudienceRole("all"); setLanguage("en"); setWard("All Wards"); setScheduledAt(""); setMedia(null); setFormError(""); };\n'
new_reset = '''  const resetForm = () => { setTitle(""); setBody(""); setCategory("announcement"); setAudienceRole("all"); setLanguage("en"); setWard("All Wards"); setScheduledAt(""); setMedia(null); setFormError(""); };
  const closeComposer = () => { if (sending) return; setComposeVisible(false); setEditingItem(null); resetForm(); };
  const openCreate = () => { setEditingItem(null); resetForm(); setComposeVisible(true); };
  const openEdit = (item: AppBroadcast) => {
    setEditingItem(item);
    setTitle(item.title);
    setBody(item.body);
    setCategory(item.category);
    setAudienceRole(item.audienceRole);
    setLanguage(item.language);
    setWard(item.ward || "All Wards");
    setScheduledAt(item.status === "scheduled" && item.scheduledAt ? item.scheduledAt : "");
    setMedia(null);
    setFormError("");
    setComposeVisible(true);
  };
'''
text = replace_once(text, old_reset, new_reset, "broadcast form helpers")
old_send = '''      await createBroadcast({ title: title.trim(), body: body.trim(), category, audienceRole: isSuperAdmin ? audienceRole : "citizen", language,
        ward: isSuperAdmin && ward === "All Wards" ? undefined : isSuperAdmin ? ward : user?.ward,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined, idempotencyKey: makeIdempotencyKey(), media });
      setComposeVisible(false); resetForm(); await refreshBroadcasts();
    } catch (requestError) { setFormError(getUserErrorMessage(requestError, "Broadcast could not be created. Please try again.")); }'''
new_send = '''      const payload = { title: title.trim(), body: body.trim(), category, audienceRole: isSuperAdmin ? audienceRole : "citizen", language,
        ward: isSuperAdmin && ward === "All Wards" ? undefined : isSuperAdmin ? ward : user?.ward,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined, idempotencyKey: makeIdempotencyKey(), media };
      if (editingItem) await updateBroadcast(editingItem.id, { ...payload, media: null });
      else await createBroadcast(payload);
      setComposeVisible(false); setEditingItem(null); resetForm(); await refreshBroadcasts();
    } catch (requestError) { setFormError(getUserErrorMessage(requestError, editingItem ? "Broadcast could not be updated. Please try again." : "Broadcast could not be created. Please try again.")); }'''
text = replace_once(text, old_send, new_send, "broadcast send or update")
text = replace_once(text, 'onPress={() => setComposeVisible(true)}', 'onPress={openCreate}', "broadcast create button")
text = replace_once(
    text,
    '{active.map((item) => <BroadcastCard key={item.id} item={item} onPause={() => setPendingAction({ kind: "pause", item })}',
    '{active.map((item) => <BroadcastCard key={item.id} item={item} onEdit={() => openEdit(item)} onPause={() => setPendingAction({ kind: "pause", item })}',
    "broadcast card map edit",
)
text = replace_once(text, 'onRequestClose={() => !sending && setComposeVisible(false)}', 'onRequestClose={closeComposer}', "broadcast modal close")
text = replace_once(text, '<Text style={styles.sheetTitle}>Create Broadcast</Text>', '<Text style={styles.sheetTitle}>{editingItem ? "Edit Broadcast" : "Create Broadcast"}</Text>', "broadcast modal title")
text = replace_once(text, 'onPress={() => setComposeVisible(false)} disabled={sending}', 'onPress={closeComposer} disabled={sending}', "broadcast close button")
text = replace_once(
    text,
    '<Label text="ATTACHMENT (OPTIONAL)" /><BroadcastMediaPicker value={media} onChange={setMedia} onError={setFormError} disabled={sending} />',
    '{editingItem ? <><Label text="ATTACHMENT" /><Text style={styles.help}>The existing image or video remains attached. Create a new post to replace the media.</Text></> : <><Label text="ATTACHMENT (OPTIONAL)" /><BroadcastMediaPicker value={media} onChange={setMedia} onError={setFormError} disabled={sending} /></>}',
    "broadcast edit attachment",
)
text = replace_once(
    text,
    '<Text style={styles.sendText}>{sending ? (media ? "Uploading..." : "Saving...") : scheduledAt ? "Schedule broadcast" : "Send in-app broadcast"}</Text>',
    '<Text style={styles.sendText}>{sending ? (media ? "Uploading..." : "Saving...") : editingItem ? "Update broadcast" : scheduledAt ? "Schedule broadcast" : "Send in-app broadcast"}</Text>',
    "broadcast submit label",
)
text = replace_once(
    text,
    'shareButton: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }, shareText: { color: "#C2410C", fontSize: 10.5, fontFamily: "Inter_700Bold" }, pauseButton:',
    'shareButton: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }, shareText: { color: "#C2410C", fontSize: 9.5, fontFamily: "Inter_700Bold" }, editButton: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }, editText: { color: "#2563EB", fontSize: 9.5, fontFamily: "Inter_700Bold" }, pauseButton:',
    "broadcast edit styles",
)
text = text.replace('actionButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12,', 'actionButton: { minHeight: 36, borderRadius: 11, paddingHorizontal: 8,', 1)
text = text.replace('pauseText: { color: "#7C3AED", fontSize: 10.5', 'pauseText: { color: "#7C3AED", fontSize: 9.5', 1)
text = text.replace('resumeText: { color: "#166534", fontSize: 10.5', 'resumeText: { color: "#166534", fontSize: 9.5', 1)
text = text.replace('deleteText: { color: "#DC2626", fontSize: 10.5', 'deleteText: { color: "#DC2626", fontSize: 9.5', 1)
write(path, text)


# 4) Super Admin navigation: Reports becomes Profile; Settings remains available via dashboard gear.
path = "mobile/app/super-admin/_layout.tsx"
text = read(path)
text = replace_once(text, '{ name: "reports", icon: "bar-chart-2", label: "Reports" },', '{ name: "profile", icon: "user", label: "Profile" },', "super admin profile tab")
text = replace_once(text, '            <Tabs.Screen name="reports" />\n', '            <Tabs.Screen name="profile" />\n            <Tabs.Screen name="reports" options={{ href: null }} />\n', "super admin profile route")
write(path, text)


# 5) Remove the editable Super Admin profile card from Settings.
path = "mobile/app/super-admin/settings.tsx"
text = read(path)
text, count = re.subn(r'\n\s*<TouchableOpacity style=\{styles\.profileCard\}.*?</TouchableOpacity>\n', '\n', text, count=1, flags=re.S)
if count != 1:
    raise RuntimeError(f"remove settings profile card: {count}")
text = text.replace('import { useAuth } from "@/context/AuthContext";\n', '')
text = text.replace('  const { user } = useAuth();\n', '')
write(path, text)


# 6) Complaint status wording across dashboards, cards and translations.
path = "mobile/context/LanguageContext.tsx"
text = read(path)
replacements = {
    'active: "Active"': 'active: "In Progress"',
    'pending: "Pending"': 'pending: "New Complaints"',
    'submitted: "Submitted"': 'submitted: "New Complaint"',
    'noActiveComplaints: "No Active Complaints"': 'noActiveComplaints: "No In Progress Complaints"',
    'active: "सक्रिय"': 'active: "प्रगति में"',
    'pending: "लंबित"': 'pending: "नई शिकायतें"',
    'submitted: "जमा किया"': 'submitted: "नई शिकायत"',
    'noActiveComplaints: "कोई सक्रिय शिकायत नहीं"': 'noActiveComplaints: "कोई प्रगति में शिकायत नहीं"',
    'active: "सक्रिय"': 'active: "प्रगतीत"',
    'pending: "प्रलंबित"': 'pending: "नवीन तक्रारी"',
    'submitted: "सबमिट केले"': 'submitted: "नवीन तक्रार"',
    'noActiveComplaints: "कोणतीही सक्रिय तक्रार नाही"': 'noActiveComplaints: "प्रगतीत तक्रार नाही"',
}
# Handle duplicate Hindi/Marathi source values deterministically by section.
text = text.replace('active: "Active"', 'active: "In Progress"', 1)
text = text.replace('pending: "Pending"', 'pending: "New Complaints"', 1)
text = text.replace('submitted: "Submitted"', 'submitted: "New Complaint"', 1)
text = text.replace('noActiveComplaints: "No Active Complaints"', 'noActiveComplaints: "No In Progress Complaints"', 1)
text = text.replace('active: "सक्रिय"', 'active: "प्रगति में"', 1)
text = text.replace('pending: "लंबित"', 'pending: "नई शिकायतें"', 1)
text = text.replace('submitted: "जमा किया"', 'submitted: "नई शिकायत"', 1)
text = text.replace('noActiveComplaints: "कोई सक्रिय शिकायत नहीं"', 'noActiveComplaints: "कोई प्रगति में शिकायत नहीं"', 1)
text = text.replace('active: "सक्रिय"', 'active: "प्रगतीत"', 1)
text = text.replace('pending: "प्रलंबित"', 'pending: "नवीन तक्रारी"', 1)
text = text.replace('submitted: "सबमिट केले"', 'submitted: "नवीन तक्रार"', 1)
text = text.replace('noActiveComplaints: "कोणतीही सक्रिय तक्रार नाही"', 'noActiveComplaints: "प्रगतीत तक्रार नाही"', 1)
write(path, text)

path = "mobile/app/super-admin/index.tsx"
text = read(path)
text = text.replace('submitted: "Pending"', 'submitted: "New Complaints"')
text = text.replace('{ label: "Pending", value: stats.pending', '{ label: "New Complaints", value: stats.pending')
text = text.replace('{ label: "Active", value: stats.inProgress', '{ label: "In Progress", value: stats.inProgress')
text = text.replace('label="Pending" value={stats.pending}', 'label="New Complaints" value={stats.pending}')
text = text.replace('openModal("pending", "Pending Complaints"', 'openModal("pending", "New Complaints"')
write(path, text)

path = "mobile/app/(tabs)/admin.tsx"
text = read(path)
text = text.replace('{ filter: "submitted", label: t("complaints")', '{ filter: "submitted", label: t("pending")')
write(path, text)

# Safe UI-only replacements in complaint-related mobile files. Backend enum/status values remain unchanged.
for file in (ROOT / "mobile").rglob("*.tsx"):
    if file.as_posix().endswith("super-admin/index.tsx") or file.as_posix().endswith("(tabs)/admin.tsx"):
        continue
    content = file.read_text()
    if "complaint" not in content.lower():
        continue
    updated = content
    updated = updated.replace('label: "Pending"', 'label: "New Complaints"')
    updated = updated.replace('label="Pending"', 'label="New Complaints"')
    updated = updated.replace('>Pending</Text>', '>New Complaints</Text>')
    updated = updated.replace('"Pending Complaints"', '"New Complaints"')
    updated = updated.replace('label: "Active"', 'label: "In Progress"')
    updated = updated.replace('label="Active"', 'label="In Progress"')
    updated = updated.replace('>Active</Text>', '>In Progress</Text>')
    if updated != content:
        file.write_text(updated)

print("Focused broadcast edit, profile navigation and complaint wording fixes applied.")
