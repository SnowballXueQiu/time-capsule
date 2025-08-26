import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { IPFSClient, IPFSClientError } from "../client.js";

// Mock IPFS HTTP client
const mockIPFSClient = {
  add: vi.fn(),
  cat: vi.fn(),
  object: {
    stat: vi.fn(),
  },
};

vi.mock("ipfs-http-client", () => ({
  create: vi.fn(() => mockIPFSClient),
}));

vi.mock("multiformats/cid", () => ({
  CID: {
    parse: vi.fn((cid: string) => ({ toString: () => cid })),
  },
}));

vi.mock("multiformats/hashes/sha2", () => ({
  sha256: {
    digest: vi.fn((content: Uint8Array) => ({
      digest: new Uint8Array([1, 2, 3, 4]), // Mock hash
    })),
  },
}));

describe("IPFSClient", () => {
  let client: IPFSClient;

  beforeEach(() => {
    client = new IPFSClient({
      url: "http://localhost:5001",
      timeout: 5000,
      retries: 2,
      retryDelay: 100,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("uploadContent", () => {
    it("should upload content successfully", async () => {
      const testContent = new Uint8Array([1, 2, 3, 4, 5]);
      const mockResult = {
        cid: { toString: () => "QmTest123" },
        size: 5,
      };

      mockIPFSClient.add.mockResolvedValueOnce(mockResult);

      const result = await client.uploadContent(testContent);

      expect(result).toEqual({
        cid: "QmTest123",
        size: 5,
        hash: new Uint8Array([1, 2, 3, 4]),
      });

      expect(mockIPFSClient.add).toHaveBeenCalledWith(testContent, {
        pin: true,
        cidVersion: 1,
      });
    });

    it("should retry on failure and eventually succeed", async () => {
      const testContent = new Uint8Array([1, 2, 3]);
      const mockResult = {
        cid: { toString: () => "QmTest456" },
        size: 3,
      };

      mockIPFSClient.add
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(mockResult);

      const result = await client.uploadContent(testContent);

      expect(result.cid).toBe("QmTest456");
      expect(mockIPFSClient.add).toHaveBeenCalledTimes(2);
    });

    it("should throw IPFSClientError after max retries", async () => {
      const testContent = new Uint8Array([1, 2, 3]);

      mockIPFSClient.add.mockRejectedValue(new Error("Persistent error"));

      await expect(client.uploadContent(testContent)).rejects.toThrow(
        IPFSClientError
      );
      expect(mockIPFSClient.add).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe("downloadContent", () => {
    it("should download content successfully", async () => {
      const testCid = "QmTest123";
      const testContent = new Uint8Array([1, 2, 3, 4, 5]);

      // Mock async iterator for IPFS cat
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield testContent;
        },
      };

      mockIPFSClient.cat.mockReturnValueOnce(mockAsyncIterator);

      const result = await client.downloadContent(testCid);

      expect(result).toEqual({
        content: testContent,
        size: 5,
      });
    });

    it("should verify content hash when provided", async () => {
      const testCid = "QmTest123";
      const testContent = new Uint8Array([1, 2, 3]);
      const expectedHash = new Uint8Array([1, 2, 3, 4]); // Matches mock hash

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield testContent;
        },
      };

      mockIPFSClient.cat.mockReturnValueOnce(mockAsyncIterator);

      const result = await client.downloadContent(testCid, expectedHash);

      expect(result.content).toEqual(testContent);
    });

    it("should throw error on hash mismatch", async () => {
      const testCid = "QmTest123";
      const testContent = new Uint8Array([1, 2, 3]);
      const wrongHash = new Uint8Array([5, 6, 7, 8]); // Different from mock hash

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield testContent;
        },
      };

      mockIPFSClient.cat.mockReturnValueOnce(mockAsyncIterator);

      await expect(client.downloadContent(testCid, wrongHash)).rejects.toThrow(
        IPFSClientError
      );
    });

    it("should handle multiple chunks", async () => {
      const testCid = "QmTest123";
      const chunk1 = new Uint8Array([1, 2]);
      const chunk2 = new Uint8Array([3, 4, 5]);

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield chunk1;
          yield chunk2;
        },
      };

      mockIPFSClient.cat.mockReturnValueOnce(mockAsyncIterator);

      const result = await client.downloadContent(testCid);

      expect(result.content).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
      expect(result.size).toBe(5);
    });
  });

  describe("contentExists", () => {
    it("should return true when content exists", async () => {
      const testCid = "QmTest123";
      mockIPFSClient.object.stat.mockResolvedValueOnce({ NumLinks: 0 });

      const exists = await client.contentExists(testCid);

      expect(exists).toBe(true);
    });

    it("should return false when content does not exist", async () => {
      const testCid = "QmTest123";
      mockIPFSClient.object.stat.mockRejectedValueOnce(new Error("Not found"));

      const exists = await client.contentExists(testCid);

      expect(exists).toBe(false);
    });
  });

  describe("getContentStats", () => {
    it("should return content statistics", async () => {
      const testCid = "QmTest123";
      mockIPFSClient.object.stat.mockResolvedValueOnce({
        CumulativeSize: 1024,
      });

      const stats = await client.getContentStats(testCid);

      expect(stats).toEqual({
        size: 1024,
        type: "application/octet-stream",
      });
    });

    it("should throw error when stats cannot be retrieved", async () => {
      const testCid = "QmTest123";
      mockIPFSClient.object.stat.mockRejectedValueOnce(
        new Error("Network error")
      );

      await expect(client.getContentStats(testCid)).rejects.toThrow(
        IPFSClientError
      );
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      const defaultClient = new IPFSClient();
      expect(defaultClient.getClient()).toBeDefined();
    });

    it("should update configuration", () => {
      client.updateConfig({ timeout: 10000 });
      // Configuration update should not throw
      expect(() => client.updateConfig({ retries: 5 })).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should create IPFSClientError with proper properties", () => {
      const originalError = new Error("Original error");
      const ipfsError = new IPFSClientError(
        "Test error",
        "TEST_CODE",
        originalError
      );

      expect(ipfsError.message).toBe("Test error");
      expect(ipfsError.code).toBe("TEST_CODE");
      expect(ipfsError.cause).toBe(originalError);
      expect(ipfsError.name).toBe("IPFSClientError");
    });
  });
});
