#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PLATFORM = process.platform;
const ARCH = process.arch;

console.log("🔧 Setting up Sui CLI...");

// Create bin directory if it doesn't exist
const binDir = path.join(__dirname, "..", "bin");
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

// Check if sui binary already exists from local build
const localSuiBinary = path.join(
  __dirname,
  "..",
  "sui",
  "target",
  "release",
  "sui.exe"
);
const targetSuiBinary = path.join(
  binDir,
  PLATFORM === "win32" ? "sui.exe" : "sui"
);

if (fs.existsSync(localSuiBinary)) {
  console.log("📦 Found locally built Sui CLI, copying...");
  try {
    fs.copyFileSync(localSuiBinary, targetSuiBinary);

    // Make executable on Unix systems
    if (PLATFORM !== "win32") {
      fs.chmodSync(targetSuiBinary, "755");
    }

    console.log("✅ Sui CLI copied successfully from local build!");

    // Verify installation
    try {
      const version = execSync(`"${targetSuiBinary}" --version`, {
        encoding: "utf8",
      });
      console.log(`🎉 Sui CLI ready: ${version.trim()}`);
      return;
    } catch (error) {
      console.error("❌ Failed to verify Sui CLI installation");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Failed to copy Sui CLI binary:", error.message);
    process.exit(1);
  }
}

// If no local build, try to build it
console.log("🏗️  No pre-built Sui CLI found, attempting to build...");

const suiDir = path.join(__dirname, "..", "sui");
if (!fs.existsSync(suiDir)) {
  console.error(
    "❌ Sui submodule not found. Please run: git submodule update --init --recursive"
  );
  process.exit(1);
}

try {
  console.log("🔨 Building Sui CLI (this may take a while)...");

  // Change to sui directory and build
  process.chdir(suiDir);

  // Build sui binary
  execSync("cargo build --release --bin sui", {
    stdio: "inherit",
    env: { ...process.env },
  });

  // Copy the built binary
  const builtBinary = path.join(
    suiDir,
    "target",
    "release",
    PLATFORM === "win32" ? "sui.exe" : "sui"
  );

  if (fs.existsSync(builtBinary)) {
    fs.copyFileSync(builtBinary, targetSuiBinary);

    // Make executable on Unix systems
    if (PLATFORM !== "win32") {
      fs.chmodSync(targetSuiBinary, "755");
    }

    console.log("✅ Sui CLI built and installed successfully!");

    // Verify installation
    const version = execSync(`"${targetSuiBinary}" --version`, {
      encoding: "utf8",
    });
    console.log(`🎉 Sui CLI ready: ${version.trim()}`);
  } else {
    throw new Error("Built binary not found");
  }
} catch (error) {
  console.error("❌ Failed to build Sui CLI:", error.message);
  console.log("");
  console.log("💡 Manual setup options:");
  console.log("1. Install Rust and required dependencies");
  console.log("2. Run: cd sui && cargo build --release --bin sui");
  console.log(
    "3. Or download pre-built binary from: https://github.com/MystenLabs/sui/releases"
  );
  process.exit(1);
}
