import { describe, it, expect, beforeEach, vi } from "vitest";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { CapsuleSDK } from "../index.js";
import { CapsuleError, CapsuleSDKError } from "@time-capsule/types";
import type { Capsule } from "@time-capsule/types";

// Mock the dependencies
vi.mock("@mysten/sui.js/client");
vi.mock("../encryption/index.js");
vi.mock("../ipfs/index.js");

describe("CapsuleSDK Query Functionality", () => {
  let sdk: CapsuleSDK;
  let keypair: Ed25519Keypair;

  const mockCapsuleData = {
    objectId: "0xTestCapsuleId",
    content: {
      dataType: "moveObject" as const,
      fields: {
        id: { id: "0xTestCapsuleId" },
        owner: "0xTestOwner",
        cid: "QmTestCID123",
        content_hash: [1, 2, 3, 4],
        unlock_condition: {
          condition_type: 1, // time
          unlock_time_ms: Date.now() + 86400000,
          threshold: null,
          approvals: [],
          price: null,
          paid: false,
        },
        created_at: Date.now().toString(),
        unlocked: false,
      },
    },
  };

  beforeEach(() => {
    sdk = new CapsuleSDK({
      network: "devnet",
      packageId: "0x123",
    });

    keypair = new Ed25519Keypair();

    // Mock Sui client for query operations
    const mockSuiClient = {
      getOwnedObjects: vi.fn().mockResolvedValue({
        data: [{ data: mockCapsuleData }],
        hasNextPage: false,
        nextCursor: null,
      }),
      getObject: vi.fn().mockResolvedValue({
        data: mockCapsuleData,
      }),
      multiGetObjects: vi.fn().mockResolvedValue([
        { data: mockCapsuleData },
        { data: null }, // Simulate one not found
      ]),
    };

    (sdk as any).client = mockSuiClient;
  });

  describe("getCapsulesByOwner", () => {
    it("should get capsules by owner with default options", async () => {
      const result = await sdk.getCapsulesByOwner("0xTestOwner");

      expect(result.capsules).toHaveLength(1);
      expect(result.capsules[0]).toMatchObject({
        id: "0xTestCapsuleId",
        owner: "0xTestOwner",
        cid: "QmTestCID123",
        unlocked: false,
      });
      expect(result.hasNextPage).toBe(false);
    });

    it("should support pagination options", async () => {
      const mockClient = (sdk as any).client;
      mockClient.getOwnedObjects.mockResolvedValue({
        data: [{ data: mockCapsuleData }],
        hasNextPage: true,
        nextCursor: "cursor123",
      });

      const result = await sdk.getCapsulesByOwner("0xTestOwner", {
        limit: 10,
        cursor: "startCursor",
      });

      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe("cursor123");
      expect(mockClient.getOwnedObjects).toHaveBeenCalledWith({
        owner: "0xTestOwner",
        filter: {
          StructType: "0x123::time_capsule::Capsule",
        },
        options: {
          showContent: true,
          showType: true,
        },
        limit: 10,
        cursor: "startCursor",
      });
    });

    it("should handle empty results", async () => {
      const mockClient = (sdk as any).client;
      mockClient.getOwnedObjects.mockResolvedValue({
        data: [],
        hasNextPage: false,
        nextCursor: null,
      });

      const result = await sdk.getCapsulesByOwner("0xEmptyOwner");

      expect(result.capsules).toHaveLength(0);
      expect(result.hasNextPage).toBe(false);
    });

    it("should handle query errors", async () => {
      const mockClient = (sdk as any).client;
      mockClient.getOwnedObjects.mockRejectedValue(new Error("Network error"));

      await expect(sdk.getCapsulesByOwner("0xTestOwner")).rejects.toThrow(
        CapsuleSDKError
      );
    });

    it("should support showContent option", async () => {
      const mockClient = (sdk as any).client;

      await sdk.getCapsulesByOwner("0xTestOwner", {
        showContent: false,
      });

      expect(mockClient.getOwnedObjects).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            showContent: false,
          }),
        })
      );
    });
  });

  describe("getAllCapsulesByOwner", () => {
    it("should handle pagination automatically", async () => {
      const mockClient = (sdk as any).client;

      // First call returns page 1 with next page
      mockClient.getOwnedObjects
        .mockResolvedValueOnce({
          data: [{ data: { ...mockCapsuleData, objectId: "0xCapsule1" } }],
          hasNextPage: true,
          nextCursor: "cursor1",
        })
        // Second call returns page 2, no more pages
        .mockResolvedValueOnce({
          data: [{ data: { ...mockCapsuleData, objectId: "0xCapsule2" } }],
          hasNextPage: false,
          nextCursor: null,
        });

      const capsules = await sdk.getAllCapsulesByOwner("0xTestOwner");

      expect(capsules).toHaveLength(2);
      expect(capsules[0].id).toBe("0xCapsule1");
      expect(capsules[1].id).toBe("0xCapsule2");
      expect(mockClient.getOwnedObjects).toHaveBeenCalledTimes(2);
    });

    it("should handle single page results", async () => {
      const mockClient = (sdk as any).client;
      mockClient.getOwnedObjects.mockResolvedValue({
        data: [{ data: mockCapsuleData }],
        hasNextPage: false,
        nextCursor: null,
      });

      const capsules = await sdk.getAllCapsulesByOwner("0xTestOwner");

      expect(capsules).toHaveLength(1);
      expect(mockClient.getOwnedObjects).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCapsuleById", () => {
    it("should get capsule by ID successfully", async () => {
      const capsule = await sdk.getCapsuleById("0xTestCapsuleId");

      expect(capsule).toMatchObject({
        id: "0xTestCapsuleId",
        owner: "0xTestOwner",
        cid: "QmTestCID123",
        unlocked: false,
      });
    });

    it("should handle capsule not found", async () => {
      const mockClient = (sdk as any).client;
      mockClient.getObject.mockResolvedValue({ data: null });

      await expect(sdk.getCapsuleById("0xNonExistentId")).rejects.toThrow(
        CapsuleSDKError
      );
    });

    it("should handle invalid capsule data", async () => {
      const mockClient = (sdk as any).client;
      mockClient.getObject.mockResolvedValue({
        data: { content: null },
      });

      await expect(sdk.getCapsuleById("0xInvalidId")).rejects.toThrow(
        CapsuleSDKError
      );
    });

    it("should handle network errors", async () => {
      const mockClient = (sdk as any).client;
      mockClient.getObject.mockRejectedValue(new Error("Network timeout"));

      await expect(sdk.getCapsuleById("0xTestId")).rejects.toThrow(
        CapsuleSDKError
      );
    });
  });

  describe("getCapsulesByIds", () => {
    it("should get multiple capsules by IDs", async () => {
      const capsules = await sdk.getCapsulesByIds([
        "0xTestCapsuleId",
        "0xNonExistentId",
      ]);

      expect(capsules).toHaveLength(2);
      expect(capsules[0]).toMatchObject({
        id: "0xTestCapsuleId",
        owner: "0xTestOwner",
      });
      expect(capsules[1]).toBeNull(); // Second one not found
    });

    it("should handle batch query errors", async () => {
      const mockClient = (sdk as any).client;
      mockClient.multiGetObjects.mockRejectedValue(new Error("Batch error"));

      await expect(sdk.getCapsulesByIds(["0xId1", "0xId2"])).rejects.toThrow(
        CapsuleSDKError
      );
    });

    it("should handle empty ID list", async () => {
      const mockClient = (sdk as any).client;
      mockClient.multiGetObjects.mockResolvedValue([]);

      const capsules = await sdk.getCapsulesByIds([]);

      expect(capsules).toHaveLength(0);
    });
  });
});
