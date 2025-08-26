import { describe, it, expect, beforeEach, vi } from "vitest";
import { CapsuleSDK } from "../index.js";
import type { Capsule } from "@time-capsule/types";

describe("CapsuleSDK Status Functionality", () => {
  let sdk: CapsuleSDK;

  beforeEach(() => {
    sdk = new CapsuleSDK({
      network: "devnet",
      packageId: "0x123",
    });
  });

  describe("getCapsuleStatus", () => {
    const baseTime = 1640995200000; // 2022-01-01 00:00:00 UTC

    describe("Time-based capsules", () => {
      it("should return ready to unlock for past unlock time", () => {
        const capsule: Capsule = {
          id: "0x1",
          owner: "0xowner",
          cid: "QmTest",
          contentHash: "hash",
          unlockCondition: {
            type: "time",
            unlockTime: baseTime - 3600000, // 1 hour ago
          },
          createdAt: baseTime - 7200000,
          unlocked: false,
        };

        const status = sdk.getCapsuleStatus(capsule, baseTime);

        expect(status.canUnlock).toBe(true);
        expect(status.statusMessage).toBe("Ready to unlock");
        expect(status.timeRemaining).toBe(0);
      });

      it("should return time remaining for future unlock time", () => {
        const capsule: Capsule = {
          id: "0x1",
          owner: "0xowner",
          cid: "QmTest",
          contentHash: "hash",
          unlockCondition: {
            type: "time",
            unlockTime: baseTime + 86400000, // 1 day later
          },
          createdAt: baseTime,
          unlocked: false,
        };

        const status = sdk.getCapsuleStatus(capsule, baseTime);

        expect(status.canUnlock).toBe(false);
        expect(status.timeRemaining).toBe(86400000);
        expect(status.statusMessage).toBe("Unlocks in 1 day");
      });

      it("should handle various time formats correctly", () => {
        const testCases = [
          { remaining: 1000, expected: "1 second" },
          { remaining: 2000, expected: "2 seconds" },
          { remaining: 60000, expected: "1 minute" },
          { remaining: 120000, expected: "2 minutes" },
          { remaining: 3600000, expected: "1 hour" },
          { remaining: 7200000, expected: "2 hours" },
          { remaining: 86400000, expected: "1 day" },
          { remaining: 172800000, expected: "2 days" },
        ];

        testCases.forEach(({ remaining, expected }) => {
          const capsule: Capsule = {
            id: "0x1",
            owner: "0xowner",
            cid: "QmTest",
            contentHash: "hash",
            unlockCondition: {
              type: "time",
              unlockTime: baseTime + remaining,
            },
            createdAt: baseTime,
            unlocked: false,
          };

          const status = sdk.getCapsuleStatus(capsule, baseTime);
          expect(status.statusMessage).toBe(`Unlocks in ${expected}`);
        });
      });
    });

    describe("Multisig capsules", () => {
      it("should return ready to unlock when threshold is met", () => {
        const capsule: Capsule = {
          id: "0x1",
          owner: "0xowner",
          cid: "QmTest",
          contentHash: "hash",
          unlockCondition: {
            type: "multisig",
            threshold: 3,
            approvals: ["0xa", "0xb", "0xc"],
          },
          createdAt: baseTime,
          unlocked: false,
        };

        const status = sdk.getCapsuleStatus(capsule, baseTime);

        expect(status.canUnlock).toBe(true);
        expect(status.statusMessage).toBe("Ready to unlock");
        expect(status.approvalProgress).toEqual({
          current: 3,
          required: 3,
          percentage: 100,
        });
      });

      it("should return approval progress when threshold not met", () => {
        const capsule: Capsule = {
          id: "0x1",
          owner: "0xowner",
          cid: "QmTest",
          contentHash: "hash",
          unlockCondition: {
            type: "multisig",
            threshold: 5,
            approvals: ["0xa", "0xb"],
          },
          createdAt: baseTime,
          unlocked: false,
        };

        const status = sdk.getCapsuleStatus(capsule, baseTime);

        expect(status.canUnlock).toBe(false);
        expect(status.statusMessage).toBe("2/5 approvals received");
        expect(status.approvalProgress).toEqual({
          current: 2,
          required: 5,
          percentage: 40,
        });
      });

      it("should handle zero threshold", () => {
        const capsule: Capsule = {
          id: "0x1",
          owner: "0xowner",
          cid: "QmTest",
          contentHash: "hash",
          unlockCondition: {
            type: "multisig",
            threshold: 0,
            approvals: [],
          },
          createdAt: baseTime,
          unlocked: false,
        };

        const status = sdk.getCapsuleStatus(capsule, baseTime);

        expect(status.canUnlock).toBe(true);
        expect(status.approvalProgress?.percentage).toBe(0);
      });
    });

    describe("Payment capsules", () => {
      it("should return ready to unlock when paid", () => {
        const capsule: Capsule = {
          id: "0x1",
          owner: "0xowner",
          cid: "QmTest",
          contentHash: "hash",
          unlockCondition: {
            type: "payment",
            price: 1000000000, // 1 SUI
            paid: true,
          },
          createdAt: baseTime,
          unlocked: false,
        };

        const status = sdk.getCapsuleStatus(capsule, baseTime);

        expect(status.canUnlock).toBe(true);
        expect(status.statusMessage).toBe("Ready to unlock");
        expect(status.paymentStatus).toEqual({
          required: 1000000000,
          paid: true,
        });
      });

      it("should return payment required when not paid", () => {
        const capsule: Capsule = {
          id: "0x1",
          owner: "0xowner",
          cid: "QmTest",
          contentHash: "hash",
          unlockCondition: {
            type: "payment",
            price: 2500000000, // 2.5 SUI
            paid: false,
          },
          createdAt: baseTime,
          unlocked: false,
        };

        const status = sdk.getCapsuleStatus(capsule, baseTime);

        expect(status.canUnlock).toBe(false);
        expect(status.statusMessage).toBe("Payment required: 2.5 SUI");
        expect(status.paymentStatus).toEqual({
          required: 2500000000,
          paid: false,
        });
      });
    });

    describe("Already unlocked capsules", () => {
      it("should return already unlocked status", () => {
        const capsule: Capsule = {
          id: "0x1",
          owner: "0xowner",
          cid: "QmTest",
          contentHash: "hash",
          unlockCondition: {
            type: "time",
            unlockTime: baseTime - 3600000,
          },
          createdAt: baseTime - 7200000,
          unlocked: true,
        };

        const status = sdk.getCapsuleStatus(capsule, baseTime);

        expect(status.canUnlock).toBe(false);
        expect(status.statusMessage).toBe("Capsule has already been unlocked");
      });
    });

    describe("Unknown condition types", () => {
      it("should handle unknown condition types gracefully", () => {
        const capsule: Capsule = {
          id: "0x1",
          owner: "0xowner",
          cid: "QmTest",
          contentHash: "hash",
          unlockCondition: {
            type: "unknown" as any,
          },
          createdAt: baseTime,
          unlocked: false,
        };

        const status = sdk.getCapsuleStatus(capsule, baseTime);

        expect(status.canUnlock).toBe(false);
        expect(status.statusMessage).toBe("Unknown unlock condition");
      });
    });
  });

  describe("getCapsulesByOwnerWithStatus", () => {
    beforeEach(() => {
      // Mock the client for this test
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

      const mockSuiClient = {
        getOwnedObjects: vi.fn().mockResolvedValue({
          data: [{ data: mockCapsuleData }],
          hasNextPage: false,
          nextCursor: null,
        }),
      };

      (sdk as any).client = mockSuiClient;
    });

    it("should return capsules with status information", async () => {
      const result = await sdk.getCapsulesByOwnerWithStatus("0xTestOwner");

      expect(result.capsules).toHaveLength(1);
      expect(result.capsules[0]).toHaveProperty("status");
      expect(result.capsules[0].status).toHaveProperty("canUnlock");
      expect(result.capsules[0].status).toHaveProperty("statusMessage");
    });

    it("should support pagination options", async () => {
      const result = await sdk.getCapsulesByOwnerWithStatus("0xTestOwner", {
        limit: 10,
        cursor: "test-cursor",
      });

      expect(result).toHaveProperty("hasNextPage");
      expect(result).toHaveProperty("nextCursor");
    });
  });
});
