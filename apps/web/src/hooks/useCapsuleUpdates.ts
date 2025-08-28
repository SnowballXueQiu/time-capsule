"use client";

import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { getSDK } from "../lib/sdk";
import type { Capsule } from "@time-capsule/sdk";

interface CapsuleWithStatus extends Capsule {
  status: {
    canUnlock: boolean;
    timeRemaining?: number;
    approvalProgress?: {
      current: number;
      required: number;
      percentage: number;
    };
    paymentStatus?: {
      required: number;
      paid: boolean;
    };
    statusMessage: string;
  };
}

export function useCapsuleUpdates(refreshInterval: number = 30000) {
  const currentAccount = useCurrentAccount();
  const [capsules, setCapsules] = useState<CapsuleWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk, setSdk] = useState<any>(null);

  // Initialize SDK
  useEffect(() => {
    const initSdk = async () => {
      try {
        const sdkInstance = await getSDK();
        await sdkInstance.initialize();
        setSdk(sdkInstance);
      } catch (err) {
        console.error("Failed to initialize SDK:", err);
        setError("Failed to initialize SDK");
      }
    };

    initSdk();
  }, []);

  const loadCapsules = useCallback(async () => {
    if (!currentAccount?.address || !sdk) {
      setCapsules([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Get capsules with status
      const result = await sdk.getCapsulesByOwnerWithStatus(
        currentAccount.address
      );

      setCapsules(
        result.capsulesWithStatus ||
          result.capsules.map((capsule: Capsule) => ({
            ...capsule,
            status: sdk.getCapsuleStatus(capsule),
          }))
      );
    } catch (err) {
      console.error("Failed to load capsules:", err);
      setError(err instanceof Error ? err.message : "Failed to load capsules");
    } finally {
      setLoading(false);
    }
  }, [currentAccount?.address, sdk]);

  // Initial load
  useEffect(() => {
    if (sdk) {
      loadCapsules();
    }
  }, [loadCapsules, sdk]);

  // Periodic updates
  useEffect(() => {
    if (!currentAccount?.address || !sdk) return;

    const interval = setInterval(() => {
      loadCapsules();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [currentAccount?.address, refreshInterval, loadCapsules, sdk]);

  // Real-time status updates (every second for time-based capsules)
  useEffect(() => {
    if (!sdk) return;

    const interval = setInterval(() => {
      setCapsules((prevCapsules) =>
        prevCapsules.map((capsule) => ({
          ...capsule,
          status: sdk.getCapsuleStatus(capsule, Date.now()),
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [sdk]);

  const refreshCapsules = useCallback(() => {
    setLoading(true);
    loadCapsules();
  }, [loadCapsules]);

  return {
    capsules,
    loading: loading || !sdk,
    error,
    refreshCapsules,
  };
}
