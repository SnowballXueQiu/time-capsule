import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Transactions } from "@mysten/sui.js/transactions";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import type {
  Capsule,
  CapsuleCreationResult,
  UnlockResult,
  ApprovalResult,
  UnlockCondition,
} from "@time-capsule/types";

export interface CapsuleSDKConfig {
  network?: "mainnet" | "testnet" | "devnet" | "localnet";
  rpcUrl?: string;
  packageId?: string;
}

export class CapsuleSDK {
  private client: SuiClient;
  private packageId: string;

  constructor(config: CapsuleSDKConfig = {}) {
    const network = config.network || "devnet";
    const rpcUrl = config.rpcUrl || getFullnodeUrl(network);

    this.client = new SuiClient({ url: rpcUrl });
    this.packageId = config.packageId || "0x0"; // Will be set after contract deployment
  }

  /**
   * Create a time-based capsule
   */
  async createTimeCapsule(
    content: Uint8Array,
    unlockTime: number,
    keypair: Ed25519Keypair
  ): Promise<CapsuleCreationResult> {
    // TODO: Implement encryption and IPFS upload
    // TODO: Build and execute transaction
    throw new Error("Not implemented yet");
  }

  /**
   * Create a multisig capsule
   */
  async createMultisigCapsule(
    content: Uint8Array,
    threshold: number,
    keypair: Ed25519Keypair
  ): Promise<CapsuleCreationResult> {
    // TODO: Implement encryption and IPFS upload
    // TODO: Build and execute transaction
    throw new Error("Not implemented yet");
  }

  /**
   * Create a paid capsule
   */
  async createPaidCapsule(
    content: Uint8Array,
    price: number,
    keypair: Ed25519Keypair
  ): Promise<CapsuleCreationResult> {
    // TODO: Implement encryption and IPFS upload
    // TODO: Build and execute transaction
    throw new Error("Not implemented yet");
  }

  /**
   * Get capsules owned by an address
   */
  async getCapsulesByOwner(owner: string): Promise<Capsule[]> {
    // TODO: Query Sui objects owned by address
    throw new Error("Not implemented yet");
  }

  /**
   * Get a specific capsule by ID
   */
  async getCapsuleById(id: string): Promise<Capsule> {
    // TODO: Query specific Sui object
    throw new Error("Not implemented yet");
  }

  /**
   * Unlock a capsule
   */
  async unlockCapsule(
    capsuleId: string,
    keypair: Ed25519Keypair,
    payment?: number
  ): Promise<UnlockResult> {
    // TODO: Build unlock transaction
    // TODO: Download and decrypt content from IPFS
    throw new Error("Not implemented yet");
  }

  /**
   * Approve a multisig capsule
   */
  async approveCapsule(
    capsuleId: string,
    keypair: Ed25519Keypair
  ): Promise<ApprovalResult> {
    // TODO: Build approval transaction
    throw new Error("Not implemented yet");
  }

  /**
   * Decrypt content using provided key and nonce
   */
  async decryptContent(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    // TODO: Use WASM encryption module for decryption
    throw new Error("Not implemented yet");
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
}

export * from "@time-capsule/types";
export * from "./ipfs/index.js";
export * from "./encryption/index.js";
