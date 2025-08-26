import { IPFSClient, IPFSConfig } from "./client.js";

/**
 * Create an IPFS client configured for Pinata
 */
export function createPinataIPFSClient(
  config?: Partial<IPFSConfig>
): IPFSClient {
  // Get Pinata configuration from environment variables
  const pinataConfig: IPFSConfig = {
    url: "https://api.pinata.cloud",
    pinataGateway: "https://gateway.pinata.cloud",
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    ...config,
  };

  // In browser environment, try to get from window object or process.env
  if (typeof window !== "undefined") {
    // Browser environment - get from environment variables injected by Next.js
    pinataConfig.pinataApiKey =
      config?.pinataApiKey ||
      (process.env.NEXT_PUBLIC_PINATA_API_KEY as string);

    pinataConfig.pinataApiSecret =
      config?.pinataApiSecret ||
      (process.env.NEXT_PUBLIC_PINATA_API_SECRET as string);

    pinataConfig.pinataJWT =
      config?.pinataJWT || (process.env.NEXT_PUBLIC_PINATA_JWT as string);

    pinataConfig.pinataGateway =
      config?.pinataGateway ||
      (process.env.NEXT_PUBLIC_PINATA_GATEWAY as string) ||
      "https://gateway.pinata.cloud";
  } else {
    // Node.js environment
    pinataConfig.pinataApiKey =
      config?.pinataApiKey || process.env.PINATA_API_KEY;

    pinataConfig.pinataApiSecret =
      config?.pinataApiSecret || process.env.PINATA_API_SECRET;

    pinataConfig.pinataJWT = config?.pinataJWT || process.env.PINATA_JWT;

    pinataConfig.pinataGateway =
      config?.pinataGateway ||
      process.env.PINATA_GATEWAY ||
      "https://gateway.pinata.cloud";
  }

  return new IPFSClient(pinataConfig);
}

/**
 * Validate Pinata configuration
 */
export function validatePinataConfig(config: IPFSConfig): boolean {
  // Check if we have either JWT or API key/secret pair
  const hasJWT = Boolean(config.pinataJWT);
  const hasApiKeyPair = Boolean(config.pinataApiKey && config.pinataApiSecret);

  if (!hasJWT && !hasApiKeyPair) {
    console.error(
      "Pinata configuration error: Either JWT or API key/secret pair is required"
    );
    return false;
  }

  return true;
}
