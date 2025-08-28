"use client";

import { useState } from "react";

export default function TestWASMPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testWASM = async () => {
    setLoading(true);
    setResult("");

    try {
      // 测试WASM加载
      const { getSDK } = await import("../../lib/sdk");
      const sdk = await getSDK();

      // 测试加密
      const testContent = new TextEncoder().encode("Hello, WASM!");
      const walletAddress = "0x1234567890abcdef";
      const capsuleId = "test-capsule";
      const unlockTime = Date.now() + 60000; // 1分钟后

      console.log("开始测试WASM加密...");
      const encryptResult = await sdk.encryptContentWithWallet(
        testContent,
        walletAddress,
        capsuleId,
        unlockTime
      );

      console.log("加密成功，开始测试解密...");
      const decryptResult = await sdk.decryptContentWithWallet(
        encryptResult.ciphertext,
        encryptResult.nonce,
        walletAddress,
        capsuleId,
        unlockTime,
        encryptResult.keyDerivationSalt
      );

      const decryptedText = new TextDecoder().decode(decryptResult.content);

      setResult(`✅ WASM测试成功！
原始内容: "Hello, WASM!"
解密内容: "${decryptedText}"
加密数据大小: ${encryptResult.ciphertext.length} 字节
随机数大小: ${encryptResult.nonce.length} 字节
盐值大小: ${encryptResult.keyDerivationSalt.length} 字节`);
    } catch (error) {
      console.error("WASM测试失败:", error);
      setResult(
        `❌ WASM测试失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">WASM 加密测试</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={testWASM}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "测试中..." : "测试 WASM 加密/解密"}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded border">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
