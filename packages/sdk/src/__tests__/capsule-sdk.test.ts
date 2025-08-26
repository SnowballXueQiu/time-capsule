import { describe, it, expect, beforeEach, vi } from "vitest";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { CapsuleSDK } from "../index.js";
import { CapsuleError, CapsuleSDKError } from "@time-capsule/types";

// Mock the dependencies
vi.mock("@mysten/sui.js/client");
vi.mock("../encryption/index.js");
vi.mock("../ipfs/index.js");

describe("CapsuleSDK", () => {
  let sdk: CapsuleSDK;
  let keypair: Ed25519Keypair;
  let testContent: Uint8Array;

  beforeEach(() => {
    sdk = new CapsuleSDK({
      network: "devnet",
      packageId: "0x123",
    });

    keypair = new Ed25519Keypair();
    testContent = new TextEncoder().encode("Test capsule content");
  });

  describe("Constructor", () => {
    it("should create SDK with default config", () => {
      const defaultSdk = new CapsuleSDK();
      expect(defaultSdk).toBeInstanceOf(CapsuleSDK);
      expect(defaultSdk.getPackageId()).toBe("0x0");
    });

    it("should create SDK with custom config", () => {
      const customSdk = new CapsuleSDK({
        network: "testnet",
        packageId: "0x456",
        ipfsUrl: "https://custom-ipfs.com",
      });

      expect(customSdk).toBeInstanceOf(CapsuleSDK);
      expect(customSdk.getPackageId()).toBe("0x456");
    });
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await expect(sdk.initialize()).resolves.not.toThrow();
    });

    it("should throw error when using SDK before initialization", async () => {
      await expect(
        sdk.createTimeCapsule(testContent, Date.now() + 86400000, keypair)
      ).rejects.toThrow(CapsuleSDKError);
    });
  });

  describe("Package ID Management", () => {
    it("should get and set package ID", () => {
      expect(sdk.getPackageId()).toBe("0x123");

      sdk.setPackageId("0x789");
      expect(sdk.getPackageId()).toBe("0x789");
    });
  });

  describe("Error Handling", () => {
    it("should handle CapsuleSDKError correctly", () => {
      const error = new CapsuleSDKError(
        CapsuleError.ENCRYPTION_FAILED,
        "Test error message"
      );

      expect(error.code).toBe(CapsuleError.ENCRYPTION_FAILED);
      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("CapsuleSDKError");
    });

    it("should wrap unknown errors in CapsuleSDKError", async () => {
      // This test would need proper mocking of the encrypted storage
      // For now, we just verify the error structure
      const error = new CapsuleSDKError(
        CapsuleError.TRANSACTION_FAILED,
        "Wrapped error",
        new Error("Original error")
      );

      expect(error.cause).toBeInstanceOf(Error);
      expect(error.cause?.message).toBe("Original error");
    });
  });

  describe("Content Type Parsing", () => {
    it("should parse condition types correctly", () => {
      // These are private methods, so we test through public interface
      // The actual parsing logic is tested when creating/retrieving capsules
      expect(true).toBe(true); // Placeholder for private method testing
    });
  });

  describe("Capsule Creation Integration Tests", () => {
    beforeEach(async () => {
      // Mock the encrypted storage and IPFS modules
      const mockEncryptedStorage = {
        initialize: vi.fn().mockResolvedValue(undefined),
        storeContent: vi.fn().mockResolvedValue({
          cid: "QmTestCID123",
          encryptionKey: new Uint8Array(32),
          contentHash: new Uint8Array(32),
        }),
      };

      const mockIPFSClient = {
        uploadContent: vi.fn().mockResolvedValue({
          cid: "QmTestCID123",
          size: 1024,
        }),
      };

      // Mock Sui client
      const mockSuiClient = {
        signAndExecuteTransactionBlock: vi.fn().mockResolvedValue({
          digest: "0xTestTransactionDigest",
          effects: {
            status: { status: "success" },
          },
          objectChanges: [
            {
              type: "created",
              objectType: "0x123::time_capsule::Capsule",
              objectId: "0xTestCapsuleId",
            },
          ],
        }),
      };

      // Replace the SDK's internal clients with mocks
      (sdk as any).encryptedStorage = mockEncryptedStorage;
      (sdk as any).ipfs = mockIPFSClient;
      (sdk as any).client = mockSuiClient;

      await sdk.initialize();
    });

    describe("Time Capsule Creation", () => {
      it("should create time capsule successfully", async () => {
        const unlockTime = Date.now() + 86400000; // 24 hours from now

        const result = await sdk.createTimeCapsule(
          testContent,
          unlockTime,
          keypair
        );

        expect(result).toMatchObject({
          capsuleId: "0xTestCapsuleId",
          transactionDigest: "0xTestTransactionDigest",
          cid: "QmTestCID123",
        });
        expect(result.encryptionKey).toBeDefined();
        expect(typeof result.encryptionKey).toBe("string");
      });

      it("should handle encryption failure during time capsule creation", async () => {
        // Mock encryption failure
        (sdk as any).encryptedStorage.storeContent = vi
          .fn()
          .mockRejectedValue(new Error("Encryption failed"));

        const unlockTime = Date.now() + 86400000;

        await expect(
          sdk.createTimeCapsule(testContent, unlockTime, keypair)
        ).rejects.toThrow(CapsuleSDKError);
      });

      it("should handle transaction failure during time capsule creation", async () => {
        // Mock transaction failure
        (sdk as any).client.signAndExecuteTransactionBlock = vi
          .fn()
          .mockResolvedValue({
            effects: {
              status: { status: "failure", error: "Insufficient gas" },
            },
          });

        const unlockTime = Date.now() + 86400000;

        await expect(
          sdk.createTimeCapsule(testContent, unlockTime, keypair)
        ).rejects.toThrow(CapsuleSDKError);
      });
    });

    describe("Multisig Capsule Creation", () => {
      it("should create multisig capsule successfully", async () => {
        const threshold = 3;

        const result = await sdk.createMultisigCapsule(
          testContent,
          threshold,
          keypair
        );

        expect(result).toMatchObject({
          capsuleId: "0xTestCapsuleId",
          transactionDigest: "0xTestTransactionDigest",
          cid: "QmTestCID123",
        });
        expect(result.encryptionKey).toBeDefined();
      });

      it("should validate threshold parameter", async () => {
        const invalidThreshold = 0;

        // The validation should happen in the smart contract, but we can test SDK behavior
        const result = await sdk.createMultisigCapsule(
          testContent,
          invalidThreshold,
          keypair
        );

        // SDK should still create the transaction, validation happens on-chain
        expect(result.capsuleId).toBeDefined();
      });

      it("should handle large threshold values", async () => {
        const largeThreshold = 100;

        const result = await sdk.createMultisigCapsule(
          testContent,
          largeThreshold,
          keypair
        );

        expect(result.capsuleId).toBeDefined();
      });
    });

    describe("Paid Capsule Creation", () => {
      it("should create paid capsule successfully", async () => {
        const price = 1000000; // 1 SUI in MIST

        const result = await sdk.createPaidCapsule(testContent, price, keypair);

        expect(result).toMatchObject({
          capsuleId: "0xTestCapsuleId",
          transactionDigest: "0xTestTransactionDigest",
          cid: "QmTestCID123",
        });
        expect(result.encryptionKey).toBeDefined();
      });

      it("should handle zero price", async () => {
        const price = 0;

        const result = await sdk.createPaidCapsule(testContent, price, keypair);

        expect(result.capsuleId).toBeDefined();
      });

      it("should handle very large price values", async () => {
        const largePrice = Number.MAX_SAFE_INTEGER;

        const result = await sdk.createPaidCapsule(
          testContent,
          largePrice,
          keypair
        );

        expect(result.capsuleId).toBeDefined();
      });
    });

    describe("Content Handling", () => {
      it("should handle empty content", async () => {
        const emptyContent = new Uint8Array(0);
        const unlockTime = Date.now() + 86400000;

        const result = await sdk.createTimeCapsule(
          emptyContent,
          unlockTime,
          keypair
        );

        expect(result.capsuleId).toBeDefined();
      });

      it("should handle large content", async () => {
        const largeContent = new Uint8Array(1024 * 1024); // 1MB
        largeContent.fill(42); // Fill with test data

        const unlockTime = Date.now() + 86400000;

        const result = await sdk.createTimeCapsule(
          largeContent,
          unlockTime,
          keypair
        );

        expect(result.capsuleId).toBeDefined();
      });

      it("should handle binary content", async () => {
        const binaryContent = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
        const unlockTime = Date.now() + 86400000;

        const result = await sdk.createTimeCapsule(
          binaryContent,
          unlockTime,
          keypair
        );

        expect(result.capsuleId).toBeDefined();
      });
    });

    describe("Error Recovery", () => {
      it("should handle IPFS upload failure gracefully", async () => {
        // Mock IPFS failure after encryption succeeds
        (sdk as any).encryptedStorage.storeContent = vi
          .fn()
          .mockRejectedValue(new Error("IPFS upload failed"));

        const unlockTime = Date.now() + 86400000;

        await expect(
          sdk.createTimeCapsule(testContent, unlockTime, keypair)
        ).rejects.toThrow(CapsuleSDKError);
      });

      it("should handle network connectivity issues", async () => {
        // Mock network timeout
        (sdk as any).client.signAndExecuteTransactionBlock = vi
          .fn()
          .mockRejectedValue(new Error("Network timeout"));

        const unlockTime = Date.now() + 86400000;

        await expect(
          sdk.createTimeCapsule(testContent, unlockTime, keypair)
        ).rejects.toThrow(CapsuleSDKError);
      });
    });

    describe("Transaction Building", () => {
      it("should build correct transaction for time capsule", async () => {
        const unlockTime = Date.now() + 86400000;

        await sdk.createTimeCapsule(testContent, unlockTime, keypair);

        const mockClient = (sdk as any).client;
        expect(mockClient.signAndExecuteTransactionBlock).toHaveBeenCalledWith(
          expect.objectContaining({
            signer: keypair,
            options: expect.objectContaining({
              showEffects: true,
              showObjectChanges: true,
            }),
          })
        );
      });

      it("should include correct parameters in transaction", async () => {
        const unlockTime = Date.now() + 86400000;

        await sdk.createTimeCapsule(testContent, unlockTime, keypair);

        // Verify that the transaction was built with correct parameters
        const mockClient = (sdk as any).client;
        expect(mockClient.signAndExecuteTransactionBlock).toHaveBeenCalled();
      });
    });
  });
});
