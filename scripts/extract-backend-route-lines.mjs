import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const backendRoot = path.join(root, "backend");
const outputDir = path.join(root, "artifacts", "audit");
fs.mkdirSync(outputDir, { recursive: true });

function walk(directory) {
  const files = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", "uploads"].includes(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.name.endsWith(".js")) files.push(absolute);
    }
  }
  return files.sort();
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

const routes = [];
for (const file of walk(backendRoot)) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  const patterns = [
    { registration: "direct", regex: /\b(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*(["'`])([^"'`]+)\2/g },
    { registration: "production-patch", regex: /\boriginal(Get|Post|Put|Patch|Delete)\.call\(\s*(?:app|this)\s*,\s*(["'`])([^"'`]+)\2/g },
  ];
  for (const { registration, regex } of patterns) {
    for (const match of source.matchAll(regex)) {
      const line = lineAt(source, match.index);
      const lines = source.split("\n");
      routes.push({
        method: match[1].toUpperCase(),
        path: match[3],
        file: rel,
        line,
        registration,
        context: lines.slice(Math.max(0, line - 2), Math.min(lines.length, line + 6)).join("\n"),
      });
    }
  }
}

routes.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
fs.writeFileSync(path.join(outputDir, "backend-route-lines.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), routes }, null, 2)}\n`);
console.log(`Extracted ${routes.length} backend route source locations.`);
