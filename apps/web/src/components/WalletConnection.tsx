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
      <div className="flex items-center space-x-3">
        {/* Status Indicator - Hidden on mobile */}
        <div className="hidden sm:flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-green-800 text-sm font-medium">Connected</span>
        </div>

        {/* Address - Hidden on small screens */}
        <div className="hidden md:block text-sm text-gray-600">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>

        {/* Balance - Hidden on mobile */}
        {balance && (
          <div className="hidden lg:flex items-center space-x-1 text-sm text-gray-600">
            <span>{balance} SUI</span>
            <button
              onClick={refreshBalance}
              className="text-blue-600 hover:text-blue-800 text-xs"
              title="Refresh balance"
            >
              ↻
            </button>
          </div>
        )}

        {/* Disconnect Button */}
        <button onClick={disconnectWallet} className="btn-danger text-sm">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {/* Status Indicator - Hidden on mobile */}
      <div className="hidden sm:flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
        <span className="text-orange-800 text-sm font-medium">
          {isConnecting ? "Connecting..." : "Not Connected"}
        </span>
      </div>

      {/* Error Message - Only on desktop */}
      {error && (
        <div
          className="hidden md:block text-sm text-red-600 max-w-32 truncate"
          title={error}
        >
          Error: {error}
        </div>
      )}

      {/* Connect Button */}
      <button
        onClick={() => connectWallet()}
        disabled={isConnecting}
        className="btn-primary text-sm"
      >
        {isConnecting ? "Connecting..." : "Connect"}
      </button>
    </div>
  );
}
