interface CapsuleStatusBadgeProps {
  unlocked: boolean;
  canUnlock: boolean;
}

export function CapsuleStatusBadge({
  unlocked,
  canUnlock,
}: CapsuleStatusBadgeProps) {
  if (unlocked) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Unlocked
      </span>
    );
  }

  if (canUnlock) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Ready
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
      Locked
    </span>
  );
}
