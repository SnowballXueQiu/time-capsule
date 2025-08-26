"use client";

import { useState, useEffect } from "react";
import type { Capsule } from "@time-capsule/types";
import { CapsuleStatusBadge } from "./CapsuleStatusBadge";
import { CountdownTimer } from "./CountdownTimer";
import { ProgressBar } from "./ProgressBar";

interface CapsuleStatus {
  canUnlock: boolean;
  timeRemaining?: number;
  approvalProgress?: {
    current: number;
    required: number;
    percentage: number;
  };
  paymentStatus?: {
    required: number;
    paid: boolean;
  };
  statusMessage: string;
}

interface CapsuleCardProps {
  capsule: Capsule;
  status: CapsuleStatus;
  onClick?: () => void;
  onUnlock?: (capsule: Capsule) => void;
  onApprove?: (capsule: Capsule) => void;
  currentUserAddress?: string;
}

export function CapsuleCard({
  capsule,
  status,
  onClick,
  onUnlock,
  onApprove,
  currentUserAddress,
}: CapsuleCardProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const getConditionDescription = () => {
    switch (capsule.unlockCondition.type) {
      case "time":
        return `Unlocks: ${formatDate(
          capsule.unlockCondition.unlockTime || 0
        )}`;
      case "multisig":
        return `Requires ${capsule.unlockCondition.threshold} signatures`;
      case "payment":
        return `Price: ${
          (capsule.unlockCondition.price || 0) / 1_000_000_000
        } SUI`;
      default:
        return "Unknown condition";
    }
  };

  const renderConditionProgress = () => {
    if (capsule.unlocked) {
      return <div className="text-green-600 font-medium">✅ Unlocked</div>;
    }

    switch (capsule.unlockCondition.type) {
      case "time":
        if (status.timeRemaining && status.timeRemaining > 0) {
          return (
            <CountdownTimer
              targetTime={capsule.unlockCondition.unlockTime || 0}
              currentTime={currentTime}
            />
          );
        } else {
          return <div className="text-green-600 font-medium"></div>;
        }

      case "multisig":
        if (status.approvalProgress) {
          return (
            <div className="space-y-2">
              <ProgressBar
                current={status.approvalProgress.current}
                total={status.approvalProgress.required}
                label="Approvals"
              />
              <div className="text-sm text-gray-600">
                {status.approvalProgress.current}/
                {status.approvalProgress.required} signatures
              </div>
            </div>
          );
        }
        break;

      case "payment":
        if (status.paymentStatus) {
          return (
            <div className="space-y-1">
              <div className="text-sm text-gray-600">
                Payment: {status.paymentStatus.required / 1_000_000_000} SUI
              </div>
              {status.paymentStatus.paid ? (
                <div className="text-green-600 font-medium">✅ Paid</div>
              ) : (
                <div className="text-orange-600 font-medium">
                  ⏳ Payment required
                </div>
              )}
            </div>
          );
        }
        break;
    }

    return <div className="text-gray-600 text-sm">{status.statusMessage}</div>;
  };

  const canUserApprove = () => {
    return (
      capsule.unlockCondition.type === "multisig" &&
      !capsule.unlocked &&
      currentUserAddress &&
      !capsule.unlockCondition.approvals?.includes(currentUserAddress)
    );
  };

  const canUserUnlock = () => {
    return (
      !capsule.unlocked &&
      status.canUnlock &&
      currentUserAddress === capsule.owner
    );
  };

  const handleQuickAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 transition-all duration-200 cursor-pointer hover:shadow-lg ${
        status.canUnlock && !capsule.unlocked
          ? "border-green-200 hover:border-green-300"
          : capsule.unlocked
          ? "border-gray-200 hover:border-gray-300"
          : "border-gray-200 hover:border-blue-300"
      }`}
      onClick={onClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getConditionIcon()}</div>
            <div>
              <h3 className="font-semibold text-gray-900 truncate">
                Capsule #{capsule.id.slice(-8)}
              </h3>
              <p className="text-sm text-gray-500">
                Created {formatDate(capsule.createdAt)}
              </p>
            </div>
          </div>
          <CapsuleStatusBadge
            unlocked={capsule.unlocked}
            canUnlock={status.canUnlock}
          />
        </div>

        {/* Condition Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            {getConditionDescription()}
          </p>
        </div>

        {/* Progress/Status */}
        <div className="mb-4">{renderConditionProgress()}</div>

        {/* Quick Actions */}
        {(canUserUnlock() || canUserApprove()) && (
          <div className="mb-4 flex space-x-2">
            {canUserUnlock() && onUnlock && (
              <button
                onClick={(e) => handleQuickAction(e, () => onUnlock(capsule))}
                className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                🔓 Unlock
              </button>
            )}
            {canUserApprove() && onApprove && (
              <button
                onClick={(e) => handleQuickAction(e, () => onApprove(capsule))}
                className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                ✅ Approve
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            CID: {capsule.cid.slice(0, 12)}...
          </div>
          <div className="text-xs text-gray-500">
            {status.canUnlock && !capsule.unlocked ? (
              <span className="text-green-600 font-medium">Ready</span>
            ) : capsule.unlocked ? (
              <span className="text-gray-600">Unlocked</span>
            ) : (
              <span className="text-orange-600">Locked</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
