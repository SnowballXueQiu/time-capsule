"use client";

import { useState, useEffect } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
} from "@mysten/dapp-kit";
import { getSDK } from "../../lib/sdk";
import type { Capsule, UnlockResult } from "@time-capsule/types";
import { Loading } from "../Loading";

interface UnlockModalProps {
  capsule: Capsule;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: UnlockResult) => void;
  onError: (error: string) => void;
}

export function UnlockModal({
  capsule,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: UnlockModalProps) {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [sdk, setSdk] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Initialize SDK
  useEffect(() => {
    const initSdk = async () => {
      try {
        const sdkInstance = await getSDK();
        await sdkInstance.initialize();
        setSdk(sdkInstance);
      } catch (err) {
        console.error("Failed to initialize SDK:", err);
      }
    };

    if (isOpen) {
      initSdk();
    }
  }, [isOpen]);

  // Validate unlock conditions when modal opens
  useEffect(() => {
    if (isOpen && sdk && capsule) {
      validateConditions();
    }
  }, [isOpen, sdk, capsule, paymentAmount]);

  const validateConditions = async () => {
    if (!sdk) return;

    try {
      const payment =
        capsule.unlockCondition.type === "payment"
          ? parseFloat(paymentAmount) * 1_000_000_000 // Convert SUI to MIST
          : undefined;

      const result = await sdk.validateUnlockConditions(capsule.id, payment);
      setValidationResult(result);
    } catch (error) {
      console.error("Validation failed:", error);
      setValidationResult({
        canUnlock: false,
        reason: "Failed to validate conditions",
      });
    }
  };

  const handleUnlock = async () => {
    if (!currentAccount || !sdk || !encryptionKey.trim()) {
      onError("Missing required information");
      return;
    }

    setLoading(true);

    try {
      const payment =
        capsule.unlockCondition.type === "payment"
          ? parseFloat(paymentAmount) * 1_000_000_000 // Convert SUI to MIST
          : undefined;

      // Use the SDK's complete unlock and decrypt flow
      const result = await sdk.unlockAndDecrypt(
        capsule.id,
        encryptionKey.trim(),
        currentAccount, // This should be the keypair, but we'll handle it in the SDK
        payment
      );

      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        onError(result.error || "Unlock failed");
      }
    } catch (error) {
      console.error("Unlock failed:", error);
      onError(error instanceof Error ? error.message : "Unlock failed");
    } finally {
      setLoading(false);
    }
  };

  const formatSUI = (mist: number) => {
    return (mist / 1_000_000_000).toFixed(4);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Unlock Capsule
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Capsule Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Capsule Details
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Type: {capsule.unlockCondition.type}</div>
                <div>ID: {capsule.id.slice(0, 20)}...</div>
              </div>
            </div>

            {/* Unlock Conditions Status */}
            {validationResult && (
              <div
                className={`rounded-lg p-4 ${
                  validationResult.canUnlock
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div
                  className={`font-medium ${
                    validationResult.canUnlock
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {validationResult.canUnlock
                    ? "✅ Ready to unlock"
                    : "❌ Cannot unlock"}
                </div>
                {validationResult.reason && (
                  <div
                    className={`text-sm mt-1 ${
                      validationResult.canUnlock
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {validationResult.reason}
                  </div>
                )}
              </div>
            )}

            {/* Payment Input for Paid Capsules */}
            {capsule.unlockCondition.type === "payment" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (SUI)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Required: ${formatSUI(
                    capsule.unlockCondition.price || 0
                  )}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Required: {formatSUI(capsule.unlockCondition.price || 0)} SUI
                </div>
              </div>
            )}

            {/* Encryption Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Encryption Key *
              </label>
              <textarea
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                placeholder="Enter the base64 encryption key..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                disabled={loading}
              />
              <div className="text-xs text-gray-500 mt-1">
                This key was provided when the capsule was created
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                disabled={
                  loading ||
                  !encryptionKey.trim() ||
                  !validationResult?.canUnlock ||
                  (capsule.unlockCondition.type === "payment" && !paymentAmount)
                }
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loading />
                    <span className="ml-2">Unlocking...</span>
                  </>
                ) : (
                  "Unlock & Decrypt"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
