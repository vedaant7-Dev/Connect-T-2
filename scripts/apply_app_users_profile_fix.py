from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:120]}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# Shared profile-photo URL resolver.
photo_util = Path("mobile/lib/profilePhoto.ts")
photo_util.write_text('''import { API_BASE_URL } from "@/constants/api";\n\nexport function resolveProfilePhotoUri(value?: string | null) {\n  const photo = String(value || "").trim();\n  if (!photo) return "";\n  if (/^(https?:|data:|file:|content:|blob:)/i.test(photo)) return photo;\n  if (photo.startsWith("//")) return `https:${photo}`;\n  if (/^\\/9j\\//.test(photo)) return `data:image/jpeg;base64,${photo}`;\n  if (/^iVBOR/.test(photo)) return `data:image/png;base64,${photo}`;\n  const path = photo.startsWith("/") ? photo : `/${photo}`;\n  return `${API_BASE_URL}${path}`;\n}\n''', encoding="utf-8")

# App Users list: resolve profile photos and open full details on tap.
users = Path("mobile/app/super-admin/users.tsx")
replace_once(
    users,
    'import { apiGet, getUserErrorMessage } from "@/lib/api";\n',
    'import { apiGet, getUserErrorMessage } from "@/lib/api";\nimport { resolveProfilePhotoUri } from "@/lib/profilePhoto";\n',
)
replace_once(
    users,
    '  profile_photo?: string;\n',
    '  profile_photo?: string;\n  profile_photo_url?: string;\n',
)
marker = '''function roleStyle(role?: string) {\n  if (role === "super_admin") return { color: "#7C3AED", bg: "#EDE9FE", icon: "shield" };\n  if (role === "nagarsevak") return { color: "#059669", bg: "#D1FAE5", icon: "user-check" };\n  return { color: "#2563EB", bg: "#DBEAFE", icon: "user" };\n}\n'''
avatar = marker + '''\nfunction UserAvatar({ user, style }: { user: AppUser; style: { color: string; bg: string; icon: string } }) {\n  const [failed, setFailed] = useState(false);\n  const uri = resolveProfilePhotoUri(user.profile_photo_url || user.profile_photo);\n  if (uri && !failed) {\n    return <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: style.bg, marginRight: 11 }} resizeMode="cover" />;\n  }\n  return <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: user.avatar_color || style.bg, alignItems: "center", justifyContent: "center", marginRight: 11 }}><Text style={{ color: style.color, fontSize: 17, fontFamily: "Inter_700Bold" }}>{String(user.name || "U").charAt(0).toUpperCase()}</Text></View>;\n}\n'''
replace_once(users, marker, avatar)
replace_once(
    users,
    '            <View style={{ backgroundColor: "white", borderRadius: 17, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>\n',
    '            <TouchableOpacity onPress={() => router.push({ pathname: "/super-admin/user-details", params: { id: item.id } } as any)} activeOpacity={0.86} accessibilityRole="button" accessibilityLabel={`Open ${item.name || "user"} profile`} style={{ backgroundColor: "white", borderRadius: 17, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>\n',
)
old_avatar = '''                {item.profile_photo ? <Image source={{ uri: item.profile_photo }} style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: style.bg, marginRight: 11 }} /> : <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: item.avatar_color || style.bg, alignItems: "center", justifyContent: "center", marginRight: 11 }}><Text style={{ color: style.color, fontSize: 17, fontFamily: "Inter_700Bold" }}>{String(item.name || "U").charAt(0).toUpperCase()}</Text></View>}\n'''
replace_once(users, old_avatar, '                <UserAvatar user={item} style={style} />\n')
replace_once(
    users,
    '                <View style={{ backgroundColor: style.bg, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, flexDirection: "row", alignItems: "center" }}><Feather name={style.icon as any} size={11} color={style.color} /><Text style={{ color: style.color, fontSize: 8.5, marginLeft: 4, fontFamily: "Inter_700Bold" }}>{roleLabel(item.role)}</Text></View>\n',
    '                <View style={{ alignItems: "flex-end", gap: 7 }}><View style={{ backgroundColor: style.bg, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, flexDirection: "row", alignItems: "center" }}><Feather name={style.icon as any} size={11} color={style.color} /><Text style={{ color: style.color, fontSize: 8.5, marginLeft: 4, fontFamily: "Inter_700Bold" }}>{roleLabel(item.role)}</Text></View><Feather name="chevron-right" size={16} color="#94A3B8" /></View>\n',
)
replace_once(users, '            </View>\n          );\n', '            </TouchableOpacity>\n          );\n')

# Hidden full user details screen.
detail = Path("mobile/app/super-admin/user-details.tsx")
detail.write_text('''import React, { useEffect, useMemo, useState } from "react";\nimport { ActivityIndicator, Image, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";\nimport { LinearGradient } from "expo-linear-gradient";\nimport { Feather } from "@expo/vector-icons";\nimport { useLocalSearchParams, useRouter } from "expo-router";\nimport { useSafeAreaInsets } from "react-native-safe-area-context";\n\nimport { apiGet, getUserErrorMessage } from "@/lib/api";\nimport { resolveProfilePhotoUri } from "@/lib/profilePhoto";\n\nconst GREEN = "#16A34A";\n\ntype UserDetails = Record<string, any>;\n\nfunction labelRole(role?: string) {\n  if (role === "super_admin") return "Super Admin";\n  if (role === "nagarsevak") return "Nagarsevak";\n  return "Citizen";\n}\n\nfunction DetailRow({ icon, label, value }: { icon: string; label: string; value: any }) {\n  if (value === null || value === undefined || String(value).trim() === "") return null;\n  return <View style={{ flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}><View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginRight: 11 }}><Feather name={icon as any} size={15} color={GREEN} /></View><View style={{ flex: 1 }}><Text style={{ color: "#94A3B8", fontSize: 9.5, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text><Text selectable style={{ color: "#0F172A", fontSize: 12.5, lineHeight: 18, marginTop: 3, fontFamily: "Inter_500Medium" }}>{String(value)}</Text></View></View>;\n}\n\nfunction Section({ title, children }: { title: string; children: React.ReactNode }) {\n  return <View style={{ backgroundColor: "white", borderRadius: 18, paddingHorizontal: 15, paddingTop: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}><Text style={{ color: "#0F172A", fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 }}>{title}</Text>{children}</View>;\n}\n\nexport default function UserDetailsScreen() {\n  const { id } = useLocalSearchParams<{ id: string }>();\n  const router = useRouter();\n  const insets = useSafeAreaInsets();\n  const topPad = Platform.OS === "web" ? 67 : insets.top;\n  const [user, setUser] = useState<UserDetails | null>(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState("");\n  const [photoFailed, setPhotoFailed] = useState(false);\n\n  useEffect(() => {\n    let active = true;\n    (async () => {\n      try {\n        setLoading(true);\n        const result = await apiGet<any>(`/api/admin/users/${encodeURIComponent(String(id || ""))}`);\n        if (active) { setUser(result.user || null); setError(""); }\n      } catch (requestError) {\n        if (active) setError(getUserErrorMessage(requestError, "User details could not be loaded."));\n      } finally {\n        if (active) setLoading(false);\n      }\n    })();\n    return () => { active = false; };\n  }, [id]);\n\n  const photo = useMemo(() => resolveProfilePhotoUri(user?.profile_photo_url || user?.profile_photo), [user]);\n  const ward = user?.ward || user?.ward_code || (user?.ward_number ? `Ward ${user.ward_number}` : "Not assigned");\n\n  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F0F4F8" }}><ActivityIndicator color={GREEN} /><Text style={{ color: "#64748B", marginTop: 10, fontFamily: "Inter_500Medium" }}>Loading user profile...</Text></View>;\n\n  return <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>\n    <LinearGradient colors={["#052E16", "#166534", "#16A34A"]} style={{ paddingTop: topPad + 8, paddingHorizontal: 16, paddingBottom: 24 }}>\n      <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}><Feather name="arrow-left" size={20} color="white" /></TouchableOpacity>\n      {user ? <View style={{ alignItems: "center", marginTop: 4 }}>\n        {photo && !photoFailed ? <Image source={{ uri: photo }} onError={() => setPhotoFailed(true)} style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 3, borderColor: "rgba(255,255,255,0.75)" }} resizeMode="cover" /> : <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: user.avatar_color || "#DCFCE7", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.75)" }}><Text style={{ color: "#166534", fontSize: 31, fontFamily: "Inter_700Bold" }}>{String(user.name || "U").charAt(0).toUpperCase()}</Text></View>}\n        <Text style={{ color: "white", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 12, textAlign: "center" }}>{user.name || "Unnamed user"}</Text>\n        <View style={{ marginTop: 7, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)" }}><Text style={{ color: "white", fontSize: 10.5, fontFamily: "Inter_700Bold" }}>{labelRole(user.role)}</Text></View>\n      </View> : null}\n    </LinearGradient>\n\n    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom, 10) + 40 }} showsVerticalScrollIndicator={false}>\n      {error ? <View style={{ backgroundColor: "#FEF2F2", borderRadius: 15, padding: 14 }}><Text style={{ color: "#DC2626", fontFamily: "Inter_600SemiBold" }}>{error}</Text></View> : null}\n      {user ? <>\n        <Section title="Contact Information">\n          <DetailRow icon="phone" label="Mobile number" value={user.mobile ? `+91 ${user.mobile}` : null} />\n          <DetailRow icon="mail" label="Email" value={user.email} />\n          <DetailRow icon="map-pin" label="Address" value={user.address} />\n          <DetailRow icon="home" label="Residence address" value={user.residence_address} />\n        </Section>\n        <Section title="Civic Profile">\n          <DetailRow icon="map" label="Ward" value={ward} />\n          <DetailRow icon="gift" label="Date of birth" value={user.dob ? new Date(user.dob).toLocaleDateString("en-IN") : null} />\n          <DetailRow icon="calendar" label="Age" value={user.age} />\n          <DetailRow icon="check-circle" label="Approval status" value={user.approval_status} />\n        </Section>\n        <Section title="Official Information">\n          <DetailRow icon="award" label="Designation" value={user.official_designation} />\n          <DetailRow icon="briefcase" label="Office address" value={user.office_address} />\n          <DetailRow icon="clock" label="Office timings" value={user.office_timings} />\n          <DetailRow icon="user" label="Contact person" value={user.contact_name} />\n          <DetailRow icon="phone-call" label="Office contact" value={user.contact_number} />\n          <DetailRow icon="hash" label="Nagarsevak ID" value={user.nagarsevak_id} />\n        </Section>\n        <Section title="Account Information">\n          <DetailRow icon="key" label="User ID" value={user.id} />\n          <DetailRow icon="calendar" label="Registered" value={user.created_at ? new Date(user.created_at).toLocaleString("en-IN") : null} />\n          <DetailRow icon="log-in" label="Last login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString("en-IN") : "Not recorded"} />\n        </Section>\n      </> : null}\n    </ScrollView>\n  </View>;\n}\n''', encoding="utf-8")

# Register hidden details route.
layout = Path("mobile/app/super-admin/_layout.tsx")
replace_once(layout, '            <Tabs.Screen name="users" options={{ href: null }} />\n', '            <Tabs.Screen name="users" options={{ href: null }} />\n            <Tabs.Screen name="user-details" options={{ href: null }} />\n')

# Backend: absolute photo URLs and secure full user details endpoint.
backend = Path("backend/internalCommunityAndUsersPatch.js")
replace_once(
    backend,
    'const baseUrl = (req) => String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\\/$/, "");\n',
    'const baseUrl = (req) => String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\\/$/, "");\n\nfunction profilePhotoUrl(req, value) {\n  const photo = clean(value, 10_000_000);\n  if (!photo) return null;\n  if (/^(https?:|data:|file:|content:|blob:)/i.test(photo)) return photo;\n  const suffix = photo.startsWith("/") ? photo : `/${photo}`;\n  return `${baseUrl(req)}${suffix}`;\n}\n',
)
replace_once(
    backend,
    '    const [roleCounts] = await pool.query("SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role");\n    return res.json({ success: true, users, roleCounts, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });\n',
    '    const [roleCounts] = await pool.query("SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role");\n    const publicUsers = users.map((user) => ({ ...user, profile_photo_url: profilePhotoUrl(req, user.profile_photo) }));\n    return res.json({ success: true, users: publicUsers, roleCounts, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });\n',
)
insert_before = '\nasync function listPosts(req, res) {'
get_details = '''\nasync function getUserDetails(req, res) {\n  try {\n    if (!(await requireAdmin(req, res))) return;\n    const userId = clean(req.params?.id, 100);\n    if (!userId) return res.status(400).json({ success: false, error: "User id is required." });\n    const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);\n    const row = rows[0] || null;\n    if (!row) return res.status(404).json({ success: false, error: "User profile not found." });\n    const user = {\n      id: row.id, name: row.name, mobile: row.mobile, role: row.role, ward: row.ward,\n      ward_code: row.ward_code, ward_number: row.ward_number, email: row.email, address: row.address,\n      age: row.age, dob: row.dob, approval_status: row.approval_status, avatar_color: row.avatar_color,\n      profile_photo: row.profile_photo, profile_photo_url: profilePhotoUrl(req, row.profile_photo),\n      official_designation: row.official_designation, is_super_admin: !!row.is_super_admin,\n      office_address: row.office_address, residence_address: row.residence_address,\n      office_timings: row.office_timings, contact_name: row.contact_name, contact_number: row.contact_number,\n      nagarsevak_id: row.nagarsevak_id, ward_changed: row.ward_changed,\n      created_at: row.created_at, last_login_at: row.last_login_at,\n    };\n    return res.json({ success: true, user });\n  } catch (error) {\n    console.warn("[InternalCommunityUsers] user details failed", error?.code || error?.name || "user_details_error");\n    return res.status(500).json({ success: false, error: "User details could not be loaded right now." });\n  }\n}\n'''
text = backend.read_text(encoding="utf-8")
if "async function getUserDetails" not in text:
    if insert_before not in text:
        raise SystemExit("listPosts marker not found")
    backend.write_text(text.replace(insert_before, get_details + insert_before, 1), encoding="utf-8")
replace_once(
    backend,
    '    originalGet.call(app, "/api/admin/users", listUsers);\n',
    '    originalGet.call(app, "/api/admin/users", listUsers);\n    originalGet.call(app, "/api/admin/users/:id", getUserDetails);\n',
)
replace_once(
    backend,
    'module.exports = { ensureSchema, listUsers, listPosts, createPost, editPost, deletePost };\n',
    'module.exports = { ensureSchema, listUsers, getUserDetails, listPosts, createPost, editPost, deletePost };\n',
)

print("App Users profile photo and details fix applied.")
