#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const PLATFORM = process.platform;
const suiBinary = path.join(
  __dirname,
  "..",
  "bin",
  PLATFORM === "win32" ? "sui.exe" : "sui"
);

async function initSuiClient() {
  console.log("🔧 Initializing Sui client...");

  return new Promise((resolve, reject) => {
    const sui = spawn(suiBinary, ["client"], {
      stdio: ["pipe", "inherit", "inherit"],
    });

    // Send responses to the prompts
    sui.stdin.write("y\n"); // Connect to Sui Full node server
    sui.stdin.write("\n"); // Use default devnet URL
    sui.stdin.write("0\n"); // Use ed25519 key scheme
    sui.stdin.end();

    sui.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Sui client initialized successfully");
        resolve();
      } else {
        console.error("❌ Failed to initialize Sui client");
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    sui.on("error", (error) => {
      console.error("❌ Error initializing Sui client:", error.message);
      reject(error);
    });
  });
}

if (require.main === module) {
  initSuiClient().catch(console.error);
}

module.exports = { initSuiClient };
