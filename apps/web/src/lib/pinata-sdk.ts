import { CapsuleSDK } from "@time-capsule/sdk";

/**
 * Create a CapsuleSDK instance configured for Pinata
 */
export function createPinataCapsuleSDK() {
  return new CapsuleSDK({
    network: "devnet", // or "testnet", "mainnet"
    // Pinata credentials will be automatically loaded from environment variables
    // NEXT_PUBLIC_PINATA_JWT is used in the SDK's uploadToIPFS method
  });
}

/**
 * Example usage of the Pinata-enabled SDK
 */
export async function exampleUsage() {
  const sdk = createPinataCapsuleSDK();

  // Initialize the SDK
  await sdk.initialize();

  // Now you can use all SDK methods as before
  // The IPFS operations will use Pinata instead of Infura

  return sdk;
}
