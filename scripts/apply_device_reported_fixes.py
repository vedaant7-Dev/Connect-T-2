from pathlib import Path
import re, json
R=Path(__file__).resolve().parents[1]
def rd(p): return (R/p).read_text()
def wr(p,s): (R/p).write_text(s)
def one(s,a,b,n):
 c=s.count(a)
 if c!=1: raise RuntimeError(f'{n}: {c}')
 return s.replace(a,b,1)
def sub(s,p,r,n):
 s,c=re.subn(p,r,s,count=1,flags=re.S)
 if c!=1: raise RuntimeError(f'{n}: {c}')
 return s

# complaint viewer: SDK56 save API + absolute upload URL
p='mobile/components/ComplaintMediaViewer.tsx'; s=rd(p)
s=one(s,'import * as MediaLibrary from "expo-media-library";','import * as MediaLibrary from "expo-media-library/legacy";','media legacy')
s=one(s,'import * as Sharing from "expo-sharing";\n','import * as Sharing from "expo-sharing";\nimport { buildApiUrl } from "@/constants/api";\n\n// DEVICE_REPORTED_FIXES_V105\n','api url')
s=one(s,'export function inferComplaintMediaKind(uri?: string | null): MediaKind {','''export function resolveComplaintMediaUri(uri?: string | null) {
  const value = String(uri || "").trim();
  if (!value) return "";
  if (/^(?:https?:|data:|file:|content:)/i.test(value)) return value;
  return buildApiUrl(value.startsWith("/") ? value : `/${value}`);
}

export function inferComplaintMediaKind(uri?: string | null): MediaKind {''','resolver')
s=one(s,'  const safeUri = String(uri || "").trim();','  const safeUri = resolveComplaintMediaUri(uri);','resolved uri'); wr(p,s)

# civic home: remove alert/live section; broadcasts stay in News
p='mobile/app/(tabs)/index.tsx'; s=rd(p)
s=sub(s,r'\nfunction InlineVideo\(\{ uri, style \}: \{ uri: string; style: any \}\) \{.*?\n\}\n','\n','home video')
s=sub(s,r'\n\s*const alertItems: AppAlert\[\] = broadcasts.*?\n\s*const newsItems =','\n  const newsItems =','home projection')
s=sub(s,r'\n\s*\{\/\* ALERTS & NEWS \*\/\}.*?\n\s*\{\/\* REPORT A PROBLEM CTA \*\/\}','\n\n        {/* REPORT A PROBLEM CTA */}','home alerts'); wr(p,s)

# citizen News: all official media opens inside app with View/Save/Share
p='mobile/app/(tabs)/feed.tsx'; s=rd(p)
s=one(s,'import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Image, Share, TextInput, Linking } from "react-native";','import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Image, Share, TextInput } from "react-native";','feed import')
s=one(s,'import TopShade from "@/components/TopShade";\n','import TopShade from "@/components/TopShade";\nimport ComplaintMediaViewer from "@/components/ComplaintMediaViewer";\n','feed viewer')
s=sub(s,r'\nfunction InlineVideo\(\{ uri \}: \{ uri: string \}\) \{.*?\}\n','\n','feed inline video')
s=one(s,'{item.media?.type === "image" ? <Image source={{ uri: item.media.uri }} style={styles.postImage} resizeMode="contain" /> : item.media?.type === "video" ? <InlineVideo uri={item.media.uri} /> : null}','{item.media?.uri ? <ComplaintMediaViewer uri={item.media.uri} title={item.title} label={item.media.type === "video" ? "Official video" : "Official image"} /> : null}','alert viewer')
s=one(s,'  const router = useRouter(); const meta = broadcastMeta(item.category);','  const meta = broadcastMeta(item.category);','remove router')
s=one(s,'return <TouchableOpacity style={[styles.card, styles.officialCard, highlighted && styles.highlightedCard]} onPress={() => router.push({ pathname: "/(tabs)/feed", params: { broadcastId: item.id } } as any)} activeOpacity={0.9}>','return <View style={[styles.card, styles.officialCard, highlighted && styles.highlightedCard]}>','card open')
s=one(s,'{item.mediaType === "image" && item.mediaUri ? <Image source={{ uri: item.mediaUri }} style={styles.postImage} resizeMode="contain" /> : item.mediaType === "video" && item.mediaUri ? <InlineVideo uri={item.mediaUri} /> : null}','{item.mediaUri ? <ComplaintMediaViewer uri={item.mediaUri} title={item.title} label={item.mediaType === "video" ? "Broadcast video" : "Broadcast image"} /> : null}','broadcast viewer')
s=one(s,'<View style={styles.broadcastFooter}><View style={styles.newsInfoChip}><Feather name="map-pin" size={11} color="#64748B" /><Text style={styles.newsInfoText}>{item.ward || "All wards"}</Text></View><Text style={styles.openText}>Open update</Text><Feather name="chevron-right" size={16} color="#EA580C" /></View></TouchableOpacity>;','<View style={styles.broadcastFooter}><View style={styles.newsInfoChip}><Feather name="map-pin" size={11} color="#64748B" /><Text style={styles.newsInfoText}>{item.ward || "All wards"}</Text></View><Text style={styles.openText}>Official update</Text></View></View>;','card close'); wr(p,s)

# Broadcast Center: in-app viewer + stable Android keyboard sheet
p='mobile/screens/BroadcastCenterMediaScreen.tsx'; s=rd(p)
s=one(s,'import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";','import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";','broadcast imports')
s=one(s,'import ConfirmActionModal from "@/components/ConfirmActionModal";\n','import ConfirmActionModal from "@/components/ConfirmActionModal";\nimport ComplaintMediaViewer from "@/components/ComplaintMediaViewer";\n','broadcast viewer')
s=sub(s,r'\s*\{item\.mediaUri \? item\.mediaType === "image" \? <Image.*?\) : null\}','\n      {item.mediaUri ? <ComplaintMediaViewer uri={item.mediaUri} title={item.title} label={item.mediaType === "video" ? "Broadcast video" : "Broadcast image"} accentColor={ORANGE} /> : null}','broadcast card media')
s=one(s,'<KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>','<KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>','broadcast keyboard')
s=one(s,'<AppScrollView contentContainerStyle={styles.formContent} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">','<AppScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>','broadcast scroll')
s=one(s,'sheet: { maxHeight: "94%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", overflow: "hidden" }','sheet: { height: "94%", maxHeight: "94%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "white", overflow: "hidden" }','sheet height')
s=one(s,'formContent: { padding: 18, paddingBottom: 38 }','formScroll: { flex: 1 }, formContent: { padding: 18, paddingBottom: 38 }','scroll style'); wr(p,s)

# Add Camera and Gallery choices to Civic + Job profiles
def photos(s, setter, translated, civic):
 perm='c("photoPermissionBody")' if translated else '"Allow photo access to choose a profile image."'
 bad='c("unsupportedImageBody")' if translated else '"Choose a JPEG, PNG or WebP profile image."'
 big='c("imageTooLargeBody")' if translated else '"Choose a profile image smaller than 8MB."'
 block=f'''  const acceptProfilePhoto = (asset?: ImagePicker.ImagePickerAsset | null) => {{
    if (!asset) return;
    const mime = String(asset.mimeType || "").toLowerCase();
    if (mime && !["image/jpeg", "image/png", "image/webp"].includes(mime)) return setFormError({bad});
    if (asset.fileSize && asset.fileSize > MAX_PROFILE_PHOTO_BYTES) return setFormError({big});
    {setter}
  }};
  const pickPhotoFromGallery = async () => {{
    setFormError("");
    if (Platform.OS !== "web") {{ const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return setFormError({perm}); }}
    const result = await ImagePicker.launchImageLibraryAsync({{ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.55 }});
    acceptProfilePhoto(result.canceled ? null : result.assets[0]);
  }};
  const pickPhotoFromCamera = async () => {{
    setFormError("");
    if (Platform.OS === "web") return pickPhotoFromGallery();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setFormError("Allow camera access to take a profile photo.");
    const result = await ImagePicker.launchCameraAsync({{ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.55 }});
    acceptProfilePhoto(result.canceled ? null : result.assets[0]);
  }};

'''
 s=sub(s,r'  const pickPhoto = async \(\) => \{.*?\n  \};\n\n  const saveProfile = async \(\) => \{',block+'  const saveProfile = async () => {','photo functions')
 old='onPress={pickPhoto} accessibilityLabel={c("editPhoto")}' if civic else 'onPress={pickPhoto} accessibilityLabel={c("changePhoto")}'
 new='onPress={pickPhotoFromGallery} accessibilityLabel={c("editPhoto")}' if civic else 'onPress={pickPhotoFromGallery} accessibilityLabel={c("changePhoto")}'
 s=one(s,old,new,'photo avatar')
 key='editPhoto' if civic else 'changePhoto'
 remove='setForm((current) => current ? { ...current, profilePhoto: null } : current)' if civic else 'setField("profilePhoto", null)'
 old=f'<View style={{{{ flex: 1 }}}}><Text style={{styles.actionTitle}}>{{c("{key}")}}</Text><TouchableOpacity onPress={{() => {remove}}}><Text style={{styles.removePhotoText}}>{{c("removePhoto")}}</Text></TouchableOpacity></View>'
 new=f'<View style={{{{ flex: 1 }}}}><Text style={{styles.actionTitle}}>{{c("{key}")}}</Text><View style={{styles.photoSourceRow}}><TouchableOpacity style={{styles.photoSourceButton}} onPress={{pickPhotoFromCamera}}><Feather name="camera" size={{14}} color={{ORANGE}} /><Text style={{styles.photoSourceText}}>Camera</Text></TouchableOpacity><TouchableOpacity style={{styles.photoSourceButton}} onPress={{pickPhotoFromGallery}}><Feather name="image" size={{14}} color={{ORANGE}} /><Text style={{styles.photoSourceText}}>Gallery</Text></TouchableOpacity></View><TouchableOpacity onPress={{() => {remove}}}><Text style={{styles.removePhotoText}}>{{c("removePhoto")}}</Text></TouchableOpacity></View>'
 s=one(s,old,new,'photo buttons')
 s=one(s,'  removePhotoText: {','  photoSourceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 7 },\n  photoSourceButton: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },\n  photoSourceText: { color: ORANGE, fontSize: 11, fontFamily: "Inter_600SemiBold" },\n  removePhotoText: {','photo styles')
 return s
p='mobile/screens/CivicProfileScreen.tsx'; wr(p,photos(rd(p),'setForm((current) => current ? { ...current, profilePhoto: asset.uri } : current);',False,True))
p='mobile/screens/LocalizedJobPortalProfileScreen.tsx'; wr(p,photos(rd(p),'setField("profilePhoto", asset.uri);',True,False))

# Job onboarding/session: continue directly from the valid Civic login
p='mobile/context/JobsAuthContext.tsx'; s=rd(p)
s=one(s,'  activateJobs: (role: JobsUserRole, data?: Partial<JobsUser>) => Promise<void>;\n','  activateJobs: (role: JobsUserRole, data?: Partial<JobsUser>) => Promise<void>;\n  activateJobsFromOnboarding: (user: unknown, token?: string | null) => Promise<void>;\n','context type')
s=one(s,'  const activateJobs = async (role: JobsUserRole, data: Partial<JobsUser> = {}) => {\n    await openUnifiedSession(role, data);\n  };\n','''  const activateJobs = async (role: JobsUserRole, data: Partial<JobsUser> = {}) => { await openUnifiedSession(role, data); };
  const activateJobsFromOnboarding = async (rawUser: unknown, token?: string | null) => {
    if (token) await storeJobsAuthToken(token);
    await persist(normalizeUser(rawUser || {}));
  };
''','direct activation')
s=one(s,'    if (Object.prototype.hasOwnProperty.call(data, "profilePhoto")) {\n      payload.profilePhoto = await toUploadableMediaUri(data.profilePhoto);\n    }\n','''    const photoChanged = Object.prototype.hasOwnProperty.call(data, "profilePhoto") && (data.profilePhoto ?? null) !== (jobsUser.profilePhoto ?? null);
    if (photoChanged) payload.profilePhoto = await toUploadableMediaUri(data.profilePhoto); else delete payload.profilePhoto;
''','unchanged job photo')
s=one(s,'<JobsContext.Provider value={{ jobsUser, loading, activateJobs, logoutJobs, updateJobsUser, addCompany, updateCompany }}>','<JobsContext.Provider value={{ jobsUser, loading, activateJobs, activateJobsFromOnboarding, logoutJobs, updateJobsUser, addCompany, updateCompany }}>','provider'); wr(p,s)

p='mobile/screens/LocalizedJobProfileSetupScreen.tsx'; s=rd(p)
s=one(s,'  const { activateJobs } = useJobsAuth();','  const { activateJobsFromOnboarding } = useJobsAuth();','setup auth')
s=one(s,'  const [hiringCategories, setHiringCategories] = useState("");\n','','employer category state')
s=one(s,'      if (hiringCategories.trim().length < 2) return c("validationHiring");\n','','employer category validation')
s=one(s,'        about: hiringCategories.trim(),\n','','employer category payload')
s=one(s,'      await apiPost("/api/job-portal/onboarding", role === "seeker" ? {','      const response = await apiPost<any>("/api/job-portal/onboarding", role === "seeker" ? {','onboarding response')
s=one(s,'      await activateJobs(role);\n      router.replace("/jobs/(tabs)" as any);','      await activateJobsFromOnboarding(response.user || response.data || response, response.token);\n      router.replace("/jobs/(tabs)" as any);','continue setup')
s=one(s,'                    <Field label={`${c("hiringCategories")} *`} value={hiringCategories} onChangeText={setHiringCategories} placeholder={c("hiringCategoriesPlaceholder")} multiline />\n','','employer category UI'); wr(p,s)

# Auto-recover a stale Job token once using the valid Civic session
p='mobile/lib/api.ts'; s=rd(p)
s=one(s,'let cacheGeneration = 0;\n','let cacheGeneration = 0;\nlet jobsRecoveryPromise: Promise<boolean> | null = null;\n','recovery state')
s=one(s,'async function request<T = any>(\n','''function isRecoverableJobsPath(path: string) { return path.startsWith("/api/job-portal/") && path !== "/api/job-portal/session" && path !== "/api/job-portal/onboarding"; }
async function recoverJobsSession() {
  if (jobsRecoveryPromise) return jobsRecoveryPromise;
  jobsRecoveryPromise = (async () => {
    const civicToken = await getStoredAuthToken(); if (!civicToken) return false;
    const res = await fetchWithTimeout(apiUrl("/api/job-portal/session"), { method: "POST", headers: { Authorization: `Bearer ${civicToken}`, "Content-Type": "application/json" }, body: "{}" });
    if (!res.ok) return false;
    const data = await parseSuccess<any>(res, "POST", "/api/job-portal/session");
    if (!data?.token) return false; await storeJobsAuthToken(data.token); return true;
  })().catch(() => false).finally(() => { jobsRecoveryPromise = null; });
  return jobsRecoveryPromise;
}

async function request<T = any>(
''','recovery helper')
s=one(s,'    await assertResponse(res, method, path);\n    return parseSuccess<T>(res, method, path);','''    if (res.status === 401 && isRecoverableJobsPath(path) && await recoverJobsSession()) {
      res = await fetchWithTimeout(url, { method, headers: await getAuthHeaders(path, body), body: body === undefined ? undefined : JSON.stringify(body) });
    }
    await assertResponse(res, method, path);
    return parseSuccess<T>(res, method, path);''','retry recovered session'); wr(p,s)

# Backend employer setup no longer requires category
p='backend/jobPortalOnboardingPatch.js'; s=rd(p)
s=sub(s,r'\n\s*if \(role === "employer" && about\.length < 2\) \{.*?\n\s*\}\n','\n','backend employer category')
s=one(s,'        about || null,','        role === "seeker" ? about || null : null,','seeker category only'); wr(p,s)

# Profile persistence compatibility for older live schemas
p='backend/server.js'; s=rd(p)
s=one(s,'});\n\nconst createId = (prefix) =>','''});

let userProfileSchemaReady = null;
async function ensureUserProfileSchema() {
  if (userProfileSchemaReady) return userProfileSchemaReady;
  userProfileSchemaReady = (async () => {
    const defs = { ward_changed: "TINYINT(1) NOT NULL DEFAULT 0", profile_photo: "LONGTEXT NULL", notify_email: "TINYINT(1) NOT NULL DEFAULT 0", notify_whatsapp: "TINYINT(1) NOT NULL DEFAULT 0", office_address: "TEXT NULL", residence_address: "TEXT NULL", office_timings: "VARCHAR(190) NULL", contact_name: "VARCHAR(160) NULL", contact_number: "VARCHAR(20) NULL" };
    const [rows] = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'");
    const existing = new Set(rows.map((row) => String(row.COLUMN_NAME)));
    for (const [column, definition] of Object.entries(defs)) if (!existing.has(column)) await db.query(`ALTER TABLE users ADD COLUMN \\`${column}\\` ${definition}`);
  })().catch((error) => { userProfileSchemaReady = null; throw error; });
  return userProfileSchemaReady;
}

const createId = (prefix) =>''','profile schema helper')
s=one(s,'async function currentCivicUser(auth) {\n  if (!auth?.sub) return null;','async function currentCivicUser(auth) {\n  if (!auth?.sub) return null;\n  await ensureUserProfileSchema();','session schema')
s=one(s,'            profile_photo, nagarsevak_id, last_login_at, created_at','            profile_photo, nagarsevak_id, ward_changed, notify_email, notify_whatsapp,\n            office_address, residence_address, office_timings, contact_name, contact_number,\n            last_login_at, created_at','profile hydrate')
s=one(s,'app.post("/api/users", async (req, res) => {\n  try {\n    await ensureRoleAuthorizationSchema(db);','app.post("/api/users", async (req, res) => {\n  try {\n    await ensureRoleAuthorizationSchema(db);\n    await ensureUserProfileSchema();','profile save schema'); wr(p,s)

# Version bump
p='mobile/app.json'; data=json.loads(rd(p)); data['expo']['version']='1.0.5'; data['expo']['android']['versionCode']=6; wr(p,json.dumps(data,indent=2)+'\n')
