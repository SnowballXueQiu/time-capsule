"use client";

import {
  useCurrentAccount,
  useConnectWallet,
  useDisconnectWallet,
  useSuiClient,
  useWallets,
} from "@mysten/dapp-kit";
import { useState, useEffect } from "react";

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  balance: string | null;
  error: string | null;
}

export function useWallet() {
  const currentAccount = useCurrentAccount();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const suiClient = useSuiClient();
  const wallets = useWallets();

  const [state, setState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    balance: null,
    error: null,
  });

  // Update wallet state when account changes
  useEffect(() => {
    if (currentAccount) {
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        address: currentAccount.address,
        error: null,
      }));

      // Fetch balance
      fetchBalance(currentAccount.address);
    } else {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        address: null,
        balance: null,
        error: null,
      }));
    }
  }, [currentAccount]);

  const fetchBalance = async (address: string) => {
    try {
      const balance = await suiClient.getBalance({ owner: address });
      const suiBalance = (
        parseInt(balance.totalBalance) / 1_000_000_000
      ).toFixed(4);
      setState((prev) => ({ ...prev, balance: suiBalance }));
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setState((prev) => ({ ...prev, balance: null }));
    }
  };

  const connectWallet = (walletName?: string) => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    // Find the first available wallet or the specified one
    const targetWallet = walletName
      ? wallets.find((w) => w.name === walletName)
      : wallets.find((w) => w.name === "Sui Wallet") || wallets[0];

    if (!targetWallet) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: "No wallet available. Please install a Sui wallet.",
      }));
      return;
    }

    connect(
      { wallet: targetWallet },
      {
        onSuccess: () => {
          setState((prev) => ({ ...prev, isConnecting: false }));
        },
        onError: (error) => {
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            error: error.message || "Failed to connect wallet",
          }));
        },
      }
    );
  };

  const disconnectWallet = () => {
    disconnect();
  };

  const refreshBalance = () => {
    if (currentAccount) {
      fetchBalance(currentAccount.address);
    }
  };

  const getAvailableWallets = () => {
    return wallets.map((wallet) => ({
      name: wallet.name,
      icon: wallet.icon,
    }));
  };

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    getAvailableWallets,
    account: currentAccount,
  };
}
