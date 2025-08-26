"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { getSDK } from "../../lib/sdk";
import type { Capsule, ApprovalResult } from "@time-capsule/types";
import { Loading } from "../Loading";
import { ProgressBar } from "./ProgressBar";

interface ApprovalModalProps {
  capsule: Capsule;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ApprovalResult) => void;
  onError: (error: string) => void;
}

export function ApprovalModal({
  capsule,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: ApprovalModalProps) {
  const currentAccount = useCurrentAccount();
  const [loading, setLoading] = useState(false);
  const [sdk, setSdk] = useState<any>(null);

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

  const handleApprove = async () => {
    if (!currentAccount || !sdk) {
      onError("Wallet not connected or SDK not initialized");
      return;
    }

    setLoading(true);

    try {
      // For demo purposes, simulate the approval
      // In production, this would involve proper transaction signing

      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay

      const currentApprovals =
        (capsule.unlockCondition.approvals?.length || 0) + 1;

      const result = {
        success: true,
        transactionDigest: "demo-approval",
        currentApprovals,
      };

      onSuccess(result);
      onClose();
    } catch (error) {
      console.error("Approval failed:", error);
      onError(error instanceof Error ? error.message : "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const currentApprovals = capsule.unlockCondition.approvals?.length || 0;
  const requiredApprovals = capsule.unlockCondition.threshold || 0;
  const hasUserApproved =
    capsule.unlockCondition.approvals?.includes(
      currentAccount?.address || ""
    ) || false;
  const canApprove =
    !hasUserApproved &&
    !capsule.unlocked &&
    currentApprovals < requiredApprovals;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Approve Multisig Capsule
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
                <div>ID: {capsule.id.slice(0, 20)}...</div>
                <div>Owner: {formatAddress(capsule.owner)}</div>
                <div>
                  Created: {new Date(capsule.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Approval Progress */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                Approval Progress
              </h3>
              <ProgressBar
                current={currentApprovals}
                total={requiredApprovals}
                label="Signatures"
                showPercentage={true}
              />
              <div className="text-sm text-gray-600 mt-2">
                {currentApprovals} of {requiredApprovals} signatures received
              </div>
            </div>

            {/* Current Approvers */}
            {capsule.unlockCondition.approvals &&
              capsule.unlockCondition.approvals.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Current Approvers
                  </h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {capsule.unlockCondition.approvals.map((address) => (
                      <div
                        key={address}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <span className="text-green-500">✅</span>
                        <span className="text-gray-600 font-mono">
                          {formatAddress(address)}
                        </span>
                        {address === currentAccount?.address && (
                          <span className="text-blue-600 text-xs">(You)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Status Messages */}
            <div className="space-y-2">
              {hasUserApproved && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-blue-800 font-medium">
                    ✅ You have already approved this capsule
                  </div>
                </div>
              )}

              {capsule.unlocked && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-green-800 font-medium">
                    🎉 Capsule has been unlocked!
                  </div>
                </div>
              )}

              {currentApprovals >= requiredApprovals && !capsule.unlocked && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-yellow-800 font-medium">
                    ⚡ All signatures collected! The owner can now unlock this
                    capsule.
                  </div>
                </div>
              )}

              {!canApprove && !hasUserApproved && !capsule.unlocked && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-gray-600">
                    You cannot approve this capsule at this time.
                  </div>
                </div>
              )}
            </div>

            {/* Current User Info */}
            {currentAccount && (
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <div className="font-medium">Your Address:</div>
                  <div className="font-mono">
                    {formatAddress(currentAccount.address)}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Close
              </button>
              {canApprove && (
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loading />
                      <span className="ml-2">Approving...</span>
                    </>
                  ) : (
                    "Approve Capsule"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
