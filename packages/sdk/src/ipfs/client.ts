import { CID } from "multiformats/cid";
import * as multihash from "multiformats/hashes/sha2";

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
  private config: Required<IPFSConfig>;

  constructor(config: IPFSConfig = {}) {
    this.config = {
      url: config.url || "https://ipfs.infura.io:5001",
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  /**
   * Upload content to IPFS with retry mechanism
   */
  async uploadContent(content: Uint8Array): Promise<IPFSUploadResult> {
    return this.withRetry(async () => {
      try {
        // Create form data for IPFS API
        const formData = new FormData();
        // Create a proper ArrayBuffer from Uint8Array
        const buffer = new ArrayBuffer(content.length);
        const view = new Uint8Array(buffer);
        view.set(content);
        const blob = new Blob([buffer], {
          type: "application/octet-stream",
        });
        formData.append("file", blob);

        // Upload to IPFS using HTTP API
        const response = await fetch(
          `${this.config.url}/api/v0/add?pin=true&cid-version=1`,
          {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(this.config.timeout),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Calculate content hash for verification
        const hash = await this.calculateContentHash(content);

        return {
          cid: result.Hash,
          size: parseInt(result.Size) || content.length,
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
        CID.parse(cid);

        // Download content from IPFS using HTTP API
        const response = await fetch(
          `${this.config.url}/api/v0/cat?arg=${cid}`,
          {
            method: "POST",
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
      CID.parse(cid);
      const response = await fetch(
        `${this.config.url}/api/v0/object/stat?arg=${cid}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(this.config.timeout),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get content statistics without downloading
   */
  async getContentStats(cid: string): Promise<{ size: number; type: string }> {
    try {
      CID.parse(cid);
      const response = await fetch(
        `${this.config.url}/api/v0/object/stat?arg=${cid}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(this.config.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const stat = await response.json();
      return {
        size: stat.CumulativeSize || 0,
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
   * Update client configuration
   */
  updateConfig(config: Partial<IPFSConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
