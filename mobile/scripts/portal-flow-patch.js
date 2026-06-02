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

function fixNagarsevakTabs(source) {
  let s = source;
  const start = s.indexOf('function NagarsevakTabBar');
  const end = s.indexOf('\n\nexport default function TabLayout');
  if (start >= 0 && end > start) {
    const fixed = `function NagarsevakTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 14 : Math.max(insets.bottom, 8);
  const orderedNames = ["admin", "ward", "news", "profile"];
  const routeByName = Object.fromEntries(state.routes.map((route: any) => [route.name, route]));
  const activeRouteName = state.routes[state.index]?.name;
  const labelMap: Record<string, string> = { admin: "Home", ward: "Ward", news: "News", profile: "Profile" };
  const iconMap: Record<string, string> = { admin: "home", ward: "users", news: "radio", profile: "user" };

  return (
    <View style={{ flexDirection: "row", backgroundColor: "white", paddingBottom: bottomInset, paddingTop: 7, borderTopWidth: 1, borderTopColor: "#E2E8F0", shadowColor: "#166534", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10 }}>
      {orderedNames.map((name) => {
        const route: any = routeByName[name];
        if (!route) return null;
        const isFocused = activeRouteName === name;
        const label = labelMap[name] || descriptors[route.key]?.options?.title || name;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (isFocused || event.defaultPrevented) return;\n          if (typeof navigation.jumpTo === "function") {\n            navigation.jumpTo(route.name, route.params);\n          } else {\n            navigation.navigate(route.name, route.params);\n          }
        };
        return <TouchableOpacity key={route.key} onPress={onPress} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 3 }} activeOpacity={0.72}><View style={{ width: 42, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: isFocused ? "rgba(22,163,74,0.12)" : "transparent", borderRadius: 16, borderWidth: isFocused ? 1 : 0, borderColor: "rgba(22,163,74,0.18)" }}><Feather name={(iconMap[name] || "circle") as any} size={20} color={isFocused ? GREEN : MUTED} /></View><Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: isFocused ? "Inter_700Bold" : "Inter_600SemiBold", color: isFocused ? GREEN : MUTED, marginTop: 2 }}>{label}</Text></TouchableOpacity>;
      })}
    </View>
  );
}`;
    s = s.slice(0, start) + fixed + s.slice(end);
  }
  s = s.replace(/<Tabs\.Screen name="index"[\s\S]*?<Tabs\.Screen name="admin" options=\{\{ title: "Home", href: isNagarsevak \? undefined : null \}\} \/>/,
`<Tabs.Screen name="admin" options={{ title: "Home", href: isNagarsevak ? undefined : null }} />
      <Tabs.Screen name="ward" options={{ title: "Ward", href: isNagarsevak ? undefined : null }} />
      <Tabs.Screen name="news" options={{ title: "News", href: isNagarsevak ? undefined : null }} />
      <Tabs.Screen name="profile" options={{ title: t("profile"), href: undefined }} />
      <Tabs.Screen name="index" options={{ title: t("home"), href: isNagarsevak ? null : undefined }} />
      <Tabs.Screen name="emergency" options={{ href: null }} />
      <Tabs.Screen name="complaints" options={{ title: t("complaints"), href: isNagarsevak ? null : undefined }} />
      <Tabs.Screen name="feed" options={{ title: t("feed"), href: isNagarsevak ? null : undefined }} />
      <Tabs.Screen name="services" options={{ href: null }} />`);
  return s;
}

edit('app/(tabs)/_layout.tsx', s => fixNagarsevakTabs(s).replace(
  '<Tabs tabBar={(props) => isNagarsevak ? <NagarsevakTabBar {...props} /> : <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, tabBarActiveTintColor: isNagarsevak ? GREEN : ORANGE, tabBarInactiveTintColor: MUTED }}>',
  '<Tabs backBehavior="history" tabBar={(props) => isNagarsevak ? <NagarsevakTabBar {...props} /> : <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, tabBarActiveTintColor: isNagarsevak ? GREEN : ORANGE, tabBarInactiveTintColor: MUTED }}>'
));

edit('app/(tabs)/profile.tsx', s => s
  .replace('const confirmLogout = async () => { setShowLogoutModal(false); await logout(); router.replace("/portal-select" as any); };',
           'const confirmLogout = async () => { setShowLogoutModal(false); await logout("/login"); router.replace("/login" as any); };')
);

edit('app/(tabs)/admin.tsx', s => {
  let next = s
    .replace('await logout();\n    router.replace("/login");', 'await logout("/nagarsevak/login");\n    router.replace("/nagarsevak/login" as any);')
    .replace('onPress={() => router.push("/login")}', 'onPress={() => router.replace("/nagarsevak/login" as any)}')
    .replace('setTimeout(() => complaintListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);', 'router.push({ pathname: "/complaint/list" as any, params: { status: nextFilter } });');
  if (!next.includes('complaintIdText:')) {
    next = next.replace(/(cmpMeta:\s*\{[^\n]*\},)/, '$1\n  complaintIdText: { fontSize: 10, color: "#16A34A", fontFamily: "Inter_700Bold", marginTop: 1 },');
  }
  return next;
});

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