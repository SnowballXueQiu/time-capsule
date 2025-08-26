import { CapsuleSDK } from "@time-capsule/sdk";

/**
 * Create a CapsuleSDK instance configured for Pinata
 */
export function createPinataCapsuleSDK() {
  return new CapsuleSDK({
    network: "devnet", // or "testnet", "mainnet"
    usePinata: true,
    // Pinata credentials will be automatically loaded from environment variables
    // NEXT_PUBLIC_PINATA_API_KEY, NEXT_PUBLIC_PINATA_API_SECRET, NEXT_PUBLIC_PINATA_JWT
    // You can also pass them explicitly:
    // pinataApiKey: process.env.NEXT_PUBLIC_PINATA_API_KEY,
    // pinataApiSecret: process.env.NEXT_PUBLIC_PINATA_API_SECRET,
    // pinataJWT: process.env.NEXT_PUBLIC_PINATA_JWT,
    // pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
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
