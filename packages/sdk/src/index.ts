import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { SuiObjectData } from "@mysten/sui/client";
import type {
  Capsule,
  CapsuleCreationResult,
  UnlockResult,
  UnlockCondition,
} from "@time-capsule/types";
import { CapsuleError, CapsuleSDKError } from "@time-capsule/types";

export interface CapsuleSDKConfig {
  network?: "mainnet" | "testnet" | "devnet" | "localnet";
  rpcUrl?: string;
  packageId?: string;
}

export interface CapsuleQueryOptions {
  limit?: number;
  cursor?: string;
  showContent?: boolean;
}

export interface CapsuleQueryResult {
  capsules: Capsule[];
  hasNextPage: boolean;
  nextCursor?: string;
}

export interface CapsuleStatus {
  canUnlock: boolean;
  timeRemaining?: number;
  statusMessage: string;
}

export class CapsuleSDK {
  private client: SuiClient;
  private packageId: string;

  constructor(config: CapsuleSDKConfig = {}) {
    const network = config.network || "devnet";
    const rpcUrl = config.rpcUrl || getFullnodeUrl(network);

    this.client = new SuiClient({ url: rpcUrl });
    this.packageId = config.packageId || "0x0";
  }

  /**
   * Get capsule status with detailed unlock condition analysis
   */
  getCapsuleStatus(capsule: Capsule, currentTime?: number): CapsuleStatus {
    const now = currentTime || Date.now();

    if (capsule.unlocked) {
      return {
        canUnlock: false,
        statusMessage: "Capsule has already been unlocked",
      };
    }

    // Only time-based capsules are supported
    const unlockTime = capsule.unlockCondition.unlockTime || 0;
    const canUnlock = now >= unlockTime;
    const timeRemaining = Math.max(0, unlockTime - now);

    return {
      canUnlock,
      timeRemaining,
      statusMessage: canUnlock
        ? ""
        : `Unlocks in ${this.formatTimeRemaining(timeRemaining)}`,
    };
  }

  /**
   * Format time remaining in human-readable format
   */
  private formatTimeRemaining(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days !== 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else {
      return `${seconds} second${seconds !== 1 ? "s" : ""}`;
    }
  }

  /**
   * Get capsules owned by an address with pagination support
   */
  async getCapsulesByOwner(
    owner: string,
    options: CapsuleQueryOptions = {}
  ): Promise<CapsuleQueryResult> {
    try {
      const response = await this.client.getOwnedObjects({
        owner,
        filter: {
          StructType: `${this.packageId}::capsule::TimeCapsule`,
        },
        options: {
          showContent: options.showContent !== false,
          showType: true,
        },
        limit: options.limit || 50,
        cursor: options.cursor,
      });

      const capsules: Capsule[] = [];
      for (const obj of response.data) {
        if (obj.data) {
          const capsule = this.parseCapsuleObject(obj.data);
          if (capsule) {
            capsules.push(capsule);
          }
        }
      }

      return {
        capsules,
        hasNextPage: response.hasNextPage,
        nextCursor: response.nextCursor || undefined,
      };
    } catch (error) {
      throw new CapsuleSDKError(
        CapsuleError.CAPSULE_NOT_FOUND,
        `Failed to get capsules for owner ${owner}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get a specific capsule by ID
   */
  async getCapsuleById(id: string): Promise<Capsule> {
    try {
      const response = await this.client.getObject({
        id,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!response.data) {
        throw new CapsuleSDKError(
          CapsuleError.CAPSULE_NOT_FOUND,
          `Capsule with ID ${id} not found`
        );
      }

      const capsule = this.parseCapsuleObject(response.data);
      if (!capsule) {
        throw new CapsuleSDKError(
          CapsuleError.CAPSULE_NOT_FOUND,
          `Invalid capsule data for ID ${id}`
        );
      }

      return capsule;
    } catch (error) {
      if (error instanceof CapsuleSDKError) {
        throw error;
      }
      throw new CapsuleSDKError(
        CapsuleError.CAPSULE_NOT_FOUND,
        `Failed to get capsule ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the Sui client instance
   */
  getClient(): SuiClient {
    return this.client;
  }

  /**
   * Get the package ID
   */
  getPackageId(): string {
    return this.packageId;
  }

  /**
   * Set the package ID (after contract deployment)
   */
  setPackageId(packageId: string): void {
    this.packageId = packageId;
  }

  /**
   * Parse a Sui object into a Capsule
   */
  private parseCapsuleObject(objectData: SuiObjectData): Capsule | null {
    if (!objectData.content || objectData.content.dataType !== "moveObject") {
      return null;
    }

    const fields = (objectData.content as any).fields;
    if (!fields) {
      return null;
    }

    // Parse time-based capsule
    const unlockTimeMs = parseInt(fields.unlock_time_ms) || 0;

    const unlockCondition: UnlockCondition = {
      type: "time",
      unlockTime: unlockTimeMs,
    };

    return {
      id: objectData.objectId,
      owner: fields.owner,
      cid: fields.cid,
      contentHash: Array.isArray(fields.content_hash)
        ? fields.content_hash.join("")
        : fields.content_hash || "",
      unlockCondition,
      createdAt: Date.now(), // Use current time since we don't store creation time
      unlocked: fields.unlocked || false,
    };
  }
}

export * from "@time-capsule/types";
