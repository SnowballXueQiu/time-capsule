import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  EncryptedStorage,
  EncryptedStorageError,
} from "../encrypted-storage.js";

// Mock the WASM encryption module
vi.mock("../wasm-loader.js", () => ({
  WASMEncryption: vi.fn().mockImplementation(() => ({
    loadModule: vi.fn().mockResolvedValue(undefined),
    generateKey: vi.fn(() => new Uint8Array(32).fill(1)),
    generateNonce: vi.fn(() => new Uint8Array(24).fill(2)),
    encryptContent: vi.fn().mockResolvedValue({
      ciphertext: new Uint8Array([3, 4, 5, 6]),
      nonce: new Uint8Array(24).fill(2),
      contentHash: new Uint8Array(32).fill(7),
    }),
    decryptContent: vi.fn().mockResolvedValue({
      content: new Uint8Array([1, 2, 3, 4]),
    }),
    hashContent: vi.fn().mockResolvedValue(new Uint8Array(32).fill(7)),
    verifyContentHash: vi.fn().mockResolvedValue(true),
    isLoaded: vi.fn(() => true),
  })),
  WASMEncryptionError: class extends Error {
    constructor(message: string, public code: number) {
      super(message);
    }
  },
}));

// Mock the storage manager
vi.mock("../../ipfs/storage.js", () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    storeEncryptedContent: vi.fn().mockResolvedValue({
      cid: "QmTest123",
      contentHash: new Uint8Array(32).fill(8),
      size: 100,
      nonce: new Uint8Array(24).fill(2),
    }),
    retrieveEncryptedContent: vi.fn().mockResolvedValue({
      ciphertext: new Uint8Array([3, 4, 5, 6]),
      nonce: new Uint8Array(24).fill(2),
      metadata: {
        originalSize: 4,
        contentType: "text/plain",
        timestamp: 1234567890,
      },
    }),
    verifyContentIntegrity: vi.fn().mockResolvedValue(true),
    getContentInfo: vi.fn().mockResolvedValue({
      exists: true,
      size: 100,
    }),
  })),
}));

describe("EncryptedStorage", () => {
  let encryptedStorage: EncryptedStorage;

  beforeEach(async () => {
    vi.clearAllMocks();
    encryptedStorage = new EncryptedStorage({
      ipfsUrl: "http://localhost:5001",
    });
    await encryptedStorage.initialize();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      const storage = new EncryptedStorage();
      await storage.initialize();
      expect(storage.isInitialized()).toBe(true);
    });

    it("should throw error when not initialized", () => {
      const storage = new EncryptedStorage();
      expect(() => storage.generateEncryptionKey()).toThrow(
        EncryptedStorageError
      );
    });
  });

  describe("storeContent", () => {
    it("should store content successfully", async () => {
      const testContent = new Uint8Array([1, 2, 3, 4]);
      const contentType = "text/plain";

      const result = await encryptedStorage.storeContent(
        testContent,
        contentType
      );

      expect(result.cid).toBe("QmTest123");
      expect(result.encryptionKey).toEqual(new Uint8Array(32).fill(1));
      expect(result.nonce).toEqual(new Uint8Array(24).fill(2));
      expect(result.contentHash).toEqual(new Uint8Array(32).fill(7));
      expect(result.originalSize).toBe(4);
    });
  });

  describe("retrieveContent", () => {
    it("should retrieve and decrypt content successfully", async () => {
      const testCid = "QmTest123";
      const encryptionKey = new Uint8Array(32).fill(1);

      const result = await encryptedStorage.retrieveContent(
        testCid,
        encryptionKey
      );

      expect(result.content).toEqual(new Uint8Array([1, 2, 3, 4]));
      expect(result.metadata.originalSize).toBe(4);
      expect(result.metadata.contentType).toBe("text/plain");
    });
  });

  describe("utility methods", () => {
    it("should generate encryption key", () => {
      const key = encryptedStorage.generateEncryptionKey();
      expect(key).toEqual(new Uint8Array(32).fill(1));
    });

    it("should hash content", async () => {
      const content = new Uint8Array([1, 2, 3, 4]);
      const hash = await encryptedStorage.hashContent(content);
      expect(hash).toEqual(new Uint8Array(32).fill(7));
    });

    it("should provide access to underlying clients", () => {
      expect(encryptedStorage.getIPFSClient()).toBeDefined();
      expect(encryptedStorage.getStorageManager()).toBeDefined();
    });
  });
});
