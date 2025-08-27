"use client";

import { useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { MobileTabBar } from "../components/MobileTabBar";
import { CreateTimeCapsule } from "../components/CreateTimeCapsule";
import { SimpleCapsuleList } from "../components/SimpleCapsuleList";
import { TransactionLookup } from "../components/TransactionLookup";
import { WalletConnection } from "../components/WalletConnection";
import { MobileWalletInfo } from "../components/MobileWalletInfo";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"create" | "list" | "wallet">(
    "create"
  );
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section - Show on desktop always, mobile only on create tab */}
          <div
            className={`text-center mb-12 ${
              activeTab === "create" ? "block" : "hidden md:block"
            }`}
          >
            <div className="text-6xl mb-4">⏰</div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Decentralized Time Capsule
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Store your messages and memories with blockchain-enforced time
              locks. Built on Sui blockchain with IPFS storage for true
              decentralization.
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 max-w-4xl mx-auto">
              <div className="flex items-start">
                <div className="text-green-400 text-xl mr-3 mt-0.5">✅</div>
                <div className="flex-1">
                  <h3 className="text-green-800 font-medium">Success!</h3>
                  <p className="text-green-600 text-sm mt-1 break-all">
                    {successMessage}
                  </p>
                </div>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-green-400 hover:text-green-600 ml-2"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Desktop Tab Navigation */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm mb-8 max-w-4xl mx-auto">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("create")}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === "create"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Capsule
                </div>
              </button>
              <button
                onClick={() => setActiveTab("list")}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === "list"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14-7H5m14 14H5"
                    />
                  </svg>
                  My Capsules
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto">
            {activeTab === "create" && (
              <CreateTimeCapsule onSuccess={handleCreateSuccess} />
            )}

            {activeTab === "list" && (
              <div className="space-y-8">
                <SimpleCapsuleList onUnlock={handleUnlockCapsule} />
                <TransactionLookup />
              </div>
            )}

            {activeTab === "wallet" && (
              <div className="space-y-6">
                {/* Mobile Wallet Page */}
                <div className="md:hidden">
                  <div className="text-center mb-8">
                    <div className="text-4xl mb-3">💳</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Wallet
                    </h1>
                    <p className="text-gray-600">
                      Manage your Sui wallet connection and view account details
                    </p>
                  </div>

                  {/* Wallet Connection */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Wallet Connection
                    </h3>
                    <MobileWalletInfo />
                  </div>

                  {/* Network Info */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Network Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Network</span>
                        <span className="font-medium text-blue-600">
                          Sui Testnet
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Storage</span>
                        <span className="font-medium text-purple-600">
                          IPFS (Pinata)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Status</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="font-medium text-green-600">
                            Connected
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* App Info */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      About Time Capsule
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Decentralized time-locked storage</p>
                      <p>• Built on Sui blockchain</p>
                      <p>• IPFS distributed storage</p>
                      <p>• End-to-end encryption</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 text-center">
                        Version 1.0.0 • Made with ❤️ for the future
                      </p>
                    </div>
                  </div>
                </div>

                {/* Desktop - redirect to other tabs since wallet is in header */}
                <div className="hidden md:block text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">💳</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Wallet
                  </h2>
                  <p className="text-gray-600 mb-6">
                    On desktop, wallet information is available in the header.
                  </p>
                  <div className="space-x-4">
                    <button
                      onClick={() => setActiveTab("create")}
                      className="btn-primary"
                    >
                      Create Capsule
                    </button>
                    <button
                      onClick={() => setActiveTab("list")}
                      className="btn-secondary"
                    >
                      View My Capsules
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* How It Works Section */}
          <div className="bg-white rounded-lg shadow-md p-8 mt-16 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">Connect Wallet</h3>
                <p className="text-gray-600">
                  Connect your Sui wallet to authenticate and manage your
                  capsules securely
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">Write Message</h3>
                <p className="text-gray-600">
                  Enter your message and set the unlock date and time for the
                  future
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-600 font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">Store on IPFS</h3>
                <p className="text-gray-600">
                  Your message is uploaded to IPFS via Pinata for decentralized
                  storage
                </p>
              </div>
              <div className="text-center">
                <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-orange-600 font-bold text-xl">4</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">Unlock & Access</h3>
                <p className="text-gray-600">
                  Access your content when the time condition is met, enforced
                  by blockchain
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Tab Bar */}
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
