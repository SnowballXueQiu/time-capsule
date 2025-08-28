// 简单的WASM测试脚本
const puppeteer = require("puppeteer");

async function testWASMFix() {
  console.log("🔄 启动WASM修复测试...");

  let browser;
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // 监听控制台消息
    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === "error") {
        console.log("❌ 浏览器错误:", text);
      } else if (text.includes("WASM")) {
        console.log("📋 WASM相关:", text);
      }
    });

    // 监听页面错误
    page.on("pageerror", (error) => {
      console.log("❌ 页面错误:", error.message);
    });

    console.log("🌐 访问调试页面...");
    await page.goto("http://localhost:3000/debug", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    console.log("✅ 调试页面加载成功");

    // 点击简单WASM测试链接
    console.log("🔄 导航到简单WASM测试页面...");
    await page.click('a[href="/simple-wasm-test"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    console.log("✅ WASM测试页面加载成功");

    // 点击测试按钮
    console.log("🔄 执行WASM测试...");
    await page.click('button:contains("测试 WASM 加载和功能")');

    // 等待测试完成
    await page.waitForTimeout(10000);

    // 检查测试结果
    const resultText = await page.$eval(".bg-gray-900", (el) => el.textContent);

    if (resultText.includes("✅") && resultText.includes("WASM模块导入成功")) {
      console.log("🎉 WASM测试成功！");
      return true;
    } else if (resultText.includes("❌")) {
      console.log("❌ WASM测试失败");
      console.log("测试结果:", resultText);
      return false;
    } else {
      console.log("⏳ 测试仍在进行中...");
      return false;
    }
  } catch (error) {
    console.log("❌ 测试过程中出错:", error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 检查是否安装了puppeteer
try {
  require("puppeteer");
  testWASMFix().then((success) => {
    if (success) {
      console.log("🎉 所有测试通过！");
      process.exit(0);
    } else {
      console.log("❌ 测试失败");
      process.exit(1);
    }
  });
} catch (error) {
  console.log("⚠️  Puppeteer未安装，请手动测试：");
  console.log("1. 访问 http://localhost:3000/debug");
  console.log('2. 点击"简单WASM测试"');
  console.log('3. 点击"测试 WASM 加载和功能"按钮');
  console.log('4. 检查是否显示"✅ WASM模块导入成功"');
}
