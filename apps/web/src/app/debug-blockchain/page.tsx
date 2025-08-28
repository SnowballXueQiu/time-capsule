"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

export default function DebugBlockchainPage() {
  const currentAccount = useCurrentAccount();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [capsuleId, setCapsuleId] = useState("");

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const debugCapsuleData = async () => {
    if (!capsuleId.trim()) {
      addLog("❌ 请输入胶囊ID");
      return;
    }

    setLoading(true);
    try {
      addLog(`🔄 开始调试胶囊数据: ${capsuleId}`);

      // 1. 导入SDK
      const { getSDK } = await import("../../lib/sdk");
      const sdk = await getSDK();
      addLog("✅ SDK加载成功");

      // 2. 获取原始区块链数据
      addLog("🔄 获取原始区块链数据...");
      const client = sdk.getClient();

      const response = await client.getObject({
        id: capsuleId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!response.data) {
        throw new Error("胶囊不存在");
      }

      addLog("✅ 原始数据获取成功");
      addLog("📋 原始对象数据:");
      addLog(JSON.stringify(response.data, null, 2));

      // 3. 检查内容字段
      if (
        response.data.content &&
        response.data.content.dataType === "moveObject"
      ) {
        const fields = (response.data.content as any).fields;
        addLog("📋 字段详情:");
        addLog(`   - owner: ${fields.owner}`);
        addLog(`   - cid: ${fields.cid}`);
        addLog(
          `   - content_hash: ${
            fields.content_hash
              ? `[${fields.content_hash.length} bytes]`
              : "未找到"
          }`
        );
        addLog(`   - unlock_time_ms: ${fields.unlock_time_ms}`);
        addLog(`   - unlocked: ${fields.unlocked}`);
        addLog(`   - created_at: ${fields.created_at}`);
        addLog(
          `   - nonce: ${
            fields.nonce ? `[${fields.nonce.length} bytes]` : "未找到"
          }`
        );
        addLog(
          `   - key_derivation_salt: ${
            fields.key_derivation_salt
              ? `[${fields.key_derivation_salt.length} bytes]`
              : "未找到"
          }`
        );

        // 4. 检查加密参数
        if (fields.nonce && fields.key_derivation_salt) {
          addLog("✅ 找到加密参数!");
          addLog(
            `   - 随机数: ${fields.nonce.slice(0, 10).join(", ")}... (${
              fields.nonce.length
            } 字节)`
          );
          addLog(
            `   - 盐值: ${fields.key_derivation_salt
              .slice(0, 10)
              .join(", ")}... (${fields.key_derivation_salt.length} 字节)`
          );
        } else {
          addLog("❌ 缺少加密参数!");
          if (!fields.nonce) addLog("   - 缺少 nonce 字段");
          if (!fields.key_derivation_salt)
            addLog("   - 缺少 key_derivation_salt 字段");
        }
      }

      // 5. 使用SDK解析
      addLog("🔄 使用SDK解析数据...");
      const capsuleData = await sdk.getCapsuleById(capsuleId);
      addLog("✅ SDK解析成功");
      addLog("📋 SDK解析结果:");
      addLog(`   - ID: ${capsuleData.id}`);
      addLog(`   - Owner: ${capsuleData.owner}`);
      addLog(`   - CID: ${capsuleData.cid}`);
      addLog(`   - Content Hash: [${capsuleData.contentHash.length} bytes]`);
      addLog(
        `   - Unlock Time: ${new Date(
          capsuleData.unlockCondition.unlockTime || 0
        ).toLocaleString()}`
      );
      addLog(`   - Unlocked: ${capsuleData.unlocked}`);
      addLog(
        `   - Created At: ${new Date(capsuleData.createdAt).toLocaleString()}`
      );
      addLog(
        `   - Encryption Nonce: ${
          capsuleData.encryptionNonce
            ? `[${capsuleData.encryptionNonce.length} bytes]`
            : "未找到"
        }`
      );
      addLog(
        `   - Key Derivation Salt: ${
          capsuleData.keyDerivationSalt
            ? `[${capsuleData.keyDerivationSalt.length} bytes]`
            : "未找到"
        }`
      );

      if (capsuleData.encryptionNonce && capsuleData.keyDerivationSalt) {
        addLog("🎉 SDK成功解析了加密参数！");
      } else {
        addLog("❌ SDK未能解析加密参数");
      }
    } catch (error) {
      addLog(
        `❌ 调试失败: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error("调试失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const listUserCapsules = async () => {
    if (!currentAccount) {
      addLog("❌ 请先连接钱包");
      return;
    }

    setLoading(true);
    try {
      addLog("🔄 获取用户胶囊列表...");

      const { getSDK } = await import("../../lib/sdk");
      const sdk = await getSDK();

      const result = await sdk.getCapsulesByOwner(currentAccount.address, {
        limit: 10,
      });

      addLog(`✅ 找到 ${result.capsules.length} 个胶囊`);

      result.capsules.forEach((capsule, index) => {
        addLog(`📦 胶囊 ${index + 1}:`);
        addLog(`   - ID: ${capsule.id}`);
        addLog(`   - CID: ${capsule.cid}`);
        addLog(
          `   - 解锁时间: ${new Date(
            capsule.unlockCondition.unlockTime || 0
          ).toLocaleString()}`
        );
        addLog(`   - 已解锁: ${capsule.unlocked}`);
        addLog(
          `   - 有加密参数: ${!!(
            capsule.encryptionNonce && capsule.keyDerivationSalt
          )}`
        );
      });

      if (result.capsules.length > 0) {
        addLog("💡 你可以复制上面的胶囊ID来进行详细调试");
      }
    } catch (error) {
      addLog(
        `❌ 获取胶囊列表失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">区块链数据调试</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            胶囊ID:
          </label>
          <input
            type="text"
            value={capsuleId}
            onChange={(e) => setCapsuleId(e.target.value)}
            placeholder="输入胶囊ID进行调试..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={loading}
          />
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={debugCapsuleData}
            disabled={loading || !capsuleId.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "调试中..." : "调试胶囊数据"}
          </button>

          <button
            onClick={listUserCapsules}
            disabled={loading || !currentAccount}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? "获取中..." : "获取我的胶囊"}
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
            <div className="text-gray-500">输入胶囊ID并点击调试按钮开始...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1 whitespace-pre-wrap">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {!currentAccount && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">连接钱包以获取你的胶囊列表</p>
        </div>
      )}
    </div>
  );
}
