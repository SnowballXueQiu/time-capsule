"use client";

import { WalletConnection } from "./WalletConnection";

interface HeaderProps {
  activeTab: "create" | "list" | "wallet";
  onTabChange: (tab: "create" | "list" | "wallet") => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="text-2xl mr-3">⏰</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TimeCapsule</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Decentralized Time Storage
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => onTabChange("create")}
                className={`tab-button ${
                  activeTab === "create" ? "active" : ""
                }`}
              >
                Create Capsule
              </button>
              <button
                onClick={() => onTabChange("list")}
                className={`tab-button ${activeTab === "list" ? "active" : ""}`}
              >
                My Capsules
              </button>
            </nav>

            {/* Wallet Connection */}
            <WalletConnection />
          </div>

          {/* Mobile navigation is now handled by bottom tab bar */}
        </div>

        {/* Mobile navigation is now handled by bottom tab bar */}
      </div>
    </header>
  );
}
