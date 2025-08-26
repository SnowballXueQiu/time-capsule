import { describe, it, expect, beforeEach, vi } from "vitest";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { CapsuleSDK } from "../index.js";
import { CapsuleError, CapsuleSDKError } from "@time-capsule/types";
import type { Capsule } from "@time-capsule/types";

// Mock the dependencies
vi.mock("@mysten/sui.js/client");
vi.mock("../encryption/index.js");
vi.mock("../ipfs/index.js");

describe("CapsuleSDK Unlock and Decrypt Functionality", () => {
  let sdk: CapsuleSDK;
  let keypair: Ed25519Keypair;
  let testContent: Uint8Array;
  let testEncryptionKey: string;

  const mockCapsuleData = {
    objectId: "0xTestCapsuleId",
    content: {
      dataType: "moveObject" as const,
      fields: {
        id: { id: "0xTestCapsuleId" },
        owner: "0xTestOwner",
        cid: "QmTestCID123",
        content_hash: "abcd1234",
        unlock_condition: {
          condition_type: 1, // time
          unlock_time_ms: Date.now() - 3600000, // 1 hour ago (unlockable)
          threshold: null,
          approvals: [],
          price: null,
          paid: false,
        },
        created_at: (Date.now() - 7200000).toString(),
        unlocked: false,
      },
    },
  };

  beforeEach(async () => {
    sdk = new CapsuleSDK({
      network: "devnet",
      packageId: "0x123",
    });

    keypair = new Ed25519Keypair();
    testContent = new TextEncoder().encode("Test capsule content for unlock");
    testEncryptionKey = Buffer.from(new Uint8Array(32)).toString("base64");

    // Mock the encrypted storage
    const mockEncryptedStorage = {
      initialize: vi.fn().mockResolvedValue(undefined),
      retrieveContent: vi.fn().mockResolvedValue({
        content: testContent,
        metadata: {
          originalSize: testContent.length,
          contentType: "application/octet-stream",
          timestamp: Date.now(),
        },
      }),
    };

    // Mock Sui client
    const mockSuiClient = {
      getObject: vi.fn().mockResolvedValue({
        data: mockCapsuleData,
      }),
      signAndExecuteTransactionBlock: vi.fn().mockResolvedValue({
        digest: "0xTestTransactionDigest",
        effects: {
          status: { status: "success" },
        },
        events: [
          {
            type: "0x123::time_capsule::CapsuleUnlocked",
            parsedJson: {
              capsule_id: "0xTestCapsuleId",
              unlocked_by: "0xTestOwner",
            },
          },
        ],
      }),
    };

    // Replace the SDK's internal clients with mocks
    (sdk as any).encryptedStorage = mockEncryptedStorage;
    (sdk as any).client = mockSuiClient;

    await sdk.initialize();
  });

  describe("unlockCapsule", () => {
    it("should unlock a time-based capsule successfully", async () => {
      const result = await sdk.unlockCapsule("0xTestCapsuleId", keypair);

      expect(result.success).toBe(true);
      expect(result.transactionDigest).toBe("0xTestTransactionDigest");
      expect(result.eventData).toEqual({
        capsule_id: "0xTestCapsuleId",
        unlocked_by: "0xTestOwner",
      });
    });

    it("should handle payment-based capsule unlock", async () => {
      // Update mock to payment capsule
      const paymentCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlock_condition: {
              condition_type: 3, // payment
              unlock_time_ms: null,
              threshold: null,
              approvals: [],
              price: 1000000000, // 1 SUI
              paid: true,
            },
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: paymentCapsule,
      });

      const result = await sdk.unlockCapsule(
        "0xTestCapsuleId",
        keypair,
        1000000000
      );

      expect(result.success).toBe(true);
      expect(result.transactionDigest).toBe("0xTestTransactionDigest");
    });

    it("should handle multisig capsule unlock", async () => {
      // Update mock to multisig capsule with sufficient approvals
      const multisigCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlock_condition: {
              condition_type: 2, // multisig
              unlock_time_ms: null,
              threshold: 2,
              approvals: ["0xApprover1", "0xApprover2"],
              price: null,
              paid: false,
            },
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: multisigCapsule,
      });

      const result = await sdk.unlockCapsule("0xTestCapsuleId", keypair);

      expect(result.success).toBe(true);
      expect(result.transactionDigest).toBe("0xTestTransactionDigest");
    });

    it("should reject unlock for already unlocked capsule", async () => {
      const unlockedCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlocked: true,
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: unlockedCapsule,
      });

      await expect(
        sdk.unlockCapsule("0xTestCapsuleId", keypair)
      ).rejects.toThrow(CapsuleSDKError);
    });

    it("should reject unlock when conditions not met", async () => {
      // Future time capsule
      const futureCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlock_condition: {
              condition_type: 1, // time
              unlock_time_ms: Date.now() + 86400000, // 1 day in future
              threshold: null,
              approvals: [],
              price: null,
              paid: false,
            },
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: futureCapsule,
      });

      await expect(
        sdk.unlockCapsule("0xTestCapsuleId", keypair)
      ).rejects.toThrow(CapsuleSDKError);
    });

    it("should reject insufficient payment", async () => {
      const paymentCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlock_condition: {
              condition_type: 3, // payment
              unlock_time_ms: null,
              threshold: null,
              approvals: [],
              price: 2000000000, // 2 SUI
              paid: false,
            },
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: paymentCapsule,
      });

      await expect(
        sdk.unlockCapsule("0xTestCapsuleId", keypair, 1000000000) // Only 1 SUI
      ).rejects.toThrow(CapsuleSDKError);
    });

    it("should handle transaction failure", async () => {
      (sdk as any).client.signAndExecuteTransactionBlock.mockResolvedValue({
        effects: {
          status: { status: "failure", error: "Insufficient gas" },
        },
      });

      await expect(
        sdk.unlockCapsule("0xTestCapsuleId", keypair)
      ).rejects.toThrow(CapsuleSDKError);
    });
  });

  describe("downloadAndDecrypt", () => {
    it("should download and decrypt content successfully", async () => {
      const result = await sdk.downloadAndDecrypt(
        "QmTestCID123",
        testEncryptionKey
      );

      expect(result.success).toBe(true);
      expect(result.content).toEqual(testContent);
      expect(result.contentType).toBe("application/octet-stream");
    });

    it("should handle decryption failure", async () => {
      (sdk as any).encryptedStorage.retrieveContent.mockRejectedValue(
        new Error("Decryption failed")
      );

      const result = await sdk.downloadAndDecrypt(
        "QmTestCID123",
        testEncryptionKey
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Decryption failed");
    });

    it("should verify content hash when provided", async () => {
      const expectedHash = new Uint8Array([1, 2, 3, 4]);

      const result = await sdk.downloadAndDecrypt(
        "QmTestCID123",
        testEncryptionKey,
        expectedHash
      );

      expect(result.success).toBe(true);
      expect(
        (sdk as any).encryptedStorage.retrieveContent
      ).toHaveBeenCalledWith(
        "QmTestCID123",
        expect.any(Uint8Array),
        expectedHash
      );
    });
  });

  describe("unlockAndDecrypt", () => {
    it("should perform complete unlock and decrypt flow", async () => {
      const result = await sdk.unlockAndDecrypt(
        "0xTestCapsuleId",
        testEncryptionKey,
        keypair
      );

      expect(result.success).toBe(true);
      expect(result.content).toEqual(testContent);
      expect(result.contentType).toBe("application/octet-stream");
      expect(result.capsuleId).toBe("0xTestCapsuleId");
      expect(result.cid).toBe("QmTestCID123");
    });

    it("should skip unlock for already unlocked capsule", async () => {
      const unlockedCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlocked: true,
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: unlockedCapsule,
      });

      const result = await sdk.unlockAndDecrypt(
        "0xTestCapsuleId",
        testEncryptionKey,
        keypair
      );

      expect(result.success).toBe(true);
      expect(result.content).toEqual(testContent);
      // Should not call unlock transaction for already unlocked capsule
      expect(
        (sdk as any).client.signAndExecuteTransactionBlock
      ).not.toHaveBeenCalled();
    });

    it("should handle unlock failure in combined flow", async () => {
      (sdk as any).client.signAndExecuteTransactionBlock.mockResolvedValue({
        effects: {
          status: { status: "failure", error: "Transaction failed" },
        },
      });

      const result = await sdk.unlockAndDecrypt(
        "0xTestCapsuleId",
        testEncryptionKey,
        keypair
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unlock transaction failed");
    });

    it("should handle decryption failure in combined flow", async () => {
      (sdk as any).encryptedStorage.retrieveContent.mockRejectedValue(
        new Error("IPFS download failed")
      );

      const result = await sdk.unlockAndDecrypt(
        "0xTestCapsuleId",
        testEncryptionKey,
        keypair
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to decrypt content");
    });

    it("should handle payment in combined flow", async () => {
      const paymentCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlock_condition: {
              condition_type: 3, // payment
              unlock_time_ms: null,
              threshold: null,
              approvals: [],
              price: 1000000000, // 1 SUI
              paid: true,
            },
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: paymentCapsule,
      });

      const result = await sdk.unlockAndDecrypt(
        "0xTestCapsuleId",
        testEncryptionKey,
        keypair,
        1000000000
      );

      expect(result.success).toBe(true);
      expect(result.content).toEqual(testContent);
    });
  });

  describe("validateUnlockConditions", () => {
    it("should validate time-based unlock conditions", async () => {
      const result = await sdk.validateUnlockConditions("0xTestCapsuleId");

      expect(result.canUnlock).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.timeRemaining).toBe(0);
    });

    it("should validate payment-based unlock conditions", async () => {
      const paymentCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlock_condition: {
              condition_type: 3, // payment
              unlock_time_ms: null,
              threshold: null,
              approvals: [],
              price: 2000000000, // 2 SUI
              paid: false,
            },
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: paymentCapsule,
      });

      const result = await sdk.validateUnlockConditions(
        "0xTestCapsuleId",
        1000000000 // 1 SUI payment
      );

      expect(result.canUnlock).toBe(false);
      expect(result.requiredPayment).toBe(2000000000);
      expect(result.reason).toContain("Payment required");
    });

    it("should validate multisig unlock conditions", async () => {
      const multisigCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlock_condition: {
              condition_type: 2, // multisig
              unlock_time_ms: null,
              threshold: 3,
              approvals: ["0xApprover1", "0xApprover2"],
              price: null,
              paid: false,
            },
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: multisigCapsule,
      });

      const result = await sdk.validateUnlockConditions("0xTestCapsuleId");

      expect(result.canUnlock).toBe(false);
      expect(result.currentApprovals).toBe(2);
      expect(result.requiredApprovals).toBe(3);
    });

    it("should handle validation errors gracefully", async () => {
      (sdk as any).client.getObject.mockRejectedValue(
        new Error("Capsule not found")
      );

      const result = await sdk.validateUnlockConditions("0xInvalidId");

      expect(result.canUnlock).toBe(false);
      expect(result.reason).toContain("Capsule not found");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors during unlock", async () => {
      (sdk as any).client.getObject.mockRejectedValue(
        new Error("Network timeout")
      );

      await expect(
        sdk.unlockCapsule("0xTestCapsuleId", keypair)
      ).rejects.toThrow(CapsuleSDKError);
    });

    it("should handle invalid capsule data", async () => {
      (sdk as any).client.getObject.mockResolvedValue({
        data: null,
      });

      await expect(
        sdk.unlockCapsule("0xTestCapsuleId", keypair)
      ).rejects.toThrow(CapsuleSDKError);
    });

    it("should handle unknown unlock condition types", async () => {
      const unknownCapsule = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            unlock_condition: {
              condition_type: 99, // unknown type
              unlock_time_ms: null,
              threshold: null,
              approvals: [],
              price: null,
              paid: false,
            },
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: unknownCapsule,
      });

      await expect(
        sdk.unlockCapsule("0xTestCapsuleId", keypair)
      ).rejects.toThrow(CapsuleSDKError);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete end-to-end unlock flow with content verification", async () => {
      // Test with content hash verification
      const contentHash = new Uint8Array([0xab, 0xcd, 0x12, 0x34]);
      const capsuleWithHash = {
        ...mockCapsuleData,
        content: {
          ...mockCapsuleData.content,
          fields: {
            ...mockCapsuleData.content.fields,
            content_hash: Array.from(contentHash),
          },
        },
      };

      (sdk as any).client.getObject.mockResolvedValue({
        data: capsuleWithHash,
      });

      const result = await sdk.unlockAndDecrypt(
        "0xTestCapsuleId",
        testEncryptionKey,
        keypair
      );

      expect(result.success).toBe(true);
      expect(result.content).toEqual(testContent);
    });

    it("should handle large content unlock and decryption", async () => {
      const largeContent = new Uint8Array(1024 * 1024); // 1MB
      largeContent.fill(42);

      (sdk as any).encryptedStorage.retrieveContent.mockResolvedValue({
        content: largeContent,
        metadata: {
          originalSize: largeContent.length,
          contentType: "application/octet-stream",
          timestamp: Date.now(),
        },
      });

      const result = await sdk.unlockAndDecrypt(
        "0xTestCapsuleId",
        testEncryptionKey,
        keypair
      );

      expect(result.success).toBe(true);
      expect(result.content).toEqual(largeContent);
    });

    it("should handle concurrent unlock attempts", async () => {
      const promises = Array(5)
        .fill(null)
        .map(() =>
          sdk.unlockAndDecrypt("0xTestCapsuleId", testEncryptionKey, keypair)
        );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.content).toEqual(testContent);
      });
    });
  });
});
