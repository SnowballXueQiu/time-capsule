"use client";

import { useState, useCallback } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { DebugInfo } from "./DebugInfo";

interface CreateTimeCapsuleProps {
  onSuccess?: (result: any) => void;
}

export function CreateTimeCapsule({ onSuccess }: CreateTimeCapsuleProps) {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

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
  const [textContent, setTextContent] = useState("");
  const [unlockDate, setUnlockDate] = useState(defaultDateTime.date);
  const [unlockTime, setUnlockTime] = useState(defaultDateTime.time);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!currentAccount) {
        setError("Please connect your wallet first");
        return;
      }

      if (!textContent.trim()) {
        setError("Please enter some text content");
        return;
      }

      if (!unlockDate || !unlockTime) {
        setError("Please set unlock date and time");
        return;
      }

      setIsCreating(true);
      setError(null);

      try {
        // 1. Upload text content to IPFS via Pinata API
        const formData = new FormData();
        const blob = new Blob([textContent], { type: "text/plain" });
        formData.append("file", blob, "message.txt");

        // Add metadata
        const metadata = JSON.stringify({
          name: `time-capsule-${Date.now()}`,
          keyvalues: {
            type: "time-capsule-content",
            timestamp: Date.now().toString(),
          },
        });
        formData.append("pinataMetadata", metadata);

        const uploadResponse = await fetch(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`IPFS upload failed: ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        const cid = uploadResult.IpfsHash;

        console.log("Content uploaded to IPFS:", cid);

        // 2. Calculate unlock timestamp
        const unlockDateTime = new Date(`${unlockDate}T${unlockTime}`);
        const unlockTimestamp = unlockDateTime.getTime();

        if (unlockTimestamp <= Date.now()) {
          throw new Error("Unlock time must be in the future");
        }

        // 3. Create blockchain transaction
        const tx = new Transaction();

        // Convert CID and content hash to bytes
        const cidBytes = Array.from(new TextEncoder().encode(cid));
        const contentBytes = new TextEncoder().encode(textContent);
        const hashBuffer = await crypto.subtle.digest("SHA-256", contentBytes);
        const hashBytes = Array.from(new Uint8Array(hashBuffer));

        tx.moveCall({
          target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::capsule::create_time_capsule`,
          arguments: [
            tx.pure.vector("u8", cidBytes),
            tx.pure.vector("u8", hashBytes),
            tx.pure.u64(unlockTimestamp),
            tx.object("0x6"), // Clock object
          ],
        });

        // 4. Sign and execute transaction
        const txResult = await new Promise<any>((resolve, reject) => {
          signAndExecuteTransaction(
            { transaction: tx },
            {
              onSuccess: resolve,
              onError: reject,
            }
          );
        });

        console.log("Transaction successful:", txResult);
        setDebugInfo(txResult);

        // Extract capsule ID from object changes
        let capsuleId = "";
        const changes = txResult.objectChanges || [];

        console.log("All object changes:", changes);

        // Try different ways to find the capsule ID
        for (const change of changes) {
          console.log("Checking change:", change);

          if (change.type === "created") {
            // Check if it's a shared object (time capsules are shared)
            if (
              change.owner === "Shared" ||
              (typeof change.owner === "object" && "Shared" in change.owner)
            ) {
              capsuleId = change.objectId;
              console.log("Found shared object capsule ID:", capsuleId);
              break;
            }

            // Check if the object type contains TimeCapsule
            if (
              change.objectType &&
              change.objectType.includes("TimeCapsule")
            ) {
              capsuleId = change.objectId;
              console.log("Found TimeCapsule object ID:", capsuleId);
              break;
            }

            // Fallback: any created object
            if (!capsuleId) {
              capsuleId = change.objectId;
              console.log("Using fallback object ID:", capsuleId);
            }
          }
        }

        // If still no capsule ID found, use the transaction digest as fallback
        if (!capsuleId) {
          console.warn(
            "Could not extract capsule ID from object changes, using transaction digest"
          );
          capsuleId = `tx-${txResult.digest.slice(0, 16)}`;
        }

        const result = {
          capsuleId,
          transactionDigest: txResult.digest,
          cid: cid,
          unlockTime: unlockTimestamp,
        };

        onSuccess?.(result);

        // Reset form
        setTextContent("");
        setUnlockDate("");
        setUnlockTime("");
        setDebugInfo(null);
      } catch (err) {
        console.error("Error creating time capsule:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create time capsule"
        );
      } finally {
        setIsCreating(false);
      }
    },
    [
      currentAccount,
      textContent,
      unlockDate,
      unlockTime,
      signAndExecuteTransaction,
      onSuccess,
    ]
  );

  if (!currentAccount) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Wallet Connection Required
        </h2>
        <p className="text-gray-600 mb-6">
          Please connect your Sui wallet to create time capsules.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Create Time Capsule
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-400 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Text Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Message
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Enter the message you want to store in your time capsule..."
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={isCreating}
            required
          />
          <div className="mt-2 text-sm text-gray-500">
            {textContent.length} characters
          </div>
        </div>

        {/* Unlock Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unlock Date
          </label>
          <input
            type="date"
            value={unlockDate}
            onChange={(e) => setUnlockDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isCreating}
            required
          />
        </div>

        {/* Unlock Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unlock Time
          </label>
          <input
            type="time"
            value={unlockTime}
            onChange={(e) => setUnlockTime(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isCreating}
            required
          />
        </div>

        {/* Preview */}
        {unlockDate && unlockTime && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-blue-800 font-medium mb-2">Unlock Preview</h4>
            <p className="text-blue-600 text-sm">
              This capsule will unlock on:{" "}
              {new Date(`${unlockDate}T${unlockTime}`).toLocaleString()}
            </p>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-green-400 text-xl mr-3">🔒</div>
            <div>
              <h3 className="text-green-800 font-medium">How it works</h3>
              <p className="text-green-600 text-sm mt-1">
                Your message will be stored on IPFS and the unlock condition
                will be enforced by the Sui blockchain.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            isCreating || !textContent.trim() || !unlockDate || !unlockTime
          }
          className="w-full btn-primary text-sm"
        >
          {isCreating ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Capsule...
            </>
          ) : (
            "Create Time Capsule"
          )}
        </button>
      </form>

      {/* Debug Information */}
      {debugInfo && (
        <DebugInfo data={debugInfo} title="Transaction Debug Info" />
      )}
    </div>
  );
}
