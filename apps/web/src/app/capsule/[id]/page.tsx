"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Layout } from "../../../components/Layout";
import { WalletConnection } from "../../../components/WalletConnection";
import { UnlockModal } from "../../../components/UnlockModal";
import { ApprovalSection } from "../../../components/ApprovalSection";
import { PaymentSection } from "../../../components/PaymentSection";
import { getSDK } from "../../../lib/sdk";
import { useWallet } from "../../../hooks/useWallet";
import type { Capsule, CapsuleStatus } from "@time-capsule/sdk";

interface CapsuleWithStatus extends Capsule {
  status: CapsuleStatus;
}

export default function CapsulePage() {
  const params = useParams();
  const { address } = useWallet();
  const capsuleId = params?.id as string;

  const [capsule, setCapsule] = useState<CapsuleWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  useEffect(() => {
    if (capsuleId) {
      loadCapsule();
    }
  }, [capsuleId]);

  const loadCapsule = async () => {
    try {
      setLoading(true);
      setError(null);

      const sdk = await getSDK();
      const capsuleData = await sdk.getCapsuleById(capsuleId);
      const status = sdk.getCapsuleStatus(capsuleData);

      setCapsule({ ...capsuleData, status });
    } catch (err) {
      console.error("Failed to load capsule:", err);
      setError(err instanceof Error ? err.message : "Failed to load capsule");
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusBadge = (capsule: CapsuleWithStatus) => {
    if (capsule.unlocked) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
          Unlocked
        </span>
      );
    }

    if (capsule.status.canUnlock) {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
          Ready to Unlock
        </span>
      );
    }

    switch (capsule.unlockCondition.type) {
      case "time":
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
            Time Locked
          </span>
        );
      case "multisig":
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
            Multisig
          </span>
        );
      case "payment":
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
            Payment Required
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
            Unknown
          </span>
        );
    }
  };

  const isOwner = address && capsule && address === capsule.owner;
  const canInteract =
    capsule &&
    (isOwner ||
      capsule.unlockCondition.type === "multisig" ||
      capsule.unlockCondition.type === "payment");

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading capsule...</span>
        </div>
      </Layout>
    );
  }

  if (error || !capsule) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-red-500 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Capsule Not Found</h3>
              <p className="text-red-600 text-sm mt-1">
                {error || "The requested capsule could not be found."}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Wallet Connection for non-owners */}
      {!isOwner && (
        <div className="mb-8">
          <WalletConnection />
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Time Capsule #{capsuleId.slice(-8)}
              </h1>
              <div className="flex items-center space-x-3">
                {getStatusBadge(capsule)}
                {isOwner && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    Owner
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Created</div>
              <div className="text-sm font-medium">
                {new Date(capsule.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Owner:</span>
              <div className="font-mono text-xs mt-1">
                {capsule.owner.slice(0, 8)}...{capsule.owner.slice(-8)}
              </div>
            </div>
            <div>
              <span className="text-gray-500">IPFS CID:</span>
              <div className="font-mono text-xs mt-1">
                {capsule.cid.slice(0, 12)}...{capsule.cid.slice(-12)}
              </div>
            </div>
          </div>
        </div>

        {/* Unlock Conditions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Unlock Conditions</h2>

          {capsule.unlockCondition.type === "time" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Time Lock</span>
                <span className="text-sm text-gray-500">
                  {capsule.unlockCondition.unlockTime
                    ? new Date(
                        capsule.unlockCondition.unlockTime
                      ).toLocaleString()
                    : "Unknown time"}
                </span>
              </div>
              {capsule.status.timeRemaining &&
                capsule.status.timeRemaining > 0 && (
                  <div className="text-yellow-600 text-sm">
                    {formatTimeRemaining(capsule.status.timeRemaining)}{" "}
                    remaining
                  </div>
                )}
            </div>
          )}

          {capsule.unlockCondition.type === "multisig" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Multisig Approval</span>
                <span className="text-sm text-gray-500">
                  {capsule.status.approvalProgress
                    ? `${capsule.status.approvalProgress.current}/${capsule.status.approvalProgress.required}`
                    : `0/${capsule.unlockCondition.threshold || 1}`}{" "}
                  approvals
                </span>
              </div>
              {capsule.status.approvalProgress && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{
                      width: `${capsule.status.approvalProgress.percentage}%`,
                    }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {capsule.unlockCondition.type === "payment" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Payment Required</span>
                <span className="text-sm text-gray-500">
                  {(
                    (capsule.unlockCondition.price || 0) / 1_000_000_000
                  ).toFixed(4)}{" "}
                  SUI
                </span>
              </div>
              {capsule.status.paymentStatus?.paid && (
                <div className="text-green-600 text-sm">Payment completed</div>
              )}
            </div>
          )}

          {capsule.status.statusMessage && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600">
              {capsule.status.statusMessage}
            </div>
          )}
        </div>

        {/* Multisig Approval Section */}
        {capsule.unlockCondition.type === "multisig" &&
          !capsule.unlocked &&
          canInteract && (
            <ApprovalSection
              capsule={capsule}
              onApprovalSuccess={loadCapsule}
            />
          )}

        {/* Payment Section */}
        {capsule.unlockCondition.type === "payment" &&
          !capsule.unlocked &&
          canInteract && (
            <PaymentSection capsule={capsule} onPaymentSuccess={loadCapsule} />
          )}

        {/* Actions */}
        {canInteract && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/capsule/${capsule.id}`;
                  navigator.clipboard.writeText(shareUrl);
                  // TODO: Show toast notification
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Copy Share Link
              </button>

              {(capsule.status.canUnlock || capsule.unlocked) && (
                <button
                  onClick={() => setShowUnlockModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {capsule.unlocked ? "View Content" : "Unlock & View"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Non-interactive message for non-owners */}
        {!canInteract && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-medium text-yellow-800 mb-2">View Only</h3>
            <p className="text-yellow-700 text-sm">
              You can view this capsule's information, but you cannot interact
              with it.
              {capsule.unlockCondition.type === "time" &&
                " Only the owner can unlock time-locked capsules."}
              {capsule.unlockCondition.type === "multisig" &&
                " Connect your wallet to participate in multisig approval."}
              {capsule.unlockCondition.type === "payment" &&
                " Connect your wallet to make a payment and unlock."}
            </p>
          </div>
        )}
      </div>

      {/* Unlock Modal */}
      {showUnlockModal && (
        <UnlockModal
          capsule={capsule}
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          onSuccess={() => {
            setShowUnlockModal(false);
            loadCapsule();
          }}
        />
      )}
    </Layout>
  );
}
