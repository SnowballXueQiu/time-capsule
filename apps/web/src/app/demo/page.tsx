"use client";

import React, { useState } from "react";
import { Layout } from "../../components/Layout";
import { useCurrentAccount } from "@mysten/dapp-kit";

export default function DemoPage() {
  const currentAccount = useCurrentAccount();
  const [testContent, setTestContent] = useState(
    "Hello from the future! This message was encrypted using wallet-based encryption."
  );
  const [unlockTime, setUnlockTime] = useState(() => {
    const future = new Date();
    future.setMinutes(future.getMinutes() + 1); // 1 minute from now
    return future.toISOString().slice(0, 16);
  });
  const [encryptedData, setEncryptedData] = useState<{
    ciphertext: Uint8Array;
    nonce: Uint8Array;
    salt: Uint8Array;
    contentHash: Uint8Array;
  } | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleEncrypt = async () => {
    if (!currentAccount) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Get SDK instance
      const { getSDK } = await import("../../lib/sdk");
      const sdk = await getSDK();

      const contentBytes = new TextEncoder().encode(testContent);
      const mockCapsuleId = `demo-${Date.now()}`;
      const unlockTimestamp = new Date(unlockTime).getTime();

      console.log("Encrypting with wallet:", currentAccount.address);
      console.log("Capsule ID:", mockCapsuleId);
      console.log("Unlock time:", unlockTimestamp);

      const result = await sdk.encryptContentWithWallet(
        contentBytes,
        currentAccount.address,
        mockCapsuleId,
        unlockTimestamp
      );

      setEncryptedData({
        ciphertext: result.ciphertext,
        nonce: result.nonce,
        salt: result.keyDerivationSalt,
        contentHash: result.contentHash,
      });

      console.log("Encryption successful!");
      console.log("Ciphertext length:", result.ciphertext.length);
      console.log("Nonce:", Array.from(result.nonce));
      console.log("Salt:", Array.from(result.keyDerivationSalt));
    } catch (err) {
      console.error("Encryption failed:", err);
      setError(err instanceof Error ? err.message : "Encryption failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!currentAccount || !encryptedData) {
      setError("Please encrypt content first and connect wallet");
      return;
    }

    const now = Date.now();
    const unlockTimestamp = new Date(unlockTime).getTime();

    if (now < unlockTimestamp) {
      setError(
        `Cannot decrypt yet. Wait until ${new Date(
          unlockTimestamp
        ).toLocaleString()}`
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Get SDK instance
      const { getSDK } = await import("../../lib/sdk");
      const sdk = await getSDK();

      const mockCapsuleId = `demo-${Date.now()}`;

      console.log("Decrypting with wallet:", currentAccount.address);
      console.log("Using nonce:", Array.from(encryptedData.nonce));
      console.log("Using salt:", Array.from(encryptedData.salt));

      const result = await sdk.decryptContentWithWallet(
        encryptedData.ciphertext,
        encryptedData.nonce,
        currentAccount.address,
        mockCapsuleId,
        unlockTimestamp,
        encryptedData.salt
      );

      const decrypted = new TextDecoder().decode(result.content);
      setDecryptedContent(decrypted);

      console.log("Decryption successful!");
      console.log("Decrypted content:", decrypted);
    } catch (err) {
      console.error("Decryption failed:", err);
      setError(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setLoading(false);
    }
  };

  const timeRemaining = () => {
    const now = Date.now();
    const unlock = new Date(unlockTime).getTime();
    const diff = unlock - now;

    if (diff <= 0) return "Ready to decrypt!";

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s remaining`;
    }
    return `${seconds}s remaining`;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Wallet-Based Encryption Demo
          </h1>
          <p className="text-gray-600 mb-8">
            Test the wallet-based encryption system. Content is encrypted using
            your wallet address and can only be decrypted after the unlock time.
          </p>

          {!currentAccount && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">
                Please connect your wallet to test the encryption system.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Encryption Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">1. Encrypt Content</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content to Encrypt
                </label>
                <textarea
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter content to encrypt..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unlock Time
                </label>
                <input
                  type="datetime-local"
                  value={unlockTime}
                  onChange={(e) => setUnlockTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">{timeRemaining()}</p>
              </div>

              <button
                onClick={handleEncrypt}
                disabled={loading || !currentAccount || !testContent.trim()}
                className="w-full btn-primary"
              >
                {loading ? "Encrypting..." : "Encrypt with Wallet"}
              </button>

              {encryptedData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">
                    ✅ Encrypted Successfully!
                  </h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>Ciphertext: {encryptedData.ciphertext.length} bytes</p>
                    <p>Nonce: {encryptedData.nonce.length} bytes</p>
                    <p>Salt: {encryptedData.salt.length} bytes</p>
                    <p>
                      Content Hash: {encryptedData.contentHash.length} bytes
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Decryption Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">2. Decrypt Content</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">
                  🔑 Wallet-Based Decryption
                </h3>
                <p className="text-sm text-blue-700">
                  No encryption key needed! Your wallet signature automatically
                  derives the decryption key.
                </p>
              </div>

              {currentAccount && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Wallet Info
                  </h4>
                  <p className="text-sm text-gray-600 font-mono">
                    {currentAccount.address.slice(0, 16)}...
                    {currentAccount.address.slice(-16)}
                  </p>
                </div>
              )}

              <button
                onClick={handleDecrypt}
                disabled={
                  loading ||
                  !currentAccount ||
                  !encryptedData ||
                  new Date(unlockTime).getTime() > Date.now()
                }
                className="w-full btn-success"
              >
                {loading ? "Decrypting..." : "Decrypt with Wallet"}
              </button>

              {decryptedContent && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">
                    ✅ Decrypted Successfully!
                  </h3>
                  <div className="bg-white border rounded p-3">
                    <pre className="whitespace-pre-wrap text-sm">
                      {decryptedContent}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-medium text-gray-800 mb-3">How It Works</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                1. <strong>Encryption:</strong> Content is encrypted using a key
                derived from your wallet address, capsule ID, and unlock time.
              </p>
              <p>
                2. <strong>Storage:</strong> Encrypted content is stored on
                IPFS, metadata on blockchain.
              </p>
              <p>
                3. <strong>Time Lock:</strong> Smart contract enforces
                time-based unlock conditions.
              </p>
              <p>
                4. <strong>Decryption:</strong> After unlock time, your wallet
                can derive the same key to decrypt content.
              </p>
              <p>
                5. <strong>Security:</strong> Only the original wallet can
                decrypt, no separate key management needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
