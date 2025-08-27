"use client";

import { useState } from "react";

interface DebugInfoProps {
  data: any;
  title: string;
}

export function DebugInfo({ data, title }: DebugInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <pre className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
