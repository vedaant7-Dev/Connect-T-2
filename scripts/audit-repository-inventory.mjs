import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "audit");
fs.mkdirSync(outputDir, { recursive: true });

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", ".git", "dist", "build", ".expo", ".gradle"].includes(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (predicate(absolute)) output.push(absolute);
    }
  }
  return output.sort();
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function routeFromFile(file) {
  const rel = path.relative(path.join(root, "mobile", "app"), file).replaceAll(path.sep, "/");
  const withoutExtension = rel.replace(/\.(tsx?|jsx?)$/, "");
  const segments = withoutExtension.split("/");
  const routeSegments = segments
    .filter((segment) => segment !== "_layout")
    .filter((segment) => !/^\(.*\)$/.test(segment));
  if (routeSegments.at(-1) === "index") routeSegments.pop();
  return `/${routeSegments.join("/")}`.replace(/\/$/, "") || "/";
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function normalizePath(value) {
  return String(value || "")
    .split("?")[0]
    .replace(/\$\{[^}]+\}/g, ":param")
    .replace(/:[A-Za-z0-9_]+/g, ":param")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "") || "/";
}

const routeFiles = walk(path.join(root, "mobile", "app"), (file) => /\.(tsx?|jsx?)$/.test(file));
const routes = routeFiles.map((file) => {
  const source = readText(file);
  return {
    route: routeFromFile(file),
    file: relative(file),
    isLayout: /\/_layout\.(tsx?|jsx?)$/.test(file),
    dynamic: /\[[^\]]+\]/.test(file),
    redirects: [...source.matchAll(/router\.(?:replace|push)\(\s*["'`]([^"'`]+)["'`]/g)].map((match) => match[1]),
    interactiveControls: {
      onPress: (source.match(/\bonPress\s*=/g) || []).length,
      onLongPress: (source.match(/\bonLongPress\s*=/g) || []).length,
      onSubmitEditing: (source.match(/\bonSubmitEditing\s*=/g) || []).length,
      onRefresh: (source.match(/\b(?:onRefresh|onAppRefresh)\s*=/g) || []).length,
    },
  };
});

const mobileFiles = walk(path.join(root, "mobile"), (file) => /\.(tsx?|jsx?)$/.test(file));
const frontendCalls = [];
const apiCallPattern = /\b(apiGet|apiPost|apiPatch|apiDelete|apiPut|uploadBroadcastForm)\s*(?:<[^;()]+?>)?\s*\(\s*(["'`])([^"'`]+)\2/g;
for (const file of mobileFiles) {
  const source = readText(file);
  for (const match of source.matchAll(apiCallPattern)) {
    const helper = match[1];
    const method = helper === "apiGet" ? "GET"
      : helper === "apiPost" || helper === "uploadBroadcastForm" ? "POST"
        : helper === "apiPatch" ? "PATCH"
          : helper === "apiDelete" ? "DELETE"
            : "PUT";
    frontendCalls.push({ method, path: match[3], normalizedPath: normalizePath(match[3]), helper, file: relative(file) });
  }
}

const backendFiles = walk(path.join(root, "backend"), (file) => /\.js$/.test(file));
const backendRoutes = [];
const routePattern = /\b(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*(["'`])([^"'`]+)\2/g;
for (const file of backendFiles) {
  const source = readText(file);
  for (const match of source.matchAll(routePattern)) {
    backendRoutes.push({
      method: match[1].toUpperCase(),
      path: match[3],
      normalizedPath: normalizePath(match[3]),
      file: relative(file),
    });
  }
}

const activeBackendPairs = new Set(backendRoutes.map((route) => `${route.method} ${route.normalizedPath}`));
const unmatchedFrontendCalls = frontendCalls.filter((call) => !activeBackendPairs.has(`${call.method} ${call.normalizedPath}`));

const packageFiles = walk(root, (file) => /(^|\/)package\.json$/.test(relative(file)) && !relative(file).includes("node_modules/"));
const packages = packageFiles.map((file) => {
  try {
    const parsed = JSON.parse(readText(file));
    return { file: relative(file), name: parsed.name || null, main: parsed.main || null, scripts: parsed.scripts || {} };
  } catch (error) {
    return { file: relative(file), parseError: error.message };
  }
});

const topLevel = fs.readdirSync(root, { withFileTypes: true }).map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : "file" }));
const deploymentFiles = ["render.yaml", "codemagic.yaml", ".github/workflows/quality.yml", "mobile/app.json"]
  .filter((file) => fs.existsSync(path.join(root, file)));

const inventory = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || null,
  topLevel,
  packages,
  deploymentFiles,
  routes,
  frontendCalls,
  backendRoutes,
  unmatchedFrontendCalls,
  counts: {
    routeFiles: routes.length,
    visibleInteractionHandlers: routes.reduce((sum, route) => sum + Object.values(route.interactiveControls).reduce((a, b) => a + b, 0), 0),
    frontendCalls: frontendCalls.length,
    backendRoutes: backendRoutes.length,
    unmatchedFrontendCalls: unmatchedFrontendCalls.length,
  },
  limitations: [
    "Regex extraction cannot prove runtime reachability or database persistence.",
    "Dynamically composed route strings may require manual review.",
    "A matched method/path is not proof of matching request and response schemas.",
  ],
};

fs.writeFileSync(path.join(outputDir, "repository-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);

const markdown = [
  "# Generated Repository Inventory",
  "",
  `Generated: ${inventory.generatedAt}`,
  `Commit: ${inventory.commit || "local/unknown"}`,
  "",
  "## Counts",
  "",
  `- Expo route files: ${inventory.counts.routeFiles}`,
  `- Visible interaction handlers in route files: ${inventory.counts.visibleInteractionHandlers}`,
  `- Extracted frontend API calls: ${inventory.counts.frontendCalls}`,
  `- Extracted backend routes: ${inventory.counts.backendRoutes}`,
  `- Frontend calls without an exact extracted backend method/path: ${inventory.counts.unmatchedFrontendCalls}`,
  "",
  "## Route files",
  "",
  "| Route | File | Dynamic | Controls |",
  "|---|---|---:|---:|",
  ...routes.map((route) => `| \`${route.route}\` | \`${route.file}\` | ${route.dynamic ? "yes" : "no"} | ${Object.values(route.interactiveControls).reduce((a, b) => a + b, 0)} |`),
  "",
  "## Extracted frontend calls without an exact backend match",
  "",
  ...(unmatchedFrontendCalls.length
    ? unmatchedFrontendCalls.map((call) => `- \`${call.method} ${call.path}\` — \`${call.file}\``)
    : ["- None detected by the extractor."]),
  "",
  "## Limitations",
  "",
  ...inventory.limitations.map((item) => `- ${item}`),
  "",
].join("\n");

fs.writeFileSync(path.join(outputDir, "repository-inventory.md"), markdown);
console.log(markdown);
