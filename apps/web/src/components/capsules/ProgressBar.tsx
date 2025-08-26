interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

export function ProgressBar({
  current,
  total,
  label,
  showPercentage = false,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const isComplete = current >= total;

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">{label}</span>
          {showPercentage && (
            <span className="text-gray-500">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isComplete
              ? "bg-green-500"
              : percentage > 0
              ? "bg-blue-500"
              : "bg-gray-300"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
