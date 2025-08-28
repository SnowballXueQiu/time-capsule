#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Deploying Time Capsule smart contract to Sui testnet...");

try {
  // Check if sui CLI is available
  const suiCommand =
    process.platform === "win32"
      ? path.join(__dirname, "..", "bin", "sui.exe")
      : "sui";
  try {
    execSync(`${suiCommand} --version`, { stdio: "pipe" });
  } catch (error) {
    console.error("❌ Sui CLI not found. Please make sure bin/sui.exe exists.");
    console.log("💡 Download Sui CLI and place it in bin/sui.exe");
    process.exit(1);
  }

  // Check if we have a Sui client configuration
  try {
    const clientConfig = execSync(`${suiCommand} client active-env`, {
      encoding: "utf8",
    });
    console.log(`📡 Active environment: ${clientConfig.trim()}`);
  } catch (error) {
    console.error("❌ No active Sui client environment found.");
    console.log(
      `💡 Run: ${suiCommand} client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443`
    );
    console.log(`💡 Then: ${suiCommand} client switch --env testnet`);
    process.exit(1);
  }

  // Check if we have an active address
  try {
    const activeAddress = execSync(`${suiCommand} client active-address`, {
      encoding: "utf8",
    });
    console.log(`👤 Active address: ${activeAddress.trim()}`);
  } catch (error) {
    console.error("❌ No active address found.");
    console.log(`💡 Run: ${suiCommand} client new-address ed25519`);
    console.log(
      `💡 Then: ${suiCommand} client switch --address <your-address>`
    );
    process.exit(1);
  }

  // Check balance
  try {
    const balance = execSync(`${suiCommand} client balance`, {
      encoding: "utf8",
    });
    console.log("💰 Current balance:");
    console.log(balance);

    // Check if we have enough SUI for deployment
    const suiMatch = balance.match(/(\d+(?:\.\d+)?)\s+SUI/);
    if (!suiMatch || parseFloat(suiMatch[1]) < 0.1) {
      console.warn(
        "⚠️  Low SUI balance. You may need more SUI for deployment."
      );
      console.log(
        "💡 Get testnet SUI from: https://discord.com/channels/916379725201563759/971488439931392130"
      );
    }
  } catch (error) {
    console.warn("⚠️  Could not check balance");
  }

  // Build and deploy the contract
  console.log("🔨 Building contract...");
  const contractDir = path.join(__dirname, "..", "contracts");

  try {
    execSync(`${suiCommand} move build`, {
      stdio: "inherit",
      cwd: contractDir,
    });
    console.log("✅ Contract built successfully");
  } catch (error) {
    console.error("❌ Contract build failed");
    process.exit(1);
  }

  // Deploy the contract
  console.log("📦 Deploying contract to testnet...");

  try {
    const deployOutput = execSync(
      `${suiCommand} client publish --gas-budget 100000000`,
      {
        encoding: "utf8",
        stdio: "pipe",
        cwd: contractDir,
      }
    );

    console.log("✅ Contract deployed successfully!");
    console.log("\n📋 Deployment details:");
    console.log(deployOutput);

    // Extract package ID from deployment output
    const packageIdMatch = deployOutput.match(/Package ID: (0x[a-fA-F0-9]+)/);
    if (packageIdMatch) {
      const packageId = packageIdMatch[1];
      console.log(`\n🎯 Package ID: ${packageId}`);

      // Save package ID to environment file
      const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
      let envContent = "";

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
      }

      // Update or add package ID
      if (envContent.includes("NEXT_PUBLIC_PACKAGE_ID=")) {
        envContent = envContent.replace(
          /NEXT_PUBLIC_PACKAGE_ID=.*/,
          `NEXT_PUBLIC_PACKAGE_ID=${packageId}`
        );
      } else {
        envContent += `\nNEXT_PUBLIC_PACKAGE_ID=${packageId}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log(`✅ Package ID saved to ${envPath}`);
    }
  } catch (error) {
    console.error("❌ Contract deployment failed");
    console.error(error.message);
    process.exit(1);
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📝 Next steps:");
  console.log("1. Update your frontend to use the new package ID");
  console.log("2. Test the contract functions");
  console.log("3. Share your time capsules!");
} catch (error) {
  console.error("❌ Deployment failed:", error.message);
  process.exit(1);
}
