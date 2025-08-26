"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  CapsuleCreationResult,
  ContentData,
  UnlockConditionData,
} from "../../types/capsule";

interface CreationSuccessProps {
  result: CapsuleCreationResult;
  contentData: ContentData;
  unlockCondition: UnlockConditionData;
  onStartOver: () => void;
}

export function CreationSuccess({
  result,
  contentData,
  unlockCondition,
  onStartOver,
}: CreationSuccessProps) {
  const [showEncryptionKey, setShowEncryptionKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const copyEncryptionKey = async () => {
    try {
      await navigator.clipboard.writeText(result.encryptionKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy encryption key:", err);
    }
  };

  const copyTransactionId = async () => {
    try {
      await navigator.clipboard.writeText(result.transactionDigest);
    } catch (err) {
      console.error("Failed to copy transaction ID:", err);
    }
  };

  const formatUnlockCondition = () => {
    switch (unlockCondition.type) {
      case "time":
        if (unlockCondition.unlockTime) {
          const date = new Date(unlockCondition.unlockTime);
          return `Time-based: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
        }
        return "Time-based";

      case "multisig":
        return `Multi-signature: ${unlockCondition.threshold} approvals required`;

      case "payment":
        return `Payment-based: ${unlockCondition.price} SUI required`;

      default:
        return "Unknown condition";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Success message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-400 text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-semibold text-green-800 mb-2">
          Time Capsule Created Successfully!
        </h2>
        <p className="text-green-600">
          Your content has been encrypted and stored securely on the blockchain.
        </p>
      </div>

      {/* Capsule details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Capsule Details
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capsule ID
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
                  {result.capsuleId}
                </code>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(result.capsuleId)
                  }
                  className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  title="Copy Capsule ID"
                >
                  📋
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction ID
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
                  {result.transactionDigest.slice(0, 20)}...
                </code>
                <button
                  onClick={copyTransactionId}
                  className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  title="Copy Transaction ID"
                >
                  📋
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded text-sm">
              📄 {contentData.filename || "Text content"} •{" "}
              {formatFileSize(contentData.content.length)} •{" "}
              {contentData.contentType}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unlock Condition
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded text-sm">
              {formatUnlockCondition()}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IPFS CID
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
                {result.cid}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(result.cid)}
                className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                title="Copy IPFS CID"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Encryption key section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          🔐 Encryption Key
        </h3>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <div className="text-yellow-400 text-xl mr-3">⚠️</div>
            <div>
              <h4 className="text-yellow-800 font-medium">
                Important Security Notice
              </h4>
              <p className="text-yellow-600 text-sm mt-1">
                This encryption key is required to decrypt your content after
                unlocking the capsule. Store it securely - if you lose it, your
                content cannot be recovered!
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Show Encryption Key
            </span>
            <button
              onClick={() => setShowEncryptionKey(!showEncryptionKey)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showEncryptionKey
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {showEncryptionKey ? "Hide Key" : "Show Key"}
            </button>
          </div>

          {showEncryptionKey && (
            <div>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
                  {result.encryptionKey}
                </code>
                <button
                  onClick={copyEncryptionKey}
                  className={`px-3 py-2 text-sm rounded transition-colors ${
                    keyCopied
                      ? "bg-green-200 text-green-700"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                  title="Copy Encryption Key"
                >
                  {keyCopied ? "✅" : "📋"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This key has been automatically saved to your browser's secure
                storage.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Next steps */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          What's Next?
        </h3>

        <div className="space-y-4">
          {unlockCondition.type === "multisig" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-blue-400 text-xl mr-3">👥</div>
                <div>
                  <h4 className="text-blue-800 font-medium">
                    Multi-signature Setup
                  </h4>
                  <p className="text-blue-600 text-sm mt-1">
                    Share your Capsule ID with trusted parties so they can
                    approve the capsule. Once {unlockCondition.threshold}{" "}
                    approval{unlockCondition.threshold !== 1 ? "s are" : " is"}{" "}
                    received, the capsule can be unlocked.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                📋 View Your Capsules
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                See all your created capsules and their status
              </p>
              <Link
                href="/capsules"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Go to My Capsules
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                🆕 Create Another
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Create another time capsule with different content
              </p>
              <button
                onClick={onStartOver}
                className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium transition-colors"
              >
                Create New Capsule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain explorer link */}
      <div className="text-center">
        <a
          href={`https://suiexplorer.com/txblock/${result.transactionDigest}?network=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
        >
          <span>View transaction on Sui Explorer</span>
          <span>🔗</span>
        </a>
      </div>
    </div>
  );
}
