import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "audit");
fs.mkdirSync(outputDir, { recursive: true });

const excludedDirectories = new Set([".git", "node_modules", "dist", "build", ".expo", ".gradle"]);
const excludedFiles = new Set([
  "scripts/audit-secrets.mjs",
  "mobile/android/app/debug.keystore",
  // Firebase Android client configuration contains public project/app identifiers,
  // not an FCM server key or service-account private key. Keep the allowlist exact.
  "mobile/google-services.json",
  "mobile/android/app/google-services.json",
]);

const patterns = [
  { id: "private-key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: "aws-access-key", expression: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "github-token", expression: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/ },
  { id: "google-api-key", expression: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: "stripe-live-key", expression: /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b/ },
  { id: "slack-token", expression: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/ },
  { id: "jwt-assignment", expression: /\bJWT_SECRET\s*=\s*["']?(?!CHANGE_|example|test|your-|replace-|<)[^\s"']{32,}/i },
];

const sensitiveFilePatterns = [
  /(^|\/)\.env$/i,
  /(^|\/)\.env\.(?!example$|sample$|template$)[^/]+$/i,
  /(^|\/)(?:service-account|service_account).*\.json$/i,
  /(^|\/)google-services\.json$/i,
  /\.(?:jks|p12|pfx|pem|key)$/i,
];

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function isIntentionalJwtFixture(rel) {
  return /(^|\/)test(s)?\//i.test(rel) || /\.env\.(?:example|sample|template)$/i.test(rel);
}

function walk(directory) {
  const files = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (excludedDirectories.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else files.push(absolute);
    }
  }
  return files;
}

function textContent(file) {
  try {
    const buffer = fs.readFileSync(file);
    if (buffer.includes(0)) return null;
    if (buffer.length > 5 * 1024 * 1024) return null;
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

const findings = [];
for (const file of walk(root)) {
  const rel = relative(file);
  if (excludedFiles.has(rel)) continue;
  if (sensitiveFilePatterns.some((pattern) => pattern.test(rel))) {
    findings.push({ scope: "current-tree", category: "sensitive-file", file: rel });
  }
  const content = textContent(file);
  if (content === null) continue;
  for (const pattern of patterns) {
    if (pattern.id === "jwt-assignment" && isIntentionalJwtFixture(rel)) continue;
    if (pattern.expression.test(content)) {
      findings.push({ scope: "current-tree", category: pattern.id, file: rel });
    }
  }
}

let historyAvailable = false;
let historyFindings = [];
try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, stdio: "ignore" });
  historyAvailable = true;
  const revisions = execFileSync("git", ["rev-list", "--all"], { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 })
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const seen = new Set();
  const grepExpression = [
    "BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY",
    "AKIA[0-9A-Z]{16}",
    "github_pat_[A-Za-z0-9_]{40,}",
    "gh[pousr]_[A-Za-z0-9]{30,}",
    "AIza[0-9A-Za-z_-]{35}",
    "(sk|rk)_live_[0-9A-Za-z]{20,}",
    "xox[baprs]-[0-9A-Za-z-]{20,}",
  ].join("|");

  for (const commit of revisions) {
    let output = "";
    try {
      output = execFileSync(
        "git",
        [
          "grep", "-I", "-n", "-E", grepExpression, commit, "--", ".",
          ":(exclude)scripts/audit-secrets.mjs",
          ":(exclude)mobile/android/app/debug.keystore",
          ":(exclude)mobile/google-services.json",
          ":(exclude)mobile/android/app/google-services.json",
        ],
        { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch (error) {
      output = String(error?.stdout || "");
    }
    for (const line of output.split(/\r?\n/).filter(Boolean)) {
      const match = line.match(/^([^:]+):([^:]+):\d+:/);
      if (!match) continue;
      const key = `${match[1]}:${match[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      historyFindings.push({ scope: "git-history", category: "high-confidence-pattern", commit: match[1], file: match[2] });
    }
  }
} catch (error) {
  historyAvailable = false;
  historyFindings = [{ scope: "git-history", category: "scan-unavailable", message: String(error?.message || error) }];
}

const report = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || null,
  historyAvailable,
  currentTreeFindings: findings,
  historyFindings,
  excludedKnownDevelopmentFiles: [...excludedFiles],
  ignoredIntentionalFixtures: [
    "*.env.example/sample/template JWT placeholders",
    "backend test JWT fixtures",
    "exact Firebase Android client-config paths (non-secret identifiers only)",
  ],
  note: "No secret values are written to this report. Matches require manual validation and rotation when genuine.",
};

fs.writeFileSync(path.join(outputDir, "secret-scan.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Current-tree high-confidence findings: ${findings.length}`);
console.log(`Git-history high-confidence findings: ${historyFindings.filter((item) => item.category !== "scan-unavailable").length}`);

if (findings.length || historyFindings.some((item) => item.category === "high-confidence-pattern")) {
  console.error("High-confidence secret material or sensitive credential files were detected. Review the sanitised artifact and rotate genuine credentials.");
  process.exitCode = 1;
}
