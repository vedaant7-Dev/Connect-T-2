from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = "JOB_ROLE_SESSION_STANDALONE_V107"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"{label}: missing expected source text")
    return text.replace(old, new)


# Remove obsolete role-lock wording in all supported languages.
path = "mobile/i18n/jobsCopy.ts"
text = read(path)
replacements = [
    ('oneRoleTitle: "One active Job Portal role"', 'oneRoleTitle: "Switch roles anytime"'),
    ('oneRoleBody: "Your selected role is locked after profile creation. A later correction requires Super Admin approval."', 'oneRoleBody: "Start as a Job Seeker or Employer. You can switch between both roles anytime without approval."'),
    ('chooseCarefully: "Choose carefully. You can go back before saving."', 'chooseCarefully: "Choose how you want to start. You can switch roles anytime later."'),
    ('confirmedRole: "Confirmed role"', 'confirmedRole: "Selected role"'),
    ('activeRoleAfterSave: "This becomes your active Job Portal role after saving."', 'activeRoleAfterSave: "This role opens now. You can switch anytime from your Job Portal profile."'),
    ('roleLockWarning: "This role cannot be changed directly after profile creation. A future correction must be requested and approved by the Super Admin."', 'roleLockWarning: "Start with this role now. You can switch to Job Seeker or Employer anytime without approval."'),
    ('roleLockedBody: "Direct switching is disabled to protect jobs, applications and verified identity."', 'roleLockedBody: "Switch instantly between Job Seeker and Employer anytime. No approval is required."'),
    ('requestCorrection: "Request role correction"', 'requestCorrection: "Switch role"'),

    ('oneRoleTitle: "एक सक्रिय नोकरी पोर्टल भूमिका"', 'oneRoleTitle: "भूमिका कधीही बदला"'),
    ('oneRoleBody: "प्रोफाइल तयार झाल्यानंतर निवडलेली भूमिका लॉक होईल. नंतरच्या बदलासाठी सुपर ॲडमिनची मंजुरी आवश्यक आहे."', 'oneRoleBody: "नोकरी शोधणारा किंवा नियोक्ता म्हणून सुरुवात करा. मंजुरीशिवाय दोन्ही भूमिका कधीही बदलता येतील."'),
    ('chooseCarefully: "काळजीपूर्वक निवडा. जतन करण्यापूर्वी मागे जाऊ शकता."', 'chooseCarefully: "सुरुवातीची भूमिका निवडा. नंतर ती कधीही बदलता येईल."'),
    ('confirmedRole: "निश्चित भूमिका"', 'confirmedRole: "निवडलेली भूमिका"'),
    ('activeRoleAfterSave: "जतन केल्यानंतर ही तुमची सक्रिय नोकरी पोर्टल भूमिका बनेल."', 'activeRoleAfterSave: "ही भूमिका आता उघडेल. प्रोफाइलमधून भूमिका कधीही बदलता येईल."'),
    ('roleLockWarning: "प्रोफाइल तयार झाल्यानंतर भूमिका थेट बदलता येणार नाही. भविष्यातील बदलासाठी सुपर ॲडमिनची मंजुरी आवश्यक आहे."', 'roleLockWarning: "या भूमिकेसह सुरुवात करा. मंजुरीशिवाय नोकरी शोधणारा किंवा नियोक्ता भूमिका कधीही बदलता येईल."'),
    ('roleLockedBody: "नोकऱ्या, अर्ज आणि सत्यापित ओळख सुरक्षित ठेवण्यासाठी थेट बदल बंद आहे."', 'roleLockedBody: "नोकरी शोधणारा आणि नियोक्ता भूमिका मंजुरीशिवाय कधीही त्वरित बदला."'),
    ('requestCorrection: "भूमिका दुरुस्तीची विनंती"', 'requestCorrection: "भूमिका बदला"'),

    ('oneRoleTitle: "एक सक्रिय जॉब पोर्टल भूमिका"', 'oneRoleTitle: "भूमिका कभी भी बदलें"'),
    ('oneRoleBody: "प्रोफ़ाइल बनने के बाद चुनी गई भूमिका लॉक हो जाएगी। बाद के बदलाव के लिए सुपर एडमिन की मंजूरी जरूरी है।"', 'oneRoleBody: "नौकरी खोजने वाले या नियोक्ता के रूप में शुरू करें। बिना मंजूरी दोनों भूमिकाएँ कभी भी बदलें।"'),
    ('chooseCarefully: "ध्यान से चुनें। सेव करने से पहले वापस जा सकते हैं।"', 'chooseCarefully: "शुरुआती भूमिका चुनें। बाद में इसे कभी भी बदल सकते हैं।"'),
    ('confirmedRole: "पुष्ट भूमिका"', 'confirmedRole: "चुनी गई भूमिका"'),
    ('activeRoleAfterSave: "सेव करने के बाद यह आपकी सक्रिय जॉब पोर्टल भूमिका बनेगी।"', 'activeRoleAfterSave: "यह भूमिका अब खुलेगी। प्रोफ़ाइल से भूमिका कभी भी बदलें।"'),
    ('roleLockWarning: "प्रोफ़ाइल बनने के बाद भूमिका सीधे नहीं बदली जा सकती। भविष्य के बदलाव के लिए सुपर एडमिन की मंजूरी जरूरी है।"', 'roleLockWarning: "इस भूमिका से शुरू करें। बिना मंजूरी नौकरी खोजने वाला या नियोक्ता कभी भी बदलें।"'),
    ('roleLockedBody: "नौकरियों, आवेदनों और सत्यापित पहचान की सुरक्षा के लिए सीधा बदलाव बंद है।"', 'roleLockedBody: "नौकरी खोजने वाले और नियोक्ता के बीच बिना मंजूरी तुरंत बदलें।"'),
    ('requestCorrection: "भूमिका सुधार का अनुरोध"', 'requestCorrection: "भूमिका बदलें"'),
]
for old, new in replacements:
    text = replace_required(text, old, new, f"jobsCopy {old[:24]}")
write(path, text)


# Make onboarding role selection direct and remove the obsolete lock confirmation modal.
path = "mobile/screens/LocalizedJobProfileSetupScreen.tsx"
text = read(path)
text = text.replace("  Modal,\n", "")
text = replace_once(text,
    '  const [role, setRole] = useState<JobsUserRole | null>(null);\n  const [pendingRole, setPendingRole] = useState<JobsUserRole | null>(null);\n  const [roleConfirmed, setRoleConfirmed] = useState(false);\n  const [showConfirm, setShowConfirm] = useState(false);',
    '  const [role, setRole] = useState<JobsUserRole | null>(null);\n  const [roleConfirmed, setRoleConfirmed] = useState(false);',
    "setup role state")
text = replace_once(text,
    '  const chooseRole = (nextRole: JobsUserRole) => {\n    setPendingRole(nextRole);\n    setShowConfirm(true);\n    setError("");\n  };\n\n  const confirmRole = () => {\n    if (!pendingRole) return;\n    setRole(pendingRole);\n    setRoleConfirmed(true);\n    setShowConfirm(false);\n  };',
    '  const chooseRole = (nextRole: JobsUserRole) => {\n    setRole(nextRole);\n    setRoleConfirmed(true);\n    setError("");\n  };',
    "direct role selection")
text = replace_once(text,
    '    setRole(null);\n    setPendingRole(null);\n    setRoleConfirmed(false);',
    '    setRole(null);\n    setRoleConfirmed(false);',
    "reset role")
text = text.replace('selected={pendingRole === "seeker"}', 'selected={role === "seeker"}')
text = text.replace('selected={pendingRole === "employer"}', 'selected={role === "employer"}')
text = text.replace('<Feather name="lock" size={20} color={ORANGE} />', '<Feather name="repeat" size={20} color={ORANGE} />')
modal_start = '      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>'
modal_end = '      </Modal>\n'
if modal_start in text:
    start = text.index(modal_start)
    end = text.index(modal_end, start) + len(modal_end)
    text = text[:start] + text[end:]
write(path, text)


# Prefer the civic token but allow a valid Job Portal token for onboarding/switch recovery.
path = "mobile/lib/api.ts"
text = read(path)
old = '''  const usesCivicJobSession = path === "/api/job-portal/session" || path === "/api/job-portal/onboarding" || path === "/api/job-portal/switch-role";
  const token = path.startsWith("/api/job-portal/") && !usesCivicJobSession
    ? isSuperAdminToken(civicToken)
      ? civicToken
      : jobsToken || civicToken
    : civicToken;'''
new = '''  const usesCivicOrJobsSession = path === "/api/job-portal/session" || path === "/api/job-portal/onboarding" || path === "/api/job-portal/switch-role";
  const token = path.startsWith("/api/job-portal/") && !usesCivicOrJobsSession
    ? isSuperAdminToken(civicToken)
      ? civicToken
      : jobsToken || civicToken
    : usesCivicOrJobsSession
      ? civicToken || jobsToken
      : civicToken;'''
text = replace_once(text, old, new, "job session auth headers")
write(path, text)


# Allow backend Job Portal session/switch routes to securely recover the civic citizen by a valid Job token.
path = "backend/jobPortalSessionRecoveryPatch.js"
text = read(path)
helper = '''
async function resolveCivicUser(db, auth) {
  if (!auth?.sub) return null;
  if (auth.scope !== "job_portal") {
    const [rows] = await db.query(
      "SELECT id, name, mobile, dob, email, address, profile_photo, role FROM users WHERE id = ? LIMIT 1",
      [auth.sub],
    );
    return rows[0] || null;
  }

  let phone = cleanPhone(auth.mobile);
  if (phone.length !== 10) {
    const [jobRows] = await db.query("SELECT phone FROM job_portal_users WHERE id = ? LIMIT 1", [auth.sub]);
    phone = cleanPhone(jobRows[0]?.phone);
  }
  if (phone.length !== 10) return null;

  const [rows] = await db.query(
    `SELECT id, name, mobile, dob, email, address, profile_photo, role
     FROM users
     WHERE role = 'citizen'
       AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(mobile, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10) = ?
     ORDER BY created_at ASC LIMIT 1`,
    [phone],
  );
  return rows[0] || null;
}
'''
anchor = 'function userPayload(row) {'
if helper.strip() not in text:
    text = text.replace(anchor, helper + '\n' + anchor, 1)
old_auth = '''    const auth = verifyRequestToken(req);
    if (!auth?.sub || auth.scope === "job_portal") {
      return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    }

    const [civicRows] = await pool.query(
      "SELECT id, name, mobile, dob, email, address, profile_photo, role FROM users WHERE id = ? LIMIT 1",
      [auth.sub],
    );
    const civicUser = civicRows[0];'''
new_auth = '''    const auth = verifyRequestToken(req);
    if (!auth?.sub) {
      return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    }

    const civicUser = await resolveCivicUser(pool, auth);'''
if text.count(old_auth) != 2:
    raise RuntimeError(f"session recovery auth blocks: expected 2, found {text.count(old_auth)}")
text = text.replace(old_auth, new_auth)
text = text.replace('module.exports = { session, switchRole, findOrCreateRoleProfile };', 'module.exports = { session, switchRole, findOrCreateRoleProfile, resolveCivicUser };')
write(path, text)


# Allow onboarding to recover from an existing valid Job Portal token as well.
path = "backend/jobPortalOnboardingPatch.js"
text = read(path)
helper2 = '''
async function resolveCivicUser(db, auth) {
  if (!auth?.sub) return null;
  if (auth.scope !== "job_portal") {
    const [rows] = await db.query(
      `SELECT id, name, mobile, dob, email, address, profile_photo, role
       FROM users WHERE id = ? LIMIT 1`,
      [auth.sub],
    );
    return rows[0] || null;
  }

  let phone = cleanPhone(auth.mobile);
  if (phone.length !== 10) {
    const [jobRows] = await db.query("SELECT phone FROM job_portal_users WHERE id = ? LIMIT 1", [auth.sub]);
    phone = cleanPhone(jobRows[0]?.phone);
  }
  if (phone.length !== 10) return null;

  const [rows] = await db.query(
    `SELECT id, name, mobile, dob, email, address, profile_photo, role
     FROM users
     WHERE role = 'citizen'
       AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(mobile, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10) = ?
     ORDER BY created_at ASC LIMIT 1`,
    [phone],
  );
  return rows[0] || null;
}
'''
anchor2 = 'async function ensureSchema(db) {'
if helper2.strip() not in text:
    text = text.replace(anchor2, helper2 + '\n' + anchor2, 1)
old = '''    const auth = verifyRequestToken(req);
    if (!auth?.sub || auth.scope === "job_portal") {
      return sendJson(res, 401, {
        success: false,
        message: "Please log in to Connect T first.",
      });
    }

    const [civicRows] = await db.query(
      `SELECT id, name, mobile, dob, email, address, profile_photo, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [auth.sub],
    );
    const civicUser = civicRows[0];'''
new = '''    const auth = verifyRequestToken(req);
    if (!auth?.sub) {
      return sendJson(res, 401, {
        success: false,
        message: "Please log in to Connect T first.",
      });
    }

    const civicUser = await resolveCivicUser(db, auth);'''
text = replace_once(text, old, new, "onboarding auth recovery")
text = text.replace('module.exports = {};', 'module.exports = { onboarding, resolveCivicUser };')
write(path, text)


# Remove complaint cards from the Nagarsevak Dashboard/Home. Status cards still open Work Progress lists.
path = "mobile/app/(tabs)/admin.tsx"
text = read(path)
text = text.replace('  const { complaints, updateStatus, refreshComplaints } = useComplaints();', '  const { complaints, refreshComplaints } = useComplaints();')
text = text.replace('  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);\n', '')
filtered = '''  const filteredComplaints = filter === "all"
    ? wardComplaints
    : wardComplaints.filter((complaint) => {
        if (filter === "in_progress") return complaint.status === "in_progress" || complaint.status === "assigned";
        return complaint.status === filter;
      });
'''
text = text.replace(filtered, '')
list_block = '''        <View style={styles.listSection}>
          {filteredComplaints.length === 0 ? (
            <View style={styles.empty}><Feather name="check-circle" size={34} color="#CBD5E1" /><Text style={styles.emptyText}>{t("noComplaintsInCategory")}</Text></View>
          ) : filteredComplaints.map((item) => <ComplaintCard key={item.id} complaint={item} onAction={() => setActiveComplaint(item)} />)}
        </View>
'''
text = replace_once(text, list_block, '', "Nagarsevak dashboard complaint list")
modal_block = '''      {activeComplaint ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setActiveComplaint(null)}>
          <ActionModal
            complaint={activeComplaint}
            onClose={() => setActiveComplaint(null)}
            onUpdate={(status, note) => {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              updateStatus(activeComplaint.id, status, note, user.name || "Nagarsevak");
            }}
          />
        </Modal>
      ) : null}
'''
text = replace_once(text, modal_block, '', "Nagarsevak dashboard complaint modal")
write(path, text)


# Build a bundled, optimized standalone APK that does not wait for Metro.
path = "mobile/android/app/build.gradle"
text = read(path)
text = text.replace('versionCode 4\n        versionName "1.0.3"', 'versionCode 5\n        versionName "1.0.4"')
release_end = '''        release {
            if (hasReleaseSigning) {
                signingConfig signingConfigs.release
            }
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
            shrinkResources enableShrinkResources.toBoolean()
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            def enablePngCrunchInRelease = findProperty('android.enablePngCrunchInReleaseBuilds') ?: 'true'
            crunchPngs enablePngCrunchInRelease.toBoolean()
        }
'''
standalone = release_end + '''        standalone {
            initWith release
            signingConfig signingConfigs.debug
            matchingFallbacks = ['release']
            minifyEnabled true
            shrinkResources true
            crunchPngs true
        }
'''
text = replace_once(text, release_end, standalone, "standalone Android build type")
write(path, text)


# Regression checks for the exact device-reported failures.
test = f'''import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {{ fileURLToPath }} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Job Portal onboarding has no role lock or Super Admin approval gate", () => {{
  const setup = read("screens/LocalizedJobProfileSetupScreen.tsx");
  const copy = read("i18n/jobsCopy.ts");
  assert.doesNotMatch(setup, /showConfirm|pendingRole|<Modal visible=\{{showConfirm\}}/);
  assert.match(setup, /setRole\(nextRole\)/);
  assert.match(setup, /name="repeat"/);
  assert.doesNotMatch(copy, /selected role is locked|requires Super Admin approval|भूमिका लॉक होईल|सुपर ॲडमिनची मंजुरी आवश्यक|भूमिका लॉक हो जाएगी|सुपर एडमिन की मंजूरी जरूरी/);
}});

test("Job setup and switching accept a valid civic or Job Portal session", () => {{
  const api = read("lib/api.ts");
  assert.match(api, /civicToken \|\| jobsToken/);
}});

test("Nagarsevak Dashboard does not render complaint cards", () => {{
  const admin = read("app/(tabs)/admin.tsx");
  const returnIndex = admin.indexOf("  return (", admin.indexOf("export default function AdminScreen"));
  const rendered = admin.slice(returnIndex);
  assert.doesNotMatch(rendered, /<ComplaintCard/);
  assert.doesNotMatch(rendered, /filteredComplaints/);
  assert.match(rendered, /dashboardFilters\.map/);
}});

test("Android includes a bundled optimized standalone APK variant", () => {{
  const gradle = read("android/app/build.gradle");
  assert.match(gradle, /standalone \{{/);
  assert.match(gradle, /initWith release/);
  assert.match(gradle, /signingConfig signingConfigs\.debug/);
  assert.match(gradle, /minifyEnabled true/);
  assert.match(gradle, /shrinkResources true/);
}});
'''
write("mobile/test/job-role-session-standalone-v107.test.mjs", test)

print(MARKER)
