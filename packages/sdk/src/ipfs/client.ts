import { CID } from "multiformats/cid";
import * as multihash from "multiformats/hashes/sha2";

export interface IPFSConfig {
  url?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  // Pinata specific configuration
  pinataApiKey?: string;
  pinataApiSecret?: string;
  pinataJWT?: string;
  pinataGateway?: string;
}

export interface IPFSUploadResult {
  cid: string;
  size: number;
  hash: Uint8Array;
}

export interface IPFSDownloadResult {
  content: Uint8Array;
  size: number;
}

export class IPFSClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "IPFSClientError";
  }
}

export class IPFSClient {
  private config: Required<IPFSConfig>;

  constructor(config: IPFSConfig = {}) {
    this.config = {
      url: config.url || "https://api.pinata.cloud",
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      pinataApiKey: config.pinataApiKey || "",
      pinataApiSecret: config.pinataApiSecret || "",
      pinataJWT: config.pinataJWT || "",
      pinataGateway: config.pinataGateway || "https://gateway.pinata.cloud",
    };
  }

  /**
   * Upload content to IPFS via Pinata with retry mechanism
   */
  async uploadContent(content: Uint8Array): Promise<IPFSUploadResult> {
    return this.withRetry(async () => {
      try {
        // Create form data for Pinata API
        const formData = new FormData();

        // Ensure proper binary data handling
        // Create a proper Blob with correct MIME type for encrypted content
        const arrayBuffer = content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength
        ) as ArrayBuffer;
        const blob = new Blob([arrayBuffer], {
          type: "application/octet-stream",
        });

        // Use a descriptive filename for the encrypted content
        const filename = `encrypted-content-${Date.now()}.bin`;
        formData.append("file", blob, filename);

        // Add metadata for Pinata
        const metadata = JSON.stringify({
          name: `time-capsule-${Date.now()}`,
          keyvalues: {
            type: "time-capsule-content",
            timestamp: Date.now().toString(),
          },
        });
        formData.append("pinataMetadata", metadata);

        // Set up headers for Pinata authentication
        const headers: Record<string, string> = {};

        if (this.config.pinataJWT) {
          headers["Authorization"] = `Bearer ${this.config.pinataJWT}`;
        } else if (this.config.pinataApiKey && this.config.pinataApiSecret) {
          headers["pinata_api_key"] = this.config.pinataApiKey;
          headers["pinata_secret_api_key"] = this.config.pinataApiSecret;
        } else {
          throw new Error("Pinata authentication credentials not provided");
        }

        // Upload to Pinata
        const response = await fetch(
          `${this.config.url}/pinning/pinFileToIPFS`,
          {
            method: "POST",
            headers,
            body: formData,
            signal: AbortSignal.timeout(this.config.timeout),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} - ${errorText}`
          );
        }

        const result = await response.json();

        // Calculate content hash for verification
        const hash = await this.calculateContentHash(content);

        return {
          cid: result.IpfsHash,
          size: parseInt(result.PinSize) || content.length,
          hash,
        };
      } catch (error) {
        throw new IPFSClientError(
          "Failed to upload content to IPFS via Pinata",
          "UPLOAD_FAILED",
          error as Error
        );
      }
    });
  }

  /**
   * Download content from IPFS via Pinata Gateway with hash verification
   */
  async downloadContent(
    cid: string,
    expectedHash?: Uint8Array
  ): Promise<IPFSDownloadResult> {
    return this.withRetry(async () => {
      try {
        // Validate CID format
        CID.parse(cid);

        // Download content from Pinata Gateway
        const response = await fetch(
          `${this.config.pinataGateway}/ipfs/${cid}`,
          {
            method: "GET",
            signal: AbortSignal.timeout(this.config.timeout),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const content = new Uint8Array(arrayBuffer);

        // Verify content hash if provided
        if (expectedHash) {
          const actualHash = await this.calculateContentHash(content);
          if (!this.compareHashes(expectedHash, actualHash)) {
            throw new IPFSClientError(
              "Content hash verification failed",
              "HASH_MISMATCH"
            );
          }
        }

        return {
          content,
          size: content.length,
        };
      } catch (error) {
        if (error instanceof IPFSClientError) {
          throw error;
        }
        throw new IPFSClientError(
          "Failed to download content from IPFS via Pinata",
          "DOWNLOAD_FAILED",
          error as Error
        );
      }
    });
  }

  /**
   * Check if content exists on IPFS via Pinata
   */
  async contentExists(cid: string): Promise<boolean> {
    try {
      CID.parse(cid);

      // Try to access the content via Pinata Gateway with HEAD request
      const response = await fetch(`${this.config.pinataGateway}/ipfs/${cid}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(this.config.timeout),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get content statistics without downloading full content
   */
  async getContentStats(cid: string): Promise<{ size: number; type: string }> {
    try {
      CID.parse(cid);

      // Use HEAD request to get content info
      const response = await fetch(`${this.config.pinataGateway}/ipfs/${cid}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get("content-length");
      const contentType = response.headers.get("content-type");

      return {
        size: contentLength ? parseInt(contentLength) : 0,
        type: contentType || "application/octet-stream", // Default type for encrypted content
      };
    } catch (error) {
      throw new IPFSClientError(
        "Failed to get content statistics",
        "STAT_FAILED",
        error as Error
      );
    }
  }

  /**
   * Calculate SHA-256 hash of content for verification
   */
  private async calculateContentHash(content: Uint8Array): Promise<Uint8Array> {
    const hash = await multihash.sha256.digest(content);
    return hash.digest;
  }

  /**
   * Compare two hash arrays for equality
   */
  private compareHashes(hash1: Uint8Array, hash2: Uint8Array): boolean {
    if (hash1.length !== hash2.length) {
      return false;
    }
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Retry mechanism for IPFS operations
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.config.retries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<IPFSConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
