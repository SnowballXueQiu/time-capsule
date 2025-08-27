"use client";

import { useState } from "react";
import { WalletConnection } from "../components/WalletConnection";
import { CreateTimeCapsule } from "../components/CreateTimeCapsule";
import { SimpleCapsuleList } from "../components/SimpleCapsuleList";
import { TransactionLookup } from "../components/TransactionLookup";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreateSuccess = (result: any) => {
    const shortId = result.capsuleId
      ? result.capsuleId.slice(0, 16) + "..."
      : "Unknown";
    const unlockDate = new Date(result.unlockTime).toLocaleString();
    setSuccessMessage(
      `Time capsule created! ID: ${shortId} | Unlocks: ${unlockDate} | Tx: ${result.transactionDigest.slice(
        0,
        16
      )}...`
    );
    setActiveTab("list");

    // Clear success message after 10 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 10000);
  };

  const handleUnlockCapsule = (capsule: any) => {
    // Open IPFS content in new tab
    const gatewayUrl = `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${capsule.cid}`;
    window.open(gatewayUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Time Capsule
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Store files with time-based unlock conditions on Sui blockchain
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="mb-8">
          <WalletConnection />
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-green-400 text-xl mr-3">✅</div>
              <div>
                <h3 className="text-green-800 font-medium">Success!</h3>
                <p className="text-green-600 text-sm mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === "create"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Create Capsule
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === "list"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              My Capsules
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "create" && (
          <CreateTimeCapsule onSuccess={handleCreateSuccess} />
        )}

        {activeTab === "list" && (
          <>
            <SimpleCapsuleList onUnlock={handleUnlockCapsule} />
            <TransactionLookup />
          </>
        )}

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-md p-8 mt-12">
          <h2 className="text-2xl font-semibold text-center mb-6">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Connect Wallet</h3>
              <p className="text-sm text-gray-600">
                Connect your Sui wallet to get started
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Upload File</h3>
              <p className="text-sm text-gray-600">
                Select a file and set unlock time
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Store on IPFS</h3>
              <p className="text-sm text-gray-600">
                File is uploaded to IPFS via Pinata
              </p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-2">Unlock & Access</h3>
              <p className="text-sm text-gray-600">
                Access content when time condition is met
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
