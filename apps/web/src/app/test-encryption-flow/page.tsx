"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

export default function TestEncryptionFlowPage() {
  const currentAccount = useCurrentAccount();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState({
    message: "Hello, Time Capsule! 你好，时间胶囊！🎉",
    encryptionResult: null as any,
    decryptedContent: "",
  });

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testFullEncryptionFlow = async () => {
    if (!currentAccount) {
      addLog("❌ 请先连接钱包");
      return;
    }

    setLoading(true);
    try {
      addLog("🔄 开始完整加密/解密流程测试...");

      // 1. 导入SDK
      const { getSDK } = await import("../../lib/sdk");
      const sdk = await getSDK();
      addLog("✅ SDK加载成功");

      // 2. 准备测试参数（模拟真实胶囊创建场景）
      const walletAddress = currentAccount.address;
      const capsuleId = `test-capsule-${Date.now()}`;
      const unlockTime = Date.now() + 60000; // 1分钟后

      addLog(`📝 测试参数:`);
      addLog(`   - 钱包地址: ${walletAddress}`);
      addLog(`   - 胶囊ID: ${capsuleId}`);
      addLog(`   - 解锁时间: ${new Date(unlockTime).toLocaleString()}`);
      addLog(`   - 原始消息: "${testData.message}"`);

      // 3. 加密内容
      addLog("🔐 步骤1: 加密内容...");
      const contentBytes = new TextEncoder().encode(testData.message);
      addLog(`   - 原始内容大小: ${contentBytes.length} 字节`);

      const encryptionResult = await sdk.encryptContentWithWallet(
        contentBytes,
        walletAddress,
        capsuleId,
        unlockTime
      );

      setTestData((prev) => ({ ...prev, encryptionResult }));

      addLog("✅ 加密成功!");
      addLog(`   - 密文大小: ${encryptionResult.ciphertext.length} 字节`);
      addLog(
        `   - 随机数: [${encryptionResult.nonce.slice(0, 8).join(", ")}...] (${
          encryptionResult.nonce.length
        } 字节)`
      );
      addLog(
        `   - 盐值: [${encryptionResult.keyDerivationSalt
          .slice(0, 8)
          .join(", ")}...] (${encryptionResult.keyDerivationSalt.length} 字节)`
      );
      addLog(
        `   - 内容哈希: [${encryptionResult.contentHash
          .slice(0, 8)
          .join(", ")}...] (${encryptionResult.contentHash.length} 字节)`
      );

      // 4. 模拟IPFS上传/下载（跳过实际网络操作）
      addLog("📡 步骤2: 模拟IPFS上传/下载...");
      const uploadedContent = encryptionResult.ciphertext;
      addLog(`✅ 模拟上传成功，内容大小: ${uploadedContent.length} 字节`);

      // 5. 解密内容（使用相同的参数）
      addLog("🔓 步骤3: 解密内容...");
      addLog("   - 使用相同的解密参数:");
      addLog(`     * 钱包地址: ${walletAddress}`);
      addLog(`     * 胶囊ID: ${capsuleId}`);
      addLog(`     * 解锁时间: ${unlockTime}`);
      addLog(`     * 随机数长度: ${encryptionResult.nonce.length}`);
      addLog(`     * 盐值长度: ${encryptionResult.keyDerivationSalt.length}`);

      const decryptionResult = await sdk.decryptContentWithWallet(
        uploadedContent,
        encryptionResult.nonce,
        walletAddress,
        capsuleId,
        unlockTime,
        encryptionResult.keyDerivationSalt
      );

      addLog("✅ 解密成功!");
      addLog(`   - 解密后大小: ${decryptionResult.content.length} 字节`);

      // 6. 验证解密结果
      const decryptedMessage = new TextDecoder().decode(
        decryptionResult.content
      );
      setTestData((prev) => ({ ...prev, decryptedContent: decryptedMessage }));

      addLog("🔍 步骤4: 验证解密结果...");
      addLog(`   - 解密后消息: "${decryptedMessage}"`);

      if (decryptedMessage === testData.message) {
        addLog("🎉 验证成功！加密/解密流程完全正常！");
      } else {
        addLog("❌ 验证失败！解密内容不匹配");
        addLog(`   - 期望: "${testData.message}"`);
        addLog(`   - 实际: "${decryptedMessage}"`);
        addLog(
          `   - 长度对比: ${testData.message.length} vs ${decryptedMessage.length}`
        );

        // 字节级对比
        const originalBytes = new TextEncoder().encode(testData.message);
        const decryptedBytes = decryptionResult.content;
        addLog("   - 字节级对比:");
        for (
          let i = 0;
          i < Math.min(originalBytes.length, decryptedBytes.length);
          i++
        ) {
          if (originalBytes[i] !== decryptedBytes[i]) {
            addLog(
              `     位置 ${i}: 期望 ${originalBytes[i]} 实际 ${decryptedBytes[i]}`
            );
            break;
          }
        }
      }

      // 7. 测试错误参数
      addLog("🧪 步骤5: 测试错误参数...");

      try {
        // 测试错误的钱包地址
        await sdk.decryptContentWithWallet(
          uploadedContent,
          encryptionResult.nonce,
          "0xwrongaddress1234567890abcdef1234567890abcdef",
          capsuleId,
          unlockTime,
          encryptionResult.keyDerivationSalt
        );
        addLog("❌ 错误钱包地址应该失败但成功了");
      } catch (error) {
        const wrongResult = await sdk.decryptContentWithWallet(
          uploadedContent,
          encryptionResult.nonce,
          "0xwrongaddress1234567890abcdef1234567890abcdef",
          capsuleId,
          unlockTime,
          encryptionResult.keyDerivationSalt
        );
        const wrongMessage = new TextDecoder().decode(wrongResult.content);
        if (wrongMessage !== testData.message) {
          addLog("✅ 错误钱包地址产生了不同的结果（预期行为）");
        } else {
          addLog("❌ 错误钱包地址产生了相同的结果（不应该发生）");
        }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">加密流程完整测试</h1>

      {!currentAccount && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">请先连接钱包以进行测试</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试消息:
          </label>
          <textarea
            value={testData.message}
            onChange={(e) =>
              setTestData((prev) => ({ ...prev, message: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
            disabled={loading}
          />
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={testFullEncryptionFlow}
            disabled={loading || !currentAccount}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "测试中..." : "开始完整流程测试"}
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

      {testData.decryptedContent && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">解密结果对比</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">原始消息</h3>
              <div className="bg-gray-50 p-3 rounded border">
                <pre className="whitespace-pre-wrap text-sm">
                  {testData.message}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">解密后消息</h3>
              <div className="bg-gray-50 p-3 rounded border">
                <pre className="whitespace-pre-wrap text-sm">
                  {testData.decryptedContent}
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>
              匹配状态:{" "}
              {testData.message === testData.decryptedContent ? (
                <span className="text-green-600 font-medium">✅ 完全匹配</span>
              ) : (
                <span className="text-red-600 font-medium">❌ 不匹配</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
