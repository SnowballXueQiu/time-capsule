#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Setting up environment variables...");

const envPath = path.join(__dirname, "..", "apps", "web", ".env.local");
const envExamplePath = path.join(
  __dirname,
  "..",
  "apps",
  "web",
  ".env.local.example"
);

// Check if .env.local already exists
if (fs.existsSync(envPath)) {
  console.log("✅ .env.local already exists");

  // Read current content
  const envContent = fs.readFileSync(envPath, "utf8");

  // Check for required variables
  const requiredVars = [
    "NEXT_PUBLIC_PINATA_JWT",
    "NEXT_PUBLIC_PINATA_GATEWAY",
    "PINATA_JWT",
    "PINATA_GATEWAY",
    "NEXT_PUBLIC_PACKAGE_ID",
  ];

  console.log("\n📋 Environment variables status:");
  for (const varName of requiredVars) {
    if (
      envContent.includes(`${varName}=`) &&
      !envContent.includes(`${varName}=your_`)
    ) {
      console.log(`✅ ${varName} - configured`);
    } else {
      console.log(`⚠️  ${varName} - needs configuration`);
    }
  }

  console.log("\n💡 To configure Pinata:");
  console.log("1. Sign up at https://pinata.cloud");
  console.log("2. Create an API key");
  console.log("3. Update the values in apps/web/.env.local");
} else {
  // Copy from example
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("✅ Created .env.local from example");
    console.log(
      "⚠️  Please configure your Pinata credentials in apps/web/.env.local"
    );
  } else {
    // Create basic .env.local
    const basicEnv = `# Pinata IPFS Configuration
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_here
NEXT_PUBLIC_PINATA_GATEWAY=your_gateway_domain.mypinata.cloud
PINATA_JWT=your_pinata_jwt_here
PINATA_GATEWAY=your_gateway_domain.mypinata.cloud

# Sui Network Configuration
NEXT_PUBLIC_PACKAGE_ID=0x0
`;

    fs.writeFileSync(envPath, basicEnv);
    console.log("✅ Created basic .env.local");
    console.log("⚠️  Please configure your Pinata credentials");
  }

  console.log("\n💡 Next steps:");
  console.log("1. Sign up at https://pinata.cloud");
  console.log("2. Create an API key");
  console.log("3. Update the JWT and Gateway values in apps/web/.env.local");
  console.log("4. Deploy the smart contract with: pnpm deploy");
}

console.log("\n🎯 Ready to run: pnpm dev");
