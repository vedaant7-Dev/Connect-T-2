const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const file = (p) => path.join(root, p);

function edit(name, fn) {
  const p = file(name);
  if (!fs.existsSync(p)) return;
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(p, after);
    console.log('[Connect-T] Super Admin UI polished ' + name);
  }
}

function removeOldSettingsIcon(s) {
  return s.replace(/\n\s*<TouchableOpacity onPress=\{\(\) => router\.push\("\/super-admin\/settings" as any\)\}[\s\S]*?<Feather name="settings" size=\{20\} color="white" \/>[\s\S]*?<\/TouchableOpacity>/g, '');
}

function removeBroadcastHeaderActions(s) {
  return s.replace(/\n\s*<View style=\{\{ flexDirection: "row", alignItems: "center", gap: 10 \}\}>[\s\S]*?<Text[\s\S]*?>\s*Compose\s*<\/Text>[\s\S]*?<\/TouchableOpacity>\s*<\/View>/g, '');
}

function addPostAlertButton(s) {
  if (s.includes('Post Alert / News</Text>')) return s;
  return s.replace(
    '        <View style={{ marginBottom: 8 }}>\n          <Text\n            style={{\n              fontSize: 15,\n              fontFamily: "Inter_700Bold",\n              color: "#0F172A",\n              marginBottom: 6,\n            }}\n          >\n            Quick Broadcast\n          </Text>',
    '        <TouchableOpacity\n          onPress={() => router.push("/alert/new" as any)}\n          activeOpacity={0.86}\n          style={{ backgroundColor: "white", borderRadius: 16, padding: 15, marginBottom: 16, flexDirection: "row", alignItems: "center", shadowColor: "#166534", shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}\n        >\n          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 12 }}>\n            <Feather name="plus-circle" size={20} color="#16A34A" />\n          </View>\n          <View style={{ flex: 1 }}>\n            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A" }}>Post Alert / News</Text>\n            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 2 }}>Create a broadcast for all citizens or selected ward</Text>\n          </View>\n          <Feather name="chevron-right" size={18} color="#CBD5E1" />\n        </TouchableOpacity>\n\n        <View style={{ marginBottom: 8 }}>\n          <Text\n            style={{\n              fontSize: 15,\n              fontFamily: "Inter_700Bold",\n              color: "#0F172A",\n              marginBottom: 6,\n            }}\n          >\n            Quick Broadcast\n          </Text>'
  );
}

function expandOfficerModalDetails(s) {
  return s.replace(
    /\{\[\n\s*\{ label: "Mobile", value: "\+91 " \+ selectedOfficer\.mobile, icon: "phone" \},\n\s*\{ label: "Ward", value: selectedOfficer\.ward, icon: "map-pin" \},\n\s*\{ label: "Ward Code", value: selectedOfficer\.wardCode \|\| "N\/A", icon: "hash" \},\n\s*\{ label: "Role", value: selectedOfficer\.role === "super_admin" \? "Super Admin" : "Nagarsevak", icon: "briefcase" \},\n\s*\]\.map/g,
    '{[\n                  { label: "Mobile", value: selectedOfficer.mobile ? "+91 " + selectedOfficer.mobile : "Not added", icon: "phone" },\n                  { label: "DOB", value: selectedOfficer.dob || "Not added", icon: "calendar" },\n                  { label: "Ward", value: selectedOfficer.ward || "Not added", icon: "map-pin" },\n                  { label: "Ward Code", value: selectedOfficer.wardCode || "Not added", icon: "hash" },\n                  { label: "Nagarsevak ID", value: selectedOfficer.id || "Not added", icon: "credit-card" },\n                  { label: "Role", value: selectedOfficer.role === "super_admin" ? "Super Admin" : "Nagarsevak", icon: "briefcase" },\n                  { label: "Contact Person", value: selectedOfficer.contactName || selectedOfficer.name || "Not added", icon: "user-check" },\n                  { label: "Contact Number", value: selectedOfficer.contactNumber ? "+91 " + selectedOfficer.contactNumber : "Not added", icon: "phone-call" },\n                  { label: "Office Address", value: selectedOfficer.officeAddress || "Not added", icon: "map" },\n                  { label: "Residence Address", value: selectedOfficer.residenceAddress || selectedOfficer.address || "Not added", icon: "home" },\n                  { label: "Office Timings", value: selectedOfficer.officeTimings || "Not added", icon: "clock" },\n                  { label: "Verification", value: selectedOfficer.approvalStatus || "pending", icon: "shield" },\n                  { label: "Registered On", value: selectedOfficer.createdAt ? new Date(selectedOfficer.createdAt).toLocaleDateString() : "Not added", icon: "calendar" },\n                ].map'
  );
}

function polishOfficerModalSpacing(s) {
  return s
    .replace('padding: 24, paddingBottom: 40', 'padding: 20, paddingBottom: 30, maxHeight: "88%"')
    .replace('paddingVertical: 10, borderBottomWidth', 'paddingVertical: 11, borderBottomWidth')
    .replace('width: 32, height: 32, borderRadius: 8', 'width: 36, height: 36, borderRadius: 12')
    .replace('fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>{item.value}</Text>', 'fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A", lineHeight: 18 }}>{item.value}</Text>');
}

function improveComplaintDetail(s) {
  let next = s;
  next = next.replace('Citizen Details</Text>', 'Complaint Issued User Detail</Text>');
  next = next.replace('Ward Officer</Text>', 'Assigned Nagarsevak Officer</Text>');
  next = next.replace(
    '{officer && (\n        <View style={{ backgroundColor: "#DCFCE7", borderRadius: 14, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>\n          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center", marginRight: 12 }}>\n            <Feather name="user-check" size={18} color="white" />\n          </View>\n          <View>\n            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#166534" }}>Assigned Nagarsevak Officer</Text>\n            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{officer.name}</Text>\n            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#16A34A" }}>{officer.ward} · {officer.mobile}</Text>\n          </View>\n        </View>\n      )}',
    '{officer && (\n        <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>\n          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 10 }}>Assigned Nagarsevak Officer Detail</Text>\n          {[\n            { label: "Officer", value: officer.name || "Not assigned", icon: "user-check" },\n            { label: "Mobile", value: officer.mobile ? "+91 " + officer.mobile : "Not added", icon: "phone" },\n            { label: "Ward", value: officer.ward || c.ward || "Not added", icon: "map-pin" },\n            { label: "Ward Code", value: officer.wardCode || c.wardCode || "Not added", icon: "hash" },\n            { label: "Nagarsevak ID", value: officer.id || c.assignedOfficerId || "Not added", icon: "credit-card" },\n          ].map((item) => (\n            <View key={item.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" }}>\n              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginRight: 10 }}>\n                <Feather name={item.icon as any} size={13} color="#16A34A" />\n              </View>\n              <Text style={{ width: 82, fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>{item.label}</Text>\n              <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#0F172A" }}>{item.value}</Text>\n            </View>\n          ))}\n        </View>\n      )}'
  );
  return next;
}

edit('app/super-admin/index.tsx', s => improveComplaintDetail(removeOldSettingsIcon(s)));
edit('app/super-admin/jobs.tsx', s => removeOldSettingsIcon(s));
edit('app/super-admin/broadcast.tsx', s => addPostAlertButton(removeBroadcastHeaderActions(removeOldSettingsIcon(s))));
edit('app/super-admin/officers.tsx', s => polishOfficerModalSpacing(expandOfficerModalDetails(s)));

console.log('[Connect-T] Super Admin UI polish complete');


/* FINAL_NAGARSEVAK_NAVIGATION_FIX */
function finalNagarsevakNavigationFix(name, fn) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return;
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after !== before) fs.writeFileSync(p, after);
}

finalNagarsevakNavigationFix('app/(tabs)/admin.tsx', function (s) {
  return s.replace(
    'setTimeout(() => complaintListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);',
    'router.push({ pathname: "/complaint/list" as any, params: { status: nextFilter } });'
  );
});

finalNagarsevakNavigationFix('app/(tabs)/_layout.tsx', function (s) {
  return s
    .replace(
      'if (!isFocused && !event.defaultPrevented) navigation.navigate(name);',
      'if (isFocused || event.defaultPrevented) return;\n          if (typeof navigation.jumpTo === "function") {\n            navigation.jumpTo(route.name, route.params);\n          } else {\n            navigation.navigate(route.name, route.params);\n          }'
    )
    .replace(
      'if (!isFocused && !event.defaultPrevented) router.replace(pathMap[name] as any);',
      'if (isFocused || event.defaultPrevented) return;\n          if (typeof navigation.jumpTo === "function") {\n            navigation.jumpTo(route.name, route.params);\n          } else {\n            navigation.navigate(route.name, route.params);\n          }'
    );
});

try {
  require('./keyboard-ux-patch');
} catch (error) {
  console.warn('[Connect-T] Keyboard UX patch skipped:', error?.message || error);
}
