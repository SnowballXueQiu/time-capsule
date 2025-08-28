"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";

export default function TestEncryptionFix() {
  const { currentAccount } = useWallet();
  const [testContent, setTestContent] = useState(
    "Hello, this is a test message for encryption!"
  );
  const [encryptedData, setEncryptedData] = useState<{
    ciphertext: Uint8Array;
    nonce: Uint8Array;
    salt: Uint8Array;
    tempCapsuleId: string;
  } | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string>("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string>("");

  const testEncryption = async () => {
    if (!currentAccount) {
      setError("请先连接钱包");
      return;
    }

    try {
      setIsEncrypting(true);
      setError("");

      // 生成临时胶囊ID
      const tempCapsuleId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const unlockTimestamp = Date.now() + 60000; // 1分钟后解锁

      // 加密内容
      const { getSDK } = await import("@/lib/sdk");
      const sdk = await getSDK();

      const contentBytes = new TextEncoder().encode(testContent);
      const encryptionResult = await sdk.encryptContentWithWallet(
        contentBytes,
        currentAccount.address,
        tempCapsuleId,
        unlockTimestamp
      );

      setEncryptedData({
        ciphertext: encryptionResult.ciphertext,
        nonce: encryptionResult.nonce,
        salt: encryptionResult.keyDerivationSalt,
        tempCapsuleId: tempCapsuleId,
      });

      console.log("加密成功:", {
        tempCapsuleId,
        ciphertextLength: encryptionResult.ciphertext.length,
        nonceLength: encryptionResult.nonce.length,
        saltLength: encryptionResult.keyDerivationSalt.length,
      });
    } catch (err) {
      console.error("加密失败:", err);
      setError(err instanceof Error ? err.message : "加密失败");
    } finally {
      setIsEncrypting(false);
    }
  };

  const testDecryption = async () => {
    if (!currentAccount || !encryptedData) {
      setError("请先进行加密测试");
      return;
    }

    try {
      setIsDecrypting(true);
      setError("");

      const { getSDK } = await import("@/lib/sdk");
      const sdk = await getSDK();

      const unlockTimestamp = Date.now() + 60000; // 使用相同的解锁时间

      // 解密内容
      const decryptionResult = await sdk.decryptContentWithWallet(
        encryptedData.ciphertext,
        encryptedData.nonce,
        currentAccount.address,
        encryptedData.tempCapsuleId, // 使用相同的tempCapsuleId
        unlockTimestamp,
        encryptedData.salt
      );

      const decryptedText = new TextDecoder().decode(decryptionResult.content);
      setDecryptedContent(decryptedText);

      console.log("解密成功:", {
        originalLength: testContent.length,
        decryptedLength: decryptedText.length,
        match: testContent === decryptedText,
      });
    } catch (err) {
      console.error("解密失败:", err);
      setError(err instanceof Error ? err.message : "解密失败");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">加密/解密流程测试</h1>

      {!currentAccount && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          请先连接钱包进行测试
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* 测试内容输入 */}
        <div>
          <label className="block text-sm font-medium mb-2">测试内容:</label>
          <textarea
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            className="w-full p-3 border rounded-lg"
            rows={3}
            placeholder="输入要测试的内容..."
          />
        </div>

        {/* 加密测试 */}
        <div>
          <button
            onClick={testEncryption}
            disabled={!currentAccount || isEncrypting}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isEncrypting ? "加密中..." : "测试加密"}
          </button>

          {encryptedData && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-medium mb-2">加密结果:</h3>
              <div className="text-sm space-y-1">
                <div>临时胶囊ID: {encryptedData.tempCapsuleId}</div>
                <div>密文长度: {encryptedData.ciphertext.length} 字节</div>
                <div>随机数长度: {encryptedData.nonce.length} 字节</div>
                <div>盐值长度: {encryptedData.salt.length} 字节</div>
              </div>
            </div>
          )}
        </div>

        {/* 解密测试 */}
        {encryptedData && (
          <div>
            <button
              onClick={testDecryption}
              disabled={!currentAccount || isDecrypting}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isDecrypting ? "解密中..." : "测试解密"}
            </button>

            {decryptedContent && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-medium mb-2">解密结果:</h3>
                <div className="text-sm space-y-2">
                  <div>
                    <strong>原始内容:</strong> {testContent}
                  </div>
                  <div>
                    <strong>解密内容:</strong> {decryptedContent}
                  </div>
                  <div
                    className={`font-medium ${
                      testContent === decryptedContent
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    匹配状态:{" "}
                    {testContent === decryptedContent ? "✅ 成功" : "❌ 失败"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
