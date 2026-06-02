const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
function file(name) { return path.join(root, name); }
function edit(name, fn) {
  const p = file(name);
  if (!fs.existsSync(p)) return;
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(p, after);
    console.log('[Connect-T] patched ' + name);
  }
}

function ensureOtpImport(source) {
  if (source.includes('@/components/OtpDigitInput')) return source;
  return source.replace('import TopShade from "@/components/TopShade";', 'import TopShade from "@/components/TopShade";\nimport OtpDigitInput from "@/components/OtpDigitInput";');
}

function ensureOtpImportAfterDecorative(source) {
  if (source.includes('@/components/OtpDigitInput')) return source;
  return source.replace('import TopShade from "@/components/TopShade";', 'import TopShade from "@/components/TopShade";\nimport OtpDigitInput from "@/components/OtpDigitInput";');
}

function ensureOtpImportSuperAdmin(source) {
  if (source.includes('@/components/OtpDigitInput')) return source;
  return source.replace('import { useAuth } from "@/context/AuthContext";', 'import { useAuth } from "@/context/AuthContext";\nimport OtpDigitInput from "@/components/OtpDigitInput";');
}

edit('app/(tabs)/_layout.tsx', s => s.replace(
  '<Tabs tabBar={(props) => isNagarsevak ? <NagarsevakTabBar {...props} /> : <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, tabBarActiveTintColor: isNagarsevak ? GREEN : ORANGE, tabBarInactiveTintColor: MUTED }}>',
  '<Tabs backBehavior="history" tabBar={(props) => isNagarsevak ? <NagarsevakTabBar {...props} /> : <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, tabBarActiveTintColor: isNagarsevak ? GREEN : ORANGE, tabBarInactiveTintColor: MUTED }}>'
));

edit('app/(tabs)/profile.tsx', s => s
  .replace('const confirmLogout = async () => { setShowLogoutModal(false); await logout(); router.replace("/portal-select" as any); };',
           'const confirmLogout = async () => { setShowLogoutModal(false); await logout("/login"); router.replace("/login" as any); };')
);

edit('app/(tabs)/admin.tsx', s => s
  .replace('await logout();\n    router.replace("/login");', 'await logout("/nagarsevak/login");\n    router.replace("/nagarsevak/login" as any);')
  .replace('onPress={() => router.push("/login")}', 'onPress={() => router.replace("/nagarsevak/login" as any)}')
);

edit('app/super-admin/settings.tsx', s => s
  .replace('await logout();\n                  router.replace("/login");', 'await logout("/super-admin-login");\n                  router.replace("/super-admin-login" as any);')
);

edit('app/jobs/(tabs)/profile.tsx', s => s
  .replace('await logoutJobs();\n    },', 'await logoutJobs();\n      router.replace("/jobs/login" as any);\n    },')
  .replace('\n        { icon: "file-text" as const, label: "Resume Builder", sub: "Create resume from profile", color: "#7C3AED", bg: "#F5F3FF", onPress: () => router.push("/jobs/resume" as any) },', '')
);

edit('app/login.tsx', s => {
  let next = ensureOtpImport(s);
  next = next.replace(
    '<TextInput value={otp} onChangeText={(v) => setOtp(v.replace(/\\D/g, "").slice(0, 4))} keyboardType="number-pad" maxLength={4} placeholder="1234" placeholderTextColor="#94A3B8" style={s.otpInput} textAlign="center" />',
    '<OtpDigitInput value={otp} onChange={setOtp} autoFocus />'
  );
  return next;
});

edit('app/jobs/login.tsx', s => {
  let next = ensureOtpImportAfterDecorative(s);
  next = next.replace(
    '<TextInput value={otp} onChangeText={(v) => setOtp(v.replace(/\\D/g, "").slice(0, 4))} placeholder="1234" keyboardType="number-pad" maxLength={4} style={s.otpInput} placeholderTextColor="#94A3B8" textAlign="center" />',
    '<OtpDigitInput value={otp} onChange={setOtp} autoFocus />'
  );
  return next;
});

edit('app/super-admin-login.tsx', s => {
  let next = ensureOtpImportSuperAdmin(s);
  next = next.replace(
    '{otpStep && <View style={styles.inputBlock}><Text style={styles.label}>4 Digit Demo OTP</Text><View style={styles.inputShell}><View style={styles.inputPrefix}><Feather name="hash" size={14} color="#047857" /></View><TextInput value={otp} onChangeText={(value) => setOtp(value.replace(/\\D/g, "").slice(0, 4))} placeholder="1234" placeholderTextColor="#94A3B8" keyboardType="number-pad" maxLength={4} style={[styles.input, { letterSpacing: 8, fontSize: 20, fontFamily: "Inter_800ExtraBold" }]} /></View></View>}',
    '{otpStep && <View style={styles.inputBlock}><Text style={styles.label}>4 Digit Demo OTP</Text><OtpDigitInput value={otp} onChange={setOtp} autoFocus /></View>}'
  );
  return next;
});

edit('app/nagarsevak/login.tsx', s => s
  .replace('router.replace("/" as any)', 'router.replace("/secret-access" as any)')
  .replace('setStep("pending");', 'router.replace({ pathname: "/nagarsevak/status" as any, params: { phone: cleaned, from: "login" } });')
);

edit('app/nagarsevak/register.tsx', s => s
  .replace('type Step = "form" | "otp" | "pending";', 'type Step = "form" | "otp";')
  .replace('if (regData.success || regData.message === "ALREADY_PENDING") {\n        setStep("pending");\n      } else if (regData.message === "WARD_TAKEN") {', 'if (regData.success || regData.message === "ALREADY_PENDING" || regData.message === "Officer already registered") {\n        router.replace({ pathname: "/nagarsevak/status" as any, params: { phone: cleanMobile(mobile), from: "register" } });\n      } else if (regData.message === "WARD_TAKEN") {')
  .replace('{step === "pending" && <View style={styles.statusWrap}><View style={[styles.statusIcon, { backgroundColor: "#FEF3C7" }]}><Feather name="clock" size={36} color="#D97706" /></View><Text style={[styles.statusTitle, { color: "#92400E" }]}>Verification Pending</Text><Text style={styles.statusMsg}>Your Nagarsevak request is submitted. Once Super Admin approves it, you will be able to login with OTP. You cannot submit another request while this one is pending.</Text><TouchableOpacity style={styles.backToHomeBtn} onPress={() => router.replace("/nagarsevak/login" as any)}><Text style={styles.backToHomeBtnText}>Back to Login</Text></TouchableOpacity></View>}', '')
);

console.log('[Connect-T] portal flow patch done');
