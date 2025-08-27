"use client";

import { Layout } from "../../components/Layout";
import { WalletConnection } from "../../components/WalletConnection";
import { CapsuleList } from "../../components/CapsuleList";
import { useWallet } from "../../hooks/useWallet";

export default function CapsulesPage() {
  const { isConnected } = useWallet();

  return (
    <Layout>
      {/* Wallet Connection Status */}
      <div className="mb-8">
        <WalletConnection />
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          My Time Capsules
        </h1>
        <p className="text-gray-600">
          View and manage your time capsules. Unlock them when conditions are
          met.
        </p>
      </div>

      {isConnected ? (
        <CapsuleList />
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-500 text-lg mb-4">
            Please connect your wallet to view your time capsules
          </div>
        </div>
      )}
    </Layout>
  );
}
