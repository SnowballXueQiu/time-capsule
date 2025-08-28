"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

export default function TestFullFlowPage() {
  const currentAccount = useCurrentAccount();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState({
    message: "这是一个测试消息 🎉",
    capsuleId: "",
    encryptionResult: null as any,
  });

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testEncryption = async () => {
    if (!currentAccount) {
      addLog("❌ 请先连接钱包");
      return;
    }

    setLoading(true);
    try {
      addLog("🔄 开始测试加密流程...");

      // 1. 导入SDK
      const { getSDK } = await import("../../lib/sdk");
      const sdk = await getSDK();
      addLog("✅ SDK加载成功");

      // 2. 准备测试数据
      const tempCapsuleId = `test-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const unlockTime = Date.now() + 60000; // 1分钟后

      setTestData((prev) => ({ ...prev, capsuleId: tempCapsuleId }));

      addLog(`📝 测试数据:`);
      addLog(`   - 消息: "${testData.message}"`);
      addLog(`   - 钱包: ${currentAccount.address}`);
      addLog(`   - 胶囊ID: ${tempCapsuleId}`);
      addLog(`   - 解锁时间: ${new Date(unlockTime).toLocaleString()}`);

      // 3. 加密内容
      addLog("🔐 开始加密...");
      const contentBytes = new TextEncoder().encode(testData.message);

      const encryptionResult = await sdk.encryptContentWithWallet(
        contentBytes,
        currentAccount.address,
        tempCapsuleId,
        unlockTime
      );

      setTestData((prev) => ({ ...prev, encryptionResult }));

      addLog("✅ 加密成功!");
      addLog(`   - 密文大小: ${encryptionResult.ciphertext.length} 字节`);
      addLog(`   - 随机数大小: ${encryptionResult.nonce.length} 字节`);
      addLog(
        `   - 盐值大小: ${encryptionResult.keyDerivationSalt.length} 字节`
      );
      addLog(`   - 内容哈希大小: ${encryptionResult.contentHash.length} 字节`);

      // 4. 立即测试解密
      addLog("🔓 测试解密...");
      const decryptionResult = await sdk.decryptContentWithWallet(
        encryptionResult.ciphertext,
        encryptionResult.nonce,
        currentAccount.address,
        tempCapsuleId,
        unlockTime,
        encryptionResult.keyDerivationSalt
      );

      const decryptedMessage = new TextDecoder().decode(
        decryptionResult.content
      );
      addLog("✅ 解密成功!");
      addLog(`   - 解密消息: "${decryptedMessage}"`);

      if (decryptedMessage === testData.message) {
        addLog("🎉 验证成功！加密/解密流程正常工作！");
      } else {
        addLog("❌ 验证失败！解密内容不匹配");
      }
    } catch (error) {
      addLog(
        `❌ 测试失败: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error("测试失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const testIPFSUpload = async () => {
    if (!testData.encryptionResult) {
      addLog("❌ 请先运行加密测试");
      return;
    }

    setLoading(true);
    try {
      addLog("🔄 测试IPFS上传...");

      // 创建加密内容的Blob
      const encryptedBlob = new Blob([testData.encryptionResult.ciphertext], {
        type: "application/octet-stream",
      });

      const formData = new FormData();
      formData.append("file", encryptedBlob, "encrypted-content.bin");

      // 添加元数据，包含加密参数
      const metadata = JSON.stringify({
        name: `test-capsule-${Date.now()}`,
        keyvalues: {
          type: "time-capsule-encrypted-content",
          timestamp: Date.now().toString(),
          encrypted: "true",
          // 存储加密参数作为备份
          nonce: Array.from(testData.encryptionResult.nonce).join(","),
          salt: Array.from(testData.encryptionResult.keyDerivationSalt).join(
            ","
          ),
        },
      });
      formData.append("pinataMetadata", metadata);

      const uploadResponse = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`IPFS上传失败: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      const cid = uploadResult.IpfsHash;

      addLog("✅ IPFS上传成功!");
      addLog(`   - CID: ${cid}`);

      // 测试下载
      addLog("🔄 测试IPFS下载...");
      const downloadResponse = await fetch(
        `https://gateway.pinata.cloud/ipfs/${cid}`
      );

      if (!downloadResponse.ok) {
        throw new Error(`IPFS下载失败: ${downloadResponse.status}`);
      }

      const downloadedContent = new Uint8Array(
        await downloadResponse.arrayBuffer()
      );
      addLog("✅ IPFS下载成功!");
      addLog(`   - 下载大小: ${downloadedContent.length} 字节`);

      // 验证下载的内容是否与原始加密内容匹配
      if (
        downloadedContent.length === testData.encryptionResult.ciphertext.length
      ) {
        let matches = true;
        for (let i = 0; i < downloadedContent.length; i++) {
          if (
            downloadedContent[i] !== testData.encryptionResult.ciphertext[i]
          ) {
            matches = false;
            break;
          }
        }

        if (matches) {
          addLog("🎉 IPFS上传/下载验证成功！");
        } else {
          addLog("❌ IPFS内容不匹配");
        }
      } else {
        addLog("❌ IPFS下载大小不匹配");
      }
    } catch (error) {
      addLog(
        `❌ IPFS测试失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">完整流程测试</h1>

      {!currentAccount && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">请先连接钱包以进行测试</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={testEncryption}
            disabled={loading || !currentAccount}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "测试中..." : "1. 测试加密/解密"}
          </button>

          <button
            onClick={testIPFSUpload}
            disabled={loading || !testData.encryptionResult}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? "测试中..." : "2. 测试IPFS上传"}
          </button>

          <button
            onClick={() => setLogs([])}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            清除日志
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试消息:
          </label>
          <input
            type="text"
            value={testData.message}
            onChange={(e) =>
              setTestData((prev) => ({ ...prev, message: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={loading}
          />
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

      {currentAccount && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">当前钱包信息</h3>
          <p className="text-blue-700 text-sm font-mono">
            {currentAccount.address}
          </p>
        </div>
      )}
    </div>
  );
}
