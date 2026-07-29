from pathlib import Path
import re

PROFILE = Path("mobile/screens/LocalizedJobPortalProfileScreen.tsx")
TEST = Path("mobile/test/job-civic-profile-consistency.test.mjs")

text = PROFILE.read_text(encoding="utf-8")
if "INSTANT_JOB_ROLE_SWITCH_V2" in text:
    print("Instant role switch fix already applied.")
    raise SystemExit(0)

original = text

text = text.replace(
    'import { apiGet, apiPost, getUserErrorMessage } from "@/lib/api";',
    'import { getUserErrorMessage } from "@/lib/api";',
)
text = re.sub(r'type RoleRequest = \{.*?\};\n\n', '', text, count=1, flags=re.S)
text = text.replace('const ORANGE = "#EA580C";', 'const ORANGE = "#EA580C";\n// INSTANT_JOB_ROLE_SWITCH_V2')
text = text.replace(
    '  const { jobsUser, updateJobsUser } = useJobsAuth();',
    '  const { jobsUser, updateJobsUser, activateJobs } = useJobsAuth();',
)
text = text.replace('  const [roleRequestVisible, setRoleRequestVisible] = useState(false);\n', '')
text = text.replace('  const [requestLoading, setRequestLoading] = useState(false);\n', '')
text = text.replace('  const [reason, setReason] = useState("");\n', '')
text = text.replace('  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);\n', '')
text = text.replace(
    '  const [saving, setSaving] = useState(false);\n',
    '  const [saving, setSaving] = useState(false);\n'
    '  const [roleSwitchVisible, setRoleSwitchVisible] = useState(false);\n'
    '  const [roleSwitching, setRoleSwitching] = useState(false);\n',
)

old_effect = '''  useEffect(() => {
    if (!jobsUser) return;
    if (!editVisible) setForm(formFromUser(jobsUser));
    void apiGet<{ request: RoleRequest | null }>("/api/job-portal/role-change-requests/me")
      .then((result) => setRoleRequest(result.request || null))
      .catch(() => undefined);
  }, [editVisible, jobsUser?.id]);'''
new_effect = '''  useEffect(() => {
    if (!jobsUser) return;
    if (!editVisible) setForm(formFromUser(jobsUser));
  }, [editVisible, jobsUser]);'''
if old_effect not in text:
    raise RuntimeError("Could not find governed role-request effect")
text = text.replace(old_effect, new_effect)

role_labels_anchor = '''  const isEmployer = jobsUser?.role === "employer";
  const roleLabel = isEmployer ? c("employer") : c("jobSeeker");
  const targetRoleLabel = isEmployer ? c("jobSeeker") : c("employer");'''
role_labels_replacement = '''  const isEmployer = jobsUser?.role === "employer";
  const roleLabel = isEmployer ? c("employer") : c("jobSeeker");
  const targetRole = isEmployer ? "seeker" : "employer";
  const targetRoleLabel = isEmployer ? c("jobSeeker") : c("employer");
  const switchRoleLabel = language === "mr"
    ? `${targetRoleLabel} म्हणून बदला`
    : language === "hi"
      ? `${targetRoleLabel} में बदलें`
      : `Switch to ${targetRoleLabel}`;
  const switchRoleTitle = language === "mr"
    ? "जॉब पोर्टल भूमिका बदलायची?"
    : language === "hi"
      ? "जॉब पोर्टल भूमिका बदलें?"
      : "Switch Job Portal role?";
  const switchRoleBody = language === "mr"
    ? "तुम्ही नोकरी शोधणारा आणि नियोक्ता भूमिका कधीही त्वरित बदलू शकता. मंजुरीची गरज नाही."
    : language === "hi"
      ? "आप नौकरी खोजने वाले और नियोक्ता की भूमिका कभी भी तुरंत बदल सकते हैं। किसी मंजूरी की जरूरत नहीं है।"
      : "Switch instantly between Job Seeker and Employer anytime. No approval is required.";
  const switchRoleSuccess = language === "mr"
    ? `${targetRoleLabel} भूमिका सक्रिय झाली.`
    : language === "hi"
      ? `${targetRoleLabel} भूमिका सक्रिय हो गई।`
      : `${targetRoleLabel} role is now active.`;'''
if role_labels_anchor not in text:
    raise RuntimeError("Could not find role labels anchor")
text = text.replace(role_labels_anchor, role_labels_replacement)

switch_function = '''  const switchJobRole = async () => {
    if (!jobsUser || roleSwitching) return;
    setRoleSwitching(true);
    setPageError("");
    setSuccessMessage("");
    try {
      const sharedLocation = jobsUser.location || jobsUser.address || "Badlapur";
      await activateJobs(targetRole, targetRole === "employer" ? {
        name: jobsUser.name,
        company: jobsUser.company || `${jobsUser.name}'s Business`,
        contactPerson: jobsUser.name,
        location: sharedLocation,
        address: sharedLocation,
      } : {
        name: jobsUser.name,
        location: sharedLocation,
      });
      setRoleSwitchVisible(false);
      setSuccessMessage(switchRoleSuccess);
    } catch (error) {
      setPageError(getUserErrorMessage(error, language === "mr"
        ? "भूमिका बदलता आली नाही. कृपया पुन्हा प्रयत्न करा."
        : language === "hi"
          ? "भूमिका बदली नहीं जा सकी। कृपया फिर से प्रयास करें।"
          : "Role could not be switched. Please try again."));
    } finally {
      setRoleSwitching(false);
    }
  };
'''
text, count = re.subn(
    r'  const submitRoleRequest = async \(\) => \{.*?\n  \};\n\n  const requestColor.*?;\n',
    switch_function,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Could not replace role request submission")

active_section = '''        <Section title={c("activeJobRole")}>
          <DetailRow icon={isEmployer ? "briefcase" : "user-check"} label={c("activeJobRole")} value={roleLabel} verified verifiedText={p("verified")} />
          <ActionRow
            icon="repeat"
            title={switchRoleLabel}
            subtitle={switchRoleBody}
            onPress={() => { setPageError(""); setSuccessMessage(""); setRoleSwitchVisible(true); }}
            disabled={roleSwitching}
          />
        </Section>'''
text, count = re.subn(
    r'        <Section title=\{c\("activeJobRole"\)\}>.*?        </Section>',
    active_section,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Could not replace active role section")

text = text.replace(
    '<View style={styles.rolePill}><Feather name={isEmployer ? "briefcase" : "user"} size={11} color="white" /><Text style={styles.roleText}>{roleLabel}</Text><Feather name="lock" size={10} color="rgba(255,255,255,0.8)" /></View>',
    '<View style={styles.rolePill}><Feather name={isEmployer ? "briefcase" : "user"} size={11} color="white" /><Text style={styles.roleText}>{roleLabel}</Text></View>',
)
text = text.replace(
    'contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) + 116 }}',
    'contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) + 32 }}',
)

text, count = re.subn(
    r'\n      <Modal visible=\{roleRequestVisible\}.*?\n      </Modal>\n',
    '\n',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Could not remove old role request modal")

account_modal_anchor = '''      <ConfirmActionModal
        visible={!!accountActions.pendingAction}'''
role_switch_modal = '''      <ConfirmActionModal
        visible={roleSwitchVisible}
        title={switchRoleTitle}
        message={`${switchRoleBody}\n\n${roleLabel} → ${targetRoleLabel}`}
        confirmLabel={switchRoleLabel}
        cancelLabel={p("cancel")}
        icon="repeat"
        tone="primary"
        busy={roleSwitching}
        errorMessage={pageError}
        onCancel={() => !roleSwitching && setRoleSwitchVisible(false)}
        onConfirm={switchJobRole}
      />

      <ConfirmActionModal
        visible={!!accountActions.pendingAction}'''
if account_modal_anchor not in text:
    raise RuntimeError("Could not find account action modal")
text = text.replace(account_modal_anchor, role_switch_modal, 1)

if text == original:
    raise RuntimeError("No profile changes were made")
PROFILE.write_text(text, encoding="utf-8")

if TEST.exists():
    test_text = TEST.read_text(encoding="utf-8")
    test_text = test_text.replace(
        'test("unified Job Portal profile preserves job fields and governed role correction", () => {',
        'test("unified Job Portal profile preserves fields and supports instant role switching", () => {',
    )
    test_text = test_text.replace(
        '  assert.match(jobs, /\\/api\\/job-portal\\/role-change-requests/);',
        '  assert.match(jobs, /activateJobs/);\n  assert.match(jobs, /roleSwitchVisible/);\n  assert.match(jobs, /Switch to/);',
    )
    test_text = test_text.replace(
        '  assert.doesNotMatch(jobs, /switchJobsRole|portal-select/);',
        '  assert.doesNotMatch(jobs, /role-change-requests|requestCorrection|roleRequestVisible/);\n  assert.doesNotMatch(route, /switchContainer|position: "absolute"/);',
    )
    TEST.write_text(test_text, encoding="utf-8")

print("Applied instant Job Portal role switching and removed the obsolete approval flow.")
