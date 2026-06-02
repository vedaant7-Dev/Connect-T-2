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

edit('app/(tabs)/_layout.tsx', s => s.replace(
  '<Tabs tabBar={(props) => isNagarsevak ? <NagarsevakTabBar {...props} /> : <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, tabBarActiveTintColor: isNagarsevak ? GREEN : ORANGE, tabBarInactiveTintColor: MUTED }}>',
  '<Tabs backBehavior="history" tabBar={(props) => isNagarsevak ? <NagarsevakTabBar {...props} /> : <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, tabBarActiveTintColor: isNagarsevak ? GREEN : ORANGE, tabBarInactiveTintColor: MUTED }}>'
));

edit('app/jobs/(tabs)/profile.tsx', s => s
  .replace('await logoutJobs();\n    },', 'await logoutJobs();\n      router.replace("/jobs/login" as any);\n    },')
  .replace('\n        { icon: "file-text" as const, label: "Resume Builder", sub: "Create resume from profile", color: "#7C3AED", bg: "#F5F3FF", onPress: () => router.push("/jobs/resume" as any) },', '')
);

edit('app/nagarsevak/login.tsx', s => s
  .replace('setStep("pending");', 'router.replace({ pathname: "/nagarsevak/status" as any, params: { phone: cleaned, from: "login" } });')
);

edit('app/nagarsevak/register.tsx', s => s
  .replace('type Step = "form" | "otp" | "pending";', 'type Step = "form" | "otp";')
  .replace('if (regData.success || regData.message === "ALREADY_PENDING") {\n        setStep("pending");\n      } else if (regData.message === "WARD_TAKEN") {', 'if (regData.success || regData.message === "ALREADY_PENDING" || regData.message === "Officer already registered") {\n        router.replace({ pathname: "/nagarsevak/status" as any, params: { phone: cleanMobile(mobile), from: "register" } });\n      } else if (regData.message === "WARD_TAKEN") {')
  .replace('{step === "pending" && <View style={styles.statusWrap}><View style={[styles.statusIcon, { backgroundColor: "#FEF3C7" }]}><Feather name="clock" size={36} color="#D97706" /></View><Text style={[styles.statusTitle, { color: "#92400E" }]}>Verification Pending</Text><Text style={styles.statusMsg}>Your Nagarsevak request is submitted. Once Super Admin approves it, you will be able to login with OTP. You cannot submit another request while this one is pending.</Text><TouchableOpacity style={styles.backToHomeBtn} onPress={() => router.replace("/nagarsevak/login" as any)}><Text style={styles.backToHomeBtnText}>Back to Login</Text></TouchableOpacity></View>}', '')
);

console.log('[Connect-T] portal flow patch done');
