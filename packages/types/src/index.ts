/**
 * Core types for the Decentralized Time Capsule system
 */

export interface Capsule {
  id: string;
  owner: string;
  cid: string;
  contentHash: string;
  unlockCondition: UnlockCondition;
  createdAt: number;
  unlocked: boolean;
}

export interface UnlockCondition {
  type: "time" | "multisig" | "payment";
  unlockTime?: number;
  threshold?: number;
  approvals?: string[];
  price?: number;
  paid?: boolean;
}

export interface CapsuleCreationResult {
  capsuleId: string;
  transactionDigest: string;
  encryptionKey: string; // Base64 encoded key - needs secure storage
  cid: string;
}

export interface UnlockResult {
  success: boolean;
  content?: Uint8Array;
  contentType?: string;
  error?: string;
}

export interface ApprovalResult {
  success: boolean;
  transactionDigest?: string;
  currentApprovals?: number;
  error?: string;
}

export interface EncryptionResult {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  contentHash: Uint8Array;
}

export interface IPFSContent {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  metadata: {
    originalSize: number;
    contentType: string;
    timestamp: number;
  };
}

export interface CapsuleEvent {
  type: "created" | "unlocked" | "approved";
  capsuleId: string;
  timestamp: number;
  data: any;
}

// Error types
export enum CapsuleError {
  ENCRYPTION_FAILED = "ENCRYPTION_FAILED",
  DECRYPTION_FAILED = "DECRYPTION_FAILED",
  IPFS_UPLOAD_FAILED = "IPFS_UPLOAD_FAILED",
  IPFS_DOWNLOAD_FAILED = "IPFS_DOWNLOAD_FAILED",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  INSUFFICIENT_GAS = "INSUFFICIENT_GAS",
  CAPSULE_NOT_FOUND = "CAPSULE_NOT_FOUND",
  UNLOCK_CONDITIONS_NOT_MET = "UNLOCK_CONDITIONS_NOT_MET",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  HASH_MISMATCH = "HASH_MISMATCH",
}

export class CapsuleSDKError extends Error {
  constructor(
    public code: CapsuleError,
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "CapsuleSDKError";
  }
}
