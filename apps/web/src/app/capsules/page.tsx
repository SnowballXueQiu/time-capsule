"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Layout } from "../../components/Layout";
import { Loading } from "../../components/Loading";
import { UnlockModal } from "../../components/capsules/UnlockModal";
import { getSDK } from "../../lib/sdk";
import type { Capsule, UnlockResult } from "@time-capsule/types";

// Dynamically import components to avoid SSR issues
const CapsuleList = dynamic(
  () =>
    import("../../components/capsules").then((mod) => ({
      default: mod.CapsuleList,
    })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

const CapsuleDetail = dynamic(
  () =>
    import("../../components/capsules").then((mod) => ({
      default: mod.CapsuleDetail,
    })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

export default function CapsulesPage() {
  const currentAccount = useCurrentAccount();
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockingCapsule, setUnlockingCapsule] = useState<Capsule | null>(
    null
  );
  const [unlockResult, setUnlockResult] = useState<UnlockResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const handleCapsuleSelect = (capsule: Capsule) => {
    setSelectedCapsule(capsule);
  };

  const handleBack = () => {
    setSelectedCapsule(null);
  };

  const handleUnlock = (capsule: Capsule) => {
    setUnlockingCapsule(capsule);
    setUnlockModalOpen(true);
    setError(null);
  };

  const handleApprove = async (capsule: Capsule) => {
    if (!currentAccount) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setError(null);
      setApproving(capsule.id);

      console.log("Simulating approval for capsule:", capsule.id);

      // Simulate approval process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Approval successful for capsule:", capsule.id);
      setApproving(null);

      // Show success message
      setTimeout(() => {
        // In a real app, you would refresh the capsule data here
        // For now, we'll just show a success message
        alert(
          "Capsule approved successfully! In a real implementation, this would update the blockchain state."
        );
      }, 500);
    } catch (err) {
      console.error("Approval failed:", err);
      setError(err instanceof Error ? err.message : "Approval failed");
      setApproving(null);
    }
  };

  const handleUnlockSuccess = (result: UnlockResult) => {
    setUnlockResult(result);
    setUnlockModalOpen(false);
    setUnlockingCapsule(null);
    console.log("Unlock successful:", result);
  };

  const handleUnlockError = (errorMessage: string) => {
    setError(errorMessage);
    setUnlockModalOpen(false);
    setUnlockingCapsule(null);
  };

  const handleCloseUnlockModal = () => {
    setUnlockModalOpen(false);
    setUnlockingCapsule(null);
    setError(null);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800">
              <span>❌</span>
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 text-sm underline mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success Display */}
        {unlockResult && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 text-green-800">
              <span>✅</span>
              <span className="font-medium">Unlock Successful</span>
            </div>
            <p className="text-green-600 text-sm mt-1">
              Capsule {unlockResult.capsuleId} has been unlocked successfully!
            </p>
            <button
              onClick={() => setUnlockResult(null)}
              className="text-green-600 text-sm underline mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {selectedCapsule ? (
          <CapsuleDetail
            capsule={selectedCapsule}
            onBack={handleBack}
            onUnlock={handleUnlock}
            onApprove={handleApprove}
            approving={approving === selectedCapsule.id}
          />
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              My Capsules
            </h1>
            <CapsuleList onCapsuleSelect={handleCapsuleSelect} />
          </>
        )}

        {/* Unlock Modal */}
        {unlockingCapsule && (
          <UnlockModal
            capsule={unlockingCapsule}
            isOpen={unlockModalOpen}
            onClose={handleCloseUnlockModal}
            onSuccess={handleUnlockSuccess}
            onError={handleUnlockError}
          />
        )}
      </div>
    </Layout>
  );
}
