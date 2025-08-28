"use client";

import React, { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { getSDK } from "../lib/sdk-simple";
import type { Capsule } from "@time-capsule/sdk";

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
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [unlocking, setUnlocking] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<{
    data: Uint8Array;
    type: string;
    text?: string;
  } | null>(null);
  const [step, setStep] = useState<"check" | "unlock" | "decrypt" | "complete">(
    "check"
  );

  // Auto-check conditions when modal opens
  React.useEffect(() => {
    if (isOpen) {
      checkUnlockConditions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const checkUnlockConditions = async () => {
    if (!currentAccount) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setError(null);

      // If capsule is already unlocked, skip to decrypt step
      if (capsule.unlocked) {
        console.log("Capsule already unlocked, proceeding to decrypt");
        setStep("decrypt");
        return;
      }

      // Check if time condition is met
      const now = Date.now();
      const unlockTime = capsule.unlockCondition.unlockTime || 0;

      if (now < unlockTime) {
        const timeRemaining = unlockTime - now;
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor(
          (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
        );
        setError(
          `Capsule cannot be unlocked yet. Time remaining: ${hours}h ${minutes}m`
        );
        return;
      }

      // If already unlocked or conditions are met, proceed to decrypt
      if (capsule.unlocked) {
        setStep("decrypt");
      } else {
        setStep("unlock");
      }
    } catch (err) {
      console.error("Failed to check unlock conditions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to check unlock conditions"
      );
    }
  };

  const handleUnlock = async () => {
    if (!currentAccount) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setUnlocking(true);
      setError(null);

      // Create unlock transaction
      const tx = new Transaction();

      tx.moveCall({
        target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::capsule::unlock_capsule`,
        arguments: [
          tx.object(capsule.id),
          tx.object("0x6"), // Clock object
        ],
      });

      // Sign and execute transaction
      const txResult = await new Promise<any>((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      console.log("Unlock transaction successful:", txResult);
      setStep("decrypt");
    } catch (err) {
      console.error("Failed to unlock capsule:", err);
      setError(err instanceof Error ? err.message : "Failed to unlock capsule");
    } finally {
      setUnlocking(false);
    }
  };

  const handleDecrypt = async () => {
    if (!currentAccount) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setDecrypting(true);
      setError(null);

      // 1. Get capsule metadata from blockchain
      const sdk = await getSDK();
      const capsuleData = await sdk.getCapsuleById(capsule.id);

      // 2. Download encrypted content from IPFS
      const ipfsResponse = await fetch(
        `https://gateway.pinata.cloud/ipfs/${capsule.cid}`
      );
      if (!ipfsResponse.ok) {
        throw new Error(
          `IPFS download failed: ${ipfsResponse.status} ${ipfsResponse.statusText}`
        );
      }

      const encryptedContent = new Uint8Array(await ipfsResponse.arrayBuffer());

      // 3. SDK instance already obtained above

      // 4. Get decryption parameters from blockchain
      let nonce: Uint8Array;
      let salt: Uint8Array;

      // Get encryption parameters from capsule data
      if (
        capsuleData.encryptionNonce &&
        capsuleData.keyDerivationSalt &&
        capsuleData.encryptionNonce.length > 0 &&
        capsuleData.keyDerivationSalt.length > 0
      ) {
        nonce = new Uint8Array(capsuleData.encryptionNonce);
        salt = new Uint8Array(capsuleData.keyDerivationSalt);
        console.log("✅ Got encryption parameters from blockchain");
        console.log(`   - Nonce length: ${nonce.length} bytes`);
        console.log(`   - Salt length: ${salt.length} bytes`);
      } else {
        console.warn(
          "❌ Complete encryption parameters not found in blockchain"
        );
        console.log("Trying to get from IPFS metadata...");

        try {
          // Get IPFS file metadata
          const metadataResponse = await fetch(
            `https://api.pinata.cloud/data/pinList?hashContains=${capsule.cid}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
              },
            }
          );

          if (metadataResponse.ok) {
            const metadataResult = await metadataResponse.json();
            const fileData = metadataResult.rows[0];

            if (fileData && fileData.metadata && fileData.metadata.keyvalues) {
              const keyvalues = fileData.metadata.keyvalues;

              if (keyvalues.nonce && keyvalues.salt) {
                nonce = new Uint8Array(keyvalues.nonce.split(",").map(Number));
                salt = new Uint8Array(keyvalues.salt.split(",").map(Number));
                console.log("Got encryption parameters from IPFS metadata");
              } else {
                throw new Error(
                  "Missing encryption parameters in IPFS metadata"
                );
              }
            } else {
              throw new Error("Unable to get IPFS metadata");
            }
          } else {
            throw new Error("Failed to get IPFS metadata");
          }
        } catch (metadataError) {
          console.error("Unable to get encryption parameters:", metadataError);
          throw new Error(
            "Unable to get encryption parameters required for decryption. Please ensure capsule data is complete."
          );
        }
      }

      console.log("Decryption parameters used:");
      console.log("- Nonce length:", nonce.length);
      console.log("- Salt length:", salt.length);
      console.log("- Wallet address:", currentAccount.address);
      console.log("- Capsule ID:", capsule.id);
      console.log("- Unlock time:", capsule.unlockCondition.unlockTime);

      // 5. Get original ID used for encryption
      let encryptionCapsuleId = capsule.id; // Default to real ID

      // Try to get original tempCapsuleId from IPFS metadata
      try {
        const metadataResponse = await fetch(
          `https://api.pinata.cloud/data/pinList?hashContains=${capsule.cid}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
            },
          }
        );

        if (metadataResponse.ok) {
          const metadataResult = await metadataResponse.json();
          const fileData = metadataResult.rows[0];

          if (fileData && fileData.metadata && fileData.metadata.keyvalues) {
            const keyvalues = fileData.metadata.keyvalues;
            if (keyvalues.tempCapsuleId) {
              encryptionCapsuleId = keyvalues.tempCapsuleId;
              console.log(
                "Got original tempCapsuleId from IPFS metadata:",
                encryptionCapsuleId
              );
            } else if (keyvalues.capsuleId) {
              encryptionCapsuleId = keyvalues.capsuleId;
              console.log(
                "Got capsuleId from IPFS metadata:",
                encryptionCapsuleId
              );
            }
          }
        }
      } catch (metadataError) {
        console.warn(
          "Unable to get IPFS metadata, using default capsule ID:",
          metadataError
        );
      }

      console.log("Final decryption capsule ID used:", encryptionCapsuleId);

      // 6. Decrypt using wallet-based key derivation
      const decryptionResult = await sdk.decryptContentWithWallet(
        encryptedContent,
        nonce,
        currentAccount.address,
        encryptionCapsuleId,
        capsule.unlockCondition.unlockTime || 0,
        salt
      );

      console.log(
        "Content decrypted successfully, decrypted size:",
        decryptionResult.content.length,
        "bytes"
      );

      // 6. Try to decode content as text
      let text: string | undefined;
      try {
        text = new TextDecoder().decode(decryptionResult.content);
      } catch {
        console.log("Content is not in text format");
      }

      setContent({
        data: decryptionResult.content,
        type: text ? "text/plain" : "application/octet-stream",
        text,
      });

      setStep("complete");
      // Don't call onSuccess() immediately, let user view content before closing
      // onSuccess();
    } catch (err) {
      console.error("Decryption failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to decrypt content"
      );
    } finally {
      setDecrypting(false);
    }
  };

  const downloadContent = () => {
    if (!content) return;

    const blob = new Blob([content.data as BlobPart], { type: content.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capsule-${capsule.id.slice(-8)}-content`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Initialize step based on current state
  React.useEffect(() => {
    if (isOpen) {
      checkUnlockConditions();
    }
  }, [isOpen]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Unlock Time Capsule</h2>
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

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`flex items-center ${
                step === "check"
                  ? "text-blue-600"
                  : step === "unlock" ||
                    step === "decrypt" ||
                    step === "complete"
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === "check"
                    ? "bg-blue-100"
                    : step === "unlock" ||
                      step === "decrypt" ||
                      step === "complete"
                    ? "bg-green-100"
                    : "bg-gray-100"
                }`}
              >
                1
              </div>
              <span className="ml-2 text-sm">Check Conditions</span>
            </div>

            <div
              className={`flex items-center ${
                step === "unlock"
                  ? "text-blue-600"
                  : step === "decrypt" || step === "complete"
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === "unlock"
                    ? "bg-blue-100"
                    : step === "decrypt" || step === "complete"
                    ? "bg-green-100"
                    : "bg-gray-100"
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm">Unlock</span>
            </div>

            <div
              className={`flex items-center ${
                step === "decrypt"
                  ? "text-blue-600"
                  : step === "complete"
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === "decrypt"
                    ? "bg-blue-100"
                    : step === "complete"
                    ? "bg-green-100"
                    : "bg-gray-100"
                }`}
              >
                3
              </div>
              <span className="ml-2 text-sm">Decrypt</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {step === "check" && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking unlock conditions...</p>
          </div>
        )}

        {step === "unlock" && (
          <div>
            <h3 className="font-medium mb-2">Unlock Capsule</h3>
            <p className="text-sm text-gray-600 mb-4">
              The time condition has been met. Click to unlock the capsule on
              the blockchain.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-blue-800 text-sm">
                🔓 This capsule is ready to be unlocked! Your wallet will be
                used to verify your identity for decryption.
              </p>
            </div>

            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="w-full btn-success"
            >
              {unlocking ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Unlocking...
                </>
              ) : (
                "Unlock Capsule"
              )}
            </button>
          </div>
        )}

        {step === "decrypt" && (
          <div>
            <h3 className="font-medium mb-2">Decrypt Content</h3>
            <p className="text-sm text-gray-600 mb-4">
              The capsule is unlocked! Your wallet will be used to derive the
              decryption key automatically.
            </p>

            <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
              <p className="text-green-800 text-sm">
                🔑 No encryption key needed! Your wallet signature will
                automatically decrypt the content.
              </p>
            </div>

            <button
              onClick={handleDecrypt}
              disabled={decrypting}
              className="w-full btn-primary"
            >
              {decrypting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Decrypting...
                </>
              ) : (
                "Decrypt with Wallet"
              )}
            </button>
          </div>
        )}

        {step === "complete" && content && (
          <div>
            <h3 className="font-medium mb-2">
              ✅ Content Decrypted Successfully!
            </h3>

            <div className="bg-gray-50 border rounded p-4">
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

              <div className="mt-3 flex gap-2">
                <button
                  onClick={downloadContent}
                  className="flex-1 btn-secondary text-sm"
                >
                  Download Content
                </button>
                <button
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="flex-1 btn-primary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
