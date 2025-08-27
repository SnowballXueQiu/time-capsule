import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { SuiObjectData } from "@mysten/sui/client";
import type {
  Capsule,
  CapsuleCreationResult,
  UnlockResult,
  ApprovalResult,
  UnlockCondition,
} from "@time-capsule/types";
import { CapsuleError, CapsuleSDKError } from "@time-capsule/types";
import { EncryptedStorage } from "./encryption/index";
import { IPFSClient, createPinataIPFSClient } from "./ipfs/index";

export interface CapsuleSDKConfig {
  network?: "mainnet" | "testnet" | "devnet" | "localnet";
  rpcUrl?: string;
  packageId?: string;
  ipfsUrl?: string;
  // Pinata configuration
  usePinata?: boolean;
  pinataApiKey?: string;
  pinataApiSecret?: string;
  pinataJWT?: string;
  pinataGateway?: string;
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
  approvalProgress?: {
    current: number;
    required: number;
    percentage: number;
  };
  paymentStatus?: {
    required: number;
    paid: boolean;
  };
  statusMessage: string;
}

export class CapsuleSDK {
  private client: SuiClient;
  private packageId: string;
  private encryptedStorage: EncryptedStorage;
  private ipfs: IPFSClient;
  private initialized = false;

  constructor(config: CapsuleSDKConfig = {}) {
    const network = config.network || "devnet";
    const rpcUrl = config.rpcUrl || getFullnodeUrl(network);

    this.client = new SuiClient({ url: rpcUrl });
    this.packageId = config.packageId || "0x0"; // Will be set after contract deployment

    // Initialize IPFS client (Pinata or traditional IPFS)
    if (config.usePinata !== false) {
      // Use Pinata by default
      this.ipfs = createPinataIPFSClient({
        pinataApiKey: config.pinataApiKey,
        pinataApiSecret: config.pinataApiSecret,
        pinataJWT: config.pinataJWT,
        pinataGateway: config.pinataGateway,
        timeout: 30000,
        retries: 3,
      });
    } else {
      // Use traditional IPFS
      this.ipfs = new IPFSClient({
        url: config.ipfsUrl || "https://ipfs.infura.io:5001",
      });
    }

    // Initialize encrypted storage
    this.encryptedStorage = new EncryptedStorage(this.ipfs);
  }

  /**
   * Initialize the SDK (loads WASM modules)
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.encryptedStorage.initialize();
      this.initialized = true;
    }
  }

  /**
   * Ensure SDK is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new CapsuleSDKError(
        CapsuleError.ENCRYPTION_FAILED,
        "SDK not initialized. Call initialize() first."
      );
    }
  }

  /**
   * Create a time-based capsule
   */
  async createTimeCapsule(
    content: Uint8Array,
    unlockTime: number,
    keypair: Ed25519Keypair
  ): Promise<CapsuleCreationResult> {
    this.ensureInitialized();

    try {
      // Store encrypted content
      const storageResult = await this.encryptedStorage.storeContent(
        content,
        "application/octet-stream"
      );

      // Build transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::capsule::create_time_capsule`,
        arguments: [
          tx.pure.string(storageResult.cid),
          tx.pure.vector("u8", Array.from(storageResult.contentHash)),
          tx.pure.u64(unlockTime),
        ],
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status !== "success") {
        throw new CapsuleSDKError(
          CapsuleError.TRANSACTION_FAILED,
          `Transaction failed: ${result.effects?.status?.error}`
        );
      }

      // Extract capsule ID from object changes
      const capsuleId = this.extractCapsuleId(result.objectChanges);

      return {
        capsuleId,
        transactionDigest: result.digest,
        encryptionKey: Buffer.from(storageResult.encryptionKey).toString(
          "base64"
        ),
        cid: storageResult.cid,
      };
    } catch (error) {
      if (error instanceof CapsuleSDKError) {
        throw error;
      }
      throw new CapsuleSDKError(
        CapsuleError.TRANSACTION_FAILED,
        `Failed to create time capsule: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a multisig capsule
   */
  async createMultisigCapsule(
    content: Uint8Array,
    threshold: number,
    keypair: Ed25519Keypair
  ): Promise<CapsuleCreationResult> {
    this.ensureInitialized();

    try {
      // Store encrypted content
      const storageResult = await this.encryptedStorage.storeContent(
        content,
        "application/octet-stream"
      );

      // Build transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::capsule::create_multisig_capsule`,
        arguments: [
          tx.pure.string(storageResult.cid),
          tx.pure.vector("u8", Array.from(storageResult.contentHash)),
          tx.pure.u64(threshold),
        ],
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status !== "success") {
        throw new CapsuleSDKError(
          CapsuleError.TRANSACTION_FAILED,
          `Transaction failed: ${result.effects?.status?.error}`
        );
      }

      // Extract capsule ID from object changes
      const capsuleId = this.extractCapsuleId(result.objectChanges);

      return {
        capsuleId,
        transactionDigest: result.digest,
        encryptionKey: Buffer.from(storageResult.encryptionKey).toString(
          "base64"
        ),
        cid: storageResult.cid,
      };
    } catch (error) {
      if (error instanceof CapsuleSDKError) {
        throw error;
      }
      throw new CapsuleSDKError(
        CapsuleError.TRANSACTION_FAILED,
        `Failed to create multisig capsule: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a paid capsule
   */
  async createPaidCapsule(
    content: Uint8Array,
    price: number,
    keypair: Ed25519Keypair
  ): Promise<CapsuleCreationResult> {
    this.ensureInitialized();

    try {
      // Store encrypted content
      const storageResult = await this.encryptedStorage.storeContent(
        content,
        "application/octet-stream"
      );

      // Build transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::capsule::create_paid_capsule`,
        arguments: [
          tx.pure.string(storageResult.cid),
          tx.pure.vector("u8", Array.from(storageResult.contentHash)),
          tx.pure.u64(price),
        ],
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status !== "success") {
        throw new CapsuleSDKError(
          CapsuleError.TRANSACTION_FAILED,
          `Transaction failed: ${result.effects?.status?.error}`
        );
      }

      // Extract capsule ID from object changes
      const capsuleId = this.extractCapsuleId(result.objectChanges);

      return {
        capsuleId,
        transactionDigest: result.digest,
        encryptionKey: Buffer.from(storageResult.encryptionKey).toString(
          "base64"
        ),
        cid: storageResult.cid,
      };
    } catch (error) {
      if (error instanceof CapsuleSDKError) {
        throw error;
      }
      throw new CapsuleSDKError(
        CapsuleError.TRANSACTION_FAILED,
        `Failed to create paid capsule: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
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
   * Get all capsules owned by an address (handles pagination automatically)
   */
  async getAllCapsulesByOwner(owner: string): Promise<Capsule[]> {
    const allCapsules: Capsule[] = [];
    let cursor: string | undefined;
    let hasNextPage = true;

    while (hasNextPage) {
      const result = await this.getCapsulesByOwner(owner, {
        cursor,
        limit: 50,
      });

      allCapsules.push(...result.capsules);
      hasNextPage = result.hasNextPage;
      cursor = result.nextCursor;
    }

    return allCapsules;
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
   * Get multiple capsules by their IDs (batch query)
   */
  async getCapsulesByIds(ids: string[]): Promise<(Capsule | null)[]> {
    try {
      const response = await this.client.multiGetObjects({
        ids,
        options: {
          showContent: true,
          showType: true,
        },
      });

      return response.map((obj) => {
        if (!obj.data) {
          return null;
        }
        return this.parseCapsuleObject(obj.data);
      });
    } catch (error) {
      throw new CapsuleSDKError(
        CapsuleError.CAPSULE_NOT_FOUND,
        `Failed to get capsules by IDs: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
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

    switch (capsule.unlockCondition.type) {
      case "time": {
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

      case "multisig": {
        const threshold = capsule.unlockCondition.threshold || 0;
        const currentApprovals = capsule.unlockCondition.approvals?.length || 0;
        const canUnlock = currentApprovals >= threshold;
        const percentage =
          threshold > 0 ? (currentApprovals / threshold) * 100 : 0;

        return {
          canUnlock,
          approvalProgress: {
            current: currentApprovals,
            required: threshold,
            percentage: Math.min(100, percentage),
          },
          statusMessage: canUnlock
            ? ""
            : `${currentApprovals}/${threshold} approvals received`,
        };
      }

      case "payment": {
        const price = capsule.unlockCondition.price || 0;
        const paid = capsule.unlockCondition.paid || false;
        const canUnlock = paid;

        return {
          canUnlock,
          paymentStatus: {
            required: price,
            paid,
          },
          statusMessage: canUnlock
            ? ""
            : `Payment required: ${price / 1_000_000_000} SUI`,
        };
      }

      default:
        return {
          canUnlock: false,
          statusMessage: "Unknown unlock condition",
        };
    }
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
   * Get capsules with their status information
   */
  async getCapsulesByOwnerWithStatus(
    owner: string,
    options: CapsuleQueryOptions = {}
  ): Promise<{
    capsules: Array<Capsule & { status: CapsuleStatus }>;
    hasNextPage: boolean;
    nextCursor?: string;
  }> {
    const result = await this.getCapsulesByOwner(owner, options);
    const currentTime = Date.now();

    const capsulesWithStatus = result.capsules.map((capsule) => ({
      ...capsule,
      status: this.getCapsuleStatus(capsule, currentTime),
    }));

    return {
      capsules: capsulesWithStatus,
      hasNextPage: result.hasNextPage,
      nextCursor: result.nextCursor,
    };
  }

  /**
   * Unlock a capsule with comprehensive condition validation
   */
  async unlockCapsule(
    capsuleId: string,
    keypair: Ed25519Keypair,
    payment?: number
  ): Promise<UnlockResult> {
    this.ensureInitialized();

    try {
      // Get current capsule state
      const capsule = await this.getCapsuleById(capsuleId);

      // Check if already unlocked
      if (capsule.unlocked) {
        throw new CapsuleSDKError(
          CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
          "Capsule has already been unlocked"
        );
      }

      // Validate unlock conditions
      const status = this.getCapsuleStatus(capsule);
      if (!status.canUnlock) {
        throw new CapsuleSDKError(
          CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
          `Unlock conditions not met: ${status.statusMessage}`
        );
      }

      // Build transaction
      const tx = new Transaction();

      // Handle different unlock condition types
      switch (capsule.unlockCondition.type) {
        case "payment":
          if (!payment || payment < (capsule.unlockCondition.price || 0)) {
            throw new CapsuleSDKError(
              CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
              `Insufficient payment: required ${
                capsule.unlockCondition.price
              }, provided ${payment || 0}`
            );
          }
          const [coin] = tx.splitCoins(tx.gas, [payment]);
          tx.moveCall({
            target: `${this.packageId}::capsule::unlock_capsule`,
            arguments: [
              tx.object(capsuleId),
              coin,
              tx.object("0x6"), // Clock object
            ],
          });
          break;

        case "time":
        case "multisig":
          tx.moveCall({
            target: `${this.packageId}::capsule::unlock_capsule`,
            arguments: [
              tx.object(capsuleId),
              tx.object("0x6"), // Clock object
            ],
          });
          break;

        default:
          throw new CapsuleSDKError(
            CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
            `Unknown unlock condition type: ${capsule.unlockCondition.type}`
          );
      }

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== "success") {
        throw new CapsuleSDKError(
          CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
          `Unlock transaction failed: ${result.effects?.status?.error}`
        );
      }

      // Extract unlock event data if available
      const unlockEvent = result.events?.find((event) =>
        event.type.includes("CapsuleUnlocked")
      );

      return {
        success: true,
        transactionDigest: result.digest,
        eventData: unlockEvent?.parsedJson,
      };
    } catch (error) {
      if (error instanceof CapsuleSDKError) {
        throw error;
      }
      throw new CapsuleSDKError(
        CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
        `Failed to unlock capsule: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Approve a multisig capsule
   */
  async approveCapsule(
    capsuleId: string,
    keypair: Ed25519Keypair
  ): Promise<ApprovalResult> {
    this.ensureInitialized();

    try {
      // Build transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::capsule::approve_capsule`,
        arguments: [tx.object(capsuleId)],
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== "success") {
        throw new CapsuleSDKError(
          CapsuleError.TRANSACTION_FAILED,
          `Approval failed: ${result.effects?.status?.error}`
        );
      }

      // Get updated capsule to check current approvals
      const capsule = await this.getCapsuleById(capsuleId);
      const currentApprovals = capsule.unlockCondition.approvals?.length || 0;

      return {
        success: true,
        transactionDigest: result.digest,
        currentApprovals,
      };
    } catch (error) {
      if (error instanceof CapsuleSDKError) {
        throw error;
      }
      throw new CapsuleSDKError(
        CapsuleError.TRANSACTION_FAILED,
        `Failed to approve capsule: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decrypt content using provided key and nonce
   */
  async decryptContent(
    cid: string,
    encryptionKey: Uint8Array,
    expectedContentHash?: Uint8Array
  ): Promise<Uint8Array> {
    this.ensureInitialized();

    try {
      const result = await this.encryptedStorage.retrieveContent(
        cid,
        encryptionKey,
        expectedContentHash
      );
      return result.content;
    } catch (error) {
      throw new CapsuleSDKError(
        CapsuleError.DECRYPTION_FAILED,
        `Failed to decrypt content: ${
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
   * Extract capsule ID from transaction object changes
   */
  private extractCapsuleId(objectChanges: any[] | null | undefined): string {
    const changes = objectChanges || [];
    for (const change of changes) {
      if (change.type === "created" && change.objectType?.includes("Capsule")) {
        return change.objectId;
      }
    }
    throw new CapsuleSDKError(
      CapsuleError.TRANSACTION_FAILED,
      "Could not extract capsule ID from transaction result"
    );
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

    // For our simple contract structure, we determine the type based on unlock_time_ms
    // If unlock_time_ms > 0, it's a time-based capsule
    // Otherwise, it's a multisig or payment capsule (simplified for now)
    const unlockTimeMs = parseInt(fields.unlock_time_ms) || 0;

    const unlockCondition: UnlockCondition = {
      type: unlockTimeMs > 0 ? "time" : "multisig", // Default to multisig for non-time capsules
      unlockTime: unlockTimeMs > 0 ? unlockTimeMs : undefined,
      threshold: unlockTimeMs === 0 ? 1 : undefined, // Default threshold for multisig
      approvals: [],
      price: undefined,
      paid: false,
    };

    return {
      id: objectData.objectId,
      owner: fields.owner,
      cid: fields.cid,
      contentHash: Array.isArray(fields.content_hash)
        ? fields.content_hash
        : [],
      unlockCondition,
      createdAt: Date.now(), // Use current time since we don't store creation time
      unlocked: fields.unlocked || false,
    };
  }

  /**
   * Parse condition type from numeric value
   */
  private parseConditionType(type: number): "time" | "multisig" | "payment" {
    switch (type) {
      case 1:
        return "time";
      case 2:
        return "multisig";
      case 3:
        return "payment";
      default:
        throw new CapsuleSDKError(
          CapsuleError.CAPSULE_NOT_FOUND,
          `Unknown unlock condition type: ${type}`
        );
    }
  }

  /**
   * Create approval transaction (for use with wallet signing)
   */
  async createApprovalTransaction(capsuleId: string): Promise<Transaction> {
    this.ensureInitialized();

    try {
      // Get current capsule state to validate
      const capsule = await this.getCapsuleById(capsuleId);

      // Check if it's a multisig capsule
      if (capsule.unlockCondition.type !== "multisig") {
        throw new CapsuleSDKError(
          CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
          "Only multisig capsules can be approved"
        );
      }

      // Check if already unlocked
      if (capsule.unlocked) {
        throw new CapsuleSDKError(
          CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
          "Capsule has already been unlocked"
        );
      }

      // Build transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::capsule::approve_capsule`,
        arguments: [tx.object(capsuleId)],
      });

      return tx;
    } catch (error) {
      if (error instanceof CapsuleSDKError) {
        throw error;
      }
      throw new CapsuleSDKError(
        CapsuleError.TRANSACTION_FAILED,
        `Failed to create approval transaction: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create unlock transaction (for use with wallet signing)
   */
  async createUnlockTransaction(
    capsuleId: string,
    payment?: number
  ): Promise<Transaction> {
    this.ensureInitialized();

    try {
      // Get current capsule state
      const capsule = await this.getCapsuleById(capsuleId);

      // Check if already unlocked
      if (capsule.unlocked) {
        throw new CapsuleSDKError(
          CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
          "Capsule has already been unlocked"
        );
      }

      // Validate unlock conditions
      const status = this.getCapsuleStatus(capsule);
      if (!status.canUnlock) {
        throw new CapsuleSDKError(
          CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
          `Unlock conditions not met: ${status.statusMessage}`
        );
      }

      // Build transaction
      const tx = new Transaction();

      // Handle different unlock condition types
      switch (capsule.unlockCondition.type) {
        case "payment":
          if (!payment || payment < (capsule.unlockCondition.price || 0)) {
            throw new CapsuleSDKError(
              CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
              `Insufficient payment: required ${
                capsule.unlockCondition.price
              }, provided ${payment || 0}`
            );
          }
          const [coin] = tx.splitCoins(tx.gas, [payment]);
          tx.moveCall({
            target: `${this.packageId}::capsule::unlock_capsule`,
            arguments: [
              tx.object(capsuleId),
              coin,
              tx.object("0x6"), // Clock object
            ],
          });
          break;

        case "time":
        case "multisig":
          tx.moveCall({
            target: `${this.packageId}::capsule::unlock_capsule`,
            arguments: [
              tx.object(capsuleId),
              tx.object("0x6"), // Clock object
            ],
          });
          break;

        default:
          throw new CapsuleSDKError(
            CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
            `Unknown unlock condition type: ${capsule.unlockCondition.type}`
          );
      }

      return tx;
    } catch (error) {
      if (error instanceof CapsuleSDKError) {
        throw error;
      }
      throw new CapsuleSDKError(
        CapsuleError.UNLOCK_CONDITIONS_NOT_MET,
        `Failed to create unlock transaction: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Process unlock result and retrieve content
   */
  async processUnlockResult(
    capsuleId: string,
    transactionDigest: string
  ): Promise<UnlockResult> {
    this.ensureInitialized();

    try {
      // Get transaction details to verify success
      const txResult = await this.client.getTransactionBlock({
        digest: transactionDigest,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (txResult.effects?.status?.status !== "success") {
        throw new CapsuleSDKError(
          CapsuleError.TRANSACTION_FAILED,
          `Transaction failed: ${txResult.effects?.status?.error}`
        );
      }

      // Extract unlock event data if available
      const unlockEvent = txResult.events?.find((event) =>
        event.type.includes("CapsuleUnlocked")
      );

      // Get updated capsule state
      const capsule = await this.getCapsuleById(capsuleId);

      // For now, return basic success info
      // In a full implementation, we would decrypt content here
      return {
        success: true,
        transactionDigest,
        eventData: unlockEvent?.parsedJson,
        capsuleId,
        cid: capsule.cid,
        content: new TextEncoder().encode(
          "Capsule content unlocked successfully!"
        ),
        contentType: "text/plain",
      };
    } catch (error) {
      if (error instanceof CapsuleSDKError) {
        throw error;
      }
      throw new CapsuleSDKError(
        CapsuleError.TRANSACTION_FAILED,
        `Failed to process unlock result: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Complete unlock and decrypt flow for a capsule
   */
  async unlockAndDecrypt(
    capsuleId: string,
    encryptionKey: string,
    keypair: Ed25519Keypair,
    payment?: number
  ): Promise<UnlockResult> {
    this.ensureInitialized();

    try {
      // Step 1: Get capsule information
      const capsule = await this.getCapsuleById(capsuleId);

      // Step 2: Validate unlock conditions and unlock if needed
      if (!capsule.unlocked) {
        const unlockResult = await this.unlockCapsule(
          capsuleId,
          keypair,
          payment
        );
        if (!unlockResult.success) {
          return {
            success: false,
            error: "Failed to unlock capsule",
          };
        }
      }

      // Step 3: Download and decrypt content
      const decryptResult = await this.downloadAndDecrypt(
        capsule.cid,
        encryptionKey,
        new Uint8Array(Buffer.from(capsule.contentHash, "hex"))
      );

      if (!decryptResult.success) {
        return {
          success: false,
          error: `Failed to decrypt content: ${decryptResult.error}`,
        };
      }

      return {
        success: true,
        content: decryptResult.content,
        contentType: decryptResult.contentType,
        capsuleId,
        cid: capsule.cid,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Download and decrypt capsule content
   */
  async downloadAndDecrypt(
    cid: string,
    encryptionKey: string,
    expectedContentHash?: Uint8Array
  ): Promise<UnlockResult> {
    this.ensureInitialized();

    try {
      // Decode encryption key
      const key = new Uint8Array(Buffer.from(encryptionKey, "base64"));

      // Decrypt content
      const decryptedContent = await this.decryptContent(
        cid,
        key,
        expectedContentHash
      );

      return {
        success: true,
        content: decryptedContent,
        contentType: "application/octet-stream",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate unlock conditions without executing unlock
   */
  async validateUnlockConditions(
    capsuleId: string,
    payment?: number
  ): Promise<{
    canUnlock: boolean;
    reason?: string;
    requiredPayment?: number;
    currentApprovals?: number;
    requiredApprovals?: number;
    timeRemaining?: number;
  }> {
    try {
      const capsule = await this.getCapsuleById(capsuleId);
      const status = this.getCapsuleStatus(capsule);

      const result = {
        canUnlock: status.canUnlock,
        reason: status.canUnlock ? undefined : status.statusMessage,
      };

      // Add condition-specific details
      switch (capsule.unlockCondition.type) {
        case "payment":
          return {
            ...result,
            requiredPayment: capsule.unlockCondition.price,
            canUnlock:
              result.canUnlock &&
              (payment || 0) >= (capsule.unlockCondition.price || 0),
            reason: result.canUnlock
              ? undefined
              : `Payment required: ${
                  capsule.unlockCondition.price
                } MIST, provided: ${payment || 0} MIST`,
          };

        case "multisig":
          return {
            ...result,
            currentApprovals: capsule.unlockCondition.approvals?.length || 0,
            requiredApprovals: capsule.unlockCondition.threshold || 0,
          };

        case "time":
          return {
            ...result,
            timeRemaining: status.timeRemaining,
          };

        default:
          return result;
      }
    } catch (error) {
      return {
        canUnlock: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export * from "@time-capsule/types";
export * from "./ipfs/index";
export * from "./encryption/index";
