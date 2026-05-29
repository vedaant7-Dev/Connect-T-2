const fs = require("fs");
const path = require("path");
const os = require("os");

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const platform = os.platform();

let binDir;
let binaryName = "hermesc";

if (platform === "linux") {
  binDir = "linux64-bin";
} else if (platform === "darwin") {
  binDir = "osx-bin";
} else if (platform === "win32") {
  binDir = "win64-bin";
  binaryName = "hermesc.exe";
} else {
  console.log(`[fix-hermesc-path] Unsupported platform: ${platform}`);
  process.exit(0);
}

const hermesCompilerPkg = require.resolve("hermes-compiler/package.json");
const hermesCompilerRoot = path.dirname(hermesCompilerPkg);
const source = path.join(hermesCompilerRoot, "hermesc", binDir, binaryName);

const reactNativePkg = require.resolve("react-native/package.json");
const reactNativeRoot = path.dirname(reactNativePkg);
const targetDir = path.join(reactNativeRoot, "sdks", "hermesc", binDir);
const target = path.join(targetDir, binaryName);

if (!exists(source)) {
  console.error(`[fix-hermesc-path] Source Hermes compiler missing: ${source}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
fs.chmodSync(target, 0o755);

console.log(`[fix-hermesc-path] Hermes compiler copied:`);
console.log(`  from: ${source}`);
console.log(`  to:   ${target}`);
