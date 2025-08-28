import { CapsuleSDK } from "@time-capsule/sdk";

let sdkInstance: CapsuleSDK | null = null;

/**
 * Get or create a simple SDK instance without WASM
 */
export async function getSDK(): Promise<CapsuleSDK> {
  if (!sdkInstance) {
    sdkInstance = new CapsuleSDK({
      network:
        (process.env.NEXT_PUBLIC_SUI_NETWORK as
          | "devnet"
          | "testnet"
          | "mainnet") || "testnet",
      packageId: process.env.NEXT_PUBLIC_PACKAGE_ID,
    });

    // Don't initialize WASM for now
    console.log("SDK created without WASM initialization");
  }

  return sdkInstance;
}

/**
 * Reset the SDK instance
 */
export function resetSDK(): void {
  sdkInstance = null;
}
