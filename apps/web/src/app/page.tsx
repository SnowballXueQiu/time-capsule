export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        Decentralized Time Capsule
      </h1>
      <p className="text-center text-gray-600 mb-8">
        Store encrypted content with blockchain-based unlock conditions
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Time-based Capsules</h2>
          <p className="text-gray-600">
            Lock content until a specific date and time
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Multisig Capsules</h2>
          <p className="text-gray-600">
            Require multiple signatures to unlock content
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Paid Capsules</h2>
          <p className="text-gray-600">
            Unlock content by paying the specified amount
          </p>
        </div>
      </div>
    </main>
  );
}
