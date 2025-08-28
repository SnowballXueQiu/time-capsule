import { CapsuleSDK } from "@time-capsule/sdk";

let sdkInstance: CapsuleSDK | null = null;

/**
 * Get or create a singleton SDK instance configured for Pinata
 */
export async function getSDK(): Promise<CapsuleSDK> {
  // Force recreation to ensure fresh configuration after network change
  sdkInstance = null;
  if (!sdkInstance) {
    sdkInstance = new CapsuleSDK({
      network:
        (process.env.NEXT_PUBLIC_SUI_NETWORK as
          | "devnet"
          | "testnet"
          | "mainnet") || "testnet",
      packageId: process.env.NEXT_PUBLIC_PACKAGE_ID,
    });

    // Initialize the SDK
    await sdkInstance.initialize();
  }

  return sdkInstance;
}

/**
 * Create a new SDK instance (useful for testing or multiple configurations)
 */
export function createSDK(config?: any): CapsuleSDK {
  return new CapsuleSDK({
    network:
      (process.env.NEXT_PUBLIC_SUI_NETWORK as
        | "devnet"
        | "testnet"
        | "mainnet") || "testnet",
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID,
    ...config,
  });
}

/**
 * Reset the SDK instance (useful for testing or re-initialization)
 */
export function resetSDK(): void {
  sdkInstance = null;
}
