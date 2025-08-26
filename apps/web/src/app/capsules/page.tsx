"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Layout } from "../../components/Layout";
import { Loading } from "../../components/Loading";
import type { Capsule } from "@time-capsule/types";

// Dynamically import components to avoid SSR issues
const CapsuleList = dynamic(
  () =>
    import("../../components/capsules").then((mod) => ({
      default: mod.CapsuleList,
    })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

const CapsuleDetail = dynamic(
  () =>
    import("../../components/capsules").then((mod) => ({
      default: mod.CapsuleDetail,
    })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

export default function CapsulesPage() {
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);

  const handleCapsuleSelect = (capsule: Capsule) => {
    setSelectedCapsule(capsule);
  };

  const handleBack = () => {
    setSelectedCapsule(null);
  };

  const handleUnlock = (capsule: Capsule) => {
    // TODO: Implement unlock functionality in next task
    console.log("Unlock capsule:", capsule.id);
  };

  const handleApprove = (capsule: Capsule) => {
    // TODO: Implement approve functionality in next task
    console.log("Approve capsule:", capsule.id);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {selectedCapsule ? (
          <CapsuleDetail
            capsule={selectedCapsule}
            onBack={handleBack}
            onUnlock={handleUnlock}
            onApprove={handleApprove}
          />
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              My Capsules
            </h1>
            <CapsuleList onCapsuleSelect={handleCapsuleSelect} />
          </>
        )}
      </div>
    </Layout>
  );
}
