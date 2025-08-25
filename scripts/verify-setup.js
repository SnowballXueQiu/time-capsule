#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔍 Verifying project setup...\n");

// Check if pnpm is being used
const lockFile = path.join(__dirname, "..", "pnpm-lock.yaml");
if (!fs.existsSync(lockFile)) {
  console.error(
    "❌ pnpm-lock.yaml not found. Please use pnpm install instead of npm/yarn/bun"
  );
  process.exit(1);
}
console.log("✅ pnpm lock file found");

// Check Sui CLI
const suiBinary = path.join(
  __dirname,
  "..",
  "bin",
  process.platform === "win32" ? "sui.exe" : "sui"
);
if (!fs.existsSync(suiBinary)) {
  console.error("❌ Sui CLI not found. Run: pnpm setup:sui");
  process.exit(1);
}

try {
  const version = execSync(`"${suiBinary}" --version`, { encoding: "utf8" });
  console.log(`✅ Sui CLI: ${version.trim()}`);
} catch (error) {
  console.error("❌ Sui CLI not working properly");
  process.exit(1);
}

// Check Rust workspace
const rustDir = path.join(__dirname, "..", "rust");
if (fs.existsSync(rustDir)) {
  try {
    process.chdir(rustDir);
    execSync("cargo check --quiet", { stdio: "pipe" });
    console.log("✅ Rust workspace builds successfully");
  } catch (error) {
    console.error("❌ Rust workspace has build errors");
    process.exit(1);
  }
}

// Check TypeScript packages
try {
  process.chdir(path.join(__dirname, ".."));
  execSync("pnpm build", { stdio: "pipe" });
  console.log("✅ TypeScript packages build successfully");
} catch (error) {
  console.error("❌ TypeScript build failed");
  process.exit(1);
}

console.log("\n🎉 All checks passed! Project setup is complete.");
console.log("\n📝 Next steps:");
console.log("  - Run: pnpm dev (start development server)");
console.log("  - Run: pnpm sui move build (build Move contracts)");
console.log("  - Run: pnpm test (run tests)");
