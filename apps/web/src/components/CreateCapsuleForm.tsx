"use client";

import { useState, useCallback } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { ContentUpload } from "./create/ContentUpload";
import { UnlockConditionSelector } from "./create/UnlockConditionSelector";
import { CreationProgress } from "./create/CreationProgress";
import { CreationSuccess } from "./create/CreationSuccess";
import type {
  ContentData,
  UnlockConditionData,
  CapsuleCreationResult,
} from "../types/capsule";

interface CreationStep {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed" | "error";
  error?: string;
}

export function CreateCapsuleForm() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [step, setStep] = useState<
    "content" | "conditions" | "creating" | "success"
  >("content");
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [unlockCondition, setUnlockCondition] =
    useState<UnlockConditionData | null>(null);
  const [creationSteps, setCreationSteps] = useState<CreationStep[]>([]);
  const [creationResult, setCreationResult] =
    useState<CapsuleCreationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleContentSubmit = useCallback((data: ContentData) => {
    setContentData(data);
    setStep("conditions");
    setError(null);
  }, []);

  const handleConditionsSubmit = useCallback(
    (condition: UnlockConditionData) => {
      setUnlockCondition(condition);
      setStep("creating");
      setError(null);
      createCapsule(contentData!, condition);
    },
    [contentData]
  );

  const createCapsule = useCallback(
    async (content: ContentData, condition: UnlockConditionData) => {
      if (!currentAccount) {
        setError("Please connect your wallet first");
        setStep("conditions");
        return;
      }

      const steps: CreationStep[] = [
        { id: "encrypt", name: "Encrypting content", status: "pending" },
        { id: "upload", name: "Uploading to IPFS", status: "pending" },
        {
          id: "transaction",
          name: "Creating blockchain transaction",
          status: "pending",
        },
        { id: "confirm", name: "Confirming transaction", status: "pending" },
      ];

      setCreationSteps(steps);

      try {
        // Dynamically import SDK to avoid SSR issues
        const { CapsuleSDK } = await import("@time-capsule/sdk");

        // Initialize SDK
        const sdk = new CapsuleSDK({
          network: "testnet",
          packageId: process.env.NEXT_PUBLIC_PACKAGE_ID || "0x0",
        });

        await sdk.initialize();

        // Step 1: Encrypt content
        setCreationSteps((prev) =>
          prev.map((s) =>
            s.id === "encrypt" ? { ...s, status: "in-progress" } : s
          )
        );

        // Step 2-4: Create capsule based on type
        setCreationSteps((prev) =>
          prev.map((s) =>
            s.id === "encrypt"
              ? { ...s, status: "completed" }
              : s.id === "upload"
              ? { ...s, status: "in-progress" }
              : s
          )
        );

        let result: CapsuleCreationResult;

        // Step 2: Upload to IPFS and encrypt content
        const { EncryptedStorage, createPinataIPFSClient } = await import(
          "@time-capsule/sdk"
        );

        const ipfs = createPinataIPFSClient({
          pinataApiKey: process.env.NEXT_PUBLIC_PINATA_API_KEY,
          pinataApiSecret: process.env.NEXT_PUBLIC_PINATA_API_SECRET,
          pinataJWT: process.env.NEXT_PUBLIC_PINATA_JWT,
          pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
          timeout: 30000,
          retries: 3,
        });

        const encryptedStorage = new EncryptedStorage(ipfs);
        await encryptedStorage.initialize();

        const storageResult = await encryptedStorage.storeContent(
          content.content,
          "application/octet-stream"
        );

        console.log("Storage result:", storageResult);

        // Validate storage result
        if (
          !storageResult.cid ||
          !storageResult.contentHash ||
          !storageResult.encryptionKey
        ) {
          throw new Error("Invalid storage result from IPFS upload");
        }

        setCreationSteps((prev) =>
          prev.map((s) =>
            s.id === "upload"
              ? { ...s, status: "completed" }
              : s.id === "transaction"
              ? { ...s, status: "in-progress" }
              : s
          )
        );

        // Step 3: Build and execute transaction based on condition type
        setCreationSteps((prev) =>
          prev.map((s) =>
            s.id === "transaction" ? { ...s, status: "in-progress" } : s
          )
        );

        // Create transaction using the imported Transaction class
        const tx = new Transaction();

        console.log("Creating transaction with:");
        console.log("- Package ID:", process.env.NEXT_PUBLIC_PACKAGE_ID);
        console.log("- Storage result:", storageResult);
        console.log("- Condition:", condition);

        // Validate package ID
        if (
          !process.env.NEXT_PUBLIC_PACKAGE_ID ||
          process.env.NEXT_PUBLIC_PACKAGE_ID === "0x0"
        ) {
          throw new Error(
            "Invalid package ID. Please deploy the contract first."
          );
        }

        switch (condition.type) {
          case "time":
            if (!condition.unlockTime) {
              throw new Error(
                "Unlock time is required for time-based capsules"
              );
            }

            const cidBytes = Array.from(
              new TextEncoder().encode(storageResult.cid)
            );
            const hashBytes = Array.from(storageResult.contentHash);

            console.log("Transaction arguments:");
            console.log("- CID bytes:", cidBytes);
            console.log("- Hash bytes:", hashBytes);
            console.log("- Unlock time:", condition.unlockTime);

            tx.moveCall({
              target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::capsule::create_time_capsule`,
              arguments: [
                tx.pure.vector("u8", cidBytes),
                tx.pure.vector("u8", hashBytes),
                tx.pure.u64(condition.unlockTime),
                tx.object("0x6"), // Clock object
              ],
            });
            break;

          case "multisig":
            if (!condition.threshold) {
              throw new Error("Threshold is required for multisig capsules");
            }

            const cidBytesMultisig = Array.from(
              new TextEncoder().encode(storageResult.cid)
            );
            const hashBytesMultisig = Array.from(storageResult.contentHash);

            console.log("Multisig transaction arguments:");
            console.log("- CID bytes:", cidBytesMultisig);
            console.log("- Hash bytes:", hashBytesMultisig);
            console.log("- Threshold:", condition.threshold);

            tx.moveCall({
              target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::capsule::create_multisig_capsule`,
              arguments: [
                tx.pure.vector("u8", cidBytesMultisig),
                tx.pure.vector("u8", hashBytesMultisig),
                tx.pure.u64(condition.threshold),
                tx.object("0x6"), // Clock object
              ],
            });
            break;

          case "payment":
            if (!condition.price) {
              throw new Error("Price is required for paid capsules");
            }

            const cidBytesPayment = Array.from(
              new TextEncoder().encode(storageResult.cid)
            );
            const hashBytesPayment = Array.from(storageResult.contentHash);
            const priceInMist = condition.price * 1_000_000_000; // Convert SUI to MIST

            console.log("Payment transaction arguments:");
            console.log("- CID bytes:", cidBytesPayment);
            console.log("- Hash bytes:", hashBytesPayment);
            console.log("- Price in MIST:", priceInMist);

            tx.moveCall({
              target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::capsule::create_payment_capsule`,
              arguments: [
                tx.pure.vector("u8", cidBytesPayment),
                tx.pure.vector("u8", hashBytesPayment),
                tx.pure.u64(priceInMist),
                tx.object("0x6"), // Clock object
              ],
            });
            break;

          default:
            throw new Error("Invalid unlock condition type");
        }

        // Step 4: Sign and execute transaction with wallet
        setCreationSteps((prev) =>
          prev.map((s) =>
            s.id === "transaction"
              ? { ...s, status: "completed" }
              : s.id === "confirm"
              ? { ...s, status: "in-progress" }
              : s
          )
        );

        // Use wallet to sign and execute transaction
        console.log("About to sign and execute transaction...");
        console.log("Transaction object:", tx);

        const txResult = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Transaction timeout after 60 seconds"));
          }, 60000);

          try {
            signAndExecuteTransaction(
              {
                transaction: tx,
                options: {
                  showEffects: true,
                  showEvents: true,
                  showObjectChanges: true,
                },
              },
              {
                onSuccess: (result) => {
                  clearTimeout(timeout);
                  console.log("Transaction success:", result);
                  resolve(result);
                },
                onError: (error) => {
                  clearTimeout(timeout);
                  console.error("Transaction error details:", {
                    error,
                    message: error?.message,
                    cause: error?.cause,
                    stack: error?.stack,
                  });
                  reject(error);
                },
              }
            );
          } catch (error) {
            clearTimeout(timeout);
            console.error("signAndExecuteTransaction call failed:", error);
            reject(error);
          }
        });

        console.log(
          "Full transaction result:",
          JSON.stringify(txResult, null, 2)
        );

        // Check if transaction was successful
        if (!txResult) {
          throw new Error("Transaction failed: No result received from wallet");
        }

        if (!txResult.digest) {
          console.error("Transaction result without digest:", txResult);
          throw new Error("Transaction failed: No transaction digest received");
        }

        // Check transaction status - the effects are base64 encoded, we need to check differently
        // If we have a digest and no obvious error, the transaction likely succeeded
        let transactionSucceeded = false;

        if (txResult.effects) {
          // Try to parse the effects if they're a string (base64)
          if (typeof txResult.effects === "string") {
            console.log(
              "Effects are base64 encoded, assuming success if we have digest"
            );
            transactionSucceeded = !!txResult.digest;
          } else if (txResult.effects.status) {
            // Effects are already parsed
            const status =
              txResult.effects.status.status || txResult.effects.status;
            transactionSucceeded = status === "success";
            if (!transactionSucceeded) {
              const errorMsg =
                txResult.effects.status.error ||
                JSON.stringify(txResult.effects.status) ||
                "Unknown transaction error";
              console.error("Transaction failed with status:", status);
              console.error("Full effects:", txResult.effects);
              throw new Error(`Transaction failed: ${errorMsg}`);
            }
          } else {
            // No clear status, check if we have digest
            transactionSucceeded = !!txResult.digest;
          }
        } else {
          // No effects, check if we have digest
          transactionSucceeded = !!txResult.digest;
        }

        if (!transactionSucceeded) {
          console.error("Transaction appears to have failed");
          console.error("Full result:", txResult);
          throw new Error("Transaction failed: No success confirmation");
        }

        // Extract capsule ID from object changes or query the transaction
        let capsuleId = "";
        const changes = txResult.objectChanges || [];

        console.log("Object changes:", changes);
        console.log("Transaction digest:", txResult.digest);

        // Try to extract from object changes first
        for (const change of changes) {
          if (change.type === "created") {
            console.log("Created object:", change);
            // Look for TimeCapsule objects or shared objects (time capsules are shared)
            if (
              change.objectType?.includes("TimeCapsule") ||
              change.objectType?.includes("capsule::TimeCapsule") ||
              (typeof change.owner === "object" &&
                "Shared" in change.owner &&
                change.objectType?.includes("capsule"))
            ) {
              capsuleId = change.objectId;
              break;
            }
          }
        }

        // If we still can't find it, try to get any shared object created
        if (!capsuleId) {
          for (const change of changes) {
            if (change.type === "created" && change.owner === "Shared") {
              capsuleId = change.objectId;
              console.log("Using shared object as capsule ID:", capsuleId);
              break;
            }
          }
        }

        // If still no capsule ID, try to query the transaction with retries
        if (!capsuleId && txResult.digest) {
          try {
            console.log(
              "Attempting to query transaction for created objects..."
            );
            // Import SuiClient dynamically
            const { SuiClient, getFullnodeUrl } = await import(
              "@mysten/sui/client"
            );
            const client = new SuiClient({ url: getFullnodeUrl("testnet") });

            // Retry mechanism for transaction query
            let retries = 3;
            let txDetails = null;

            while (retries > 0 && !txDetails) {
              try {
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
                txDetails = await client.getTransactionBlock({
                  digest: txResult.digest,
                  options: {
                    showObjectChanges: true,
                    showEffects: true,
                  },
                });
                break;
              } catch (retryError) {
                retries--;
                console.log(`Query retry ${3 - retries} failed:`, retryError);
                if (retries === 0) throw retryError;
              }
            }

            console.log("Transaction details from query:", txDetails);

            if (txDetails?.objectChanges) {
              for (const change of txDetails.objectChanges) {
                if (
                  change.type === "created" &&
                  (change.objectType?.includes("TimeCapsule") ||
                    (typeof change.owner === "object" &&
                      "Shared" in change.owner))
                ) {
                  capsuleId = change.objectId;
                  console.log(
                    "Found capsule ID from transaction query:",
                    capsuleId
                  );
                  break;
                }
              }
            }
          } catch (queryError) {
            console.warn("Failed to query transaction details:", queryError);
          }
        }

        // If still no capsule ID, try to parse the raw effects
        if (!capsuleId && txResult.rawEffects) {
          try {
            console.log("Attempting to parse raw effects for capsule ID...");
            // The rawEffects is a Uint8Array that contains the transaction effects
            // We'll look for patterns that might indicate a created object ID
            const effectsArray = Array.from(txResult.rawEffects);
            console.log("Raw effects length:", effectsArray.length);

            // Look for 32-byte sequences that might be object IDs (simplified approach)
            // This is a heuristic approach - in a production app you'd want proper BCS parsing
            for (let i = 0; i < effectsArray.length - 32; i++) {
              const potentialId = effectsArray.slice(i, i + 32) as number[];
              // Check if this looks like an object ID (starts with reasonable bytes)
              if (potentialId[0] !== 0 || potentialId.some((b) => b !== 0)) {
                const hexId =
                  "0x" +
                  potentialId
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("");
                // Basic validation - object IDs should be 32 bytes and not all zeros
                if (hexId.length === 66 && hexId !== "0x" + "00".repeat(32)) {
                  console.log("Potential capsule ID from raw effects:", hexId);
                  capsuleId = hexId;
                  break;
                }
              }
            }
          } catch (parseError) {
            console.warn("Failed to parse raw effects:", parseError);
          }
        }

        if (!capsuleId) {
          console.error("Available object changes:", changes);
          console.error("Full transaction result:", txResult);

          // Since we have a successful transaction digest, use it as a fallback
          // The user can find their capsule in the capsule list
          console.log("Using transaction digest as fallback identifier");
          capsuleId = `pending-${txResult.digest}`;
        }

        result = {
          capsuleId,
          transactionDigest: txResult.digest,
          encryptionKey: Buffer.from(storageResult.encryptionKey).toString(
            "base64"
          ),
          cid: storageResult.cid,
        };

        // Mark all steps as completed
        setCreationSteps((prev) =>
          prev.map((s) => ({ ...s, status: "completed" }))
        );
        setCreationResult(result);
        setStep("success");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);

        // Mark current step as error
        setCreationSteps((prev) =>
          prev.map((s) =>
            s.status === "in-progress"
              ? { ...s, status: "error", error: errorMessage }
              : s
          )
        );

        // Allow user to go back and try again
        setTimeout(() => {
          setStep("conditions");
        }, 3000);
      }
    },
    [currentAccount]
  );

  const handleStartOver = useCallback(() => {
    setStep("content");
    setContentData(null);
    setUnlockCondition(null);
    setCreationSteps([]);
    setCreationResult(null);
    setError(null);
  }, []);

  const handleBackToContent = useCallback(() => {
    setStep("content");
    setError(null);
  }, []);

  const handleBackToConditions = useCallback(() => {
    setStep("conditions");
    setError(null);
  }, []);

  if (!currentAccount) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Wallet Connection Required
        </h2>
        <p className="text-gray-600 mb-6">
          Please connect your Sui wallet to create time capsules.
        </p>
        <p className="text-sm text-gray-500">
          Your wallet is needed to sign transactions and manage your capsules
          securely.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center space-x-2 ${
              step === "content" ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "content"
                  ? "bg-blue-100"
                  : ["conditions", "creating", "success"].includes(step)
                  ? "bg-green-100"
                  : "bg-gray-100"
              }`}
            >
              {["conditions", "creating", "success"].includes(step) ? "✓" : "1"}
            </div>
            <span className="font-medium">Content</span>
          </div>

          <div className="flex-1 h-px bg-gray-200 mx-4" />

          <div
            className={`flex items-center space-x-2 ${
              step === "conditions" ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "conditions"
                  ? "bg-blue-100"
                  : ["creating", "success"].includes(step)
                  ? "bg-green-100"
                  : "bg-gray-100"
              }`}
            >
              {["creating", "success"].includes(step) ? "✓" : "2"}
            </div>
            <span className="font-medium">Conditions</span>
          </div>

          <div className="flex-1 h-px bg-gray-200 mx-4" />

          <div
            className={`flex items-center space-x-2 ${
              ["creating", "success"].includes(step)
                ? "text-blue-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "creating"
                  ? "bg-blue-100"
                  : step === "success"
                  ? "bg-green-100"
                  : "bg-gray-100"
              }`}
            >
              {step === "success" ? "✓" : "3"}
            </div>
            <span className="font-medium">Create</span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-400 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Creation Failed</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step content */}
      {step === "content" && <ContentUpload onSubmit={handleContentSubmit} />}

      {step === "conditions" && contentData && (
        <UnlockConditionSelector
          onSubmit={handleConditionsSubmit}
          onBack={handleBackToContent}
          contentData={contentData}
        />
      )}

      {step === "creating" && (
        <CreationProgress
          steps={creationSteps}
          onBack={handleBackToConditions}
        />
      )}

      {step === "success" && creationResult && (
        <CreationSuccess
          result={creationResult}
          contentData={contentData!}
          unlockCondition={unlockCondition!}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
}
