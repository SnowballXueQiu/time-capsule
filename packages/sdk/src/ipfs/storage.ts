import {
  IPFSClient,
  IPFSUploadResult,
  IPFSDownloadResult,
  IPFSClientError,
} from "./client.js";

export interface EncryptedContent {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  metadata: {
    originalSize: number;
    contentType: string;
    timestamp: number;
  };
}

export interface StorageResult {
  cid: string;
  contentHash: Uint8Array;
  size: number;
  encryptionKey: Uint8Array;
  nonce: Uint8Array;
}

export interface RetrievalResult {
  content: Uint8Array;
  metadata: {
    originalSize: number;
    contentType: string;
    timestamp: number;
  };
}

export class StorageManager {
  private ipfsClient: IPFSClient;

  constructor(ipfsClient: IPFSClient) {
    this.ipfsClient = ipfsClient;
  }

  /**
   * Store encrypted content to IPFS
   * This method expects pre-encrypted content and metadata
   */
  async storeEncryptedContent(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    metadata: {
      originalSize: number;
      contentType: string;
      timestamp: number;
    }
  ): Promise<Omit<StorageResult, "encryptionKey">> {
    try {
      // Create the encrypted content structure
      const encryptedContent: EncryptedContent = {
        ciphertext,
        nonce,
        metadata,
      };

      // Serialize the encrypted content
      const serializedContent =
        this.serializeEncryptedContent(encryptedContent);

      // Upload to IPFS
      const uploadResult = await this.ipfsClient.uploadContent(
        serializedContent
      );

      return {
        cid: uploadResult.cid,
        contentHash: uploadResult.hash,
        size: uploadResult.size,
        nonce,
      };
    } catch (error) {
      if (error instanceof IPFSClientError) {
        throw error;
      }
      throw new IPFSClientError(
        "Failed to store encrypted content",
        "STORAGE_FAILED",
        error as Error
      );
    }
  }

  /**
   * Retrieve and verify encrypted content from IPFS
   */
  async retrieveEncryptedContent(
    cid: string,
    expectedHash?: Uint8Array
  ): Promise<EncryptedContent> {
    try {
      // Download content from IPFS
      const downloadResult = await this.ipfsClient.downloadContent(
        cid,
        expectedHash
      );

      // Deserialize the encrypted content
      const encryptedContent = this.deserializeEncryptedContent(
        downloadResult.content
      );

      return encryptedContent;
    } catch (error) {
      if (error instanceof IPFSClientError) {
        throw error;
      }
      throw new IPFSClientError(
        "Failed to retrieve encrypted content",
        "RETRIEVAL_FAILED",
        error as Error
      );
    }
  }

  /**
   * Check if content exists and get its metadata without downloading
   */
  async getContentInfo(
    cid: string
  ): Promise<{ exists: boolean; size?: number }> {
    try {
      const exists = await this.ipfsClient.contentExists(cid);
      if (!exists) {
        return { exists: false };
      }

      const stats = await this.ipfsClient.getContentStats(cid);
      return {
        exists: true,
        size: stats.size,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Verify content integrity by comparing hashes
   */
  async verifyContentIntegrity(
    cid: string,
    expectedHash: Uint8Array
  ): Promise<boolean> {
    try {
      // Download content and verify hash
      await this.ipfsClient.downloadContent(cid, expectedHash);
      return true;
    } catch (error) {
      if (error instanceof IPFSClientError && error.code === "HASH_MISMATCH") {
        return false;
      }
      // Other errors (network, etc.) should be treated as verification failure
      return false;
    }
  }

  /**
   * Serialize encrypted content to bytes for IPFS storage
   */
  private serializeEncryptedContent(content: EncryptedContent): Uint8Array {
    // Create a simple binary format:
    // [nonce_length: 4 bytes][nonce: variable][ciphertext_length: 4 bytes][ciphertext: variable][metadata: JSON]

    const metadataJson = JSON.stringify(content.metadata);
    const metadataBytes = new TextEncoder().encode(metadataJson);

    const totalLength =
      4 + // nonce length
      content.nonce.length +
      4 + // ciphertext length
      content.ciphertext.length +
      4 + // metadata length
      metadataBytes.length;

    const buffer = new ArrayBuffer(totalLength);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);

    let offset = 0;

    // Write nonce length and nonce
    view.setUint32(offset, content.nonce.length, true);
    offset += 4;
    uint8View.set(content.nonce, offset);
    offset += content.nonce.length;

    // Write ciphertext length and ciphertext
    view.setUint32(offset, content.ciphertext.length, true);
    offset += 4;
    uint8View.set(content.ciphertext, offset);
    offset += content.ciphertext.length;

    // Write metadata length and metadata
    view.setUint32(offset, metadataBytes.length, true);
    offset += 4;
    uint8View.set(metadataBytes, offset);

    return uint8View;
  }

  /**
   * Deserialize encrypted content from bytes retrieved from IPFS
   */
  private deserializeEncryptedContent(data: Uint8Array): EncryptedContent {
    try {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      let offset = 0;

      // Read nonce
      const nonceLength = view.getUint32(offset, true);
      offset += 4;
      const nonce = data.slice(offset, offset + nonceLength);
      offset += nonceLength;

      // Read ciphertext
      const ciphertextLength = view.getUint32(offset, true);
      offset += 4;
      const ciphertext = data.slice(offset, offset + ciphertextLength);
      offset += ciphertextLength;

      // Read metadata
      const metadataLength = view.getUint32(offset, true);
      offset += 4;
      const metadataBytes = data.slice(offset, offset + metadataLength);
      const metadataJson = new TextDecoder().decode(metadataBytes);
      const metadata = JSON.parse(metadataJson);

      return {
        ciphertext,
        nonce,
        metadata,
      };
    } catch (error) {
      throw new IPFSClientError(
        "Failed to deserialize encrypted content",
        "DESERIALIZATION_FAILED",
        error as Error
      );
    }
  }

  /**
   * Get the underlying IPFS client
   */
  getIPFSClient(): IPFSClient {
    return this.ipfsClient;
  }
}
