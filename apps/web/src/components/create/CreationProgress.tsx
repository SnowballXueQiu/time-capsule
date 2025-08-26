"use client";

interface CreationStep {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed" | "error";
  error?: string;
}

interface CreationProgressProps {
  steps: CreationStep[];
  onBack: () => void;
}

export function CreationProgress({ steps, onBack }: CreationProgressProps) {
  const getStepIcon = (step: CreationStep) => {
    switch (step.status) {
      case "completed":
        return "✅";
      case "in-progress":
        return "⏳";
      case "error":
        return "❌";
      default:
        return "⏸️";
    }
  };

  const getStepColor = (step: CreationStep) => {
    switch (step.status) {
      case "completed":
        return "text-green-600";
      case "in-progress":
        return "text-blue-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-400";
    }
  };

  const hasError = steps.some((step) => step.status === "error");
  const allCompleted = steps.every((step) => step.status === "completed");

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Creating Your Time Capsule
      </h2>

      <div className="space-y-4 mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-1">
              <div className={`text-2xl ${getStepColor(step)}`}>
                {getStepIcon(step)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${getStepColor(step)}`}>
                {step.name}
              </div>
              {step.status === "in-progress" && (
                <div className="text-sm text-gray-500 mt-1">Processing...</div>
              )}
              {step.status === "error" && step.error && (
                <div className="text-sm text-red-600 mt-1">
                  Error: {step.error}
                </div>
              )}
              {step.status === "completed" && (
                <div className="text-sm text-green-600 mt-1">
                  Completed successfully
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>
            {steps.filter((s) => s.status === "completed").length} of{" "}
            {steps.length} steps
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              hasError ? "bg-red-500" : "bg-blue-500"
            }`}
            style={{
              width: `${
                (steps.filter((s) => s.status === "completed").length /
                  steps.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>

      {/* Status messages */}
      {!allCompleted && !hasError && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-blue-400 text-xl mr-3">⏳</div>
            <div>
              <h3 className="text-blue-800 font-medium">
                Creating your capsule...
              </h3>
              <p className="text-blue-600 text-sm mt-1">
                Please wait while we encrypt your content and create the
                blockchain transaction. This may take a few moments.
              </p>
            </div>
          </div>
        </div>
      )}

      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-400 text-xl mr-3">❌</div>
            <div>
              <h3 className="text-red-800 font-medium">Creation failed</h3>
              <p className="text-red-600 text-sm mt-1">
                There was an error creating your time capsule. You'll be
                redirected back to try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={!hasError}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Back to Conditions
        </button>
        <div className="text-sm text-gray-500 flex items-center">
          {!allCompleted && !hasError && (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Processing...
            </>
          )}
        </div>
      </div>
    </div>
  );
}
