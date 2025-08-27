"use client";

import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { getSDK } from "../lib/sdk";
import type { Capsule } from "@time-capsule/types";

interface UnlockModalProps {
  capsule: Capsule;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UnlockModal({
  capsule,
  isOpen,
  onClose,
  onSuccess,
}: UnlockModalProps) {
  const { account } = useWallet();
  const [encryptionKey, setEncryptionKey] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<{
    data: Uint8Array;
    type: string;
    text?: string;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  if (!isOpen) return null;

  const handleUnlock = async () => {
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setUnlocking(true);
      setError(null);

      const sdk = await getSDK();

      // Handle payment unlock
      let payment: number | undefined;
      if (capsule.unlockCondition.type === "payment") {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
          setError("Please enter a valid payment amount");
          return;
        }
        payment = Math.floor(amount * 1_000_000_000); // Convert SUI to MIST
      }

      // Create unlock transaction
      const tx = await sdk.createUnlockTransaction(capsule.id, payment);

      // Sign and execute transaction (this would need wallet integration)
      // For now, we'll simulate success
      console.log("Unlock transaction created:", tx);

      // Simulate successful unlock
      await new Promise((resolve) => setTimeout(resolve, 2000));

      onSuccess();
    } catch (err) {
      console.error("Failed to unlock capsule:", err);
      setError(err instanceof Error ? err.message : "Failed to unlock capsule");
    } finally {
      setUnlocking(false);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptionKey.trim()) {
      setError("Please enter the encryption key");
      return;
    }

    try {
      setDecrypting(true);
      setError(null);

      const sdk = await getSDK();

      // Decode base64 key
      const keyBytes = new Uint8Array(
        atob(encryptionKey)
          .split("")
          .map((char) => char.charCodeAt(0))
      );

      // Decrypt content
      const decryptedContent = await sdk.decryptContent(
        capsule.cid,
        keyBytes,
        new Uint8Array(capsule.contentHash)
      );

      // Try to decode as text
      let text: string | undefined;
      try {
        text = new TextDecoder().decode(decryptedContent);
      } catch {
        // Not text content
      }

      setContent({
        data: decryptedContent,
        type: "application/octet-stream",
        text,
      });
    } catch (err) {
      console.error("Failed to decrypt content:", err);
      setError(
        err instanceof Error ? err.message : "Failed to decrypt content"
      );
    } finally {
      setDecrypting(false);
    }
  };

  const downloadContent = () => {
    if (!content) return;

    const blob = new Blob([content.data], { type: content.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capsule-${capsule.id.slice(-8)}-content`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {capsule.unlocked ? "View Content" : "Unlock Capsule"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!capsule.unlocked && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Step 1: Unlock Capsule</h3>
            <p className="text-sm text-gray-600 mb-4">
              First, unlock the capsule on the blockchain.
            </p>

            {capsule.unlockCondition.type === "payment" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (SUI)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Required: ${(
                    (capsule.unlockCondition.price || 0) / 1_000_000_000
                  ).toFixed(4)} SUI`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="w-full btn-success"
            >
              {unlocking ? "Unlocking..." : "Unlock Capsule"}
            </button>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">
            {capsule.unlocked
              ? "Enter Decryption Key"
              : "Step 2: Decrypt Content"}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter the encryption key to decrypt and view the content.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Encryption Key (Base64)
            </label>
            <textarea
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
              placeholder="Paste your encryption key here..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleDecrypt}
            disabled={decrypting || (!capsule.unlocked && !unlocking)}
            className="w-full btn-primary mb-4"
          >
            {decrypting ? "Decrypting..." : "Decrypt Content"}
          </button>

          {content && (
            <div className="bg-gray-50 border rounded p-4">
              <h4 className="font-medium mb-2">Decrypted Content</h4>

              {content.text ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Text Content:</p>
                  <div className="bg-white border rounded p-3 max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">
                      {content.text}
                    </pre>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Binary Content ({content.data.length} bytes)
                  </p>
                </div>
              )}

              <button
                onClick={downloadContent}
                className="mt-3 btn-secondary text-sm"
              >
                Download Content
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
