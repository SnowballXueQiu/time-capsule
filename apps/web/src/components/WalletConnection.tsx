"use client";

import { useWallet } from "../hooks/useWallet";

export function WalletConnection() {
  const {
    isConnected,
    isConnecting,
    address,
    balance,
    error,
    connectWallet,
    disconnectWallet,
    refreshBalance,
  } = useWallet();

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">
              Wallet Connected
            </span>
          </div>
          <div className="text-sm text-green-600 mt-1">
            <div>
              Address: {address.slice(0, 6)}...{address.slice(-4)}
            </div>
            {balance && (
              <div className="flex items-center space-x-2">
                <span>Balance: {balance} SUI</span>
                <button
                  onClick={refreshBalance}
                  className="text-green-700 hover:text-green-900 underline text-xs"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium text-yellow-800">
              {isConnecting ? "Connecting..." : "Wallet Not Connected"}
            </span>
          </div>
          <p className="text-sm text-yellow-600 mt-1">
            Connect your Sui wallet to create and manage time capsules
          </p>
          {error && <p className="text-sm text-red-600 mt-1">Error: {error}</p>}
        </div>
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      </div>
    </div>
  );
}
