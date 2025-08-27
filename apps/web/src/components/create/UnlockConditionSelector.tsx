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
  const [conditionType, setConditionType] = useState<"time">("time");
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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!unlockDate || !unlockTime) {
        alert("Please select both date and time");
        return;
      }

      const unlockDateTime = new Date(`${unlockDate}T${unlockTime}`);
      if (unlockDateTime <= new Date()) {
        alert("Unlock time must be in the future");
        return;
      }

      const condition: UnlockConditionData = {
        type: "time",
        unlockTime: unlockDateTime.getTime(),
      };

      onSubmit(condition);
    },
    [unlockDate, unlockTime, onSubmit]
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
          {/* Unlock method info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">⏰</div>
              <div>
                <div className="font-medium text-blue-900">
                  Time-based Unlock
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  Your capsule will unlock at the specified date and time
                </div>
              </div>
            </div>
          </div>

          {/* Time-based settings */}
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
