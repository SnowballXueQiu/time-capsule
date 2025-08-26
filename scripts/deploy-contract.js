#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PLATFORM = process.platform;
const suiBinary = path.join(
  __dirname,
  "..",
  "bin",
  PLATFORM === "win32" ? "sui.exe" : "sui"
);
const contractDir = path.join(__dirname, "..", "contracts", "time_capsule");
const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");

async function deployContract() {
  console.log("🚀 Deploying Time Capsule contract...");

  // Check if Sui CLI exists
  if (!fs.existsSync(suiBinary)) {
    console.error("❌ Sui CLI not found. Please run: pnpm setup:sui");
    process.exit(1);
  }

  // Check if contract directory exists
  if (!fs.existsSync(contractDir)) {
    console.error("❌ Contract directory not found:", contractDir);
    process.exit(1);
  }

  try {
    // Change to contract directory
    process.chdir(contractDir);

    // Build the contract first
    console.log("🔨 Building contract...");
    execSync(`"${suiBinary}" move build`, { stdio: "inherit" });

    // Deploy the contract
    console.log("📦 Publishing contract to devnet...");
    const deployOutput = execSync(
      `"${suiBinary}" client publish --gas-budget 100000000 --json`,
      {
        encoding: "utf8",
        stdio: ["inherit", "pipe", "inherit"],
      }
    );

    // Parse the deployment result
    const deployResult = JSON.parse(deployOutput);

    if (deployResult.objectChanges) {
      // Find the package object
      const packageObject = deployResult.objectChanges.find(
        (change) => change.type === "published"
      );

      if (packageObject && packageObject.packageId) {
        const packageId = packageObject.packageId;
        console.log("✅ Contract deployed successfully!");
        console.log("📋 Package ID:", packageId);

        // Update .env.local file
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, "utf8");

          // Replace the package ID
          if (envContent.includes("NEXT_PUBLIC_PACKAGE_ID=")) {
            envContent = envContent.replace(
              /NEXT_PUBLIC_PACKAGE_ID=.*/,
              `NEXT_PUBLIC_PACKAGE_ID=${packageId}`
            );
          } else {
            envContent += `\nNEXT_PUBLIC_PACKAGE_ID=${packageId}\n`;
          }

          fs.writeFileSync(envPath, envContent);
          console.log("✅ Updated .env.local with new Package ID");
        }

        // Also update the template
        const templatePath = path.join(
          __dirname,
          "..",
          "apps",
          "web",
          ".env.template"
        );
        if (fs.existsSync(templatePath)) {
          let templateContent = fs.readFileSync(templatePath, "utf8");
          templateContent = templateContent.replace(
            /NEXT_PUBLIC_PACKAGE_ID=.*/,
            `NEXT_PUBLIC_PACKAGE_ID=${packageId}`
          );
          fs.writeFileSync(templatePath, templateContent);
          console.log("✅ Updated .env.template with new Package ID");
        }

        console.log("");
        console.log(
          "🎉 Deployment complete! You can now use the Time Capsule dApp."
        );
        console.log("");

        return packageId;
      }
    }

    throw new Error("Failed to extract package ID from deployment result");
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);

    if (error.message.includes("Insufficient gas")) {
      console.log("💡 Try increasing the gas budget or check your SUI balance");
    } else if (error.message.includes("No such file or directory")) {
      console.log("💡 Make sure Sui CLI is properly installed");
    } else if (error.message.includes("Connection refused")) {
      console.log(
        "💡 Make sure you are connected to the internet and devnet is accessible"
      );
    }

    process.exit(1);
  }
}

if (require.main === module) {
  deployContract();
}

module.exports = { deployContract };
