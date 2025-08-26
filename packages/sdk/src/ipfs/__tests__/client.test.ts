import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { IPFSClient, IPFSClientError } from "../client.js";

// Mock fetch for Pinata API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
      url: "https://api.pinata.cloud",
      pinataJWT: "test-jwt-token",
      pinataGateway: "https://gateway.pinata.cloud",
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
    it("should upload content successfully via Pinata", async () => {
      const testContent = new Uint8Array([1, 2, 3, 4, 5]);
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            IpfsHash: "QmTest123",
            PinSize: 5,
            Timestamp: "2023-01-01T00:00:00.000Z",
          }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.uploadContent(testContent);

      expect(result).toEqual({
        cid: "QmTest123",
        size: 5,
        hash: new Uint8Array([1, 2, 3, 4]),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-jwt-token",
          }),
        })
      );
    });

    it("should retry on failure and eventually succeed", async () => {
      const testContent = new Uint8Array([1, 2, 3]);
      const mockErrorResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Server error"),
      };
      const mockSuccessResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            IpfsHash: "QmTest456",
            PinSize: 3,
          }),
      };

      mockFetch
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await client.uploadContent(testContent);

      expect(result.cid).toBe("QmTest456");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should throw IPFSClientError after max retries", async () => {
      const testContent = new Uint8Array([1, 2, 3]);
      const mockErrorResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Persistent error"),
      };

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(client.uploadContent(testContent)).rejects.toThrow(
        IPFSClientError
      );
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe("downloadContent", () => {
    it("should download content successfully via Pinata Gateway", async () => {
      const testCid = "QmTest123";
      const testContent = new Uint8Array([1, 2, 3, 4, 5]);
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(testContent.buffer),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.downloadContent(testCid);

      expect(result).toEqual({
        content: testContent,
        size: 5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://gateway.pinata.cloud/ipfs/QmTest123",
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should verify content hash when provided", async () => {
      const testCid = "QmTest123";
      const testContent = new Uint8Array([1, 2, 3]);
      const expectedHash = new Uint8Array([1, 2, 3, 4]); // Matches mock hash
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(testContent.buffer),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.downloadContent(testCid, expectedHash);

      expect(result.content).toEqual(testContent);
    });

    it("should throw error on hash mismatch", async () => {
      const testCid = "QmTest123";
      const testContent = new Uint8Array([1, 2, 3]);
      const wrongHash = new Uint8Array([5, 6, 7, 8]); // Different from mock hash
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(testContent.buffer),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(client.downloadContent(testCid, wrongHash)).rejects.toThrow(
        IPFSClientError
      );
    });
  });

  describe("contentExists", () => {
    it("should return true when content exists", async () => {
      const testCid = "QmTest123";
      const mockResponse = {
        ok: true,
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const exists = await client.contentExists(testCid);

      expect(exists).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://gateway.pinata.cloud/ipfs/QmTest123",
        expect.objectContaining({
          method: "HEAD",
        })
      );
    });

    it("should return false when content does not exist", async () => {
      const testCid = "QmTest123";
      const mockResponse = {
        ok: false,
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const exists = await client.contentExists(testCid);

      expect(exists).toBe(false);
    });
  });

  describe("getContentStats", () => {
    it("should return content statistics", async () => {
      const testCid = "QmTest123";
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === "content-length") return "1024";
            if (header === "content-type") return "application/octet-stream";
            return null;
          }),
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const stats = await client.getContentStats(testCid);

      expect(stats).toEqual({
        size: 1024,
        type: "application/octet-stream",
      });
    });

    it("should throw error when stats cannot be retrieved", async () => {
      const testCid = "QmTest123";
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(client.getContentStats(testCid)).rejects.toThrow(
        IPFSClientError
      );
    });
  });

  describe("configuration", () => {
    it("should use default Pinata configuration", () => {
      const defaultClient = new IPFSClient();
      expect(defaultClient).toBeDefined();
    });

    it("should update configuration", () => {
      client.updateConfig({ timeout: 10000 });
      // Configuration update should not throw
      expect(() => client.updateConfig({ retries: 5 })).not.toThrow();
    });

    it("should support API key authentication", () => {
      const apiKeyClient = new IPFSClient({
        pinataApiKey: "test-key",
        pinataApiSecret: "test-secret",
      });
      expect(apiKeyClient).toBeDefined();
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
