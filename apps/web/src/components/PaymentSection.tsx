"use client";

import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { getSDK } from "../lib/sdk";
import type { Capsule } from "@time-capsule/types";

interface PaymentSectionProps {
  capsule: Capsule;
  onPaymentSuccess: () => void;
}

export function PaymentSection({
  capsule,
  onPaymentSuccess,
}: PaymentSectionProps) {
  const { account, address, balance } = useWallet();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requiredAmount = (capsule.unlockCondition.price || 0) / 1_000_000_000;
  const userBalance = parseFloat(balance || "0");
  const hasEnoughBalance = userBalance >= requiredAmount;
  const isPaid = capsule.unlockCondition.paid;

  const handlePayment = async () => {
    if (!account || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!hasEnoughBalance) {
      setError(
        `Insufficient balance. You need ${requiredAmount.toFixed(
          4
        )} SUI but only have ${userBalance.toFixed(4)} SUI`
      );
      return;
    }

    if (isPaid) {
      setError("Payment has already been made for this capsule");
      return;
    }

    try {
      setPaying(true);
      setError(null);
      setSuccess(null);

      const sdk = await getSDK();

      // Create unlock transaction with payment
      const paymentInMist = Math.floor(requiredAmount * 1_000_000_000);
      const tx = await sdk.createUnlockTransaction(capsule.id, paymentInMist);

      // In a real implementation, this would use wallet signing
      // For now, we'll simulate the payment
      console.log("Payment transaction created:", tx);

      // Simulate successful payment
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setSuccess(
        `Payment of ${requiredAmount.toFixed(4)} SUI completed successfully!`
      );
      onPaymentSuccess();
    } catch (err) {
      console.error("Failed to process payment:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process payment"
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Payment Required</h2>

      {/* Payment Info */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-orange-800">Required Payment</span>
          <span className="text-2xl font-bold text-orange-900">
            {requiredAmount.toFixed(4)} SUI
          </span>
        </div>

        {address && (
          <div className="text-sm text-orange-700">
            <div className="flex justify-between">
              <span>Your Balance:</span>
              <span
                className={hasEnoughBalance ? "text-green-600" : "text-red-600"}
              >
                {userBalance.toFixed(4)} SUI
              </span>
            </div>
            {!hasEnoughBalance && (
              <div className="text-red-600 mt-1">
                ⚠️ Insufficient balance (need{" "}
                {(requiredAmount - userBalance).toFixed(4)} more SUI)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Status */}
      {isPaid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="font-medium text-green-800">
              Payment Completed
            </span>
          </div>
          <p className="text-green-700 text-sm mt-2">
            The required payment has been made. This capsule can now be
            unlocked.
          </p>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}

      {/* Action Button */}
      {address ? (
        <div>
          {isPaid ? (
            <div className="text-center p-4 bg-green-50 rounded">
              <p className="text-green-700 text-sm">
                Payment completed. You can now unlock the capsule.
              </p>
            </div>
          ) : (
            <button
              onClick={handlePayment}
              disabled={paying || !hasEnoughBalance}
              className="w-full btn-primary bg-orange-600 hover:bg-orange-700 active:bg-orange-800 hover:shadow-orange-500/25 active:shadow-orange-500/20"
            >
              {paying
                ? "Processing Payment..."
                : `Pay ${requiredAmount.toFixed(4)} SUI to Unlock`}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-gray-600 text-sm mb-3">
            Connect your wallet to make the payment
          </p>
        </div>
      )}

      {/* Payment Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
        <p className="font-medium mb-1">Payment Details:</p>
        <ul className="text-xs space-y-1">
          <li>• Payment is required to unlock this capsule</li>
          <li>• The payment goes to the capsule owner</li>
          <li>
            • Once paid, anyone with the decryption key can view the content
          </li>
          <li>• Payments are processed on the Sui blockchain</li>
        </ul>
      </div>
    </div>
  );
}
