import { IPFSClient, StorageManager } from "../ipfs/index.js";
import { WASMEncryption, WASMEncryptionError } from "./wasm-loader.js";

export interface EncryptedStorageConfig {
  ipfsUrl?: string;
  wasmPath?: string;
  ipfsClient?: IPFSClient;
}

export interface StorageEncryptionResult {
  cid: string;
  encryptionKey: Uint8Array;
  nonce: Uint8Array;
  contentHash: Uint8Array;
  originalSize: number;
}

export interface StorageDecryptionResult {
  content: Uint8Array;
  metadata: {
    originalSize: number;
    contentType: string;
    timestamp: number;
  };
}

export class EncryptedStorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "EncryptedStorageError";
  }
}

export class EncryptedStorage {
  private ipfsClient: IPFSClient;
  private storageManager: StorageManager;
  private wasmEncryption: WASMEncryption;
  private initialized = false;

  constructor(config: EncryptedStorageConfig | IPFSClient = {}) {
    // Support both config object and direct IPFSClient instance
    if (config instanceof IPFSClient) {
      this.ipfsClient = config;
    } else {
      this.ipfsClient =
        config.ipfsClient ||
        new IPFSClient({
          url: config.ipfsUrl,
        });
    }
    this.storageManager = new StorageManager(this.ipfsClient);
    this.wasmEncryption = new WASMEncryption();
  }

  /**
   * Initialize the encrypted storage system
   */
  async initialize(): Promise<void> {
    try {
      await this.wasmEncryption.loadModule();
      this.initialized = true;
    } catch (error) {
      throw new EncryptedStorageError(
        "Failed to initialize encrypted storage",
        "INIT_FAILED",
        error as Error
      );
    }
  }

  /**
   * Store content with encryption to IPFS
   */
  async storeContent(
    content: Uint8Array,
    contentType: string = "application/octet-stream"
  ): Promise<StorageEncryptionResult> {
    this.ensureInitialized();

    try {
      // Generate encryption key
      const encryptionKey = this.wasmEncryption.generateKey();

      // Encrypt content
      const encryptionResult = await this.wasmEncryption.encryptContent(
        content,
        encryptionKey
      );

      // Create metadata
      const metadata = {
        originalSize: content.length,
        contentType,
        timestamp: Date.now(),
      };

      // Store encrypted content to IPFS
      const storageResult = await this.storageManager.storeEncryptedContent(
        encryptionResult.ciphertext,
        encryptionResult.nonce,
        metadata
      );

      return {
        cid: storageResult.cid,
        encryptionKey,
        nonce: encryptionResult.nonce,
        contentHash: encryptionResult.contentHash,
        originalSize: content.length,
      };
    } catch (error) {
      if (error instanceof WASMEncryptionError) {
        throw new EncryptedStorageError(
          "Encryption failed during storage",
          "ENCRYPTION_FAILED",
          error
        );
      }
      throw new EncryptedStorageError(
        "Failed to store encrypted content",
        "STORAGE_FAILED",
        error as Error
      );
    }
  }

  /**
   * Retrieve and decrypt content from IPFS
   */
  async retrieveContent(
    cid: string,
    encryptionKey: Uint8Array,
    expectedContentHash?: Uint8Array
  ): Promise<StorageDecryptionResult> {
    this.ensureInitialized();

    try {
      // Retrieve encrypted content from IPFS
      const encryptedContent =
        await this.storageManager.retrieveEncryptedContent(cid);

      // Decrypt content
      const decryptionResult = await this.wasmEncryption.decryptContent(
        encryptedContent.ciphertext,
        encryptedContent.nonce,
        encryptionKey
      );

      // Verify content hash if provided
      if (expectedContentHash) {
        const isValid = await this.wasmEncryption.verifyContentHash(
          decryptionResult.content,
          expectedContentHash
        );

        if (!isValid) {
          throw new EncryptedStorageError(
            "Content hash verification failed",
            "HASH_VERIFICATION_FAILED"
          );
        }
      }

      return {
        content: decryptionResult.content,
        metadata: encryptedContent.metadata,
      };
    } catch (error) {
      if (error instanceof EncryptedStorageError) {
        throw error;
      }
      if (error instanceof WASMEncryptionError) {
        throw new EncryptedStorageError(
          "Decryption failed during retrieval",
          "DECRYPTION_FAILED",
          error
        );
      }
      throw new EncryptedStorageError(
        "Failed to retrieve encrypted content",
        "RETRIEVAL_FAILED",
        error as Error
      );
    }
  }

  /**
   * Verify content integrity without full retrieval
   */
  async verifyContentIntegrity(
    cid: string,
    expectedHash: Uint8Array
  ): Promise<boolean> {
    this.ensureInitialized();

    try {
      return await this.storageManager.verifyContentIntegrity(
        cid,
        expectedHash
      );
    } catch {
      return false;
    }
  }

  /**
   * Get content information without downloading
   */
  async getContentInfo(
    cid: string
  ): Promise<{ exists: boolean; size?: number }> {
    this.ensureInitialized();

    try {
      return await this.storageManager.getContentInfo(cid);
    } catch {
      return { exists: false };
    }
  }

  /**
   * Generate a new encryption key
   */
  generateEncryptionKey(): Uint8Array {
    this.ensureInitialized();
    return this.wasmEncryption.generateKey();
  }

  /**
   * Hash content using the same algorithm as encryption
   */
  async hashContent(content: Uint8Array): Promise<Uint8Array> {
    this.ensureInitialized();
    return this.wasmEncryption.hashContent(content);
  }

  /**
   * Perform end-to-end test of encryption and storage
   */
  async performIntegrityTest(): Promise<boolean> {
    this.ensureInitialized();

    try {
      const testContent = new TextEncoder().encode("Integrity test content");
      const contentType = "text/plain";

      // Store content
      const storeResult = await this.storeContent(testContent, contentType);

      // Retrieve content
      const retrieveResult = await this.retrieveContent(
        storeResult.cid,
        storeResult.encryptionKey,
        storeResult.contentHash
      );

      // Verify content matches
      if (retrieveResult.content.length !== testContent.length) {
        return false;
      }

      for (let i = 0; i < testContent.length; i++) {
        if (retrieveResult.content[i] !== testContent[i]) {
          return false;
        }
      }

      // Verify metadata
      return (
        retrieveResult.metadata.originalSize === testContent.length &&
        retrieveResult.metadata.contentType === contentType
      );
    } catch {
      return false;
    }
  }

  /**
   * Get the underlying IPFS client
   */
  getIPFSClient(): IPFSClient {
    return this.ipfsClient;
  }

  /**
   * Get the underlying storage manager
   */
  getStorageManager(): StorageManager {
    return this.storageManager;
  }

  /**
   * Check if the system is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.wasmEncryption.isLoaded();
  }

  /**
   * Ensure the system is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new EncryptedStorageError(
        "Encrypted storage not initialized. Call initialize() first.",
        "NOT_INITIALIZED"
      );
    }
  }
}
