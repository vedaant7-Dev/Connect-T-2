import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mobileRoot = path.join(root, "mobile");
const outputDir = path.join(root, "artifacts", "audit");
fs.mkdirSync(outputDir, { recursive: true });

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", "android", "dist", ".expo"].includes(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (/\.(?:tsx|jsx)$/.test(entry.name)) output.push(absolute);
    }
  }
  return output.sort();
}

function count(source, expression) {
  return (source.match(expression) || []).length;
}

const files = [...walk(path.join(mobileRoot, "app")), ...walk(path.join(mobileRoot, "screens"))];
const results = [];
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const textInputs = count(source, /<TextInput\b/g);
  const touchables = count(source, /<(?:TouchableOpacity|Pressable)\b/g);
  if (!textInputs && !touchables) continue;
  const hasAppScroll = /AppScrollView/.test(source);
  const hasNativeScroll = /<(?:ScrollView|FlatList|SectionList)\b/.test(source);
  const hasKeyboardAvoiding = /KeyboardAvoidingView/.test(source);
  const hasKeyboardTapHandling = /keyboardShouldPersistTaps/.test(source);
  const accessibilityRoles = count(source, /accessibilityRole\s*=/g);
  const accessibilityLabels = count(source, /accessibilityLabel\s*=/g);
  const multilineInputs = count(source, /<TextInput[\s\S]{0,400}?\bmultiline\b/g);
  const absoluteStyles = count(source, /position:\s*["']absolute["']/g);
  const issues = [];

  if (textInputs && !hasAppScroll && !hasNativeScroll && !hasKeyboardAvoiding) {
    issues.push("Text inputs have no visible scrolling or keyboard-avoidance container");
  }
  if (textInputs && hasNativeScroll && !hasAppScroll && !hasKeyboardTapHandling && !/automaticallyAdjustKeyboardInsets/.test(source)) {
    issues.push("Native input list/scroll does not preserve taps or adjust keyboard insets");
  }
  if (multilineInputs && !/textAlignVertical\s*=\s*["']top["']/.test(source)) {
    issues.push("Multiline input does not declare top text alignment");
  }
  if (touchables >= 4 && accessibilityRoles < Math.ceil(touchables * 0.35)) {
    issues.push("Many interactive controls lack explicit accessibility roles");
  }
  if (touchables >= 4 && accessibilityLabels === 0) {
    issues.push("Interactive screen has no explicit accessibility labels");
  }
  if (textInputs && absoluteStyles >= 3) {
    issues.push("Input screen has several absolute-positioned elements; overlap needs layout review");
  }

  results.push({
    file: path.relative(root, file).replaceAll(path.sep, "/"),
    textInputs,
    multilineInputs,
    touchables,
    accessibilityRoles,
    accessibilityLabels,
    hasAppScroll,
    hasNativeScroll,
    hasKeyboardAvoiding,
    hasKeyboardTapHandling,
    absoluteStyles,
    issues,
  });
}

const findings = results.filter((item) => item.issues.length);
const report = {
  generatedAt: new Date().toISOString(),
  scannedFiles: results.length,
  filesWithFindings: findings.length,
  findings,
  sharedGuarantees: {
    AppScrollView: "automaticallyAdjustKeyboardInsets, keyboardDismissMode and keyboardShouldPersistTaps are applied by the shared component",
    androidWindow: "mobile/app.json uses softwareKeyboardLayoutMode=resize",
  },
  note: "This static inventory identifies review targets; it is not device-level keyboard or accessibility verification.",
};
fs.writeFileSync(path.join(outputDir, "mobile-ui-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Scanned ${results.length} interactive screen files; ${findings.length} require manual review.`);
