#!/usr/bin/env node

// 检测是否在 Vercel 环境中
const isVercel = process.env.VERCEL || process.env.CI;

console.log(`🔧 Running in ${isVercel ? "Vercel/CI" : "local"} environment`);

if (isVercel) {
  console.log("⏭️  Skipping Sui CLI setup in Vercel environment");
  console.log("✅ Vercel setup complete");
} else {
  console.log("🏠 Running local setup...");

  const { execSync } = require("child_process");

  try {
    // 运行本地设置脚本
    execSync("pnpm setup:sui && pnpm setup:env", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    console.warn("⚠️  Setup scripts failed, but continuing...");
  }
}
