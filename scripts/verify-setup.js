#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔍 Verifying Time Capsule setup...\n");

let allGood = true;

// Check Node.js version
try {
  const nodeVersion = process.version;
  console.log(`✅ Node.js version: ${nodeVersion}`);

  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
  if (majorVersion < 18) {
    console.warn("⚠️  Node.js 18+ recommended");
  }
} catch (error) {
  console.error("❌ Node.js check failed");
  allGood = false;
}

// Check pnpm
try {
  const pnpmVersion = execSync("pnpm --version", { encoding: "utf8" }).trim();
  console.log(`✅ pnpm version: ${pnpmVersion}`);
} catch (error) {
  console.error("❌ pnpm not found. Please install pnpm: npm install -g pnpm");
  allGood = false;
}

// Check Sui CLI
try {
  const suiVersion = execSync("sui --version", { encoding: "utf8" }).trim();
  console.log(`✅ Sui CLI version: ${suiVersion}`);
} catch (error) {
  console.error(
    "❌ Sui CLI not found. Please install from: https://docs.sui.io/guides/developer/getting-started/sui-install"
  );
  allGood = false;
}

// Check Rust (for WASM compilation)
try {
  const rustVersion = execSync("rustc --version", { encoding: "utf8" }).trim();
  console.log(`✅ Rust version: ${rustVersion}`);
} catch (error) {
  console.warn(
    "⚠️  Rust not found. Install from: https://rustup.rs/ (needed for WASM compilation)"
  );
}

// Check wasm-pack (for WASM compilation)
try {
  const wasmPackVersion = execSync("wasm-pack --version", {
    encoding: "utf8",
  }).trim();
  console.log(`✅ wasm-pack version: ${wasmPackVersion}`);
} catch (error) {
  console.warn(
    "⚠️  wasm-pack not found. Install with: cargo install wasm-pack (needed for WASM compilation)"
  );
}

// Check project structure
const requiredDirs = [
  "apps/web",
  "packages/sdk",
  "packages/types",
  "contracts",
  "rust/encryptor-wasi",
];

console.log("\n📁 Checking project structure...");
for (const dir of requiredDirs) {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir}/`);
  } else {
    console.error(`❌ Missing directory: ${dir}/`);
    allGood = false;
  }
}

// Check environment files
console.log("\n🔧 Checking environment configuration...");
const envPath = path.join("apps", "web", ".env.local");
if (fs.existsSync(envPath)) {
  console.log("✅ .env.local exists");

  const envContent = fs.readFileSync(envPath, "utf8");
  const requiredVars = [
    "NEXT_PUBLIC_PINATA_API_KEY",
    "NEXT_PUBLIC_PINATA_API_SECRET",
    "NEXT_PUBLIC_PINATA_JWT",
    "NEXT_PUBLIC_PINATA_GATEWAY",
  ];

  for (const varName of requiredVars) {
    if (envContent.includes(`${varName}=`)) {
      console.log(`✅ ${varName} configured`);
    } else {
      console.warn(`⚠️  ${varName} not configured`);
    }
  }
} else {
  console.warn("⚠️  .env.local not found. Run: pnpm setup:env");
}

// Check dependencies
console.log("\n📦 Checking dependencies...");
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log(`✅ Project: ${packageJson.name} v${packageJson.version}`);

  if (fs.existsSync("node_modules")) {
    console.log("✅ Dependencies installed");
  } else {
    console.warn("⚠️  Dependencies not installed. Run: pnpm install");
  }
} catch (error) {
  console.error("❌ Could not read package.json");
  allGood = false;
}

// Check Sui client configuration
console.log("\n🌐 Checking Sui client configuration...");
try {
  const activeEnv = execSync("sui client active-env", {
    encoding: "utf8",
  }).trim();
  console.log(`✅ Active environment: ${activeEnv}`);

  const activeAddress = execSync("sui client active-address", {
    encoding: "utf8",
  }).trim();
  console.log(`✅ Active address: ${activeAddress}`);

  // Check if it's testnet
  if (activeEnv.includes("testnet")) {
    console.log("✅ Using testnet (recommended for development)");
  } else {
    console.warn(
      "⚠️  Not using testnet. Switch with: sui client switch --env testnet"
    );
  }
} catch (error) {
  console.warn(
    "⚠️  Sui client not configured. Run: sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443"
  );
}

// Summary
console.log("\n" + "=".repeat(50));
if (allGood) {
  console.log("🎉 Setup verification completed successfully!");
  console.log("\n📝 Ready to run:");
  console.log("• pnpm dev     - Start development server");
  console.log("• pnpm build   - Build for production");
  console.log("• pnpm deploy  - Deploy smart contract");
} else {
  console.log(
    "❌ Setup verification found issues. Please fix them before proceeding."
  );
  process.exit(1);
}

console.log("\n📖 Documentation: https://docs.sui.io/");
console.log("💬 Discord: https://discord.gg/sui");
console.log("🐛 Issues: https://github.com/your-repo/issues");
