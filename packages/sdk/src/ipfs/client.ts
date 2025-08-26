import { create, IPFSHTTPClient } from "ipfs-http-client";
import { CID } from "multiformats/cid";
import * as multihash from "multiformats/hashes/sha2";
import { base58btc } from "multiformats/bases/base58";

export interface IPFSConfig {
  url?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
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
  private client: IPFSHTTPClient;
  private config: Required<IPFSConfig>;

  constructor(config: IPFSConfig = {}) {
    this.config = {
      url: config.url || "https://ipfs.infura.io:5001",
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.client = create({
      url: this.config.url,
      timeout: this.config.timeout,
    });
  }

  /**
   * Upload content to IPFS with retry mechanism
   */
  async uploadContent(content: Uint8Array): Promise<IPFSUploadResult> {
    return this.withRetry(async () => {
      try {
        // Add content to IPFS
        const result = await this.client.add(content, {
          pin: true,
          cidVersion: 1,
        });

        // Calculate content hash for verification
        const hash = await this.calculateContentHash(content);

        return {
          cid: result.cid.toString(),
          size: result.size,
          hash,
        };
      } catch (error) {
        throw new IPFSClientError(
          "Failed to upload content to IPFS",
          "UPLOAD_FAILED",
          error as Error
        );
      }
    });
  }

  /**
   * Download content from IPFS with hash verification
   */
  async downloadContent(
    cid: string,
    expectedHash?: Uint8Array
  ): Promise<IPFSDownloadResult> {
    return this.withRetry(async () => {
      try {
        // Validate CID format
        const parsedCid = CID.parse(cid);

        // Download content from IPFS
        const chunks: Uint8Array[] = [];
        let totalSize = 0;

        for await (const chunk of this.client.cat(parsedCid)) {
          chunks.push(chunk);
          totalSize += chunk.length;
        }

        const content = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
          content.set(chunk, offset);
          offset += chunk.length;
        }

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
          size: totalSize,
        };
      } catch (error) {
        if (error instanceof IPFSClientError) {
          throw error;
        }
        throw new IPFSClientError(
          "Failed to download content from IPFS",
          "DOWNLOAD_FAILED",
          error as Error
        );
      }
    });
  }

  /**
   * Check if content exists on IPFS
   */
  async contentExists(cid: string): Promise<boolean> {
    try {
      const parsedCid = CID.parse(cid);
      const stat = await this.client.object.stat(parsedCid);
      return stat.NumLinks >= 0; // If we can get stats, content exists
    } catch {
      return false;
    }
  }

  /**
   * Get content statistics without downloading
   */
  async getContentStats(cid: string): Promise<{ size: number; type: string }> {
    try {
      const parsedCid = CID.parse(cid);
      const stat = await this.client.object.stat(parsedCid);
      return {
        size: stat.CumulativeSize,
        type: "application/octet-stream", // Default type for encrypted content
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
   * Get the underlying IPFS client for advanced operations
   */
  getClient(): IPFSHTTPClient {
    return this.client;
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<IPFSConfig>): void {
    this.config = { ...this.config, ...config };

    // Recreate client if URL changed
    if (config.url) {
      this.client = create({
        url: this.config.url,
        timeout: this.config.timeout,
      });
    }
  }
}
