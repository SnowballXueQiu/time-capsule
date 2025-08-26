"use client";

import { useState, useCallback } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
} from "@mysten/dapp-kit";
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
  const { mutate: signAndExecuteTransactionBlock } =
    useSignAndExecuteTransactionBlock();

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
          network: "devnet",
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

        // Import TransactionBlock from sui.js
        const { TransactionBlock } = await import(
          "@mysten/sui.js/transactions"
        );

        const tx = new TransactionBlock();

        switch (condition.type) {
          case "time":
            if (!condition.unlockTime) {
              throw new Error(
                "Unlock time is required for time-based capsules"
              );
            }
            tx.moveCall({
              target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::capsule::create_time_capsule`,
              arguments: [
                tx.pure(storageResult.cid),
                tx.pure(Array.from(storageResult.contentHash)),
                tx.pure(condition.unlockTime),
              ],
            });
            break;

          case "multisig":
            if (!condition.threshold) {
              throw new Error("Threshold is required for multisig capsules");
            }
            tx.moveCall({
              target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::capsule::create_multisig_capsule`,
              arguments: [
                tx.pure(storageResult.cid),
                tx.pure(Array.from(storageResult.contentHash)),
                tx.pure(condition.threshold),
              ],
            });
            break;

          case "payment":
            if (!condition.price) {
              throw new Error("Price is required for paid capsules");
            }
            tx.moveCall({
              target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::capsule::create_paid_capsule`,
              arguments: [
                tx.pure(storageResult.cid),
                tx.pure(Array.from(storageResult.contentHash)),
                tx.pure(condition.price * 1_000_000_000), // Convert SUI to MIST
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
        const txResult = await new Promise<any>((resolve, reject) => {
          signAndExecuteTransactionBlock(
            {
              transactionBlock: tx,
              options: {
                showEffects: true,
                showObjectChanges: true,
              },
            },
            {
              onSuccess: resolve,
              onError: reject,
            }
          );
        });

        if (txResult.effects?.status?.status !== "success") {
          throw new Error(
            `Transaction failed: ${txResult.effects?.status?.error}`
          );
        }

        // Extract capsule ID from object changes
        let capsuleId = "";
        const changes = txResult.objectChanges || [];
        for (const change of changes) {
          if (
            change.type === "created" &&
            change.objectType?.includes("TimeCapsule")
          ) {
            capsuleId = change.objectId;
            break;
          }
        }

        if (!capsuleId) {
          throw new Error(
            "Could not extract capsule ID from transaction result"
          );
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
