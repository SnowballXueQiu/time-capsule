#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

const PLATFORM = process.platform;
const suiBinary = path.join(
  __dirname,
  "..",
  "bin",
  PLATFORM === "win32" ? "sui.exe" : "sui"
);

async function completeSetup() {
  console.log("🚀 Time Capsule Complete Setup");
  console.log("================================");

  try {
    // Get current address
    console.log("📋 Getting your Sui address...");
    const address = execSync(`"${suiBinary}" client active-address`, {
      encoding: "utf8",
    }).trim();
    console.log("📍 Your Sui address:", address);

    // Check balance
    console.log("\n💰 Checking current balance...");
    try {
      const balance = execSync(`"${suiBinary}" client balance`, {
        encoding: "utf8",
      });
      console.log(balance);

      if (balance.includes("No coins found")) {
        console.log("\n🚰 You need test SUI tokens to deploy the contract.");
        console.log("🌐 Please visit the faucet to get test tokens:");
        console.log(`   https://faucet.sui.io/?address=${address}`);
        console.log("\n⏳ After getting tokens, run this script again or use:");
        console.log("   node scripts/deploy-contract.js");
        return;
      }
    } catch (error) {
      console.log(
        "⚠️  Could not check balance, but continuing with deployment..."
      );
    }

    // Deploy contract
    console.log("\n🚀 Deploying contract...");
    const { deployContract } = require("./deploy-contract.js");
    const packageId = await deployContract();

    console.log("\n✅ Setup Complete!");
    console.log("==================");
    console.log("📦 Package ID:", packageId);
    console.log("🌐 Your Time Capsule dApp is ready to use!");
    console.log("\n🎯 Next steps:");
    console.log("   1. Start the development server: pnpm dev");
    console.log("   2. Open http://localhost:3000");
    console.log("   3. Connect your wallet and start creating time capsules!");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);

    if (error.message.includes("Insufficient gas")) {
      console.log("\n💡 You need more SUI tokens. Visit the faucet:");
      const address = execSync(`"${suiBinary}" client active-address`, {
        encoding: "utf8",
      }).trim();
      console.log(`   https://faucet.sui.io/?address=${address}`);
    }

    process.exit(1);
  }
}

if (require.main === module) {
  completeSetup();
}

module.exports = { completeSetup };
