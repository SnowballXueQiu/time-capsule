"use client";

import { useState, useEffect } from "react";
import { useWallet } from "../hooks/useWallet";
import { getSDK } from "../lib/sdk";
import { UnlockModal } from "./UnlockModal";
import type { Capsule } from "@time-capsule/types";
import type { CapsuleStatus } from "@time-capsule/sdk";

interface CapsuleWithStatus extends Capsule {
  status: CapsuleStatus;
}

export function CapsuleList() {
  const { address } = useWallet();
  const [capsules, setCapsules] = useState<CapsuleWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  useEffect(() => {
    if (address) {
      loadCapsules();
    }
  }, [address]);

  const loadCapsules = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      const sdk = await getSDK();
      const result = await sdk.getCapsulesByOwnerWithStatus(address);
      setCapsules(result.capsules);
    } catch (err) {
      console.error("Failed to load capsules:", err);
      setError(err instanceof Error ? err.message : "Failed to load capsules");
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
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          Unlocked
        </span>
      );
    }

    if (capsule.status.canUnlock) {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
          Ready to Unlock
        </span>
      );
    }

    switch (capsule.unlockCondition.type) {
      case "time":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            Time Locked
          </span>
        );
      case "multisig":
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            Multisig
          </span>
        );
      case "payment":
        return (
          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
            Payment Required
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
            Unknown
          </span>
        );
    }
  };

  const getStatusDetails = (capsule: CapsuleWithStatus) => {
    if (capsule.unlocked) {
      return "This capsule has been unlocked and content is accessible.";
    }

    if (capsule.status.statusMessage) {
      return capsule.status.statusMessage;
    }

    return "Waiting for unlock conditions to be met.";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading capsules...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-500 text-xl mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Capsules</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadCapsules}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (capsules.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-500 text-lg mb-4">No time capsules found</div>
        <p className="text-gray-400 mb-6">
          You haven't created any time capsules yet. Create your first one to
          get started!
        </p>
        <a
          href="/create"
          className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create Your First Capsule
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {capsules.length} Capsule{capsules.length !== 1 ? "s" : ""}
        </h2>
        <button
          onClick={loadCapsules}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-6">
        {capsules.map((capsule) => (
          <div
            key={capsule.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Capsule #{capsule.id.slice(-8)}
                </h3>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(capsule)}
                  <span className="text-sm text-gray-500">
                    Created {new Date(capsule.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">CID</div>
                <div className="text-xs font-mono text-gray-700">
                  {capsule.cid.slice(0, 12)}...
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                Unlock Condition:
              </div>
              <div className="text-sm">
                {capsule.unlockCondition.type === "time" && (
                  <div>
                    <span className="font-medium">Time Lock:</span>{" "}
                    {capsule.unlockCondition.unlockTime
                      ? new Date(
                          capsule.unlockCondition.unlockTime
                        ).toLocaleString()
                      : "Unknown time"}
                    {capsule.status.timeRemaining &&
                      capsule.status.timeRemaining > 0 && (
                        <span className="text-yellow-600 ml-2">
                          ({formatTimeRemaining(capsule.status.timeRemaining)}{" "}
                          remaining)
                        </span>
                      )}
                  </div>
                )}
                {capsule.unlockCondition.type === "multisig" && (
                  <div>
                    <span className="font-medium">Multisig:</span>{" "}
                    {capsule.status.approvalProgress ? (
                      <>
                        {capsule.status.approvalProgress.current}/
                        {capsule.status.approvalProgress.required} approvals
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{
                              width: `${capsule.status.approvalProgress.percentage}%`,
                            }}
                          ></div>
                        </div>
                      </>
                    ) : (
                      `Requires ${
                        capsule.unlockCondition.threshold || 1
                      } approvals`
                    )}
                  </div>
                )}
                {capsule.unlockCondition.type === "payment" && (
                  <div>
                    <span className="font-medium">Payment Required:</span>{" "}
                    {(
                      (capsule.unlockCondition.price || 0) / 1_000_000_000
                    ).toFixed(4)}{" "}
                    SUI
                    {capsule.status.paymentStatus?.paid && (
                      <span className="text-green-600 ml-2">(Paid)</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600">
                {getStatusDetails(capsule)}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                onClick={() => {
                  // TODO: Implement share functionality
                  navigator.clipboard.writeText(
                    `${window.location.origin}/capsule/${capsule.id}`
                  );
                }}
              >
                Share
              </button>

              {capsule.status.canUnlock && !capsule.unlocked && (
                <button
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  onClick={() => {
                    setSelectedCapsule(capsule);
                    setShowUnlockModal(true);
                  }}
                >
                  Unlock Now
                </button>
              )}

              {capsule.unlocked && (
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    setSelectedCapsule(capsule);
                    setShowUnlockModal(true);
                  }}
                >
                  View Content
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedCapsule && (
        <UnlockModal
          capsule={selectedCapsule}
          isOpen={showUnlockModal}
          onClose={() => {
            setShowUnlockModal(false);
            setSelectedCapsule(null);
          }}
          onSuccess={() => {
            setShowUnlockModal(false);
            setSelectedCapsule(null);
            loadCapsules(); // Refresh the list
          }}
        />
      )}
    </div>
  );
}
