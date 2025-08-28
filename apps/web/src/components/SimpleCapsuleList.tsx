"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

interface SimpleCapsule {
  id: string;
  owner: string;
  cid: string;
  unlockTime: number;
  unlocked: boolean;
  createdAt: number;
}

interface CapsuleListProps {
  onUnlock?: (capsule: SimpleCapsule) => void;
}

export function SimpleCapsuleList({ onUnlock }: CapsuleListProps) {
  const currentAccount = useCurrentAccount();
  const [capsules, setCapsules] = useState<SimpleCapsule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (currentAccount?.address) {
      loadCapsules();
    }
  }, [currentAccount?.address]);

  // Process capsules in batches using RAF to prevent UI blocking
  const processCapsulesBatched = async (
    events: any[],
    client: SuiClient,
    parsedCapsules: SimpleCapsule[]
  ) => {
    const BATCH_SIZE = 3; // Process 3 capsules per frame
    let currentIndex = 0;

    return new Promise<void>((resolve) => {
      const processBatch = async () => {
        const endIndex = Math.min(currentIndex + BATCH_SIZE, events.length);

        for (let i = currentIndex; i < endIndex; i++) {
          const event = events[i];
          const eventData = event.parsedJson as any;

          try {
            const capsuleResponse = await client.getObject({
              id: eventData.capsule_id,
              options: {
                showContent: true,
                showType: true,
              },
            });

            if (
              capsuleResponse.data?.content &&
              capsuleResponse.data.content.dataType === "moveObject"
            ) {
              const fields = (capsuleResponse.data.content as any).fields;

              const capsule: SimpleCapsule = {
                id: capsuleResponse.data.objectId,
                owner: fields.owner,
                cid: fields.cid,
                unlockTime: parseInt(fields.unlock_time_ms),
                createdAt: parseInt(fields.created_at),
                unlocked: fields.unlocked,
              };

              parsedCapsules.push(capsule);

              // Update progress and UI incrementally
              setProcessingProgress({ current: i + 1, total: events.length });
              setCapsules([...parsedCapsules]); // Show capsules as they load
            }
          } catch (objError) {
            console.warn(
              "Failed to get capsule object:",
              eventData.capsule_id,
              objError
            );
          }
        }

        currentIndex = endIndex;

        if (currentIndex < events.length) {
          // Schedule next batch
          requestAnimationFrame(() => {
            setTimeout(processBatch, 0); // Small delay to prevent overwhelming
          });
        } else {
          resolve();
        }
      };

      processBatch();
    });
  };

  const loadCapsules = async () => {
    if (!currentAccount?.address) return;

    setLoading(true);
    setError(null);
    setCapsules([]); // Clear existing capsules

    try {
      const client = new SuiClient({ url: getFullnodeUrl("testnet") });

      console.log("Loading capsules for address:", currentAccount.address);
      console.log("Package ID:", process.env.NEXT_PUBLIC_PACKAGE_ID);

      // Since time capsules are shared objects, we need to query events instead
      // Query CapsuleCreated events to find capsules created by this user
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::capsule::CapsuleCreated`,
        },
        limit: 50,
        order: "descending",
      });

      console.log("Found events:", events);

      const parsedCapsules: SimpleCapsule[] = [];
      const userEvents = events.data.filter(
        (event) => (event.parsedJson as any).owner === currentAccount.address
      );

      setProcessingProgress({ current: 0, total: userEvents.length });

      // Process capsules in batches using RAF to prevent UI blocking
      await processCapsulesBatched(userEvents, client, parsedCapsules);

      setCapsules(parsedCapsules);
      setProcessingProgress(null);
      console.log("Total capsules loaded:", parsedCapsules.length);
    } catch (err) {
      console.error("Error loading capsules:", err);
      setError(
        `Failed to load capsules: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (unlockTime: number) => {
    const now = Date.now();
    const remaining = unlockTime - now;

    if (remaining <= 0) {
      return "Ready to unlock";
    }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  if (!currentAccount) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Connect Wallet to View Capsules
        </h2>
        <p className="text-gray-600">
          Connect your Sui wallet to see your time capsules.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Loading Capsules...
          </h3>
          {processingProgress && (
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (processingProgress.current / processingProgress.total) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                Processing {processingProgress.current} of{" "}
                {processingProgress.total} capsules...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-red-600 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p>{error}</p>
          <button onClick={loadCapsules} className="mt-4 btn-danger">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-8">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-3 sm:space-y-0">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
          My Time Capsules
        </h2>
        <button
          onClick={loadCapsules}
          className="btn-secondary text-sm w-full sm:w-auto"
        >
          🔄 Refresh
        </button>
      </div>

      {capsules.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl md:text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Time Capsules Yet
          </h3>
          <p className="text-gray-600 text-sm md:text-base">
            Create your first time capsule to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {capsules.map((capsule) => (
            <div
              key={capsule.id}
              className="border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow"
            >
              {/* Mobile-First Layout */}
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="text-xl md:text-2xl">⏰</div>
                    <h3 className="text-base md:text-lg font-medium text-gray-900">
                      Time Capsule
                    </h3>
                  </div>
                  {capsule.unlocked && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      ✓ Unlocked
                    </span>
                  )}
                </div>

                {/* Status Row - Prominent on Mobile */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                        Status
                      </div>
                      <div className="mt-1">
                        {capsule.unlocked ? (
                          <span className="text-green-600 font-medium">
                            🔓 Ready to View
                          </span>
                        ) : Date.now() >= capsule.unlockTime ? (
                          <span className="text-blue-600 font-medium">
                            🔓 Ready to Unlock
                          </span>
                        ) : (
                          <span className="text-orange-600 font-medium">
                            🔒 {formatTimeRemaining(capsule.unlockTime)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="ml-3">
                      {capsule.unlocked || Date.now() >= capsule.unlockTime ? (
                        <button
                          onClick={() => onUnlock?.(capsule)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                      ) : (
                        <div className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-medium">
                          Locked
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details - Horizontal Layout */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Created
                    </div>
                    <div className="mt-1 text-gray-900">
                      {new Date(capsule.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(capsule.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Unlock Time
                    </div>
                    <div className="mt-1 text-gray-900">
                      {new Date(capsule.unlockTime).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(capsule.unlockTime).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* IPFS CID - Hidden on small mobile, shown on larger screens */}
                <div className="hidden sm:block">
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                    IPFS CID
                  </div>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">
                    {capsule.cid}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
