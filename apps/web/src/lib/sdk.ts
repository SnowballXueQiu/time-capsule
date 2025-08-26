import { CapsuleSDK } from "@time-capsule/sdk";

let sdkInstance: CapsuleSDK | null = null;

/**
 * Get or create a singleton SDK instance configured for Pinata
 */
export async function getSDK(): Promise<CapsuleSDK> {
  if (!sdkInstance) {
    sdkInstance = new CapsuleSDK({
      network: "devnet", // or "testnet", "mainnet"
      usePinata: true,
      // Pinata credentials will be automatically loaded from environment variables
      // NEXT_PUBLIC_PINATA_API_KEY, NEXT_PUBLIC_PINATA_API_SECRET, NEXT_PUBLIC_PINATA_JWT
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
    network: "devnet",
    usePinata: true,
    ...config,
  });
}

/**
 * Reset the SDK instance (useful for testing or re-initialization)
 */
export function resetSDK(): void {
  sdkInstance = null;
}
