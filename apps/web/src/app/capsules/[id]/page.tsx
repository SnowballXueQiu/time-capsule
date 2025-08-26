"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { getSDK } from "../../../lib/sdk";
import type { Capsule, UnlockResult } from "@time-capsule/types";
import { Layout } from "../../../components/Layout";
import { Loading } from "../../../components/Loading";

// Dynamically import components to avoid SSR issues
const CapsuleDetail = dynamic(
  () =>
    import("../../../components/capsules").then((mod) => ({
      default: mod.CapsuleDetail,
    })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

const UnlockModal = dynamic(
  () =>
    import("../../../components/capsules").then((mod) => ({
      default: mod.UnlockModal,
    })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

const ContentViewer = dynamic(
  () =>
    import("../../../components/capsules").then((mod) => ({
      default: mod.ContentViewer,
    })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

export default function CapsuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const currentAccount = useCurrentAccount();

  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk, setSdk] = useState<any>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockResult, setUnlockResult] = useState<UnlockResult | null>(null);
  const [showContentViewer, setShowContentViewer] = useState(false);

  const capsuleId = params.id as string;

  // Initialize SDK
  useEffect(() => {
    const initSdk = async () => {
      try {
        const sdkInstance = await getSDK();
        await sdkInstance.initialize();
        setSdk(sdkInstance);
      } catch (err) {
        console.error("Failed to initialize SDK:", err);
        setError("Failed to initialize SDK");
      }
    };

    initSdk();
  }, []);

  useEffect(() => {
    if (capsuleId && sdk) {
      loadCapsule();
    }
  }, [capsuleId, sdk]);

  const loadCapsule = async () => {
    if (!sdk) return;

    try {
      setLoading(true);
      setError(null);

      const capsuleData = await sdk.getCapsuleById(capsuleId);
      setCapsule(capsuleData);
    } catch (err) {
      console.error("Failed to load capsule:", err);
      setError(err instanceof Error ? err.message : "Failed to load capsule");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/capsules");
  };

  const handleUnlock = async (capsule: Capsule) => {
    console.log("handleUnlock called with capsule:", capsule.id);

    if (!currentAccount || !sdk) {
      alert("Please connect your wallet first");
      return;
    }

    // Validate ownership
    if (currentAccount.address !== capsule.owner) {
      alert("Only the capsule owner can unlock it");
      return;
    }

    // Check if capsule can be unlocked
    const status = sdk.getCapsuleStatus(capsule);
    if (!status.canUnlock) {
      alert(`Cannot unlock capsule: ${status.statusMessage}`);
      return;
    }

    if (capsule.unlocked) {
      alert("Capsule is already unlocked");
      return;
    }

    setShowUnlockModal(true);
  };

  const handleUnlockSuccess = (result: UnlockResult) => {
    console.log("Unlock successful:", result);
    console.log("Setting unlockResult:", result);
    console.log("Setting showContentViewer to true");

    setUnlockResult(result);
    setShowContentViewer(true);

    // Show a temporary alert to confirm the unlock worked
    alert(
      `🎉 Unlock Successful!\n\nCapsule ID: ${
        result.capsuleId
      }\nContent Type: ${result.contentType}\nContent Size: ${
        result.content?.length || 0
      } bytes\n\nContent viewer should open now.`
    );

    // Refresh capsule data to show updated state
    loadCapsule();
  };

  const handleUnlockError = (error: string) => {
    console.error("Unlock failed:", error);
    alert(`❌ Failed to unlock capsule:\n\n${error}`);
  };

  const handleApprove = async (capsule: Capsule) => {
    if (!currentAccount) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      console.log("Simulating approval for capsule:", capsule.id);
      setLoading(true);

      // Simulate approval process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Approval successful for capsule:", capsule.id);

      // Show success message
      alert(
        "Capsule approved successfully! In a real implementation, this would update the blockchain state."
      );

      // Refresh capsule data
      await loadCapsule();
    } catch (err) {
      console.error("Approval failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Approval failed";
      alert(`❌ Failed to approve capsule:\n\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !sdk) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Error Loading Capsule
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="space-x-4">
              <button
                onClick={loadCapsule}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!capsule) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">
              Capsule Not Found
            </h2>
            <p className="text-yellow-600 mb-4">
              The capsule with ID {capsuleId} could not be found.
            </p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Back to List
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Debug logging
  console.log(
    "Render check - showContentViewer:",
    showContentViewer,
    "unlockResult:",
    !!unlockResult
  );

  return (
    <Layout>
      <CapsuleDetail
        capsule={capsule}
        onBack={handleBack}
        onUnlock={handleUnlock}
        onApprove={handleApprove}
      />

      {/* Unlock Modal */}
      {showUnlockModal && capsule && (
        <UnlockModal
          capsule={capsule}
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          onSuccess={handleUnlockSuccess}
          onError={handleUnlockError}
        />
      )}

      {/* Content Viewer */}
      {showContentViewer && unlockResult && (
        <ContentViewer
          unlockResult={unlockResult}
          isOpen={showContentViewer}
          onClose={() => {
            console.log("Closing content viewer");
            setShowContentViewer(false);
          }}
          onDownload={() => {
            console.log("Content downloaded");
          }}
        />
      )}
    </Layout>
  );
}
