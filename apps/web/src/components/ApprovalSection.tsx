"use client";

import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { getSDK } from "../lib/sdk";
import type { Capsule } from "@time-capsule/sdk";

interface ApprovalSectionProps {
  capsule: Capsule;
  onApprovalSuccess: () => void;
}

export function ApprovalSection({
  capsule,
  onApprovalSuccess,
}: ApprovalSectionProps) {
  const { account, address } = useWallet();
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasAlreadyApproved = () => {
    if (!address || !capsule.unlockCondition.approvers) return false;
    return capsule.unlockCondition.approvers.includes(address);
  };

  const handleApprove = async () => {
    if (!account || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (hasAlreadyApproved()) {
      setError("You have already approved this capsule");
      return;
    }

    try {
      setApproving(true);
      setError(null);
      setSuccess(null);

      const sdk = await getSDK();

      // Create approval transaction
      const tx = await sdk.createApprovalTransaction(capsule.id);

      // In a real implementation, this would use wallet signing
      // For now, we'll simulate the approval
      console.log("Approval transaction created:", tx);

      // Simulate successful approval
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSuccess("Approval submitted successfully!");
      onApprovalSuccess();
    } catch (err) {
      console.error("Failed to approve capsule:", err);
      setError(
        err instanceof Error ? err.message : "Failed to approve capsule"
      );
    } finally {
      setApproving(false);
    }
  };

  const currentApprovals = capsule.unlockCondition.approvers?.length || 0;
  const requiredApprovals = capsule.unlockCondition.threshold || 1;
  const progressPercentage = (currentApprovals / requiredApprovals) * 100;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Multisig Approval</h2>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Approval Progress
          </span>
          <span className="text-sm text-gray-500">
            {currentApprovals}/{requiredApprovals} approvals
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-purple-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {requiredApprovals - currentApprovals > 0
            ? `${requiredApprovals - currentApprovals} more approval${
                requiredApprovals - currentApprovals !== 1 ? "s" : ""
              } needed`
            : "All required approvals received!"}
        </div>
      </div>

      {/* Approvals List */}
      {capsule.unlockCondition.approvers &&
        capsule.unlockCondition.approvers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Approved By:
            </h3>
            <div className="space-y-2">
              {capsule.unlockCondition.approvers.map((approver, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-2 bg-green-50 rounded"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-mono text-sm">
                    {approver.slice(0, 8)}...{approver.slice(-8)}
                  </span>
                  {approver === address && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}

      {/* Action Button */}
      {address ? (
        <div>
          {hasAlreadyApproved() ? (
            <div className="flex items-center space-x-2 text-green-600">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm font-medium">
                You have approved this capsule
              </span>
            </div>
          ) : currentApprovals >= requiredApprovals ? (
            <div className="text-sm text-gray-600">
              All required approvals have been received. The capsule can now be
              unlocked.
            </div>
          ) : (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {approving ? "Submitting Approval..." : "Approve This Capsule"}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-gray-600 text-sm mb-3">
            Connect your wallet to participate in the approval process
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
        <p className="font-medium mb-1">How Multisig Works:</p>
        <ul className="text-xs space-y-1">
          <li>
            • This capsule requires {requiredApprovals} approval
            {requiredApprovals !== 1 ? "s" : ""} to unlock
          </li>
          <li>• Each wallet can only approve once</li>
          <li>
            • Once enough approvals are collected, anyone can unlock the capsule
          </li>
          <li>• The owner will need the decryption key to view the content</li>
        </ul>
      </div>
    </div>
  );
}
