"use client";

interface MobileTabBarProps {
  activeTab: "create" | "list" | "wallet";
  onTabChange: (tab: "create" | "list" | "wallet") => void;
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 mobile-tab-bar border-t border-gray-200 z-50 bg-white">
      <div className="grid grid-cols-3">
        <button
          onClick={() => onTabChange("create")}
          className={`mobile-tab ${
            activeTab === "create"
              ? "active"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg
            className="w-6 h-6 mb-1 transition-transform duration-200"
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
          <span className="text-xs font-medium">Create</span>
        </button>

        <button
          onClick={() => onTabChange("list")}
          className={`mobile-tab ${
            activeTab === "list"
              ? "active"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg
            className="w-6 h-6 mb-1"
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
          <span className="text-xs font-medium">My Capsules</span>
        </button>

        <button
          onClick={() => onTabChange("wallet")}
          className={`mobile-tab ${
            activeTab === "wallet"
              ? "active"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg
            className="w-6 h-6 mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <span className="text-xs font-medium">Wallet</span>
        </button>
      </div>
    </div>
  );
}
