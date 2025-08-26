"use client";

// Client-only SDK wrapper to avoid SSR issues
let sdkInstance: any = null;

export async function getSDK() {
  if (!sdkInstance) {
    // Dynamic import to avoid SSR issues
    const { CapsuleSDK } = await import("@time-capsule/sdk");
    sdkInstance = new CapsuleSDK({
      network: "devnet",
      // Add other config as needed
    });
  }
  return sdkInstance;
}

export async function initializeSDK() {
  const sdk = await getSDK();
  await sdk.initialize();
  return sdk;
}
