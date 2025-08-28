"use client";

import { useState } from "react";

export default function DebugEncryptionPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testFullFlow = async () => {
    setLoading(true);
    setLogs([]);

    try {
      addLog("开始完整的加密/解密流程测试...");

      // 1. 导入SDK
      addLog("1. 导入SDK...");
      const { getSDK } = await import("../../lib/sdk");
      const sdk = await getSDK();
      addLog("✅ SDK导入成功");

      // 2. 准备测试数据
      const testMessage = "这是一个测试消息，包含中文和English！🎉";
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const capsuleId = `test-capsule-${Date.now()}`;
      const unlockTime = Date.now() + 60000; // 1分钟后

      addLog(`2. 测试数据准备完成:`);
      addLog(`   - 消息: "${testMessage}"`);
      addLog(`   - 钱包地址: ${walletAddress}`);
      addLog(`   - 胶囊ID: ${capsuleId}`);
      addLog(`   - 解锁时间: ${new Date(unlockTime).toLocaleString()}`);

      // 3. 加密内容
      addLog("3. 开始加密内容...");
      const contentBytes = new TextEncoder().encode(testMessage);
      addLog(`   - 原始内容大小: ${contentBytes.length} 字节`);

      const encryptionResult = await sdk.encryptContentWithWallet(
        contentBytes,
        walletAddress,
        capsuleId,
        unlockTime
      );

      addLog("✅ 加密成功!");
      addLog(`   - 密文大小: ${encryptionResult.ciphertext.length} 字节`);
      addLog(`   - 随机数大小: ${encryptionResult.nonce.length} 字节`);
      addLog(
        `   - 盐值大小: ${encryptionResult.keyDerivationSalt.length} 字节`
      );
      addLog(`   - 内容哈希大小: ${encryptionResult.contentHash.length} 字节`);

      // 4. 模拟上传到IPFS (跳过实际上传)
      addLog("4. 模拟IPFS上传...");
      const mockCID = `Qm${Math.random().toString(36).substr(2, 44)}`;
      addLog(`✅ 模拟上传成功，CID: ${mockCID}`);

      // 5. 模拟从IPFS下载
      addLog("5. 模拟从IPFS下载加密内容...");
      const downloadedContent = encryptionResult.ciphertext;
      addLog(`✅ 下载成功，大小: ${downloadedContent.length} 字节`);

      // 6. 解密内容
      addLog("6. 开始解密内容...");
      const decryptionResult = await sdk.decryptContentWithWallet(
        downloadedContent,
        encryptionResult.nonce,
        walletAddress,
        capsuleId,
        unlockTime,
        encryptionResult.keyDerivationSalt
      );

      addLog("✅ 解密成功!");
      addLog(`   - 解密后大小: ${decryptionResult.content.length} 字节`);

      // 7. 验证内容
      const decryptedMessage = new TextDecoder().decode(
        decryptionResult.content
      );
      addLog("7. 验证解密内容...");
      addLog(`   - 解密后消息: "${decryptedMessage}"`);

      if (decryptedMessage === testMessage) {
        addLog("🎉 验证成功！加密/解密流程完全正常！");
      } else {
        addLog("❌ 验证失败！解密后的内容与原始内容不匹配");
        addLog(`   - 期望: "${testMessage}"`);
        addLog(`   - 实际: "${decryptedMessage}"`);
      }
    } catch (error) {
      addLog(
        `❌ 测试失败: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error("完整测试失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const testWrongParameters = async () => {
    setLoading(true);
    setLogs([]);

    try {
      addLog("开始错误参数测试...");

      const { getSDK } = await import("../../lib/sdk");
      const sdk = await getSDK();

      const testMessage = "测试消息";
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const capsuleId = `test-capsule-${Date.now()}`;
      const unlockTime = Date.now() + 60000;

      // 正确加密
      const contentBytes = new TextEncoder().encode(testMessage);
      const encryptionResult = await sdk.encryptContentWithWallet(
        contentBytes,
        walletAddress,
        capsuleId,
        unlockTime
      );

      addLog("✅ 正确加密完成");

      // 尝试用错误的钱包地址解密
      addLog("测试错误钱包地址解密...");
      try {
        await sdk.decryptContentWithWallet(
          encryptionResult.ciphertext,
          encryptionResult.nonce,
          "0xwrongaddress1234567890abcdef1234567890abcdef",
          capsuleId,
          unlockTime,
          encryptionResult.keyDerivationSalt
        );
        addLog("❌ 应该失败但成功了！");
      } catch (error) {
        addLog("✅ 正确拒绝了错误的钱包地址");
      }

      // 尝试用错误的胶囊ID解密
      addLog("测试错误胶囊ID解密...");
      try {
        const decryptResult = await sdk.decryptContentWithWallet(
          encryptionResult.ciphertext,
          encryptionResult.nonce,
          walletAddress,
          "wrong-capsule-id",
          unlockTime,
          encryptionResult.keyDerivationSalt
        );
        const decryptedMessage = new TextDecoder().decode(
          decryptResult.content
        );
        if (decryptedMessage === testMessage) {
          addLog("❌ 应该失败但成功了！");
        } else {
          addLog("✅ 错误胶囊ID产生了不同的解密结果（预期行为）");
        }
      } catch (error) {
        addLog("✅ 正确拒绝了错误的胶囊ID");
      }

      addLog("🎉 错误参数测试完成！");
    } catch (error) {
      addLog(
        `❌ 错误参数测试失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">加密调试工具</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={testFullFlow}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "测试中..." : "测试完整流程"}
          </button>

          <button
            onClick={testWrongParameters}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "测试中..." : "测试错误参数"}
          </button>

          <button
            onClick={() => setLogs([])}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            清除日志
          </button>
        </div>

        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">点击按钮开始测试...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
