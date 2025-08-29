"use client";

import { useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { MobileTabBar } from "../components/MobileTabBar";
import { CreateTimeCapsule } from "../components/CreateTimeCapsule";
import { SimpleCapsuleList } from "../components/SimpleCapsuleList";

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
    // Navigate to capsule detail page for proper unlock/decrypt flow
    window.location.href = `/capsule/${capsule.id}`;
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
            <img
              src="/logo.svg"
              alt="TimeCapsule Logo"
              className="w-24 h-24 mb-4 mx-auto"
            />
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

            {/* Technical Architecture Flow */}
            <div className="mb-12">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-semibold text-center mb-6 text-gray-800">
                  Technical Architecture & Process Flow
                </h3>

                {/* Flow Diagram */}
                <div className="flex flex-col lg:flex-row items-center justify-center space-y-4 lg:space-y-0 lg:space-x-6">
                  {/* Wallet */}
                  <div className="flex flex-col items-center">
                    <div className="bg-blue-500 text-white rounded-lg p-3 mb-2">
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Sui Wallet</span>
                  </div>

                  <div className="text-gray-400 font-bold">
                    <span className="hidden lg:inline">→</span>
                    <span className="lg:hidden">↓</span>
                  </div>

                  {/* WASM Encryption */}
                  <div className="flex flex-col items-center">
                    <div className="bg-green-500 text-white rounded-lg p-3 mb-2">
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">WASM Encryption</span>
                  </div>

                  <div className="text-gray-400 font-bold">
                    <span className="hidden lg:inline">→</span>
                    <span className="lg:hidden">↓</span>
                  </div>

                  {/* IPFS */}
                  <div className="flex flex-col items-center">
                    <div className="bg-purple-500 text-white rounded-lg p-3 mb-2">
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">IPFS Storage</span>
                  </div>

                  <div className="text-gray-400 font-bold">
                    <span className="hidden lg:inline">→</span>
                    <span className="lg:hidden">↓</span>
                  </div>

                  {/* Blockchain */}
                  <div className="flex flex-col items-center">
                    <div className="bg-orange-500 text-white rounded-lg p-3 mb-2">
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Sui Blockchain</span>
                  </div>
                </div>

                {/* Technology Stack */}
                <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-blue-600 font-semibold text-sm">
                      Wallet Auth
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Ed25519 Signatures
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-green-600 font-semibold text-sm">
                      Encryption
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Rust WASM + AES-GCM
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-purple-600 font-semibold text-sm">
                      Storage
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Pinata IPFS Gateway
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-orange-600 font-semibold text-sm">
                      Time Lock
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Move Smart Contract
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">Connect Wallet</h3>
                <p className="text-gray-600 text-sm">
                  Connect your Sui wallet to authenticate. Your wallet's private
                  key will be used for encryption key derivation.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">Write Content</h3>
                <p className="text-gray-600 text-sm">
                  Enter your message and set the unlock date. The content can be
                  text, files, or any data you want to preserve.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-600 font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">WASM Encryption</h3>
                <p className="text-gray-600 text-sm">
                  Content is encrypted using Rust WASM with AES-GCM. Encryption
                  key is derived from your wallet signature.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-indigo-600 font-bold text-xl">4</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">IPFS Storage</h3>
                <p className="text-gray-600 text-sm">
                  Encrypted content is uploaded to IPFS via Pinata for
                  decentralized, immutable storage.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-orange-600 font-bold text-xl">5</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">Blockchain Lock</h3>
                <p className="text-gray-600 text-sm">
                  Time capsule metadata and unlock conditions are stored on Sui
                  blockchain with smart contract enforcement.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-600 font-bold text-xl">6</span>
                </div>
                <h3 className="font-semibold mb-3 text-lg">Unlock & Decrypt</h3>
                <p className="text-gray-600 text-sm">
                  When time condition is met, use your wallet to decrypt
                  content. WASM handles key derivation and decryption.
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
