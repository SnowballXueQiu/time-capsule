"use client";

import { useState } from "react";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

export function TransactionLookup() {
  const [txDigest, setTxDigest] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const lookupTransaction = async () => {
    if (!txDigest.trim()) return;

    setLoading(true);
    try {
      const client = new SuiClient({ url: getFullnodeUrl("testnet") });

      const txResult = await client.getTransactionBlock({
        digest: txDigest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      setResult(txResult);
      console.log("Transaction lookup result:", txResult);
    } catch (error) {
      console.error("Transaction lookup error:", error);
      setResult({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Transaction Lookup</h3>
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={txDigest}
          onChange={(e) => setTxDigest(e.target.value)}
          placeholder="Enter transaction digest (e.g., FRGC9ArpRLbiHJes...)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />
        <button
          onClick={lookupTransaction}
          disabled={loading || !txDigest.trim()}
          className="btn-primary"
        >
          {loading ? "Looking up..." : "Lookup"}
        </button>
      </div>

      {result && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Result:</h4>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
