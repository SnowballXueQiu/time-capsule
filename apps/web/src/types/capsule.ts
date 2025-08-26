// Local types for the web app to avoid importing SDK types that cause SSR issues

export interface ContentData {
  content: Uint8Array;
  filename?: string;
  contentType: string;
}

export interface UnlockConditionData {
  type: "time" | "multisig" | "payment";
  unlockTime?: number;
  threshold?: number;
  price?: number;
}

export interface CapsuleCreationResult {
  capsuleId: string;
  transactionDigest: string;
  encryptionKey: string;
  cid: string;
}
