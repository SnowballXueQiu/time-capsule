"use client";

import { Layout } from "../../components/Layout";
import { CreateCapsuleForm } from "../../components/CreateCapsuleForm";
import { ClientOnly } from "../../components/ClientOnly";

export default function CreatePage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Create Time Capsule
          </h1>
          <p className="text-lg text-gray-600">
            Encrypt and store your content with blockchain-based unlock
            conditions
          </p>
        </div>
        <ClientOnly
          fallback={
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                Loading capsule creation interface...
              </p>
            </div>
          }
        >
          <CreateCapsuleForm />
        </ClientOnly>
      </div>
    </Layout>
  );
}
