"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { getSDK } from "../../lib/sdk";
import type { Capsule } from "@time-capsule/types";
import { CapsuleStatusBadge } from "./CapsuleStatusBadge";
import { CountdownTimer } from "./CountdownTimer";
import { ProgressBar } from "./ProgressBar";
import { Loading } from "../Loading";

interface CapsuleDetailProps {
  capsule: Capsule;
  onBack?: () => void;
  onUnlock?: (capsule: Capsule) => void;
  onApprove?: (capsule: Capsule) => void;
}

export function CapsuleDetail({
  capsule,
  onBack,
  onUnlock,
  onApprove,
}: CapsuleDetailProps) {
  const currentAccount = useCurrentAccount();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

    initSdk();
  }, []);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate status
  useEffect(() => {
    if (sdk) {
      try {
        const capsuleStatus = sdk.getCapsuleStatus(capsule, currentTime);
        setStatus(capsuleStatus);
        setLoading(false);
      } catch (error) {
        console.error("Failed to calculate status:", error);
        setLoading(false);
      }
    }
  }, [capsule, currentTime, sdk]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getConditionIcon = () => {
    switch (capsule.unlockCondition.type) {
      case "time":
        return "⏰";
      case "multisig":
        return "👥";
      case "payment":
        return "💰";
      default:
        return "📦";
    }
  };

  const renderUnlockConditionDetails = () => {
    if (loading || !status) {
      return <Loading />;
    }

    switch (capsule.unlockCondition.type) {
      case "time":
        const unlockTime = capsule.unlockCondition.unlockTime || 0;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Unlock Time</h4>
              <p className="text-gray-600">{formatDate(unlockTime)}</p>
            </div>

            {!capsule.unlocked && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Time Remaining
                </h4>
                <CountdownTimer
                  targetTime={unlockTime}
                  currentTime={currentTime}
                />
              </div>
            )}
          </div>
        );

      case "multisig":
        const threshold = capsule.unlockCondition.threshold || 0;
        const approvals = capsule.unlockCondition.approvals || [];
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Signature Requirements
              </h4>
              <p className="text-gray-600">
                Requires {threshold} signature{threshold !== 1 ? "s" : ""} to
                unlock
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Progress</h4>
              <ProgressBar
                current={approvals.length}
                total={threshold}
                label="Signatures"
                showPercentage={true}
              />
              <p className="text-sm text-gray-600 mt-2">
                {approvals.length} of {threshold} signatures received
              </p>
            </div>

            {approvals.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Approvers</h4>
                <div className="space-y-1">
                  {approvals.map((address, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      ✅ {formatAddress(address)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "payment":
        const price = capsule.unlockCondition.price || 0;
        const paid = capsule.unlockCondition.paid || false;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Payment Required
              </h4>
              <p className="text-gray-600">{price / 1_000_000_000} SUI</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Payment Status</h4>
              {paid ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <span>✅</span>
                  <span>Payment received</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-orange-600">
                  <span>⏳</span>
                  <span>Payment required</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-gray-600">Unknown unlock condition type</div>
        );
    }
  };

  const canUserApprove = () => {
    return (
      capsule.unlockCondition.type === "multisig" &&
      !capsule.unlocked &&
      currentAccount?.address &&
      !capsule.unlockCondition.approvals?.includes(currentAccount.address)
    );
  };

  const canUserUnlock = () => {
    return (
      !capsule.unlocked &&
      status?.canUnlock &&
      currentAccount?.address === capsule.owner
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loading />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Capsule Details
            </h1>
            <p className="text-gray-600">ID: {capsule.id}</p>
          </div>
        </div>
        <CapsuleStatusBadge
          unlocked={capsule.unlocked}
          canUnlock={status?.canUnlock || false}
        />
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md">
        {/* Basic Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-3xl">{getConditionIcon()}</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {capsule.unlockCondition.type.charAt(0).toUpperCase() +
                  capsule.unlockCondition.type.slice(1)}{" "}
                Capsule
              </h2>
              <p className="text-gray-600">
                Created {formatDate(capsule.createdAt)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Owner:</span>
              <span className="ml-2 text-gray-600">
                {formatAddress(capsule.owner)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Content ID:</span>
              <span className="ml-2 text-gray-600 font-mono">
                {capsule.cid.slice(0, 20)}...
              </span>
            </div>
          </div>
        </div>

        {/* Unlock Condition Details */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Unlock Conditions
          </h3>
          {renderUnlockConditionDetails()}
        </div>

        {/* Status Message */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Current Status
          </h3>
          <p className="text-gray-600">
            {status?.statusMessage || "Loading status..."}
          </p>
        </div>

        {/* Actions */}
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            {canUserApprove() && (
              <button
                onClick={() => onApprove?.(capsule)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Approve Capsule
              </button>
            )}

            {canUserUnlock() && (
              <button
                onClick={() => onUnlock?.(capsule)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Unlock Capsule
              </button>
            )}

            {capsule.unlocked && (
              <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                Capsule has been unlocked
              </div>
            )}

            {!canUserUnlock() && !canUserApprove() && !capsule.unlocked && (
              <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg">
                {status?.statusMessage || "Conditions not met"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
