"use client";

import { useWallet } from "../hooks/useWallet";

export function MobileWalletInfo() {
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
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-green-800 font-medium">Connected</span>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            Disconnect
          </button>
        </div>

        {/* Wallet Info Combined */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700 text-sm font-medium">
              Wallet Info
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(address)}
                className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
              >
                Copy
              </button>
              <button
                onClick={refreshBalance}
                className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-300 rounded hover:bg-blue-100 transition-colors"
                title="Refresh balance"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Combined Address and Balance Display */}
          <div className="font-mono text-lg font-bold text-gray-900 break-all">
            {balance || "0.0000"} SUI
          </div>

          {/* Full Address (smaller, for reference) */}
          <div className="text-xs text-gray-500 mt-2 font-mono break-all">
            Full: {address}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
          <span className="text-orange-800 font-medium">
            {isConnecting ? "Connecting..." : "Not Connected"}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800 font-medium text-sm">Error</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      )}

      {/* Connect Button */}
      <button
        onClick={() => connectWallet()}
        disabled={isConnecting}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500 mt-4">
        <p>Connect your Sui wallet to view balance and manage capsules</p>
      </div>
    </div>
  );
}
