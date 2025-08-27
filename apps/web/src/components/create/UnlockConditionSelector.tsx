"use client";

import { useState, useCallback } from "react";
import type { ContentData, UnlockConditionData } from "../../types/capsule";

interface UnlockConditionSelectorProps {
  onSubmit: (condition: UnlockConditionData) => void;
  onBack: () => void;
  contentData: ContentData;
}

export function UnlockConditionSelector({
  onSubmit,
  onBack,
  contentData,
}: UnlockConditionSelectorProps) {
  const [conditionType, setConditionType] = useState<
    "time" | "multisig" | "payment"
  >("time");
  // Set default date to today and time to current time + 5 minutes
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return {
      date: now.toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
      time: now.toTimeString().slice(0, 5), // Current time + 5 minutes in HH:MM format
    };
  };

  const [defaultDateTime] = useState(() => getDefaultDateTime());
  const [unlockDate, setUnlockDate] = useState(defaultDateTime.date);
  const [unlockTime, setUnlockTime] = useState(defaultDateTime.time);
  const [threshold, setThreshold] = useState(2);
  const [price, setPrice] = useState(1);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const condition: UnlockConditionData = {
        type: conditionType,
      };

      switch (conditionType) {
        case "time":
          if (!unlockDate || !unlockTime) {
            alert("Please select both date and time");
            return;
          }
          const unlockDateTime = new Date(`${unlockDate}T${unlockTime}`);
          if (unlockDateTime <= new Date()) {
            alert("Unlock time must be in the future");
            return;
          }
          condition.unlockTime = unlockDateTime.getTime();
          break;

        case "multisig":
          if (threshold < 1) {
            alert("Threshold must be at least 1");
            return;
          }
          condition.threshold = threshold;
          break;

        case "payment":
          if (price <= 0) {
            alert("Price must be greater than 0");
            return;
          }
          condition.price = price;
          break;
      }

      onSubmit(condition);
    },
    [conditionType, unlockDate, unlockTime, threshold, price, onSubmit]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Content summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Content Summary</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>📄 {contentData.filename || "Text content"}</span>
          <span>📊 {formatFileSize(contentData.content.length)}</span>
          <span>🔧 {contentData.contentType}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Set Unlock Conditions
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Condition type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Choose Unlock Method
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setConditionType("time")}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  conditionType === "time"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-2xl mb-2">⏰</div>
                <div className="font-medium text-gray-900">Time-based</div>
                <div className="text-sm text-gray-500 mt-1">
                  Unlock at a specific date and time
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConditionType("multisig")}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  conditionType === "multisig"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium text-gray-900">Multi-signature</div>
                <div className="text-sm text-gray-500 mt-1">
                  Require multiple approvals to unlock
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConditionType("payment")}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  conditionType === "payment"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-2xl mb-2">💰</div>
                <div className="font-medium text-gray-900">Payment-based</div>
                <div className="text-sm text-gray-500 mt-1">
                  Unlock by paying the specified amount
                </div>
              </button>
            </div>
          </div>

          {/* Time-based settings */}
          {conditionType === "time" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Time-based Unlock Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unlock Date
                  </label>
                  <input
                    type="date"
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unlock Time
                  </label>
                  <input
                    type="time"
                    value={unlockTime}
                    onChange={(e) => setUnlockTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-yellow-400 text-xl mr-3">⚠️</div>
                  <div>
                    <h4 className="text-yellow-800 font-medium">Important</h4>
                    <p className="text-yellow-600 text-sm mt-1">
                      The capsule will be unlockable after the specified time.
                      Make sure to set a time that's at least 5 minutes in the
                      future.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multisig settings */}
          {conditionType === "multisig" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Multi-signature Settings
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Approvals
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-medium min-w-[3rem] text-center">
                    {threshold}
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Number of signatures required to unlock the capsule
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-blue-400 text-xl mr-3">ℹ️</div>
                  <div>
                    <h4 className="text-blue-800 font-medium">How it works</h4>
                    <p className="text-blue-600 text-sm mt-1">
                      After creating the capsule, you'll need to share the
                      capsule ID with trusted parties. They can approve the
                      capsule using their wallets, and once {threshold} approval
                      {threshold !== 1 ? "s" : ""}
                      {threshold !== 1 ? " are" : " is"} received, anyone can
                      unlock the capsule.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment settings */}
          {conditionType === "payment" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Payment Settings
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (SUI)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1.0"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                    SUI
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Amount in SUI tokens required to unlock the capsule
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-green-400 text-xl mr-3">💡</div>
                  <div>
                    <h4 className="text-green-800 font-medium">Use cases</h4>
                    <p className="text-green-600 text-sm mt-1">
                      Perfect for selling digital content, creating bounties, or
                      monetizing information. The payment will be transferred to
                      your wallet when someone unlocks the capsule.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Back to Content
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Create Time Capsule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
