import { describe, it, expect, beforeEach, vi } from "vitest";
import { StorageManager } from "../storage.js";
import { IPFSClient } from "../client.js";

// Mock IPFSClient
const mockIPFSClient = {
  uploadContent: vi.fn(),
  downloadContent: vi.fn(),
  contentExists: vi.fn(),
  getContentStats: vi.fn(),
} as unknown as IPFSClient;

describe("StorageManager", () => {
  let storageManager: StorageManager;

  beforeEach(() => {
    storageManager = new StorageManager(mockIPFSClient);
    vi.clearAllMocks();
  });

  describe("storeEncryptedContent", () => {
    it("should store encrypted content successfully", async () => {
      const ciphertext = new Uint8Array([1, 2, 3, 4]);
      const nonce = new Uint8Array([5, 6, 7, 8]);
      const metadata = {
        originalSize: 100,
        contentType: "text/plain",
        timestamp: Date.now(),
      };

      const mockUploadResult = {
        cid: "QmTest123",
        hash: new Uint8Array([9, 10, 11, 12]),
        size: 50,
      };

      (mockIPFSClient.uploadContent as any).mockResolvedValueOnce(
        mockUploadResult
      );

      const result = await storageManager.storeEncryptedContent(
        ciphertext,
        nonce,
        metadata
      );

      expect(result).toEqual({
        cid: "QmTest123",
        contentHash: new Uint8Array([9, 10, 11, 12]),
        size: 50,
        nonce,
      });
    });
  });

  describe("retrieveEncryptedContent", () => {
    it("should retrieve and deserialize encrypted content", async () => {
      const testCid = "QmTest123";
      const originalCiphertext = new Uint8Array([1, 2, 3, 4]);
      const originalNonce = new Uint8Array([5, 6, 7, 8]);
      const originalMetadata = {
        originalSize: 100,
        contentType: "text/plain",
        timestamp: 1234567890,
      };

      // Create serialized content manually for testing
      const metadataJson = JSON.stringify(originalMetadata);
      const metadataBytes = new TextEncoder().encode(metadataJson);

      const totalLength =
        4 +
        originalNonce.length +
        4 +
        originalCiphertext.length +
        4 +
        metadataBytes.length;
      const buffer = new ArrayBuffer(totalLength);
      const view = new DataView(buffer);
      const uint8View = new Uint8Array(buffer);

      let offset = 0;
      view.setUint32(offset, originalNonce.length, true);
      offset += 4;
      uint8View.set(originalNonce, offset);
      offset += originalNonce.length;

      view.setUint32(offset, originalCiphertext.length, true);
      offset += 4;
      uint8View.set(originalCiphertext, offset);
      offset += originalCiphertext.length;

      view.setUint32(offset, metadataBytes.length, true);
      offset += 4;
      uint8View.set(metadataBytes, offset);

      const mockDownloadResult = {
        content: uint8View,
        size: totalLength,
      };

      (mockIPFSClient.downloadContent as any).mockResolvedValueOnce(
        mockDownloadResult
      );

      const result = await storageManager.retrieveEncryptedContent(testCid);

      expect(result.ciphertext).toEqual(originalCiphertext);
      expect(result.nonce).toEqual(originalNonce);
      expect(result.metadata).toEqual(originalMetadata);
    });
  });

  describe("getContentInfo", () => {
    it("should return content info when content exists", async () => {
      const testCid = "QmTest123";

      (mockIPFSClient.contentExists as any).mockResolvedValueOnce(true);
      (mockIPFSClient.getContentStats as any).mockResolvedValueOnce({
        size: 1024,
      });

      const result = await storageManager.getContentInfo(testCid);

      expect(result).toEqual({
        exists: true,
        size: 1024,
      });
    });

    it("should return false when content does not exist", async () => {
      const testCid = "QmTest123";

      (mockIPFSClient.contentExists as any).mockResolvedValueOnce(false);

      const result = await storageManager.getContentInfo(testCid);

      expect(result).toEqual({
        exists: false,
      });
    });
  });

  describe("verifyContentIntegrity", () => {
    it("should return true when content integrity is valid", async () => {
      const testCid = "QmTest123";
      const expectedHash = new Uint8Array([1, 2, 3, 4]);

      (mockIPFSClient.downloadContent as any).mockResolvedValueOnce({
        content: new Uint8Array([5, 6, 7, 8]),
        size: 4,
      });

      const result = await storageManager.verifyContentIntegrity(
        testCid,
        expectedHash
      );

      expect(result).toBe(true);
    });
  });
});
