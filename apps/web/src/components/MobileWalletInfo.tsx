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

        {/* Wallet Address */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Address</span>
            <button
              onClick={() => navigator.clipboard.writeText(address)}
              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
            >
              Copy
            </button>
          </div>
          <div className="font-mono text-sm text-gray-900 break-all">
            {address}
          </div>
        </div>

        {/* Balance */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-800 text-sm font-medium">Balance</span>
            <button
              onClick={refreshBalance}
              className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-300 rounded hover:bg-blue-100 transition-colors"
              title="Refresh balance"
            >
              ↻ Refresh
            </button>
          </div>
          {balance ? (
            <div className="text-xl font-bold text-blue-900">{balance} SUI</div>
          ) : (
            <div className="text-gray-500 text-sm">Loading balance...</div>
          )}
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
