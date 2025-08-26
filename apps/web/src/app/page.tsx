import { Layout } from "../components/Layout";
import Link from "next/link";

export default function Home() {
  return (
    <Layout>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Decentralized Time Capsule
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Store encrypted content with blockchain-based unlock conditions
        </p>
        <Link
          href="/create"
          className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
        >
          Create Your First Capsule
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-blue-500 text-4xl mb-4">⏰</div>
          <h2 className="text-xl font-semibold mb-4">Time-based Capsules</h2>
          <p className="text-gray-600">
            Lock content until a specific date and time. Perfect for future
            messages, birthday surprises, or time-sensitive information.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-green-500 text-4xl mb-4">👥</div>
          <h2 className="text-xl font-semibold mb-4">Multisig Capsules</h2>
          <p className="text-gray-600">
            Require multiple signatures to unlock content. Ideal for group
            decisions, shared secrets, or collaborative projects.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-purple-500 text-4xl mb-4">💰</div>
          <h2 className="text-xl font-semibold mb-4">Paid Capsules</h2>
          <p className="text-gray-600">
            Unlock content by paying the specified amount. Great for selling
            digital content, creating bounties, or monetizing information.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-center mb-6">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Upload Content</h3>
            <p className="text-sm text-gray-600">
              Upload your files or enter text content
            </p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Set Conditions</h3>
            <p className="text-sm text-gray-600">
              Choose unlock conditions: time, multisig, or payment
            </p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <span className="text-purple-600 font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Encrypt & Store</h3>
            <p className="text-sm text-gray-600">
              Content is encrypted and stored on IPFS
            </p>
          </div>
          <div className="text-center">
            <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <span className="text-orange-600 font-bold">4</span>
            </div>
            <h3 className="font-semibold mb-2">Unlock & Access</h3>
            <p className="text-sm text-gray-600">
              Access content when conditions are met
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
