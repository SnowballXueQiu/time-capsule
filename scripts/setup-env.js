#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const webDir = path.join(__dirname, "..", "apps", "web");
const templatePath = path.join(webDir, ".env.template");
const localPath = path.join(webDir, ".env.local");

function setupEnvironment() {
  console.log("🔧 Checking environment configuration...");

  // Check if template file exists
  if (!fs.existsSync(templatePath)) {
    console.error("❌ .env.template file not found");
    process.exit(1);
  }

  // Check if .env.local already exists
  if (fs.existsSync(localPath)) {
    console.log("✅ .env.local file already exists");

    // Check if it contains necessary Pinata configuration
    const localContent = fs.readFileSync(localPath, "utf8");
    const hasApiKey =
      localContent.includes("NEXT_PUBLIC_PINATA_API_KEY=") &&
      !localContent.includes(
        "NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key_here"
      );
    const hasApiSecret =
      localContent.includes("NEXT_PUBLIC_PINATA_API_SECRET=") &&
      !localContent.includes(
        "NEXT_PUBLIC_PINATA_API_SECRET=your_pinata_api_secret_here"
      );
    const hasJWT =
      localContent.includes("NEXT_PUBLIC_PINATA_JWT=") &&
      !localContent.includes(
        "NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token_here"
      );

    if (hasApiKey && hasApiSecret && hasJWT) {
      console.log("✅ Pinata configuration is complete");
      return;
    } else {
      console.log(
        "⚠️  .env.local exists but Pinata configuration is incomplete"
      );

      // Try to merge configurations
      const templateContent = fs.readFileSync(templatePath, "utf8");
      const templateLines = templateContent.split("\n");
      const localLines = localContent.split("\n");

      // Create merged configuration
      const mergedLines = [...localLines];

      templateLines.forEach((templateLine) => {
        const trimmedLine = templateLine.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const [key] = trimmedLine.split("=");
          const existingLineIndex = localLines.findIndex((line) =>
            line.trim().startsWith(key + "=")
          );

          if (existingLineIndex === -1) {
            // Add missing configuration items
            mergedLines.push(templateLine);
          }
        }
      });

      // Write merged configuration
      fs.writeFileSync(localPath, mergedLines.join("\n"));
      console.log(
        "✅ Updated .env.local file with missing configuration items"
      );
      console.log("📝 Please check and fill in your Pinata credentials");
      return;
    }
  }

  // Copy template file to .env.local
  try {
    const templateContent = fs.readFileSync(templatePath, "utf8");
    fs.writeFileSync(localPath, templateContent);
    console.log("✅ Created .env.local file from template");
    console.log("");
    console.log(
      "📝 Please edit apps/web/.env.local file and fill in your Pinata credentials:"
    );
    console.log("");
    console.log("1. Visit https://app.pinata.cloud/keys");
    console.log("2. Create a new API Key");
    console.log("3. Copy API Key, API Secret and JWT Token");
    console.log("4. Replace placeholders in .env.local file");
    console.log("");
  } catch (error) {
    console.error("❌ Failed to create .env.local file:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupEnvironment();
}

module.exports = { setupEnvironment };
