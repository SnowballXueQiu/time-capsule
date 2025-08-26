"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import type { Capsule } from "@time-capsule/types";
import { CapsuleCard } from "./CapsuleCard";
import { Loading } from "../Loading";
import { useCapsuleUpdates } from "../../hooks/useCapsuleUpdates";

interface CapsuleListProps {
  onCapsuleSelect?: (capsule: Capsule) => void;
}

export function CapsuleList({ onCapsuleSelect }: CapsuleListProps) {
  const currentAccount = useCurrentAccount();
  const { capsules, loading, error, refreshCapsules } = useCapsuleUpdates();

  if (!currentAccount) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">
          Please connect your wallet to view capsules
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600">Error loading capsules: {error}</p>
        </div>
        <button
          onClick={refreshCapsules}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (capsules.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No capsules found
        </h3>
        <p className="text-gray-600 mb-6">
          You haven't created any time capsules yet.
        </p>
        <a
          href="/create"
          className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
        >
          Create Your First Capsule
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          My Capsules ({capsules.length})
        </h2>
        <button
          onClick={refreshCapsules}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {capsules.map((capsule) => (
          <CapsuleCard
            key={capsule.id}
            capsule={capsule}
            status={capsule.status}
            onClick={() => onCapsuleSelect?.(capsule)}
          />
        ))}
      </div>
    </div>
  );
}
