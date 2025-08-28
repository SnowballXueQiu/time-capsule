"use client";

import { useState } from "react";

export default function SimpleWASMTestPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testWASMLoad = async () => {
    setLoading(true);
    setResult("");

    try {
      setResult("正在加载WASM模块...\n");

      // 直接导入WASM模块
      const wasmModule = await import(
        "../../../../packages/sdk/src/wasm/encryptor_wasi.js"
      );
      setResult((prev) => prev + "✅ WASM模块导入成功\n");

      // 初始化WASM
      if (typeof wasmModule.default === "function") {
        await wasmModule.default();
        setResult((prev) => prev + "✅ WASM模块初始化成功\n");
      }

      // 测试基本功能
      if (wasmModule.wasm_generate_key) {
        const key = wasmModule.wasm_generate_key();
        setResult(
          (prev) => prev + `✅ 生成密钥成功，长度: ${key.length} 字节\n`
        );
      }

      if (wasmModule.wasm_generate_nonce) {
        const nonce = wasmModule.wasm_generate_nonce();
        setResult(
          (prev) => prev + `✅ 生成随机数成功，长度: ${nonce.length} 字节\n`
        );
      }

      if (wasmModule.wasm_hash_content) {
        const testData = new TextEncoder().encode("Hello, World!");
        const hash = wasmModule.wasm_hash_content(testData);
        setResult(
          (prev) => prev + `✅ 哈希计算成功，长度: ${hash.length} 字节\n`
        );
      }

      // 测试加密功能
      if (wasmModule.wasm_encrypt_content_with_wallet) {
        const testContent = new TextEncoder().encode("测试内容");
        const walletAddress = "0x1234567890abcdef";
        const capsuleId = "test-capsule";
        const unlockTime = Date.now();

        const encryptResult = wasmModule.wasm_encrypt_content_with_wallet(
          testContent,
          walletAddress,
          capsuleId,
          unlockTime
        );

        setResult((prev) => prev + `✅ 钱包加密成功\n`);
        setResult(
          (prev) =>
            prev + `   - 密文长度: ${encryptResult.ciphertext.length} 字节\n`
        );
        setResult(
          (prev) =>
            prev + `   - 随机数长度: ${encryptResult.nonce.length} 字节\n`
        );
        setResult(
          (prev) =>
            prev +
            `   - 盐值长度: ${encryptResult.key_derivation_salt.length} 字节\n`
        );

        // 测试解密
        if (wasmModule.wasm_decrypt_content_with_wallet) {
          const decryptResult = wasmModule.wasm_decrypt_content_with_wallet(
            encryptResult.ciphertext,
            encryptResult.nonce,
            walletAddress,
            capsuleId,
            unlockTime,
            encryptResult.key_derivation_salt
          );

          const decryptedText = new TextDecoder().decode(decryptResult);
          setResult((prev) => prev + `✅ 钱包解密成功\n`);
          setResult((prev) => prev + `   - 解密内容: "${decryptedText}"\n`);

          if (decryptedText === "测试内容") {
            setResult((prev) => prev + "🎉 完整的加密/解密测试成功！\n");
          } else {
            setResult((prev) => prev + "❌ 解密内容不匹配\n");
          }
        }
      }
    } catch (error) {
      console.error("WASM测试失败:", error);
      setResult(
        (prev) =>
          prev +
          `❌ 测试失败: ${
            error instanceof Error ? error.message : String(error)
          }\n`
      );

      // 如果是MIME类型错误，提供解决方案
      if (
        error instanceof Error &&
        error.message.includes("application/wasm")
      ) {
        setResult((prev) => prev + "\n💡 解决方案:\n");
        setResult((prev) => prev + "1. 确保Next.js配置了正确的WASM MIME类型\n");
        setResult((prev) => prev + "2. 重启开发服务器\n");
        setResult((prev) => prev + "3. 检查浏览器控制台的详细错误信息\n");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">简单 WASM 测试</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={testWASMLoad}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
        >
          {loading ? "测试中..." : "测试 WASM 加载和功能"}
        </button>

        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
          {result || "点击按钮开始测试..."}
        </div>
      </div>
    </div>
  );
}
