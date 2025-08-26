"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getSDK } from "../../../lib/sdk";
import type { Capsule } from "@time-capsule/types";
import { Layout } from "../../../components/Layout";
import { Loading } from "../../../components/Loading";

// Dynamically import CapsuleDetail to avoid SSR issues
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

export default function CapsuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk, setSdk] = useState<any>(null);

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

  const handleUnlock = (capsule: Capsule) => {
    // TODO: Implement unlock functionality in next task
    console.log("Unlock capsule:", capsule.id);
  };

  const handleApprove = (capsule: Capsule) => {
    // TODO: Implement approve functionality in next task
    console.log("Approve capsule:", capsule.id);
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

  return (
    <Layout>
      <CapsuleDetail
        capsule={capsule}
        onBack={handleBack}
        onUnlock={handleUnlock}
        onApprove={handleApprove}
      />
    </Layout>
  );
}
